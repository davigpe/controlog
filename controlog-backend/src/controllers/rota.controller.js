import { asyncHandler } from '../utils/asyncHandler.js';

export function createRotaController(rotaService) {
  return {
    list: asyncHandler(async (req, res) => {
      const rotas = await rotaService.list(req.query);
      res.json(rotas);
    }),

    getById: asyncHandler(async (req, res) => {
      const rota = await rotaService.getById(req.params.id);
      res.json(rota);
    }),

    create: asyncHandler(async (req, res) => {
      const rota = await rotaService.create(req.body);
      res.status(201).json(rota);
    }),

    update: asyncHandler(async (req, res) => {
      const rota = await rotaService.update(req.params.id, req.body, req.user);
      res.json(rota);
    }),

    remove: asyncHandler(async (req, res) => {
      await rotaService.remove(req.params.id);
      res.status(204).send();
    }),
  };
}
