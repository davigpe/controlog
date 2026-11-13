import { describe, expect, test } from 'vitest';
import { calcularDestino, LADO_MAXIMO, podeReduzir } from './reduzirImagem';

describe('calcularDestino', () => {
  test('não aumenta uma imagem que já é menor que o limite', () => {
    expect(calcularDestino(800, 600)).toEqual({ largura: 800, altura: 600 });
  });

  test('reduz pelo lado maior, preservando a proporção', () => {
    const r = calcularDestino(4000, 3000);
    expect(r.largura).toBe(LADO_MAXIMO);
    expect(r.altura).toBe(1200); // 3000 * (1600/4000)
  });

  test('funciona com a foto em pé, que é como o motorista segura o celular', () => {
    const r = calcularDestino(3000, 4000);
    expect(r.altura).toBe(LADO_MAXIMO);
    expect(r.largura).toBe(1200);
  });

  // Com Math.floor, uma imagem muito alongada chegaria a zero numa das
  // dimensões e o canvas lançaria ao desenhar.
  test('nunca devolve dimensão zero numa imagem muito alongada', () => {
    const r = calcularDestino(20000, 3);
    expect(r.largura).toBe(LADO_MAXIMO);
    expect(r.altura).toBeGreaterThanOrEqual(1);
  });
});

describe('podeReduzir', () => {
  test.each([
    ['image/jpeg', true],
    ['image/png', true],
    ['image/webp', true],
    // O canvas não decodifica estes, então são enviados como vieram e o
    // limite do servidor é quem protege.
    ['application/pdf', false],
    ['image/heic', false],
  ])('%s -> %s', (tipo, esperado) => {
    const arquivo = new File([new Uint8Array([1, 2, 3])], 'x', { type: tipo });
    expect(podeReduzir(arquivo)).toBe(esperado);
  });
});
