import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createComprovanteController } from '../controllers/comprovante.controller.js';
import { createMinhasRotasController } from '../controllers/minhasRotas.controller.js';
import { uploadComprovante } from '../middlewares/uploadComprovante.js';
import { validate } from '../middlewares/validate.js';
import { createComprovanteService } from '../services/comprovante.service.js';
import { createMinhasRotasService } from '../services/minhasRotas.service.js';
import { ForbiddenError } from '../utils/AppError.js';
import {
  listMinhasRotasQuerySchema,
  registrarInsucessoSchema,
} from '../validators/minhasRotas.validators.js';

const minhasRotasService = createMinhasRotasService(prisma);
const comprovanteService = createComprovanteService(prisma);
const controller = createMinhasRotasController(minhasRotasService);

// Nesta visão, toda operação é sobre entregas do próprio motorista. O id vem
// do cadastro vinculado ao usuário logado, nunca da requisição: aceitá-lo do
// cliente deixaria um motorista agir sobre a entrega de outro.
async function motoristaDoUsuarioLogado(req) {
  const motorista = await prisma.motorista.findUnique({
    where: { usuarioId: req.user.id },
    select: { id: true },
  });
  if (!motorista) {
    throw new ForbiddenError('Este usuário não está vinculado a um cadastro de motorista.');
  }
  return motorista.id;
}

const comprovantes = createComprovanteController(comprovanteService, motoristaDoUsuarioLogado);

export const minhasRotasRouter = Router();

minhasRotasRouter.get('/', validate(listMinhasRotasQuerySchema, 'query'), controller.listar);
minhasRotasRouter.patch('/entregas/:id/concluir', controller.concluirEntrega);
minhasRotasRouter.patch(
  '/entregas/:id/insucesso',
  validate(registrarInsucessoSchema),
  controller.registrarInsucesso
);

minhasRotasRouter.get('/entregas/:id/comprovantes', comprovantes.listar);
minhasRotasRouter.post('/entregas/:id/comprovantes', uploadComprovante, comprovantes.enviar);
minhasRotasRouter.get('/comprovantes/:id/arquivo', comprovantes.abrir);
minhasRotasRouter.delete('/comprovantes/:id', comprovantes.remover);
