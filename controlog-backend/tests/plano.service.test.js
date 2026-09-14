import { jest } from '@jest/globals';
import { createPlanoService } from '../src/services/plano.service.js';
import { ConflictError, NotFoundError, ValidationError } from '../src/utils/AppError.js';

function buildPrismaMock() {
  const tx = {
    plano: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    pedido: { updateMany: jest.fn(), update: jest.fn() },
  };

  return {
    plano: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    pedido: { findMany: jest.fn() },
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
  function pedidosFake(n) {
    return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}` }));
  }

  test('divide os pedidos em grupos sequenciais de tamanhoRota', async () => {
    const prisma = buildPrismaMock();
    prisma.plano.findUnique
      .mockResolvedValueOnce({ id: 'plano1', pedidos: pedidosFake(5) })
      .mockResolvedValueOnce({ id: 'plano1', pedidos: pedidosFake(5) }); // segunda chamada: getById no final

    const service = createPlanoService(prisma);
    await service.otimizar('plano1', { tamanhoRota: 2 });

    const chamadas = prisma._tx.pedido.update.mock.calls.map(([args]) => args);
    expect(chamadas).toEqual([
      { where: { id: 'p1' }, data: { rotaIndex: 1 } },
      { where: { id: 'p2' }, data: { rotaIndex: 1 } },
      { where: { id: 'p3' }, data: { rotaIndex: 2 } },
      { where: { id: 'p4' }, data: { rotaIndex: 2 } },
      { where: { id: 'p5' }, data: { rotaIndex: 3 } },
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
