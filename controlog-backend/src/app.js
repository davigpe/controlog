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
    app.use(morgan('dev'));
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
