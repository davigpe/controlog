import { jest } from '@jest/globals';
import { createVeiculoService } from '../src/services/veiculo.service.js';
import { ConflictError, NotFoundError } from '../src/utils/AppError.js';

function buildPrismaMock() {
  return {
    veiculo: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    rota: { count: jest.fn() },
  };
}

describe('veiculo.service', () => {
  test('create cria veículo com status padrão DISPONIVEL', async () => {
    const prisma = buildPrismaMock();
    prisma.veiculo.create.mockResolvedValue({
      id: 'v1',
      placa: 'ABC-1234',
      modelo: 'Mercedes Sprinter',
      capacidade: '1.500 kg',
      status: 'DISPONIVEL',
      criadoEm: new Date(),
    });

    const service = createVeiculoService(prisma);
    const veiculo = await service.create({
      placa: 'ABC-1234',
      modelo: 'Mercedes Sprinter',
      capacidade: '1.500 kg',
    });

    expect(veiculo.status).toBe('DISPONIVEL');
    expect(veiculo.emRota).toBe(false);
  });

  // RN04 — Não é possível excluir um veículo que possui rotas ativas vinculadas
  test('remove bloqueia exclusão quando há rota ativa vinculada', async () => {
    const prisma = buildPrismaMock();
    prisma.veiculo.findUnique.mockResolvedValue({ id: 'v1' });
    prisma.rota.count.mockResolvedValue(1);

    const service = createVeiculoService(prisma);

    await expect(service.remove('v1')).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.veiculo.delete).not.toHaveBeenCalled();
  });

  test('remove permite exclusão quando não há rota ativa vinculada', async () => {
    const prisma = buildPrismaMock();
    prisma.veiculo.findUnique.mockResolvedValue({ id: 'v1' });
    prisma.rota.count.mockResolvedValue(0);
    prisma.veiculo.delete.mockResolvedValue({ id: 'v1' });

    const service = createVeiculoService(prisma);

    await expect(service.remove('v1')).resolves.toBeUndefined();
  });

  test('remove lança NotFoundError para veículo inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.veiculo.findUnique.mockResolvedValue(null);

    const service = createVeiculoService(prisma);

    await expect(service.remove('inexistente')).rejects.toBeInstanceOf(NotFoundError);
  });

  test('list aplica filtros de busca e status', async () => {
    const prisma = buildPrismaMock();
    prisma.veiculo.findMany.mockResolvedValue([
      { id: 'v1', placa: 'ABC-1234', modelo: 'Sprinter', capacidade: '1.500 kg', status: 'DISPONIVEL', criadoEm: new Date() },
    ]);
    prisma.rota.count.mockResolvedValue(0);

    const service = createVeiculoService(prisma);
    const resultado = await service.list({ busca: 'abc', status: 'DISPONIVEL' });

    expect(resultado).toEqual([expect.objectContaining({ id: 'v1', emRota: false })]);
  });

  test('getById lança NotFoundError quando veículo não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.veiculo.findUnique.mockResolvedValue(null);

    const service = createVeiculoService(prisma);

    await expect(service.getById('inexistente')).rejects.toBeInstanceOf(NotFoundError);
  });

  test('update lança NotFoundError quando veículo não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.veiculo.findUnique.mockResolvedValue(null);

    const service = createVeiculoService(prisma);

    await expect(service.update('inexistente', { modelo: 'Novo' })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  test('update altera dados do veículo existente', async () => {
    const prisma = buildPrismaMock();
    prisma.veiculo.findUnique
      .mockResolvedValueOnce({ id: 'v1' })
      .mockResolvedValueOnce({
        id: 'v1',
        placa: 'ABC-1234',
        modelo: 'Sprinter 2.0',
        capacidade: '1.500 kg',
        status: 'DISPONIVEL',
        criadoEm: new Date(),
      });
    prisma.veiculo.update.mockResolvedValue({ id: 'v1' });
    prisma.rota.count.mockResolvedValue(0);

    const service = createVeiculoService(prisma);
    const veiculo = await service.update('v1', { modelo: 'Sprinter 2.0' });

    expect(veiculo.modelo).toBe('Sprinter 2.0');
  });
});
