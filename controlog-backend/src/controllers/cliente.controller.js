import { asyncHandler } from '../utils/asyncHandler.js';

export function createClienteController(clienteService) {
  return {
    list: asyncHandler(async (req, res) => {
      res.json(await clienteService.list(req.query));
    }),

    getById: asyncHandler(async (req, res) => {
      res.json(await clienteService.getById(req.params.id));
    }),

    getByCodigo: asyncHandler(async (req, res) => {
      res.json(await clienteService.getByCodigo(req.params.codigo));
    }),

    create: asyncHandler(async (req, res) => {
      res.status(201).json(await clienteService.create(req.body));
    }),

    update: asyncHandler(async (req, res) => {
      res.json(await clienteService.update(req.params.id, req.body));
    }),

    remove: asyncHandler(async (req, res) => {
      await clienteService.remove(req.params.id);
      res.status(204).send();
    }),
  };
}
