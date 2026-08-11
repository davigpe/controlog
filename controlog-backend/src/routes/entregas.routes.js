import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createEntregaController } from '../controllers/entrega.controller.js';
import { validate } from '../middlewares/validate.js';
import { createEntregaService } from '../services/entrega.service.js';
import {
  createEntregaSchema,
  listEntregasQuerySchema,
  updateEntregaSchema,
} from '../validators/entrega.validators.js';

const entregaService = createEntregaService(prisma);
const controller = createEntregaController(entregaService);

export const entregasRouter = Router();

entregasRouter.get('/', validate(listEntregasQuerySchema, 'query'), controller.list);
entregasRouter.get('/:id', controller.getById);
entregasRouter.post('/', validate(createEntregaSchema), controller.create);
entregasRouter.put('/:id', validate(updateEntregaSchema), controller.update);
entregasRouter.delete('/:id', controller.remove);
