import { jest } from '@jest/globals';
import {
  createRelatorioService,
  hojeNoFusoDeOperacao,
  intervaloDoDia,
} from '../src/services/relatorio.service.js';

function buildPrismaMock() {
  return {
    rota: { groupBy: jest.fn(), findMany: jest.fn() },
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

// Rotas do dia — melhoria pedida na avaliação com usuários da área de
// logística: quantas rotas saíram no dia, a que horas, exportável em planilha.
describe('relatorio.service / rotas do dia', () => {
  const rota = (overrides = {}) => ({
    id: 'r1',
    codigo: 'RT-001',
    origem: 'Centro de Distribuição',
    destino: 'Joinville',
    status: 'ATIVA',
    dataHora: new Date('2026-11-07T11:00:00.000Z'),
    criadoEm: new Date('2026-11-06T18:00:00.000Z'),
    motorista: { id: 'm1', nome: 'Carlos Silva' },
    veiculo: { id: 'v1', placa: 'ABC-1234', modelo: 'Iveco Daily' },
    entregas: [{ status: 'ENTREGUE' }, { status: 'PENDENTE' }],
    ...overrides,
  });

  test('recorta o dia civil no fuso de operação (UTC-3), não em UTC', () => {
    const { inicio, fim } = intervaloDoDia('2026-11-07');

    // 00:00 de 07/11 em Brasília é 03:00Z do mesmo dia...
    expect(inicio.toISOString()).toBe('2026-11-07T03:00:00.000Z');
    // ...e o fim do dia já cai em 08/11 em UTC.
    expect(fim.toISOString()).toBe('2026-11-08T02:59:59.999Z');
  });

  test('uma rota das 22h fica no dia dela, e não no seguinte', () => {
    // 2026-11-08T01:30Z é 07/11 às 22:30 em Brasília.
    expect(hojeNoFusoDeOperacao(new Date('2026-11-08T01:30:00.000Z'))).toBe('2026-11-07');
  });

  test('consulta pelo horário da rota e devolve os totais do dia', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findMany.mockResolvedValue([
      rota(),
      rota({ id: 'r2', codigo: 'RT-002', entregas: [{ status: 'ENTREGUE' }] }),
    ]);

    const service = createRelatorioService(prisma);
    const resultado = await service.getRotasDoDia({ data: '2026-11-07' });

    expect(resultado).toMatchObject({
      data: '2026-11-07',
      base: 'dataHora',
      totalRotas: 2,
      totalEntregas: 3,
      entregasConcluidas: 2,
    });
    expect(prisma.rota.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          dataHora: {
            gte: new Date('2026-11-07T03:00:00.000Z'),
            lte: new Date('2026-11-08T02:59:59.999Z'),
          },
        },
        orderBy: { dataHora: 'asc' },
      })
    );
  });

  test('base criadoEm conta pelo cadastro no sistema, não pelo horário da rota', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findMany.mockResolvedValue([]);

    const service = createRelatorioService(prisma);
    const resultado = await service.getRotasDoDia({ data: '2026-11-07', base: 'criadoEm' });

    expect(resultado.base).toBe('criadoEm');
    expect(prisma.rota.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ criadoEm: expect.any(Object) }),
        orderBy: { criadoEm: 'asc' },
      })
    );
  });

  test('lista em ordem cronológica e conta as entregas de cada rota', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findMany.mockResolvedValue([rota()]);

    const service = createRelatorioService(prisma);
    const { rotas } = await service.getRotasDoDia({ data: '2026-11-07' });

    expect(rotas[0]).toMatchObject({
      codigo: 'RT-001',
      totalEntregas: 2,
      entregasConcluidas: 1,
      motorista: { nome: 'Carlos Silva' },
      veiculo: { placa: 'ABC-1234' },
    });
  });

  test('dia vazio devolve totais zerados, e não erro', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findMany.mockResolvedValue([]);

    const service = createRelatorioService(prisma);
    const resultado = await service.getRotasDoDia({ data: '2026-11-07' });

    expect(resultado).toMatchObject({ totalRotas: 0, totalEntregas: 0, entregasConcluidas: 0 });
    expect(resultado.rotas).toEqual([]);
  });

  test('sem data informada, usa hoje no fuso de operação', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findMany.mockResolvedValue([]);

    const service = createRelatorioService(prisma);
    const resultado = await service.getRotasDoDia({});

    expect(resultado.data).toBe(hojeNoFusoDeOperacao());
  });
});
