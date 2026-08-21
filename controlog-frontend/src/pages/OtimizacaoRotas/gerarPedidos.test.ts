import { describe, expect, test } from 'vitest';
import { DEPOSITO, gerarPedidos } from './gerarPedidos';

// Gerador determinístico simples (mulberry32) — permite asserções exatas em
// vez de só checar limites, sem precisar de dependência nova.
function criarRngDeterministico(seed: number) {
  let estado = seed;
  return () => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (g: number) => (g * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

describe('gerarPedidos', () => {
  test('gera a quantidade solicitada, com ids únicos e sequenciais', () => {
    const pedidos = gerarPedidos(8, DEPOSITO, { rng: criarRngDeterministico(1) });

    expect(pedidos).toHaveLength(8);
    expect(pedidos.map((p) => p.id)).toEqual([
      'pedido-1',
      'pedido-2',
      'pedido-3',
      'pedido-4',
      'pedido-5',
      'pedido-6',
      'pedido-7',
      'pedido-8',
    ]);
  });

  test('retorna lista vazia para quantidade 0', () => {
    expect(gerarPedidos(0, DEPOSITO)).toEqual([]);
  });

  test('todos os pontos ficam dentro do raio configurado', () => {
    const raioKm = 10;
    const pedidos = gerarPedidos(30, DEPOSITO, { raioKm, rng: criarRngDeterministico(42) });

    for (const pedido of pedidos) {
      expect(distanciaKm(DEPOSITO, pedido)).toBeLessThanOrEqual(raioKm + 0.01);
    }
  });

  test('é determinístico para o mesmo rng (mesma seed)', () => {
    const a = gerarPedidos(5, DEPOSITO, { rng: criarRngDeterministico(7) });
    const b = gerarPedidos(5, DEPOSITO, { rng: criarRngDeterministico(7) });

    expect(a).toEqual(b);
  });

  test('cada pedido tem um endereço não vazio', () => {
    const pedidos = gerarPedidos(5, DEPOSITO, { rng: criarRngDeterministico(3) });
    for (const pedido of pedidos) {
      expect(pedido.endereco.length).toBeGreaterThan(0);
    }
  });
});
