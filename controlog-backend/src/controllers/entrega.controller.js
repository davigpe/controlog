import { asyncHandler } from '../utils/asyncHandler.js';

export function createEntregaController(entregaService) {
  return {
    list: asyncHandler(async (req, res) => {
      const entregas = await entregaService.list(req.query);
      res.json(entregas);
    }),

    getById: asyncHandler(async (req, res) => {
      const entrega = await entregaService.getById(req.params.id);
      res.json(entrega);
    }),

    create: asyncHandler(async (req, res) => {
      const entrega = await entregaService.create(req.body);
      res.status(201).json(entrega);
    }),

    update: asyncHandler(async (req, res) => {
      const entrega = await entregaService.update(req.params.id, req.body);
      res.json(entrega);
    }),

    remove: asyncHandler(async (req, res) => {
      await entregaService.remove(req.params.id);
      res.status(204).send();
    }),
  };
}
