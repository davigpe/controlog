import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createAuthController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createAuthService } from '../services/auth.service.js';
import { loginSchema, refreshSchema, registerSchema } from '../validators/auth.validators.js';

const authService = createAuthService(prisma);
const controller = createAuthController(authService);

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), controller.register);
authRouter.post('/login', validate(loginSchema), controller.login);
authRouter.post('/refresh', validate(refreshSchema), controller.refresh);
authRouter.get('/me', requireAuth, controller.me);
