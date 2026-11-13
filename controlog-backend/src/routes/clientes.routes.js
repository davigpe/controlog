import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createClienteController } from '../controllers/cliente.controller.js';
import { validate } from '../middlewares/validate.js';
import { createClienteService } from '../services/cliente.service.js';
import {
  createClienteSchema,
  listClientesQuerySchema,
  updateClienteSchema,
} from '../validators/cliente.validators.js';

const controller = createClienteController(createClienteService(prisma));

export const clientesRouter = Router();

// Antes de '/:id': 'codigo' é um segmento literal, então não há ambiguidade
// real, mas manter as rotas literais na frente evita que uma mudança futura no
// padrão de '/:id' as capture sem ninguém notar.
clientesRouter.get('/codigo/:codigo', controller.getByCodigo);

clientesRouter.get('/', validate(listClientesQuerySchema, 'query'), controller.list);
clientesRouter.get('/:id', controller.getById);
clientesRouter.post('/', validate(createClienteSchema), controller.create);
clientesRouter.put('/:id', validate(updateClienteSchema), controller.update);
clientesRouter.delete('/:id', controller.remove);
