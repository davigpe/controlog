import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createMinhasRotasController } from '../controllers/minhasRotas.controller.js';
import { validate } from '../middlewares/validate.js';
import { createMinhasRotasService } from '../services/minhasRotas.service.js';
import {
  listMinhasRotasQuerySchema,
  registrarInsucessoSchema,
} from '../validators/minhasRotas.validators.js';

const minhasRotasService = createMinhasRotasService(prisma);
const controller = createMinhasRotasController(minhasRotasService);

export const minhasRotasRouter = Router();

minhasRotasRouter.get('/', validate(listMinhasRotasQuerySchema, 'query'), controller.listar);
minhasRotasRouter.patch('/entregas/:id/concluir', controller.concluirEntrega);
minhasRotasRouter.patch(
  '/entregas/:id/insucesso',
  validate(registrarInsucessoSchema),
  controller.registrarInsucesso
);
