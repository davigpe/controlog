import { jest } from '@jest/globals';
import { createPedidoService } from '../src/services/pedido.service.js';

function buildPrismaMock() {
  return {
    pedido: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
}

describe('pedido.service', () => {
  test('gerar cria a quantidade pedida e busca de volta pelos códigos gerados', async () => {
    const prisma = buildPrismaMock();
    const service = createPedidoService(prisma);

    await service.gerar({ quantidade: 5 });

    expect(prisma.pedido.createMany).toHaveBeenCalledTimes(1);
    const [{ data }] = prisma.pedido.createMany.mock.calls[0];
    expect(data).toHaveLength(5);
    for (const pedido of data) {
      expect(pedido.codigo).toMatch(/^PED-/);
      expect(pedido.unidades).toBeGreaterThanOrEqual(1);
      expect(pedido.volumeM3).toBeGreaterThanOrEqual(0.1);
      expect(typeof pedido.lat).toBe('number');
      expect(typeof pedido.lng).toBe('number');
    }

    const [{ where }] = prisma.pedido.findMany.mock.calls[0];
    expect(where.codigo.in).toHaveLength(5);
  });

  test('gerar com quantidade 0 não cria nada', async () => {
    const prisma = buildPrismaMock();
    const service = createPedidoService(prisma);

    await service.gerar({ quantidade: 0 });

    const [{ data }] = prisma.pedido.createMany.mock.calls[0];
    expect(data).toEqual([]);
  });

  test('list com disponivel=true filtra planoId nulo', async () => {
    const prisma = buildPrismaMock();
    const service = createPedidoService(prisma);

    await service.list({ disponivel: true, page: 1, pageSize: 10 });

    const [{ where }] = prisma.pedido.findMany.mock.calls[0];
    expect(where).toEqual({ planoId: null });
  });

  test('list sem disponivel não filtra por planoId', async () => {
    const prisma = buildPrismaMock();
    const service = createPedidoService(prisma);

    await service.list({ page: 1, pageSize: 10 });

    const [{ where }] = prisma.pedido.findMany.mock.calls[0];
    expect(where).toEqual({});
  });
});
