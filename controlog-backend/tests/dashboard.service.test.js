import { jest } from '@jest/globals';
import { createDashboardService } from '../src/services/dashboard.service.js';

function buildPrismaMock() {
  return {
    rota: { count: jest.fn() },
    motorista: { count: jest.fn() },
    veiculo: { count: jest.fn() },
    entrega: { count: jest.fn(), groupBy: jest.fn() },
  };
}

// RF07 — Dashboard com total de rotas ativas, concluídas, canceladas e número de motoristas
describe('dashboard.service', () => {
  test('getResumo consolida contadores de rotas, motoristas, veículos e entregas', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.count
      .mockResolvedValueOnce(3) // ativas
      .mockResolvedValueOnce(5) // concluidas
      .mockResolvedValueOnce(1); // canceladas
    prisma.motorista.count.mockResolvedValue(6);
    prisma.veiculo.count.mockResolvedValue(8);
    prisma.entrega.count.mockResolvedValue(20);
    prisma.entrega.groupBy.mockResolvedValue([
      { status: 'PENDENTE', _count: { _all: 4 } },
      { status: 'ENTREGUE', _count: { _all: 16 } },
    ]);

    const service = createDashboardService(prisma);
    const resumo = await service.getResumo();

    expect(resumo.rotas).toEqual({ ativas: 3, concluidas: 5, canceladas: 1, total: 9 });
    expect(resumo.totalMotoristas).toBe(6);
    expect(resumo.totalVeiculos).toBe(8);
    expect(resumo.totalEntregas).toBe(20);
    expect(resumo.entregasPorStatus).toEqual({ PENDENTE: 4, ENTREGUE: 16 });
  });
});
