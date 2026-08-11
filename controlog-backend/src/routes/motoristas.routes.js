import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createMotoristaController } from '../controllers/motorista.controller.js';
import { validate } from '../middlewares/validate.js';
import { createMotoristaService } from '../services/motorista.service.js';
import {
  createMotoristaSchema,
  listMotoristasQuerySchema,
  updateMotoristaSchema,
} from '../validators/motorista.validators.js';

const motoristaService = createMotoristaService(prisma);
const controller = createMotoristaController(motoristaService);

export const motoristasRouter = Router();

motoristasRouter.get('/', validate(listMotoristasQuerySchema, 'query'), controller.list);
motoristasRouter.get('/:id', controller.getById);
motoristasRouter.post('/', validate(createMotoristaSchema), controller.create);
motoristasRouter.put('/:id', validate(updateMotoristaSchema), controller.update);
motoristasRouter.delete('/:id', controller.remove);
