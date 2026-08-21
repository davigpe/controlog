import { Router } from 'express';
import { createOtimizacaoRotaController } from '../controllers/otimizacaoRota.controller.js';
import { validate } from '../middlewares/validate.js';
import { otimizacaoRotaService } from '../services/otimizacaoRota.service.js';
import { otimizarRotaSchema } from '../validators/otimizacaoRota.validators.js';

const controller = createOtimizacaoRotaController(otimizacaoRotaService);

export const otimizacaoRotasRouter = Router();

otimizacaoRotasRouter.post('/otimizar', validate(otimizarRotaSchema), controller.otimizar);
