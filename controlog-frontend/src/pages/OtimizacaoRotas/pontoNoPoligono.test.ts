import { describe, expect, test } from 'vitest';
import { pedidosDentroDoPoligono, pontoDentroDoPoligono } from './pontoNoPoligono';
import type { Pedido } from './types';

const quadrado = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 10 },
  { lat: 10, lng: 10 },
  { lat: 10, lng: 0 },
];

function pedido(id: string, lat: number, lng: number): Pedido {
  return { id, lat, lng, endereco: `Endereço ${id}`, unidades: 1, volumeM3: 0.1 };
}

describe('pontoDentroDoPoligono', () => {
  test('ponto claramente dentro do quadrado', () => {
    expect(pontoDentroDoPoligono({ lat: 5, lng: 5 }, quadrado)).toBe(true);
  });

  test('ponto claramente fora do quadrado', () => {
    expect(pontoDentroDoPoligono({ lat: 20, lng: 20 }, quadrado)).toBe(false);
  });

  test('ponto fora, mas na mesma faixa de latitude', () => {
    expect(pontoDentroDoPoligono({ lat: 5, lng: 15 }, quadrado)).toBe(false);
  });

  test('polígono côncavo (formato de "L") — ponto na reentrância fica fora', () => {
    const formaL = [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 10 },
      { lat: 5, lng: 10 },
      { lat: 5, lng: 5 },
      { lat: 10, lng: 5 },
      { lat: 10, lng: 0 },
    ];
    expect(pontoDentroDoPoligono({ lat: 8, lng: 8 }, formaL)).toBe(false);
    expect(pontoDentroDoPoligono({ lat: 2, lng: 2 }, formaL)).toBe(true);
  });

  test('polígono com menos de 3 pontos nunca contém nada', () => {
    expect(pontoDentroDoPoligono({ lat: 5, lng: 5 }, [])).toBe(false);
    expect(pontoDentroDoPoligono({ lat: 5, lng: 5 }, [{ lat: 0, lng: 0 }])).toBe(false);
    expect(
      pontoDentroDoPoligono({ lat: 5, lng: 5 }, [
        { lat: 0, lng: 0 },
        { lat: 10, lng: 10 },
      ])
    ).toBe(false);
  });
});

describe('pedidosDentroDoPoligono', () => {
  test('filtra só os pedidos que caem dentro do polígono', () => {
    const pedidos = [pedido('p1', 5, 5), pedido('p2', 20, 20), pedido('p3', 1, 1)];

    const resultado = pedidosDentroDoPoligono(pedidos, quadrado);

    expect(resultado.map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  test('retorna lista vazia com polígono incompleto', () => {
    const pedidos = [pedido('p1', 5, 5)];
    expect(pedidosDentroDoPoligono(pedidos, [{ lat: 0, lng: 0 }])).toEqual([]);
  });
});
