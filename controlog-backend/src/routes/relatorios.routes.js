import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createRelatorioController } from '../controllers/relatorio.controller.js';
import { validate } from '../middlewares/validate.js';
import { createRelatorioService } from '../services/relatorio.service.js';
import { relatorioQuerySchema } from '../validators/relatorio.validators.js';

const relatorioService = createRelatorioService(prisma);
const controller = createRelatorioController(relatorioService);

export const relatoriosRouter = Router();

relatoriosRouter.get('/', validate(relatorioQuerySchema, 'query'), controller.getRelatorio);
