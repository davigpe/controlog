import { asyncHandler } from '../utils/asyncHandler.js';

export function createMotoristaController(motoristaService) {
  return {
    list: asyncHandler(async (req, res) => {
      const motoristas = await motoristaService.list(req.query);
      res.json(motoristas);
    }),

    getById: asyncHandler(async (req, res) => {
      const motorista = await motoristaService.getById(req.params.id);
      res.json(motorista);
    }),

    create: asyncHandler(async (req, res) => {
      const motorista = await motoristaService.create(req.body);
      res.status(201).json(motorista);
    }),

    update: asyncHandler(async (req, res) => {
      const motorista = await motoristaService.update(req.params.id, req.body);
      res.json(motorista);
    }),

    remove: asyncHandler(async (req, res) => {
      await motoristaService.remove(req.params.id);
      res.status(204).send();
    }),
  };
}
