import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { authRouter } from './auth.routes.js';
import { clientesRouter } from './clientes.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { entregasRouter } from './entregas.routes.js';
import { minhasRotasRouter } from './minhasRotas.routes.js';
import { motoristasRouter } from './motoristas.routes.js';
import { otimizacaoRotasRouter } from './otimizacaoRotas.routes.js';
import { pedidosRouter } from './pedidos.routes.js';
import { planosRouter } from './planos.routes.js';
import { relatoriosRouter } from './relatorios.routes.js';
import { rotasRouter } from './rotas.routes.js';
import { veiculosRouter } from './veiculos.routes.js';

export const router = Router();

router.use('/auth', authRouter);

// RN01 — Apenas usuários autenticados podem acessar qualquer funcionalidade do sistema
router.use(requireAuth);

// Visão restrita do motorista: só as rotas atribuídas a ele mesmo. Exclusiva do
// perfil MOTORISTA — gestor e operador enxergam a operação inteira pelas rotas
// de gestão abaixo, não por aqui.
router.use('/minhas-rotas', requireRole('MOTORISTA'), minhasRotasRouter);

// Gestão da operação — o motorista não participa do cadastro/alteração de
// nada, então todo este bloco é restrito a gestor e operador.
const apenasGestao = requireRole('GESTOR', 'OPERADOR');

router.use('/clientes', apenasGestao, clientesRouter);
router.use('/motoristas', apenasGestao, motoristasRouter);
router.use('/veiculos', apenasGestao, veiculosRouter);
router.use('/rotas', apenasGestao, rotasRouter);
router.use('/entregas', apenasGestao, entregasRouter);
router.use('/dashboard', apenasGestao, dashboardRouter);
router.use('/relatorios', apenasGestao, relatoriosRouter);
router.use('/otimizacao-rotas', apenasGestao, otimizacaoRotasRouter);
router.use('/pedidos', apenasGestao, pedidosRouter);
router.use('/planos', apenasGestao, planosRouter);
