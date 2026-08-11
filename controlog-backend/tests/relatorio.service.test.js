import { jest } from '@jest/globals';
import { createRelatorioService } from '../src/services/relatorio.service.js';

function buildPrismaMock() {
  return {
    rota: { groupBy: jest.fn() },
    entrega: { groupBy: jest.fn(), findMany: jest.fn() },
  };
}

// RF13/RF14 — Relatórios operacionais filtráveis por período, com métricas consolidadas
describe('relatorio.service', () => {
  test('getRelatorio consolida rotas por status, entregas por status e motoristas mais ativos', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.groupBy.mockResolvedValue([
      { status: 'ATIVA', _count: { _all: 2 } },
      { status: 'CONCLUIDA', _count: { _all: 4 } },
    ]);
    prisma.entrega.groupBy.mockResolvedValue([
      { status: 'ENTREGUE', _count: { _all: 3 } },
      { status: 'PENDENTE', _count: { _all: 1 } },
    ]);
    prisma.entrega.findMany.mockResolvedValue([
      { motorista: { id: 'm1', nome: 'Carlos Silva' } },
      { motorista: { id: 'm1', nome: 'Carlos Silva' } },
      { motorista: { id: 'm2', nome: 'Ana Souza' } },
    ]);

    const service = createRelatorioService(prisma);
    const relatorio = await service.getRelatorio({});

    expect(relatorio.rotasPorStatus).toEqual({ ATIVA: 2, CONCLUIDA: 4 });
    expect(relatorio.entregasPorStatus).toEqual({ ENTREGUE: 3, PENDENTE: 1 });
    expect(relatorio.totalEntregas).toBe(4);
    expect(relatorio.motoristasMaisAtivos[0]).toEqual({ motorista: 'Carlos Silva', entregas: 2 });
  });

  test('getRelatorio aplica filtro de período quando dataInicio/dataFim são informadas', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.groupBy.mockResolvedValue([]);
    prisma.entrega.groupBy.mockResolvedValue([]);
    prisma.entrega.findMany.mockResolvedValue([]);

    const dataInicio = new Date('2026-01-01');
    const dataFim = new Date('2026-01-31');

    const service = createRelatorioService(prisma);
    await service.getRelatorio({ dataInicio, dataFim });

    expect(prisma.rota.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dataHora: { gte: dataInicio, lte: dataFim } },
      })
    );
  });
});
