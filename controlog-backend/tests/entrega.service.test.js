import { jest } from '@jest/globals';
import { createEntregaService } from '../src/services/entrega.service.js';
import { ConflictError, NotFoundError, ValidationError } from '../src/utils/AppError.js';

function buildPrismaMock() {
  return {
    entrega: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    rota: { findUnique: jest.fn() },
    motorista: { findUnique: jest.fn() },
  };
}

const dadosEntregaValida = {
  codigo: 'EN-010',
  rotaId: 'r1',
  motoristaId: 'm1',
  destino: 'Florianópolis, SC',
  dataPrevista: new Date(),
};

describe('entrega.service', () => {
  // RN07 — Toda entrega deve estar obrigatoriamente vinculada a uma rota e a um motorista
  test('create rejeita quando rota informada não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue(null);
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1' });

    const service = createEntregaService(prisma);

    await expect(service.create(dadosEntregaValida)).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.entrega.create).not.toHaveBeenCalled();
  });

  test('create rejeita quando motorista informado não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue({ id: 'r1' });
    prisma.motorista.findUnique.mockResolvedValue(null);

    const service = createEntregaService(prisma);

    await expect(service.create(dadosEntregaValida)).rejects.toBeInstanceOf(ValidationError);
  });

  test('create rejeita código de entrega duplicado', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue({ id: 'r1' });
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.entrega.findUnique.mockResolvedValue({ id: 'existente', codigo: 'EN-010' });

    const service = createEntregaService(prisma);

    await expect(service.create(dadosEntregaValida)).rejects.toBeInstanceOf(ConflictError);
  });

  test('create cria entrega com status padrão PENDENTE', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue({ id: 'r1' });
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.entrega.findUnique.mockResolvedValue(null);
    prisma.entrega.create.mockResolvedValue({
      id: 'e1',
      ...dadosEntregaValida,
      status: 'PENDENTE',
      dataEfetiva: null,
      criadoEm: new Date(),
      rota: { id: 'r1', codigo: 'RT-010' },
      motorista: { id: 'm1', nome: 'Carlos Silva' },
    });

    const service = createEntregaService(prisma);
    const entrega = await service.create(dadosEntregaValida);

    expect(entrega.status).toBe('PENDENTE');
    expect(entrega.rota.codigo).toBe('RT-010');
  });

  test('list aplica filtros de busca, status e rota', async () => {
    const prisma = buildPrismaMock();
    prisma.entrega.findMany.mockResolvedValue([
      {
        id: 'e1',
        ...dadosEntregaValida,
        status: 'PENDENTE',
        dataEfetiva: null,
        criadoEm: new Date(),
        rota: { id: 'r1', codigo: 'RT-010' },
        motorista: { id: 'm1', nome: 'Carlos Silva' },
      },
    ]);

    const service = createEntregaService(prisma);
    const resultado = await service.list({ busca: 'floripa', status: 'PENDENTE', rotaId: 'r1' });

    expect(resultado).toHaveLength(1);
  });

  test('getById lança NotFoundError quando entrega não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.entrega.findUnique.mockResolvedValue(null);

    const service = createEntregaService(prisma);

    await expect(service.getById('inexistente')).rejects.toBeInstanceOf(NotFoundError);
  });

  test('update rejeita novo código já usado por outra entrega', async () => {
    const prisma = buildPrismaMock();
    prisma.entrega.findUnique
      .mockResolvedValueOnce({ id: 'e1', codigo: 'EN-010' })
      .mockResolvedValueOnce({ id: 'e2', codigo: 'EN-020' });

    const service = createEntregaService(prisma);

    await expect(service.update('e1', { codigo: 'EN-020' })).rejects.toBeInstanceOf(ConflictError);
  });

  test('update rejeita rotaId inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', codigo: 'EN-010' });
    prisma.rota.findUnique.mockResolvedValue(null);

    const service = createEntregaService(prisma);

    await expect(service.update('e1', { rotaId: 'r-inexistente' })).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  test('update rejeita motoristaId inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', codigo: 'EN-010' });
    prisma.motorista.findUnique.mockResolvedValue(null);

    const service = createEntregaService(prisma);

    await expect(service.update('e1', { motoristaId: 'm-inexistente' })).rejects.toBeInstanceOf(
      ValidationError
    );
  });

  test('remove exclui entrega existente', async () => {
    const prisma = buildPrismaMock();
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1' });
    prisma.entrega.delete.mockResolvedValue({ id: 'e1' });

    const service = createEntregaService(prisma);

    await expect(service.remove('e1')).resolves.toBeUndefined();
  });

  test('remove lança NotFoundError para entrega inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.entrega.findUnique.mockResolvedValue(null);

    const service = createEntregaService(prisma);

    await expect(service.remove('inexistente')).rejects.toBeInstanceOf(NotFoundError);
  });
});
