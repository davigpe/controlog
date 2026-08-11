import { jest } from '@jest/globals';
import { createMotoristaService } from '../src/services/motorista.service.js';
import { ConflictError, NotFoundError } from '../src/utils/AppError.js';

function buildPrismaMock() {
  return {
    motorista: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    rota: { count: jest.fn() },
    entrega: { count: jest.fn() },
  };
}

describe('motorista.service', () => {
  test('create cria motorista com status padrão ATIVO', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.create.mockResolvedValue({
      id: 'm1',
      nome: 'Carlos Silva',
      cnh: '12345678901',
      telefone: '(47) 99111-1111',
      status: 'ATIVO',
      criadoEm: new Date(),
    });

    const service = createMotoristaService(prisma);
    const motorista = await service.create({
      nome: 'Carlos Silva',
      cnh: '12345678901',
      telefone: '(47) 99111-1111',
    });

    expect(motorista.status).toBe('ATIVO');
    expect(motorista.emRota).toBe(false);
  });

  // RN03 — Não é possível excluir um motorista que possui rotas ativas vinculadas
  test('remove bloqueia exclusão quando há rota ativa vinculada', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.rota.count.mockResolvedValue(1);

    const service = createMotoristaService(prisma);

    await expect(service.remove('m1')).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.motorista.delete).not.toHaveBeenCalled();
  });

  test('remove permite exclusão quando não há rota ativa vinculada', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.rota.count.mockResolvedValue(0);
    prisma.motorista.delete.mockResolvedValue({ id: 'm1' });

    const service = createMotoristaService(prisma);

    await expect(service.remove('m1')).resolves.toBeUndefined();
    expect(prisma.motorista.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  test('remove lança NotFoundError para motorista inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(null);

    const service = createMotoristaService(prisma);

    await expect(service.remove('inexistente')).rejects.toBeInstanceOf(NotFoundError);
  });

  test('list aplica filtros de busca e status e calcula emRota por motorista', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findMany.mockResolvedValue([
      { id: 'm1', nome: 'Carlos Silva', cnh: '1', telefone: '1', status: 'ATIVO', criadoEm: new Date() },
    ]);
    prisma.rota.count.mockResolvedValue(1);
    prisma.entrega.count.mockResolvedValue(3);

    const service = createMotoristaService(prisma);
    const resultado = await service.list({ busca: 'carlos', status: 'ATIVO' });

    expect(prisma.motorista.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'ATIVO' }) })
    );
    expect(resultado).toEqual([
      expect.objectContaining({ id: 'm1', emRota: true, entregasRealizadas: 3 }),
    ]);
  });

  test('getById lança NotFoundError quando motorista não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(null);

    const service = createMotoristaService(prisma);

    await expect(service.getById('inexistente')).rejects.toBeInstanceOf(NotFoundError);
  });

  test('update lança NotFoundError quando motorista não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(null);

    const service = createMotoristaService(prisma);

    await expect(service.update('inexistente', { nome: 'Novo Nome' })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  test('update altera dados do motorista existente', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique
      .mockResolvedValueOnce({ id: 'm1', nome: 'Carlos Silva' })
      .mockResolvedValueOnce({
        id: 'm1',
        nome: 'Carlos S. Silva',
        cnh: '1',
        telefone: '1',
        status: 'ATIVO',
        criadoEm: new Date(),
      });
    prisma.motorista.update.mockResolvedValue({ id: 'm1' });
    prisma.rota.count.mockResolvedValue(0);
    prisma.entrega.count.mockResolvedValue(0);

    const service = createMotoristaService(prisma);
    const motorista = await service.update('m1', { nome: 'Carlos S. Silva' });

    expect(motorista.nome).toBe('Carlos S. Silva');
  });

  test('getById calcula emRota=true quando existe rota ativa', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue({
      id: 'm1',
      nome: 'Carlos Silva',
      cnh: '12345678901',
      telefone: '(47) 99111-1111',
      status: 'ATIVO',
      criadoEm: new Date(),
    });
    prisma.rota.count.mockResolvedValue(2);
    prisma.entrega.count.mockResolvedValue(5);

    const service = createMotoristaService(prisma);
    const motorista = await service.getById('m1');

    expect(motorista.emRota).toBe(true);
    expect(motorista.entregasRealizadas).toBe(5);
  });
});
