import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createVeiculoController } from '../controllers/veiculo.controller.js';
import { validate } from '../middlewares/validate.js';
import { createVeiculoService } from '../services/veiculo.service.js';
import {
  createVeiculoSchema,
  listVeiculosQuerySchema,
  updateVeiculoSchema,
} from '../validators/veiculo.validators.js';

const veiculoService = createVeiculoService(prisma);
const controller = createVeiculoController(veiculoService);

export const veiculosRouter = Router();

veiculosRouter.get('/', validate(listVeiculosQuerySchema, 'query'), controller.list);
veiculosRouter.get('/:id', controller.getById);
veiculosRouter.post('/', validate(createVeiculoSchema), controller.create);
veiculosRouter.put('/:id', validate(updateVeiculoSchema), controller.update);
veiculosRouter.delete('/:id', controller.remove);
