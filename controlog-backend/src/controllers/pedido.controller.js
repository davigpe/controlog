import { asyncHandler } from '../utils/asyncHandler.js';

export function createPedidoController(pedidoService) {
  return {
    gerar: asyncHandler(async (req, res) => {
      const pedidos = await pedidoService.gerar(req.body);
      res.status(201).json(pedidos);
    }),

    list: asyncHandler(async (req, res) => {
      const pedidos = await pedidoService.list(req.query);
      res.json(pedidos);
    }),
  };
}
