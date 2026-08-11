import { asyncHandler } from '../utils/asyncHandler.js';

export function createVeiculoController(veiculoService) {
  return {
    list: asyncHandler(async (req, res) => {
      const veiculos = await veiculoService.list(req.query);
      res.json(veiculos);
    }),

    getById: asyncHandler(async (req, res) => {
      const veiculo = await veiculoService.getById(req.params.id);
      res.json(veiculo);
    }),

    create: asyncHandler(async (req, res) => {
      const veiculo = await veiculoService.create(req.body);
      res.status(201).json(veiculo);
    }),

    update: asyncHandler(async (req, res) => {
      const veiculo = await veiculoService.update(req.params.id, req.body);
      res.json(veiculo);
    }),

    remove: asyncHandler(async (req, res) => {
      await veiculoService.remove(req.params.id);
      res.status(204).send();
    }),
  };
}
