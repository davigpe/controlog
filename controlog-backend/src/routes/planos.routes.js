import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createPlanoController } from '../controllers/plano.controller.js';
import { validate } from '../middlewares/validate.js';
import { createPlanoService } from '../services/plano.service.js';
import {
  aprovarRotaSchema,
  createPlanoSchema,
  listPlanosQuerySchema,
  otimizarPlanoSchema,
  renomearPlanoSchema,
} from '../validators/plano.validators.js';

const planoService = createPlanoService(prisma);
const controller = createPlanoController(planoService);

export const planosRouter = Router();

planosRouter.get('/', validate(listPlanosQuerySchema, 'query'), controller.list);
planosRouter.get('/:id', controller.getById);
planosRouter.post('/', validate(createPlanoSchema), controller.create);
planosRouter.put('/:id', validate(renomearPlanoSchema), controller.renomear);
planosRouter.post('/:id/otimizar', validate(otimizarPlanoSchema), controller.otimizar);
planosRouter.post('/:id/rotas/:rotaIndex/aprovar', validate(aprovarRotaSchema), controller.aprovarRota);
planosRouter.delete('/:id', controller.remove);
