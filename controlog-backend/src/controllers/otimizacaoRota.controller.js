import { asyncHandler } from '../utils/asyncHandler.js';

export function createOtimizacaoRotaController(otimizacaoRotaService) {
  return {
    otimizar: asyncHandler(async (req, res) => {
      const resultado = await otimizacaoRotaService.otimizar(req.body);
      res.json(resultado);
    }),
  };
}
