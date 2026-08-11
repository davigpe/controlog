import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { createDashboardController } from '../controllers/dashboard.controller.js';
import { createDashboardService } from '../services/dashboard.service.js';

const dashboardService = createDashboardService(prisma);
const controller = createDashboardController(dashboardService);

export const dashboardRouter = Router();

dashboardRouter.get('/resumo', controller.getResumo);
