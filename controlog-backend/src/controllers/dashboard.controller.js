import { asyncHandler } from '../utils/asyncHandler.js';

export function createDashboardController(dashboardService) {
  return {
    getResumo: asyncHandler(async (req, res) => {
      const resumo = await dashboardService.getResumo();
      res.json(resumo);
    }),
  };
}
