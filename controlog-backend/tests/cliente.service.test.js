import { jest } from '@jest/globals';

import { createClienteService } from '../src/services/cliente.service.js';
import { createPedidoService } from '../src/services/pedido.service.js';
import { createClienteSchema } from '../src/validators/cliente.validators.js';
import { ConflictError, NotFoundError, ValidationError } from '../src/utils/AppError.js';

function clienteFake(over = {}) {
  return {
    id: 'c1', codigo: 'CLI-001', nome: 'Mercado Bom Preço',
    endereco: 'Rua das Palmeiras, 120', bairro: 'Centro', cidade: 'Joinville', uf: 'SC',
    lat: -26.303486, lng: -48.844667, ativo: true, criadoEm: new Date(),
    _count: { pedidos: 0 }, ...over,
  };
}

function buildPrisma() {
  return {
    cliente: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    pedido: { createMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]), count: jest.fn() },
  };
}

describe('validador de cliente', () => {
  const base = {
    codigo: 'cli-009', nome: 'Padaria Pão Quente', endereco: 'Rua Timbó, 500',
    bairro: 'América', lat: -26.29, lng: -48.85,
  };

  // "cli-1" e "CLI-1" não podem virar dois clientes diferentes: o código é o
  // identificador pelo qual um sistema externo encontra o cadastro.
  test('o código é normalizado para maiúsculas', () => {
    expect(createClienteSchema.parse(base).codigo).toBe('CLI-009');
  });

  test('cidade e UF têm padrão', () => {
    const r = createClienteSchema.parse(base);
    expect(r.cidade).toBe('Joinville');
    expect(r.uf).toBe('SC');
  });

  // Aceitar o cadastro sem coordenada só adiaria o erro para a hora de montar
  // o plano, quando já não dá para saber onde o cliente fica.
  test.each(['lat', 'lng'])('recusa cadastro sem %s', (campo) => {
    const { [campo]: _, ...semCoordenada } = base;
    expect(createClienteSchema.safeParse(semCoordenada).success).toBe(false);
  });
});

describe('cliente.service', () => {
  test('cria e devolve as coordenadas como par', async () => {
    const prisma = buildPrisma();
    prisma.cliente.findUnique.mockResolvedValue(null);
    prisma.cliente.create.mockResolvedValue(clienteFake());
    const service = createClienteService(prisma);

    const r = await service.create({ codigo: 'CLI-001', nome: 'x' });
    expect(r.coordenadas).toEqual([-26.303486, -48.844667]);
    expect(r.totalPedidos).toBe(0);
  });

  test('recusa código já usado', async () => {
    const prisma = buildPrisma();
    prisma.cliente.findUnique.mockResolvedValue(clienteFake());
    const service = createClienteService(prisma);

    await expect(service.create({ codigo: 'CLI-001', nome: 'x' })).rejects.toThrow(ConflictError);
    expect(prisma.cliente.create).not.toHaveBeenCalled();
  });

  test('busca pelo código, em maiúsculas', async () => {
    const prisma = buildPrisma();
    prisma.cliente.findUnique.mockResolvedValue(clienteFake());
    const service = createClienteService(prisma);

    await service.getByCodigo('cli-001');
    expect(prisma.cliente.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { codigo: 'CLI-001' } })
    );
  });

  test('código inexistente dá 404 dizendo qual era', async () => {
    const prisma = buildPrisma();
    prisma.cliente.findUnique.mockResolvedValue(null);
    const service = createClienteService(prisma);

    await expect(service.getByCodigo('CLI-999')).rejects.toThrow(/CLI-999/);
  });

  // A chave estrangeira é SET NULL, então remover não apagaria pedidos — mas
  // os deixaria órfãos, identificados só pelo nome gravado, e sem volta.
  test('não exclui cliente com pedidos e sugere inativar', async () => {
    const prisma = buildPrisma();
    prisma.cliente.findUnique.mockResolvedValue(clienteFake({ _count: { pedidos: 7 } }));
    const service = createClienteService(prisma);

    await expect(service.remove('c1')).rejects.toThrow(/inativo/i);
    expect(prisma.cliente.delete).not.toHaveBeenCalled();
  });

  test('exclui cliente sem pedidos', async () => {
    const prisma = buildPrisma();
    prisma.cliente.findUnique.mockResolvedValue(clienteFake());
    const service = createClienteService(prisma);

    await service.remove('c1');
    expect(prisma.cliente.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  test('cliente inexistente dá NotFound', async () => {
    const prisma = buildPrisma();
    prisma.cliente.findUnique.mockResolvedValue(null);
    const service = createClienteService(prisma);
    await expect(service.getById('x')).rejects.toThrow(NotFoundError);
  });
});

describe('pedidos nascem no endereço do cliente', () => {
  const clientes = [
    { id: 'c1', nome: 'Mercado Bom Preço', endereco: 'Rua das Palmeiras, 120', bairro: 'Centro', lat: -26.3034, lng: -48.8446 },
    { id: 'c2', nome: 'Farmácia Vida', endereco: 'Rua XV de Novembro, 455', bairro: 'Centro', lat: -26.3008, lng: -48.8438 },
  ];

  test('copia endereço, bairro e coordenada do cadastro', async () => {
    const prisma = buildPrisma();
    prisma.cliente.findMany.mockResolvedValue(clientes);
    const service = createPedidoService(prisma);

    await service.gerar({ quantidade: 5 });

    const gravados = prisma.pedido.createMany.mock.calls[0][0].data;
    expect(gravados).toHaveLength(5);
    for (const p of gravados) {
      const dono = clientes.find((c) => c.id === p.clienteId);
      expect(dono).toBeDefined();
      // A coordenada é a do cadastro, não um ponto sorteado em volta: é isso
      // que faz pedidos do mesmo cliente coincidirem no mapa.
      expect(p.lat).toBe(dono.lat);
      expect(p.lng).toBe(dono.lng);
      expect(p.endereco).toBe(dono.endereco);
      expect(p.clienteNome).toBe(dono.nome);
    }
  });

  test('só sorteia clientes ativos', async () => {
    const prisma = buildPrisma();
    prisma.cliente.findMany.mockResolvedValue(clientes);
    const service = createPedidoService(prisma);

    await service.gerar({ quantidade: 1 });
    expect(prisma.cliente.findMany).toHaveBeenCalledWith({ where: { ativo: true } });
  });

  // Inventar um endereço reintroduziria o problema que o cadastro resolve: o
  // texto não corresponderia ao ponto no mapa.
  test('sem cliente ativo, recusa em vez de inventar endereço', async () => {
    const prisma = buildPrisma();
    prisma.cliente.findMany.mockResolvedValue([]);
    const service = createPedidoService(prisma);

    await expect(service.gerar({ quantidade: 3 })).rejects.toThrow(ValidationError);
    expect(prisma.pedido.createMany).not.toHaveBeenCalled();
  });

  test('o mesmo cliente pode receber mais de um pedido', async () => {
    const prisma = buildPrisma();
    // Um cliente só: toda a geração cai nele, que é o caso extremo do
    // agrupamento no mapa.
    prisma.cliente.findMany.mockResolvedValue([clientes[0]]);
    const service = createPedidoService(prisma);

    await service.gerar({ quantidade: 4 });

    const gravados = prisma.pedido.createMany.mock.calls[0][0].data;
    const pontos = new Set(gravados.map((p) => `${p.lat},${p.lng}`));
    expect(gravados).toHaveLength(4);
    expect(pontos.size).toBe(1);
  });
});
