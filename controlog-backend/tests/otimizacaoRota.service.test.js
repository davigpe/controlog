import { otimizacaoRotaService } from '../src/services/otimizacaoRota.service.js';

const origem = { lat: -26.3045, lng: -48.8487 };

describe('otimizacaoRota.service', () => {
  test('retorna a ordem otimizada como permutação dos pedidos recebidos, com posição sequencial', () => {
    const pedidos = [
      { id: 'p1', lat: -26.31, lng: -48.84 },
      { id: 'p2', lat: -26.29, lng: -48.86 },
      { id: 'p3', lat: -26.32, lng: -48.9 },
      { id: 'p4', lat: -26.28, lng: -48.83 },
    ];

    const resultado = otimizacaoRotaService.otimizar({ origem, pedidos });

    expect(resultado.ordem).toHaveLength(pedidos.length);
    expect(new Set(resultado.ordem.map((p) => p.id))).toEqual(new Set(pedidos.map((p) => p.id)));
    expect(resultado.ordem.map((p) => p.posicao)).toEqual([1, 2, 3, 4]);
  });

  test('a distância otimizada nunca é maior que a distância original', () => {
    const pedidos = [
      { id: 'p1', lat: -26.31, lng: -48.84 },
      { id: 'p2', lat: -26.29, lng: -48.86 },
      { id: 'p3', lat: -26.32, lng: -48.9 },
      { id: 'p4', lat: -26.28, lng: -48.83 },
      { id: 'p5', lat: -26.35, lng: -48.88 },
    ];

    const resultado = otimizacaoRotaService.otimizar({ origem, pedidos });

    expect(resultado.distanciaOtimizadaKm).toBeLessThanOrEqual(resultado.distanciaOriginalKm + 1e-9);
    expect(resultado.economiaPercentual).toBeGreaterThanOrEqual(0);
  });

  test('economiaPercentual é 0 quando há apenas um pedido (evita divisão por zero)', () => {
    const pedidos = [{ id: 'p1', lat: -26.31, lng: -48.84 }];

    const resultado = otimizacaoRotaService.otimizar({ origem, pedidos });

    expect(resultado.distanciaOtimizadaKm).toBe(resultado.distanciaOriginalKm);
    expect(resultado.economiaPercentual).toBe(0);
  });

  test('economiaPercentual é 0 quando não há pedidos (distância original zero)', () => {
    const resultado = otimizacaoRotaService.otimizar({ origem, pedidos: [] });

    expect(resultado.ordem).toEqual([]);
    expect(resultado.distanciaOriginalKm).toBe(0);
    expect(resultado.economiaPercentual).toBe(0);
  });
});
