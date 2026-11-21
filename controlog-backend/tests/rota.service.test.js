import { jest } from '@jest/globals';
import { createRotaService } from '../src/services/rota.service.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../src/utils/AppError.js';

function buildPrismaMock() {
  const tx = {
    rota: { update: jest.fn() },
    entrega: { updateMany: jest.fn() },
  };

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
    entrega: { count: jest.fn(), updateMany: jest.fn() },
    $transaction: jest.fn(async (fn) => fn(tx)),
    _tx: tx,
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
    prisma._tx.rota.update.mockResolvedValue({
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

  test('reatribuir a rota a outro motorista move as entregas junto', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue({ id: 'r1', codigo: 'RT-010', status: 'ATIVA', motoristaId: 'm1' });
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm2', nome: 'Ana Souza' });
    prisma._tx.rota.update.mockResolvedValue({
      id: 'r1',
      ...dadosRotaValida,
      motoristaId: 'm2',
      criadoEm: new Date(),
      motorista: { id: 'm2', nome: 'Ana Souza' },
      veiculo: { id: 'v1', placa: 'ABC-1234', modelo: 'Sprinter' },
      entregas: [{ status: 'PENDENTE' }, { status: 'ENTREGUE' }],
    });

    const service = createRotaService(prisma);
    const rota = await service.update('r1', { motoristaId: 'm2' }, { perfil: 'GESTOR' });

    expect(prisma._tx.entrega.updateMany).toHaveBeenCalledWith({
      where: { rotaId: 'r1' },
      data: { motoristaId: 'm2' },
    });
    expect(rota.motorista.nome).toBe('Ana Souza');
    expect(rota.totalEntregas).toBe(2);
    expect(rota.entregasPendentes).toBe(1);
  });

  test('update que não troca o motorista não mexe nas entregas', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue({ id: 'r1', codigo: 'RT-010', status: 'ATIVA', motoristaId: 'm1' });
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1', nome: 'Carlos Silva' });
    prisma._tx.rota.update.mockResolvedValue({
      id: 'r1',
      ...dadosRotaValida,
      criadoEm: new Date(),
      motorista: { id: 'm1', nome: 'Carlos Silva' },
      veiculo: { id: 'v1', placa: 'ABC-1234', modelo: 'Sprinter' },
      entregas: [],
    });

    const service = createRotaService(prisma);
    await service.update('r1', { motoristaId: 'm1' }, { perfil: 'GESTOR' });

    expect(prisma._tx.entrega.updateMany).not.toHaveBeenCalled();
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

// Testes de caixa branca: cada um fecha um caminho ou uma combinação de
// condições que a cobertura de branches mostrava como nunca exercitada. O
// grafo, a complexidade ciclomática e a tabela de caminhos de cada função
// estão em docs/TESTES_CAIXA_BRANCA.md; o identificador no nome do teste
// (C1, RN05-B, RN02-...) é o da tabela.
describe('rota.service — caixa branca', () => {
  // Rota existente, sem motorista, veículo nem veículo próprio, para que o
  // update chegue até a transação sem cair em nenhuma outra validação.
  const rotaExistente = (campos = {}) => ({
    id: 'r1',
    codigo: 'RT-010',
    status: 'ATIVA',
    motoristaId: null,
    veiculoId: null,
    veiculoProprio: false,
    ...campos,
  });

  function prismaComUpdateBemSucedido(existente) {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValueOnce(existente);
    prisma._tx.rota.update.mockImplementation(async ({ data }) => ({
      ...dadosRotaValida,
      ...existente,
      ...data,
      criadoEm: new Date(),
      motorista: null,
      veiculo: null,
    }));
    return prisma;
  }

  // rota.remove, caminho C1 (1-2-3): o único dos três que nenhum teste seguia.
  test('remove C1: rota inexistente lança NotFoundError sem contar entregas nem excluir', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue(null);

    const service = createRotaService(prisma);

    await expect(service.remove('inexistente')).rejects.toBeInstanceOf(NotFoundError);
    expect(prisma.entrega.count).not.toHaveBeenCalled();
    expect(prisma.rota.delete).not.toHaveBeenCalled();
  });

  // RN05, decisão `data.codigo && data.codigo !== existente.codigo` com o
  // segundo termo falso: é o que acontece ao salvar o formulário de edição sem
  // mudar o código. Não pode consultar a unicidade, senão a rota colidiria
  // consigo mesma.
  test('update RN05-B: mesmo código da própria rota não consulta unicidade', async () => {
    const prisma = prismaComUpdateBemSucedido(rotaExistente());

    const service = createRotaService(prisma);
    const rota = await service.update('r1', { codigo: 'RT-010' }, { perfil: 'OPERADOR' });

    expect(rota.codigo).toBe('RT-010');
    expect(prisma.rota.findUnique).toHaveBeenCalledTimes(1);
  });

  // RN05, decisão `codigoEmUso` falsa: código novo e livre.
  test('update RN05-C: código novo e livre é aceito', async () => {
    const prisma = prismaComUpdateBemSucedido(rotaExistente());
    prisma.rota.findUnique.mockResolvedValueOnce(null);

    const service = createRotaService(prisma);
    const rota = await service.update('r1', { codigo: 'RT-099' }, { perfil: 'OPERADOR' });

    expect(rota.codigo).toBe('RT-099');
    expect(prisma.rota.findUnique).toHaveBeenLastCalledWith({ where: { codigo: 'RT-099' } });
  });

  // RN02, condição A && B && C com B falso: pedir ATIVA para uma rota que já
  // está ativa não é reativação, então operador pode.
  test('update RN02-B: status ATIVA em rota já ativa é permitido para operador', async () => {
    const prisma = prismaComUpdateBemSucedido(rotaExistente({ status: 'ATIVA' }));

    const service = createRotaService(prisma);
    const rota = await service.update('r1', { status: 'ATIVA' }, { perfil: 'OPERADOR' });

    expect(rota.status).toBe('ATIVA');
  });

  // RN02 com A falso: operador pode editar outros campos de uma rota
  // concluída; o bloqueio é só sobre reativá-la.
  test('update RN02-A: operador edita rota concluída sem reativá-la', async () => {
    const prisma = prismaComUpdateBemSucedido(rotaExistente({ status: 'CONCLUIDA' }));

    const service = createRotaService(prisma);
    const rota = await service.update('r1', { origem: 'Blumenau, SC' }, { perfil: 'OPERADOR' });

    expect(rota.status).toBe('CONCLUIDA');
    expect(rota.origem).toBe('Blumenau, SC');
  });

  // RN02, B verdadeiro pelo outro valor do conjunto: CANCELADA, além de
  // CONCLUIDA (já coberto acima).
  test('update RN02-B2: operador não reativa rota cancelada', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue(rotaExistente({ status: 'CANCELADA' }));

    const service = createRotaService(prisma);

    await expect(
      service.update('r1', { status: 'ATIVA' }, { perfil: 'OPERADOR' })
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // RN02, C pelo encadeamento opcional `actor?.perfil`: sem usuário, o padrão
  // tem que ser bloquear, não liberar.
  test('update RN02-C2: sem ator informado, reativação é bloqueada', async () => {
    const prisma = buildPrismaMock();
    prisma.rota.findUnique.mockResolvedValue(rotaExistente({ status: 'CONCLUIDA' }));

    const service = createRotaService(prisma);

    await expect(service.update('r1', { status: 'ATIVA' })).rejects.toBeInstanceOf(ForbiddenError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
