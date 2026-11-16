import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { prisma as prismaPadrao } from './config/prisma.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { router } from './routes/index.js';

/**
 * `prismaClient` é injetável só para teste — em produção vem o cliente real.
 * Serve ao `/health/db`, que precisa consultar o banco de verdade.
 */
export function createApp({ prismaClient = prismaPadrao } = {}) {
  const app = express();

  // Atrás de um proxy reverso, o IP real de quem chamou só existe no
  // X-Forwarded-For; sem confiar nesse cabeçalho, o express-rate-limit
  // (abaixo) não distingue um usuário do outro. Quantos saltos confiar
  // depende da pilha de deploy, por isso vem do ambiente — ver TRUST_PROXY
  // em config/env.js.
  app.set('trust proxy', env.trustProxy);

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );
  // 1 MB em vez dos 100 KB padrão: a importação de motoristas por planilha
  // manda até 500 linhas num POST só (POST /api/motoristas/importar), o que
  // passa dos 100 KB quando os nomes são longos. O teto de linhas no
  // validador é que limita o lote de fato; aqui é só folga para ele caber.
  app.use(express.json({ limit: '1mb' }));

  if (env.nodeEnv !== 'test') {
    // `dev` só em desenvolvimento. Ele é concisao e colorido para o terminal,
    // mas emite códigos ANSI de cor sempre — inclusive sem TTY — e omite data,
    // IP e versão do protocolo. No CloudWatch isso significa linha suja e, pior,
    // impossível de filtrar: o padrão de métrica que conta respostas 5xx e as
    // consultas do Logs Insights em docs/OBSERVABILIDADE.md extraem método,
    // rota e status do formato `combined`.
    app.use(
      morgan(env.nodeEnv === 'development' ? 'dev' : 'combined', {
        // `/health` bem-sucedido não vai para o log. Ele é consultado pelo
        // health check do Route 53 a cada 30 s, de vários verificadores em
        // regiões diferentes, e pelo healthcheck do contêiner — juntos, a maior
        // parte do volume e nenhum sinal. No CloudWatch isso afoga o que
        // importa e cobra ingestão para registrar que está tudo bem.
        //
        // Falha continua registrada: o filtro só dispensa resposta abaixo de
        // 400. Um `/health` respondendo 503 é exatamente o que se quer ver.
        //
        // `startsWith` e não igualdade, para cobrir `/health/db` também: ele é
        // o endereço que o health check externo consulta, na mesma cadência.
        skip: (req, res) => req.path.startsWith('/health') && res.statusCode < 400,
      })
    );
  }

  // RNF04 — proteção básica contra abuso, mantendo a API disponível para os
  // ~50 usuários simultâneos previstos nas métricas de sucesso do projeto
  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Liveness: o processo subiu e responde. Não toca em dependência nenhuma, de
  // propósito — é o que o healthcheck do contêiner consulta, e um banco
  // momentaneamente indisponível não deve marcar o contêiner como quebrado.
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  /**
   * Readiness: a aplicação consegue efetivamente trabalhar.
   *
   * Existe por causa de um incidente concreto. A rotação automática da senha
   * mestra do RDS invalidou a credencial do `.env.production`, e por cinco
   * horas **todo login respondeu 500** enquanto o `/health` seguia devolvendo
   * 200 — porque ele não tocava no banco. O health check externo ficou verde, o
   * alarme de disponibilidade ficou em OK, e quem descobriu a queda foi o
   * usuário tentando entrar.
   *
   * Monitorar só liveness responde "o processo está vivo?". A pergunta que
   * importa é "ele consegue atender?", e essa exige falar com o banco.
   */
  app.get('/health/db', async (req, res) => {
    try {
      // Consulta mais barata possível: não lê tabela, só confirma que a
      // conexão está autenticada e respondendo.
      await prismaClient.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', banco: 'ok', timestamp: new Date().toISOString() });
    } catch (erro) {
      // Registra inteiro: foi exatamente a mensagem do Prisma, com o motivo da
      // recusa, que permitiu identificar a rotação da senha como causa. O
      // Prisma não inclui a senha na mensagem, apenas host e usuário.
      console.error('[health/db] banco inacessível:', erro);
      res.status(503).json({
        status: 'erro',
        banco: 'inacessivel',
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use('/api', router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
