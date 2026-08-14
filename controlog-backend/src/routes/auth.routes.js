import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { prisma } from '../config/prisma.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createAuthService } from '../services/auth.service.js';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validators/auth.validators.js';

const authService = createAuthService(prisma);
const controller = createAuthController(authService);

export const authRouter = Router();

// Limite bem mais restrito que o global (RNF04) — protege especificamente contra
// força bruta de senha e enumeração de e-mail nessas rotas sensíveis. Chave por
// IP + e-mail informado, para não bloquear todos os usuários de uma mesma rede
// (ex.: NAT de empresa) por causa da tentativa de um único usuário.
const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${req.body?.email ?? ''}`,
  message: { message: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' },
});

authRouter.post('/register', validate(registerSchema), controller.register);
authRouter.post('/login', authAttemptLimiter, validate(loginSchema), controller.login);
authRouter.post('/refresh', validate(refreshSchema), controller.refresh);
authRouter.get('/me', requireAuth, controller.me);
authRouter.post(
  '/esqueci-senha',
  authAttemptLimiter,
  validate(forgotPasswordSchema),
  controller.forgotPassword
);
authRouter.post(
  '/redefinir-senha',
  authAttemptLimiter,
  validate(resetPasswordSchema),
  controller.resetPassword
);
