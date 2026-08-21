import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { authRouter } from './auth.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { entregasRouter } from './entregas.routes.js';
import { motoristasRouter } from './motoristas.routes.js';
import { otimizacaoRotasRouter } from './otimizacaoRotas.routes.js';
import { relatoriosRouter } from './relatorios.routes.js';
import { rotasRouter } from './rotas.routes.js';
import { veiculosRouter } from './veiculos.routes.js';

export const router = Router();

router.use('/auth', authRouter);

// RN01 — Apenas usuários autenticados podem acessar qualquer funcionalidade do sistema
router.use(requireAuth);

router.use('/motoristas', motoristasRouter);
router.use('/veiculos', veiculosRouter);
router.use('/rotas', rotasRouter);
router.use('/entregas', entregasRouter);
router.use('/dashboard', dashboardRouter);
router.use('/relatorios', relatoriosRouter);
router.use('/otimizacao-rotas', otimizacaoRotasRouter);
