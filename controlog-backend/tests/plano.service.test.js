import { jest } from '@jest/globals';
import { createPlanoService, DEPOSITO } from '../src/services/plano.service.js';
import { ConflictError, NotFoundError, ValidationError } from '../src/utils/AppError.js';

function buildPrismaMock() {
  const tx = {
    plano: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    pedido: { updateMany: jest.fn(), update: jest.fn() },
    rota: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    entrega: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
  };

  return {
    plano: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    pedido: { findMany: jest.fn() },
    motorista: { findUnique: jest.fn() },
    veiculo: { findUnique: jest.fn() },
    $transaction: jest.fn(async (fn) => fn(tx)),
    _tx: tx,
  };
}

describe('plano.service — create', () => {
  test('cria o plano e vincula os pedidos informados', async () => {
    const prisma = buildPrismaMock();
    prisma.pedido.findMany.mockResolvedValue([
      { id: 'p1', codigo: 'PED-1', planoId: null },
      { id: 'p2', codigo: 'PED-2', planoId: null },
    ]);
    prisma._tx.plano.create.mockResolvedValue({ id: 'plano1', nome: 'Rota Norte' });
    prisma._tx.plano.findUnique.mockResolvedValue({ id: 'plano1', nome: 'Rota Norte', pedidos: [] });

    const service = createPlanoService(prisma);
    await service.create({ nome: 'Rota Norte', pedidoIds: ['p1', 'p2'] });

    expect(prisma._tx.plano.create).toHaveBeenCalledWith({ data: { nome: 'Rota Norte' } });
    expect(prisma._tx.pedido.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['p1', 'p2'] } },
      data: { planoId: 'plano1' },
    });
  });

  test('rejeita quando algum pedido não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.pedido.findMany.mockResolvedValue([{ id: 'p1', codigo: 'PED-1', planoId: null }]);

    const service = createPlanoService(prisma);

    await expect(service.create({ nome: 'X', pedidoIds: ['p1', 'p2'] })).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('rejeita quando algum pedido já está vinculado a outro plano', async () => {
    const prisma = buildPrismaMock();
    prisma.pedido.findMany.mockResolvedValue([
      { id: 'p1', codigo: 'PED-1', planoId: null },
      { id: 'p2', codigo: 'PED-2', planoId: 'outro-plano' },
    ]);

    const service = createPlanoService(prisma);

    await expect(service.create({ nome: 'X', pedidoIds: ['p1', 'p2'] })).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('plano.service — otimizar', () => {
  // Pedidos fictícios em cruz ao redor do depósito, deliberadamente fora de
  // ordem angular — a varredura precisa reordenar por geografia, não repetir
  // a ordem de entrada.
  function pedidosEmCruz() {
    return [
      { id: 'p1', lat: DEPOSITO.lat + 0.02, lng: DEPOSITO.lng }, // norte
      { id: 'p2', lat: DEPOSITO.lat, lng: DEPOSITO.lng - 0.02 }, // oeste
      { id: 'p3', lat: DEPOSITO.lat - 0.02, lng: DEPOSITO.lng }, // sul
      { id: 'p4', lat: DEPOSITO.lat, lng: DEPOSITO.lng + 0.02 }, // leste
      { id: 'p5', lat: DEPOSITO.lat + 0.01, lng: DEPOSITO.lng + 0.01 }, // nordeste
    ];
  }

  test('divide os pedidos em grupos de tamanhoRota seguindo a varredura geográfica, não a ordem de entrada', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique
      .mockResolvedValueOnce({ id: 'plano1', pedidos: pedidosEmCruz() })
      .mockResolvedValueOnce({ id: 'plano1', pedidos: pedidosEmCruz() }); // segunda chamada: getById no final

    const service = createPlanoService(prisma);
    await service.otimizar('plano1', { tamanhoRota: 2 });

    // Ordem angular esperada a partir do depósito: sul, leste, nordeste, norte, oeste.
    const chamadas = prisma._tx.pedido.update.mock.calls.map(([args]) => args);
    expect(chamadas).toEqual([
      { where: { id: 'p3' }, data: { rotaIndex: 1 } },
      { where: { id: 'p4' }, data: { rotaIndex: 1 } },
      { where: { id: 'p5' }, data: { rotaIndex: 2 } },
      { where: { id: 'p1' }, data: { rotaIndex: 2 } },
      { where: { id: 'p2' }, data: { rotaIndex: 3 } },
    ]);
    expect(prisma._tx.plano.update).toHaveBeenCalledWith({
      where: { id: 'plano1' },
      data: { status: 'OTIMIZADO' },
    });
  });

  test('rejeita otimizar um plano sem nenhum pedido', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique.mockResolvedValue({ id: 'plano1', pedidos: [] });

    const service = createPlanoService(prisma);

    await expect(service.otimizar('plano1', { tamanhoRota: 3 })).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('rejeita otimizar um plano inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique.mockResolvedValue(null);

    const service = createPlanoService(prisma);

    await expect(service.otimizar('inexistente', { tamanhoRota: 3 })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });
});

describe('plano.service — aprovarRota', () => {
  function pedidosDoGrupo() {
    return [
      { id: 'p1', codigo: 'PED-1', endereco: 'Rua A, 1', cidade: 'Centro', lat: -26.3, lng: -48.84, rotaId: null },
      { id: 'p2', codigo: 'PED-2', endereco: 'Rua B, 2', cidade: 'Bucarein', lat: -26.32, lng: -48.86, rotaId: null },
    ];
  }

  const payload = { motoristaId: 'm1', veiculoId: 'v1', dataHora: new Date('2026-01-10T10:00:00Z') };

  test('cria a Rota com o próximo código, aprova os pedidos e gera uma Entrega por pedido', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique.mockResolvedValue({ id: 'plano1', status: 'OTIMIZADO' });
    prisma.pedido.findMany.mockResolvedValue(pedidosDoGrupo());
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.veiculo.findUnique.mockResolvedValue({ id: 'v1' });
    prisma._tx.rota.findMany.mockResolvedValue([{ codigo: 'RT-001' }]);
    prisma._tx.rota.create.mockResolvedValue({ id: 'rota1', codigo: 'RT-002' });

    const service = createPlanoService(prisma);
    const resultado = await service.aprovarRota('plano1', '1', payload);

    expect(resultado).toEqual({ id: 'rota1', codigo: 'RT-002' });
    const dadosRota = prisma._tx.rota.create.mock.calls[0][0].data;
    expect(dadosRota).toMatchObject({
      codigo: 'RT-002',
      origem: 'Centro de Distribuição',
      destino: 'Centro, Bucarein',
      latOrigem: -26.3045,
      lngOrigem: -48.8487,
      status: 'ATIVA',
      dataHora: payload.dataHora,
      motoristaId: 'm1',
      veiculoId: 'v1',
    });
    expect(dadosRota.latDestino).toBeCloseTo(-26.31, 9);
    expect(dadosRota.lngDestino).toBeCloseTo(-48.85, 9);
    expect(prisma._tx.pedido.updateMany).toHaveBeenCalledWith({
      where: { planoId: 'plano1', rotaIndex: 1 },
      data: { rotaId: 'rota1' },
    });
    expect(prisma._tx.entrega.create).toHaveBeenCalledTimes(2);
    expect(prisma._tx.entrega.create).toHaveBeenNthCalledWith(1, {
      data: {
        codigo: 'EN-001',
        destino: 'Rua A, 1, Centro',
        status: 'PENDENTE',
        dataPrevista: payload.dataHora,
        rotaId: 'rota1',
        motoristaId: 'm1',
      },
    });
    expect(prisma._tx.entrega.create).toHaveBeenNthCalledWith(2, {
      data: {
        codigo: 'EN-002',
        destino: 'Rua B, 2, Bucarein',
        status: 'PENDENTE',
        dataPrevista: payload.dataHora,
        rotaId: 'rota1',
        motoristaId: 'm1',
      },
    });
  });

  test('rejeita plano inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique.mockResolvedValue(null);

    const service = createPlanoService(prisma);
    await expect(service.aprovarRota('inexistente', '1', payload)).rejects.toBeInstanceOf(NotFoundError);
  });

  test('rejeita aprovar rota de um plano ainda não otimizado', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique.mockResolvedValue({ id: 'plano1', status: 'ABERTO' });

    const service = createPlanoService(prisma);
    await expect(service.aprovarRota('plano1', '1', payload)).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.pedido.findMany).not.toHaveBeenCalled();
  });

  test('rejeita quando o grupo (rotaIndex) não existe no plano', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique.mockResolvedValue({ id: 'plano1', status: 'OTIMIZADO' });
    prisma.pedido.findMany.mockResolvedValue([]);

    const service = createPlanoService(prisma);
    await expect(service.aprovarRota('plano1', '9', payload)).rejects.toBeInstanceOf(NotFoundError);
  });

  test('rejeita reaprovar uma rota já aprovada', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique.mockResolvedValue({ id: 'plano1', status: 'OTIMIZADO' });
    prisma.pedido.findMany.mockResolvedValue([{ ...pedidosDoGrupo()[0], rotaId: 'rota-ja-existente' }]);

    const service = createPlanoService(prisma);
    await expect(service.aprovarRota('plano1', '1', payload)).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('rejeita motorista inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique.mockResolvedValue({ id: 'plano1', status: 'OTIMIZADO' });
    prisma.pedido.findMany.mockResolvedValue(pedidosDoGrupo());
    prisma.motorista.findUnique.mockResolvedValue(null);
    prisma.veiculo.findUnique.mockResolvedValue({ id: 'v1' });

    const service = createPlanoService(prisma);
    await expect(service.aprovarRota('plano1', '1', payload)).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('rejeita veículo inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique.mockResolvedValue({ id: 'plano1', status: 'OTIMIZADO' });
    prisma.pedido.findMany.mockResolvedValue(pedidosDoGrupo());
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.veiculo.findUnique.mockResolvedValue(null);

    const service = createPlanoService(prisma);
    await expect(service.aprovarRota('plano1', '1', payload)).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('plano.service — remove/renomear', () => {
  test('remove rejeita plano inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique.mockResolvedValue(null);

    const service = createPlanoService(prisma);

    await expect(service.remove('inexistente')).rejects.toBeInstanceOf(NotFoundError);
    expect(prisma.plano.delete).not.toHaveBeenCalled();
  });

  test('remove exclui o plano existente (pedidos são liberados via onDelete: SetNull no schema)', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique.mockResolvedValue({ id: 'plano1' });

    const service = createPlanoService(prisma);
    await service.remove('plano1');

    expect(prisma.plano.delete).toHaveBeenCalledWith({ where: { id: 'plano1' } });
  });

  test('renomear rejeita plano inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique.mockResolvedValue(null);

    const service = createPlanoService(prisma);

    await expect(service.renomear('inexistente', 'Novo nome')).rejects.toBeInstanceOf(NotFoundError);
  });
});
