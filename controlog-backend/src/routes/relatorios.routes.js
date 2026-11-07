import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createRelatorioController } from '../controllers/relatorio.controller.js';
import { validate } from '../middlewares/validate.js';
import { createRelatorioService } from '../services/relatorio.service.js';
import {
  relatorioQuerySchema,
  rotasDoDiaQuerySchema,
} from '../validators/relatorio.validators.js';

const relatorioService = createRelatorioService(prisma);
const controller = createRelatorioController(relatorioService);

export const relatoriosRouter = Router();

relatoriosRouter.get('/', validate(relatorioQuerySchema, 'query'), controller.getRelatorio);

// Espelho operacional de um dia só: quantas rotas saíram, a que horas, e com
// quantas entregas cada uma. Separado de GET / porque aquele é agregado por
// período e este lista rota a rota.
relatoriosRouter.get(
  '/rotas-do-dia',
  validate(rotasDoDiaQuerySchema, 'query'),
  controller.getRotasDoDia
);
