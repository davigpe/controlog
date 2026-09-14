import { asyncHandler } from '../utils/asyncHandler.js';

export function createPlanoController(planoService) {
  return {
    list: asyncHandler(async (req, res) => {
      const planos = await planoService.list(req.query);
      res.json(planos);
    }),

    getById: asyncHandler(async (req, res) => {
      const plano = await planoService.getById(req.params.id);
      res.json(plano);
    }),

    create: asyncHandler(async (req, res) => {
      const plano = await planoService.create(req.body);
      res.status(201).json(plano);
    }),

    renomear: asyncHandler(async (req, res) => {
      const plano = await planoService.renomear(req.params.id, req.body.nome);
      res.json(plano);
    }),

    otimizar: asyncHandler(async (req, res) => {
      const plano = await planoService.otimizar(req.params.id, req.body);
      res.json(plano);
    }),

    remove: asyncHandler(async (req, res) => {
      await planoService.remove(req.params.id);
      res.status(204).send();
    }),
  };
}
