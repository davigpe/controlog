import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createComprovanteController } from '../controllers/comprovante.controller.js';
import { createEntregaController } from '../controllers/entrega.controller.js';
import { validate } from '../middlewares/validate.js';
import { createComprovanteService } from '../services/comprovante.service.js';
import { createEntregaService } from '../services/entrega.service.js';
import {
  createEntregaSchema,
  listEntregasQuerySchema,
  updateEntregaSchema,
} from '../validators/entrega.validators.js';

const entregaService = createEntregaService(prisma);
const controller = createEntregaController(entregaService);

// null: aqui quem chama e gestor ou operador, que enxergam a operacao inteira.
// A checagem de dono do service so vale para a visao do motorista.
const comprovantes = createComprovanteController(createComprovanteService(prisma), () => null);

export const entregasRouter = Router();

// Antes de '/:id' por clareza. Nao ha ambiguidade real (os caminhos tem numero
// de segmentos diferente), mas deixar as rotas literais na frente evita que
// uma alteracao futura no padrao de '/:id' as capture sem ninguem notar.
entregasRouter.get('/comprovantes/:id/arquivo', comprovantes.abrir);
entregasRouter.delete('/comprovantes/:id', comprovantes.remover);
entregasRouter.get('/:id/comprovantes', comprovantes.listar);

entregasRouter.get('/', validate(listEntregasQuerySchema, 'query'), controller.list);
entregasRouter.get('/:id', controller.getById);
entregasRouter.post('/', validate(createEntregaSchema), controller.create);
entregasRouter.put('/:id', validate(updateEntregaSchema), controller.update);
entregasRouter.delete('/:id', controller.remove);
