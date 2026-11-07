import { asyncHandler } from '../utils/asyncHandler.js';

export function createMinhasRotasController(minhasRotasService) {
  return {
    listar: asyncHandler(async (req, res) => {
      const resultado = await minhasRotasService.listar(req.user.id, req.query);
      res.json(resultado);
    }),

    concluirEntrega: asyncHandler(async (req, res) => {
      const entrega = await minhasRotasService.concluirEntrega(req.user.id, req.params.id);
      res.json(entrega);
    }),

    registrarInsucesso: asyncHandler(async (req, res) => {
      const entrega = await minhasRotasService.registrarInsucesso(
        req.user.id,
        req.params.id,
        req.body
      );
      res.json(entrega);
    }),
  };
}
