import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createPedidoController } from '../controllers/pedido.controller.js';
import { validate } from '../middlewares/validate.js';
import { createPedidoService } from '../services/pedido.service.js';
import { gerarPedidosSchema, listPedidosQuerySchema } from '../validators/pedido.validators.js';

const pedidoService = createPedidoService(prisma);
const controller = createPedidoController(pedidoService);

export const pedidosRouter = Router();

pedidosRouter.get('/', validate(listPedidosQuerySchema, 'query'), controller.list);
pedidosRouter.post('/gerar', validate(gerarPedidosSchema), controller.gerar);
