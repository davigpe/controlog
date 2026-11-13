import { jest } from '@jest/globals';

import { createPlanoService } from '../src/services/plano.service.js';
import { createRotaService } from '../src/services/rota.service.js';
import { aprovarRotaSchema } from '../src/validators/plano.validators.js';
import { ValidationError } from '../src/utils/AppError.js';

function buildPlanoPrisma() {
  const tx = {
    plano: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    pedido: { updateMany: jest.fn(), update: jest.fn() },
    rota: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    entrega: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn() },
  };
  return {
    plano: { findUnique: jest.fn() },
    pedido: { findMany: jest.fn() },
    motorista: { findUnique: jest.fn() },
    veiculo: { findUnique: jest.fn() },
    $transaction: jest.fn(async (fn) => fn(tx)),
    _tx: tx,
  };
}

function prontoParaAprovar(prisma) {
  prisma.plano.findUnique.mockResolvedValue({ id: 'plano1', status: 'OTIMIZADO' });
  prisma.pedido.findMany.mockResolvedValue([
    { id: 'p1', codigo: 'PED-1', endereco: 'Rua A, 1', cidade: 'Centro', lat: -26.3, lng: -48.84, rotaId: null },
  ]);
  prisma._tx.rota.create.mockResolvedValue({ id: 'rota1', codigo: 'RT-001' });
  return prisma;
}

const dataHora = new Date('2026-11-20T08:00:00Z');

describe('aprovar rota sem motorista e sem veículo', () => {
  test('aprova com os dois ausentes e grava null', async () => {
    const prisma = prontoParaAprovar(buildPlanoPrisma());
    const service = createPlanoService(prisma);

    await service.aprovarRota('plano1', '1', { dataHora });

    const dados = prisma._tx.rota.create.mock.calls[0][0].data;
    expect(dados.motoristaId).toBeNull();
    expect(dados.veiculoId).toBeNull();
    expect(dados.veiculoProprio).toBe(false);
    // Nada a validar: sem id informado, não há o que buscar no banco.
    expect(prisma.motorista.findUnique).not.toHaveBeenCalled();
    expect(prisma.veiculo.findUnique).not.toHaveBeenCalled();
  });

  test('as entregas nascem sem dono junto com a rota', async () => {
    const prisma = prontoParaAprovar(buildPlanoPrisma());
    const service = createPlanoService(prisma);

    await service.aprovarRota('plano1', '1', { dataHora });

    const entregas = prisma._tx.entrega.createMany.mock.calls[0][0].data;
    expect(entregas).toHaveLength(1);
    expect(entregas[0].motoristaId).toBeNull();
  });

  test('continua recusando um motorista informado que não existe', async () => {
    const prisma = prontoParaAprovar(buildPlanoPrisma());
    prisma.motorista.findUnique.mockResolvedValue(null);
    const service = createPlanoService(prisma);

    await expect(
      service.aprovarRota('plano1', '1', { motoristaId: 'm-inexistente', dataHora })
    ).rejects.toThrow(ValidationError);
  });
});

describe('aprovar rota com veículo próprio', () => {
  test('grava a marcação e deixa veiculoId nulo', async () => {
    const prisma = prontoParaAprovar(buildPlanoPrisma());
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1' });
    const service = createPlanoService(prisma);

    await service.aprovarRota('plano1', '1', { motoristaId: 'm1', veiculoProprio: true, dataHora });

    const dados = prisma._tx.rota.create.mock.calls[0][0].data;
    expect(dados.veiculoProprio).toBe(true);
    expect(dados.veiculoId).toBeNull();
  });

  // Os dois juntos não têm leitura possível: nenhuma tela saberia qual mostrar.
  // O banco também recusa, mas aqui a mensagem diz o que fazer.
  test('recusa veículo próprio junto com um veículo da frota', async () => {
    const prisma = prontoParaAprovar(buildPlanoPrisma());
    const service = createPlanoService(prisma);

    await expect(
      service.aprovarRota('plano1', '1', { veiculoProprio: true, veiculoId: 'v1', dataHora })
    ).rejects.toThrow(/excludentes/i);
    expect(prisma._tx.rota.create).not.toHaveBeenCalled();
  });

  test('o validador recusa a mesma combinação antes de chegar ao service', () => {
    const r = aprovarRotaSchema.safeParse({
      dataHora: '2026-11-20T08:00:00Z',
      veiculoProprio: true,
      veiculoId: '11111111-1111-1111-1111-111111111111',
    });
    expect(r.success).toBe(false);
  });
});

function buildRotaPrisma(existente) {
  const tx = {
    rota: { update: jest.fn().mockResolvedValue({ ...existente, entregas: [] }) },
    entrega: { updateMany: jest.fn() },
  };
  return {
    rota: { findUnique: jest.fn().mockResolvedValue(existente), update: jest.fn() },
    motorista: { findUnique: jest.fn().mockResolvedValue({ id: 'm2' }) },
    veiculo: { findUnique: jest.fn().mockResolvedValue({ id: 'v2' }) },
    entrega: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn(async (fn) => fn(tx)),
    _tx: tx,
  };
}

describe('atribuir e desatribuir o motorista de uma rota', () => {
  const base = {
    id: 'r1', codigo: 'RT-001', status: 'ATIVA', motoristaId: null,
    veiculoId: null, veiculoProprio: false,
  };

  test('atribuir a uma rota sem dono leva as entregas junto', async () => {
    const prisma = buildRotaPrisma(base);
    const service = createRotaService(prisma);

    await service.update('r1', { motoristaId: 'm2' }, { perfil: 'GESTOR' });

    expect(prisma._tx.entrega.updateMany).toHaveBeenCalledWith({
      where: { rotaId: 'r1' },
      data: { motoristaId: 'm2' },
    });
  });

  // A regressão que a nulidade introduziu: com `data.motoristaId && ...`, um
  // null explícito era descartado e as entregas ficavam com o motorista
  // anterior, que seguiria vendo-as como suas em "Minhas Rotas".
  test('desatribuir também desatribui as entregas', async () => {
    const prisma = buildRotaPrisma({ ...base, motoristaId: 'm1' });
    const service = createRotaService(prisma);

    await service.update('r1', { motoristaId: null }, { perfil: 'GESTOR' });

    expect(prisma._tx.entrega.updateMany).toHaveBeenCalledWith({
      where: { rotaId: 'r1' },
      data: { motoristaId: null },
    });
  });

  test('não mexe nas entregas quando o motorista nem foi mencionado', async () => {
    const prisma = buildRotaPrisma({ ...base, motoristaId: 'm1' });
    const service = createRotaService(prisma);

    await service.update('r1', { dataHora: dataHora }, { perfil: 'GESTOR' });

    expect(prisma._tx.entrega.updateMany).not.toHaveBeenCalled();
  });

  test('recusa pôr um veículo da frota numa rota marcada como veículo próprio', async () => {
    const prisma = buildRotaPrisma({ ...base, veiculoProprio: true });
    const service = createRotaService(prisma);

    await expect(
      service.update('r1', { veiculoId: 'v2' }, { perfil: 'GESTOR' })
    ).rejects.toThrow(/excludentes/i);
  });
});
