import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { router } from './routes/index.js';

export function createApp() {
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
        skip: (req, res) => req.path === '/health' && res.statusCode < 400,
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

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api', router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
