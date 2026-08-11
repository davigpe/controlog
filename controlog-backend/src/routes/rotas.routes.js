import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createRotaController } from '../controllers/rota.controller.js';
import { validate } from '../middlewares/validate.js';
import { createRotaService } from '../services/rota.service.js';
import {
  createRotaSchema,
  listRotasQuerySchema,
  updateRotaSchema,
} from '../validators/rota.validators.js';

const rotaService = createRotaService(prisma);
const controller = createRotaController(rotaService);

export const rotasRouter = Router();

rotasRouter.get('/', validate(listRotasQuerySchema, 'query'), controller.list);
rotasRouter.get('/:id', controller.getById);
rotasRouter.post('/', validate(createRotaSchema), controller.create);
rotasRouter.put('/:id', validate(updateRotaSchema), controller.update);
rotasRouter.delete('/:id', controller.remove);
