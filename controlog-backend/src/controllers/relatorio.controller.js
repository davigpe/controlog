import { asyncHandler } from '../utils/asyncHandler.js';

export function createRelatorioController(relatorioService) {
  return {
    getRelatorio: asyncHandler(async (req, res) => {
      const relatorio = await relatorioService.getRelatorio(req.query);
      res.json(relatorio);
    }),
  };
}
