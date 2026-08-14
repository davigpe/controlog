import { jest } from '@jest/globals';
import { createRotaService } from '../src/services/rota.service.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../src/utils/AppError.js';

function buildPrismaMock() {
  return {
    rota: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    motorista: { findUnique: jest.fn() },
    veiculo: { findUnique: jest.fn() },
    entrega: { count: jest.fn() },
  };
}

const dadosRotaValida = {
  codigo: 'RT-010',
  origem: 'Joinville, SC',
  destino: 'Florianópolis, SC',
  motoristaId: 'm1',
  veiculoId: 'v1',
  dataHora: new Date(),
  latOrigem: -26.3045,
  lngOrigem: -48.8487,
  latDestino: -27.5954,
  lngDestino: -48.548,
};

describe('rota.service', () => {
  test('create rejeita quando motorista informado não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(null);
    prisma.veiculo.findUnique.mockResolvedValue({ id: 'v1' });

    const service = createRotaService(prisma);

    await expect(service.create(dadosRotaValida)).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.rota.create).not.toHaveBeenCalled();
  });

  test('create rejeita quando veículo informado não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.veiculo.findUnique.mockResolvedValue(null);

    const service = createRotaService(prisma);

    await expect(service.create(dadosRotaValida)).rejects.toBeInstanceOf(ValidationError);
  });

  // RN05 — O código da rota deve ser único no sistema
  test('create rejeita código de rota duplicado', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.veiculo.findUnique.mockResolvedValue({ id: 'v1' });
    prisma.rota.findUnique.mockResolvedValue({ id: 'existente', codigo: 'RT-010' });

    const service = createRotaService(prisma);

    await expect(service.create(dadosRotaValida)).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.rota.create).not.toHaveBeenCalled();
  });

  test('create cria rota quando motorista, veículo e código são válidos', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.veiculo.findUnique.mockResolvedValue({ id: 'v1' });
    prisma.rota.findUnique.mockResolvedValue(null);
    prisma.rota.create.mockResolvedValue({
      id: 'r1',
      ...dadosRotaValida,
      status: 'ATIVA',
      criadoEm: new Date(),
      motorista: { id: 'm1', nome: 'Carlos Silva' },
      veiculo: { id: 'v1', placa: 'ABC-1234', modelo: 'Sprinter' },
    });

    const service = createRotaService(prisma);
    const rota = await service.create(dadosRotaValida);

    expect(rota.codigo).toBe('RT-010');
    expect(rota.coordenadasOrigem).toEqual([-26.3045, -48.8487]);
  });

  // RN02 — Rota Concluída/Cancelada não pode ser reativada sem permissão de gestor
  test('update bloqueia reativação de rota concluída por usuário sem perfil GESTOR', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue({ id: 'r1', codigo: 'RT-010', status: 'CONCLUIDA' });

    const service = createRotaService(prisma);

    await expect(
      service.update('r1', { status: 'ATIVA' }, { perfil: 'OPERADOR' })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.rota.update).not.toHaveBeenCalled();
  });

  test('update permite reativação de rota concluída quando ator é GESTOR', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue({ id: 'r1', codigo: 'RT-010', status: 'CONCLUIDA' });
    prisma.rota.update.mockResolvedValue({
      id: 'r1',
      ...dadosRotaValida,
      status: 'ATIVA',
      criadoEm: new Date(),
      motorista: { id: 'm1', nome: 'Carlos Silva' },
      veiculo: { id: 'v1', placa: 'ABC-1234', modelo: 'Sprinter' },
    });

    const service = createRotaService(prisma);
    const rota = await service.update('r1', { status: 'ATIVA' }, { perfil: 'GESTOR' });

    expect(rota.status).toBe('ATIVA');
  });

  test('update de rota inexistente lança NotFoundError', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue(null);

    const service = createRotaService(prisma);

    await expect(service.update('inexistente', { status: 'ATIVA' }, { perfil: 'GESTOR' })).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  // RN08 — Não é possível excluir uma rota que possua entregas pendentes vinculadas
  test('remove bloqueia exclusão quando há entregas pendentes vinculadas', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue({ id: 'r1' });
    prisma.entrega.count.mockResolvedValue(1);

    const service = createRotaService(prisma);

    await expect(service.remove('r1')).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.rota.delete).not.toHaveBeenCalled();
  });

  test('remove permite exclusão quando não há entregas pendentes', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue({ id: 'r1' });
    prisma.entrega.count.mockResolvedValue(0);
    prisma.rota.delete.mockResolvedValue({ id: 'r1' });

    const service = createRotaService(prisma);

    await expect(service.remove('r1')).resolves.toBeUndefined();
  });

  test('list aplica filtro de busca por código, cidade, motorista e veículo', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findMany.mockResolvedValue([
      {
        id: 'r1',
        ...dadosRotaValida,
        status: 'ATIVA',
        criadoEm: new Date(),
        motorista: { id: 'm1', nome: 'Carlos Silva' },
        veiculo: { id: 'v1', placa: 'ABC-1234', modelo: 'Sprinter' },
      },
    ]);
    prisma.rota.count.mockResolvedValue(1);

    const service = createRotaService(prisma);
    const resultado = await service.list({ busca: 'joinville', status: 'ATIVA' });

    expect(resultado.items).toHaveLength(1);
    expect(resultado.items[0].motorista.nome).toBe('Carlos Silva');
    expect(resultado.pagination).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
  });

  test('getById lança NotFoundError quando rota não existe', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue(null);

    const service = createRotaService(prisma);

    await expect(service.getById('inexistente')).rejects.toBeInstanceOf(NotFoundError);
  });

  test('update rejeita novo código já usado por outra rota', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique
      .mockResolvedValueOnce({ id: 'r1', codigo: 'RT-010', status: 'ATIVA' })
      .mockResolvedValueOnce({ id: 'r2', codigo: 'RT-020' });

    const service = createRotaService(prisma);

    await expect(
      service.update('r1', { codigo: 'RT-020' }, { perfil: 'GESTOR' })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  test('update rejeita motoristaId inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue({ id: 'r1', codigo: 'RT-010', status: 'ATIVA' });
    prisma.motorista.findUnique.mockResolvedValue(null);

    const service = createRotaService(prisma);

    await expect(
      service.update('r1', { motoristaId: 'm-inexistente' }, { perfil: 'GESTOR' })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  test('update rejeita veiculoId inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue({ id: 'r1', codigo: 'RT-010', status: 'ATIVA' });
    prisma.veiculo.findUnique.mockResolvedValue(null);

    const service = createRotaService(prisma);

    await expect(
      service.update('r1', { veiculoId: 'v-inexistente' }, { perfil: 'GESTOR' })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
