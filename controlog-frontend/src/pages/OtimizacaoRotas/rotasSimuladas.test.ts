import { describe, expect, test } from 'vitest';
import {
  atribuirPedidos,
  criarRota,
  desatribuirPedidos,
  excluirRota,
  pedidosNaoAtribuidos,
  proximaCor,
  renomearRota,
  rotasAfetadas,
  type RotaSimulada,
} from './rotasSimuladas';
import type { Pedido } from './types';

function pedido(id: string): Pedido {
  return { id, lat: 0, lng: 0, endereco: `Endereço ${id}`, unidades: 1, volumeM3: 0.1 };
}

describe('criarRota', () => {
  test('cria uma rota nova com os pedidos informados, em rascunho', () => {
    const rotas = criarRota([], ['p1', 'p2']);

    expect(rotas).toHaveLength(1);
    expect(rotas[0].pedidoIds).toEqual(['p1', 'p2']);
    expect(rotas[0].status).toBe('rascunho');
    expect(rotas[0].resultado).toBeNull();
    expect(rotas[0].nome).toBeTruthy();
    expect(rotas[0].cor).toBeTruthy();
  });

  test('rotas sucessivas recebem cores e nomes distintos (ciclo da paleta)', () => {
    let rotas: RotaSimulada[] = [];
    rotas = criarRota(rotas, ['p1']);
    rotas = criarRota(rotas, ['p2']);

    expect(rotas[0].cor).not.toBe(rotas[1].cor);
    expect(rotas[0].nome).not.toBe(rotas[1].nome);
  });

  test('tira os pedidos de uma rota existente antes de colocar na nova (1 pedido = 1 rota)', () => {
    let rotas: RotaSimulada[] = [];
    rotas = criarRota(rotas, ['p1', 'p2']);
    const rotaAId = rotas[0].id;

    rotas = criarRota(rotas, ['p2', 'p3']);

    const rotaA = rotas.find((r) => r.id === rotaAId)!;
    const rotaB = rotas.find((r) => r.id !== rotaAId)!;
    expect(rotaA.pedidoIds).toEqual(['p1']);
    expect(rotaB.pedidoIds).toEqual(['p2', 'p3']);
  });
});

describe('atribuirPedidos', () => {
  test('adiciona pedidos não atribuídos à rota destino', () => {
    let rotas = criarRota([], ['p1']);
    const rotaId = rotas[0].id;

    rotas = atribuirPedidos(rotas, rotaId, ['p2', 'p3']);

    expect(rotas[0].pedidoIds).toEqual(['p1', 'p2', 'p3']);
    expect(rotas[0].status).toBe('rascunho');
  });

  test('move pedidos de uma rota pra outra, sem duplicar', () => {
    let rotas: RotaSimulada[] = [];
    rotas = criarRota(rotas, ['p1', 'p2']);
    rotas = criarRota(rotas, ['p3']);
    const [rotaAId, rotaBId] = rotas.map((r) => r.id);

    rotas = atribuirPedidos(rotas, rotaBId, ['p2']);

    const rotaA = rotas.find((r) => r.id === rotaAId)!;
    const rotaB = rotas.find((r) => r.id === rotaBId)!;
    expect(rotaA.pedidoIds).toEqual(['p1']);
    expect(rotaB.pedidoIds).toEqual(['p3', 'p2']);
  });
});

describe('desatribuirPedidos', () => {
  test('sem rotaIdAlvo, remove o pedido de qualquer rota a que pertença', () => {
    let rotas: RotaSimulada[] = [];
    rotas = criarRota(rotas, ['p1', 'p2']);
    rotas = criarRota(rotas, ['p3']);

    rotas = desatribuirPedidos(rotas, ['p2']);

    expect(rotas.flatMap((r) => r.pedidoIds)).toEqual(['p1', 'p3']);
  });

  test('com rotaIdAlvo, só remove se o pedido pertencer àquela rota específica', () => {
    let rotas: RotaSimulada[] = [];
    rotas = criarRota(rotas, ['p1', 'p2']);
    rotas = criarRota(rotas, ['p3']);
    const [rotaAId, rotaBId] = rotas.map((r) => r.id);

    // p3 não pertence à rota A — desatribuir mirando a rota A não deve afetar nada.
    rotas = desatribuirPedidos(rotas, ['p2', 'p3'], rotaAId);

    const rotaA = rotas.find((r) => r.id === rotaAId)!;
    const rotaB = rotas.find((r) => r.id === rotaBId)!;
    expect(rotaA.pedidoIds).toEqual(['p1']);
    expect(rotaB.pedidoIds).toEqual(['p3']);
  });
});

describe('excluirRota', () => {
  test('remove a rota; os pedidos voltam a aparecer como não atribuídos', () => {
    let rotas = criarRota([], ['p1', 'p2']);
    const rotaId = rotas[0].id;
    const pedidos = [pedido('p1'), pedido('p2')];

    rotas = excluirRota(rotas, rotaId);

    expect(rotas).toEqual([]);
    expect(pedidosNaoAtribuidos(pedidos, rotas).map((p) => p.id)).toEqual(['p1', 'p2']);
  });
});

describe('renomearRota', () => {
  test('troca só o nome da rota informada', () => {
    let rotas: RotaSimulada[] = [];
    rotas = criarRota(rotas, ['p1']);
    rotas = criarRota(rotas, ['p2']);
    const rotaId = rotas[0].id;

    rotas = renomearRota(rotas, rotaId, 'Zona Norte');

    expect(rotas[0].nome).toBe('Zona Norte');
    expect(rotas[1].nome).not.toBe('Zona Norte');
  });
});

describe('pedidosNaoAtribuidos', () => {
  test('retorna só os pedidos que não estão em nenhuma rota', () => {
    const pedidos = [pedido('p1'), pedido('p2'), pedido('p3')];
    const rotas = criarRota([], ['p2']);

    expect(pedidosNaoAtribuidos(pedidos, rotas).map((p) => p.id)).toEqual(['p1', 'p3']);
  });
});

describe('proximaCor', () => {
  test('cicla a paleta depois de esgotada', () => {
    let rotas: RotaSimulada[] = [];
    const cores: string[] = [];
    for (let i = 0; i < 11; i++) {
      cores.push(proximaCor(rotas));
      rotas = criarRota(rotas, [`p${i}`]);
    }
    expect(cores[10]).toBe(cores[0]);
  });
});

describe('rotasAfetadas', () => {
  test('rota vazia (sem transição) não aparece como afetada', () => {
    const rotas = criarRota([], ['p1']);
    expect(rotasAfetadas(rotas, rotas)).toEqual([]);
  });

  test('uma reatribuição entre rotas marca as duas como afetadas', () => {
    let antes: RotaSimulada[] = [];
    antes = criarRota(antes, ['p1', 'p2']);
    antes = criarRota(antes, ['p3']);
    const [rotaAId, rotaBId] = antes.map((r) => r.id);

    const depois = atribuirPedidos(antes, rotaBId, ['p2']);

    expect(new Set(rotasAfetadas(antes, depois))).toEqual(new Set([rotaAId, rotaBId]));
  });

  test('criar uma rota nova conta como rota afetada', () => {
    const antes: RotaSimulada[] = [];
    const depois = criarRota(antes, ['p1']);

    expect(rotasAfetadas(antes, depois)).toEqual([depois[0].id]);
  });

  test('rota que ficou vazia depois de desatribuir também é reportada como afetada', () => {
    const antes = criarRota([], ['p1']);
    const depois = desatribuirPedidos(antes, ['p1']);

    expect(rotasAfetadas(antes, depois)).toEqual([antes[0].id]);
  });
});
