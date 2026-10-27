import { jest } from '@jest/globals';
import { createMinhasRotasService } from '../src/services/minhasRotas.service.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../src/utils/AppError.js';

function buildPrismaMock() {
  return {
    motorista: { findUnique: jest.fn() },
    rota: { findMany: jest.fn() },
    entrega: { findUnique: jest.fn(), update: jest.fn() },
  };
}

const motoristaFake = {
  id: 'm1',
  nome: 'Marcos Oliveira',
  cnh: '67890123456',
  telefone: '(47) 99666-6666',
  status: 'ATIVO',
};

function rotaFake(overrides = {}) {
  return {
    id: 'r1',
    codigo: 'RT-001',
    origem: 'Centro de Distribuição',
    destino: 'Centro, Glória',
    status: 'ATIVA',
    dataHora: new Date('2026-10-14T08:00:00Z'),
    latOrigem: -26.3045,
    lngOrigem: -48.8487,
    latDestino: -26.28,
    lngDestino: -48.84,
    veiculo: { id: 'v1', placa: 'ABC-1234', modelo: 'Mercedes Sprinter' },
    entregas: [
      {
        id: 'e1',
        codigo: 'EN-001',
        destino: 'Rua Teste, 1, Centro',
        status: 'PENDENTE',
        dataPrevista: new Date('2026-10-14T08:00:00Z'),
        dataEfetiva: null,
      },
    ],
    ...overrides,
  };
}

describe('minhasRotas.service', () => {
  test('retorna só as rotas do motorista vinculado ao usuário logado', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.rota.findMany.mockResolvedValue([rotaFake()]);

    const service = createMinhasRotasService(prisma);
    const resultado = await service.listar('u1');

    expect(prisma.motorista.findUnique).toHaveBeenCalledWith({ where: { usuarioId: 'u1' } });
    expect(prisma.rota.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ motoristaId: 'm1' }) })
    );
    expect(resultado.motorista.nome).toBe('Marcos Oliveira');
    expect(resultado.rotas).toHaveLength(1);
    expect(resultado.rotas[0].codigo).toBe('RT-001');
    expect(resultado.rotas[0].entregas).toHaveLength(1);
    expect(resultado.rotas[0].coordenadasOrigem).toEqual([-26.3045, -48.8487]);
  });

  test('filtra por status quando informado', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.rota.findMany.mockResolvedValue([]);

    const service = createMinhasRotasService(prisma);
    await service.listar('u1', { status: 'ATIVA' });

    expect(prisma.rota.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ motoristaId: 'm1', status: 'ATIVA' }),
      })
    );
  });

  test('usuário sem motorista vinculado recebe ForbiddenError', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(null);

    const service = createMinhasRotasService(prisma);

    await expect(service.listar('u-sem-vinculo')).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.rota.findMany).not.toHaveBeenCalled();
  });

  test('motorista sem rotas atribuídas retorna lista vazia', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.rota.findMany.mockResolvedValue([]);

    const service = createMinhasRotasService(prisma);
    const resultado = await service.listar('u1');

    expect(resultado.rotas).toEqual([]);
    expect(resultado.motorista.id).toBe('m1');
  });
});

describe('minhasRotas.service — concluirEntrega', () => {
  test('marca a entrega como ENTREGUE e grava a data efetiva', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.entrega.findUnique.mockResolvedValue({
      id: 'e1',
      codigo: 'EN-001',
      status: 'PENDENTE',
      motoristaId: 'm1',
    });
    prisma.entrega.update.mockResolvedValue({
      id: 'e1',
      codigo: 'EN-001',
      destino: 'Rua Teste, 1',
      status: 'ENTREGUE',
      dataPrevista: new Date(),
      dataEfetiva: new Date(),
    });

    const service = createMinhasRotasService(prisma);
    const entrega = await service.concluirEntrega('u1', 'e1');

    expect(prisma.entrega.update).toHaveBeenCalledWith({
      where: { id: 'e1' },
      data: expect.objectContaining({ status: 'ENTREGUE', dataEfetiva: expect.any(Date) }),
    });
    expect(entrega.status).toBe('ENTREGUE');
    expect(entrega.dataEfetiva).not.toBeNull();
  });

  test('conclui entrega que já estava EM_TRANSITO', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'EM_TRANSITO', motoristaId: 'm1' });
    prisma.entrega.update.mockResolvedValue({ id: 'e1', status: 'ENTREGUE', dataEfetiva: new Date() });

    const service = createMinhasRotasService(prisma);
    await service.concluirEntrega('u1', 'e1');

    expect(prisma.entrega.update).toHaveBeenCalled();
  });

  // Sem essa checagem, um motorista concluiria a entrega de outro só trocando
  // o id na requisição — o perfil sozinho não basta.
  test('bloqueia concluir entrega de outro motorista', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e9', status: 'PENDENTE', motoristaId: 'm-outro' });

    const service = createMinhasRotasService(prisma);

    await expect(service.concluirEntrega('u1', 'e9')).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.entrega.update).not.toHaveBeenCalled();
  });

  test('rejeita concluir entrega já concluída', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'ENTREGUE', motoristaId: 'm1' });

    const service = createMinhasRotasService(prisma);

    await expect(service.concluirEntrega('u1', 'e1')).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.entrega.update).not.toHaveBeenCalled();
  });

  test('rejeita concluir entrega cancelada', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'CANCELADA', motoristaId: 'm1' });

    const service = createMinhasRotasService(prisma);

    await expect(service.concluirEntrega('u1', 'e1')).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.entrega.update).not.toHaveBeenCalled();
  });

  test('entrega inexistente lança NotFoundError', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.entrega.findUnique.mockResolvedValue(null);

    const service = createMinhasRotasService(prisma);

    await expect(service.concluirEntrega('u1', 'inexistente')).rejects.toBeInstanceOf(NotFoundError);
  });

  test('usuário sem motorista vinculado não conclui nada', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(null);

    const service = createMinhasRotasService(prisma);

    await expect(service.concluirEntrega('u-sem-vinculo', 'e1')).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.entrega.findUnique).not.toHaveBeenCalled();
  });
});

describe('minhasRotas.service — registrarInsucesso', () => {
  test('grava status NAO_ENTREGUE com motivo, observação e data da tentativa', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'PENDENTE', motoristaId: 'm1' });
    prisma.entrega.update.mockResolvedValue({
      id: 'e1',
      codigo: 'EN-001',
      destino: 'Rua X, 10',
      status: 'NAO_ENTREGUE',
      dataPrevista: new Date('2026-10-27T09:00:00Z'),
      dataEfetiva: new Date('2026-10-27T14:30:00Z'),
      motivoInsucesso: 'CLIENTE_AUSENTE',
      observacao: 'Ninguém atendeu, portaria fechada.',
    });

    const service = createMinhasRotasService(prisma);
    const entrega = await service.registrarInsucesso('u1', 'e1', {
      motivo: 'CLIENTE_AUSENTE',
      observacao: 'Ninguém atendeu, portaria fechada.',
    });

    const [args] = prisma.entrega.update.mock.calls[0];
    expect(args.where).toEqual({ id: 'e1' });
    expect(args.data.status).toBe('NAO_ENTREGUE');
    expect(args.data.motivoInsucesso).toBe('CLIENTE_AUSENTE');
    expect(args.data.observacao).toBe('Ninguém atendeu, portaria fechada.');
    expect(args.data.dataEfetiva).toBeInstanceOf(Date);
    expect(entrega.status).toBe('NAO_ENTREGUE');
    expect(entrega.motivoInsucesso).toBe('CLIENTE_AUSENTE');
  });

  test('sem observação grava null em vez de undefined', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'EM_TRANSITO', motoristaId: 'm1' });
    prisma.entrega.update.mockResolvedValue({ id: 'e1', status: 'NAO_ENTREGUE' });

    const service = createMinhasRotasService(prisma);
    await service.registrarInsucesso('u1', 'e1', { motivo: 'AVARIA' });

    const [args] = prisma.entrega.update.mock.calls[0];
    expect(args.data.observacao).toBeNull();
  });

  // Mesma checagem de dono de concluirEntrega: o id vem da requisição, então
  // sem isso um motorista registraria insucesso na entrega de outro.
  test('rejeita registrar insucesso em entrega de outro motorista', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e9', status: 'PENDENTE', motoristaId: 'm2' });

    const service = createMinhasRotasService(prisma);

    await expect(
      service.registrarInsucesso('u1', 'e9', { motivo: 'AVARIA' })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.entrega.update).not.toHaveBeenCalled();
  });

  test('rejeita insucesso em entrega já concluída', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'ENTREGUE', motoristaId: 'm1' });

    const service = createMinhasRotasService(prisma);

    await expect(
      service.registrarInsucesso('u1', 'e1', { motivo: 'AVARIA' })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.entrega.update).not.toHaveBeenCalled();
  });

  test('rejeita registrar insucesso duas vezes na mesma entrega', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'NAO_ENTREGUE', motoristaId: 'm1' });

    const service = createMinhasRotasService(prisma);

    await expect(
      service.registrarInsucesso('u1', 'e1', { motivo: 'AVARIA' })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  // Uma entrega que falhou ainda pode ser concluída depois: o motorista volta
  // ao endereço no mesmo dia e entrega. Só NAO_ENTREGUE -> ENTREGUE é livre.
  test('entrega com insucesso ainda pode ser concluída numa segunda tentativa', async () => {
    const prisma = buildPrismaMock();
    prisma.motorista.findUnique.mockResolvedValue(motoristaFake);
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'NAO_ENTREGUE', motoristaId: 'm1' });
    prisma.entrega.update.mockResolvedValue({ id: 'e1', status: 'ENTREGUE' });

    const service = createMinhasRotasService(prisma);
    const entrega = await service.concluirEntrega('u1', 'e1');

    expect(entrega.status).toBe('ENTREGUE');
  });
});
