import { randomUUID } from 'node:crypto';

import { createPlanoSchema, moverPedidosSchema } from '../src/validators/plano.validators.js';

const LIMITE = 500;

function ids(quantos) {
  return Array.from({ length: quantos }, () => randomUUID());
}

describe('limite de pedidos por requisição', () => {
  // O teto existe por causa do GHSA-mrhx-c7xc-m3w5: o zod pode exaurir memória
  // validando coleção grande com restrição de tamanho. Sem `.max()`, o limite de
  // 1 MB do corpo deixaria passar cerca de 25 mil UUIDs numa única requisição.
  test.each([
    ['createPlanoSchema', createPlanoSchema, (lista) => ({ nome: 'Plano', pedidoIds: lista })],
    ['moverPedidosSchema', moverPedidosSchema, (lista) => ({ pedidoIds: lista, rotaIndex: 1 })],
  ])('%s recusa lista acima de 500', (_nome, schema, montar) => {
    const resultado = schema.safeParse(montar(ids(LIMITE + 1)));

    expect(resultado.success).toBe(false);
    expect(resultado.error.issues.map((i) => i.message)).toContain(
      'No máximo 500 pedidos por requisição.'
    );
  });

  test.each([
    ['createPlanoSchema', createPlanoSchema, (lista) => ({ nome: 'Plano', pedidoIds: lista })],
    ['moverPedidosSchema', moverPedidosSchema, (lista) => ({ pedidoIds: lista, rotaIndex: 1 })],
  ])('%s aceita exatamente 500', (_nome, schema, montar) => {
    expect(schema.safeParse(montar(ids(LIMITE))).success).toBe(true);
  });

  // O teto não pode ter apertado o uso legítimo: a geração de pedidos aceita no
  // máximo 200 por vez, então um plano plausível fica muito abaixo de 500.
  test.each([1, 200])('%i pedidos continuam aceitos', (quantos) => {
    expect(createPlanoSchema.safeParse({ nome: 'Plano', pedidoIds: ids(quantos) }).success).toBe(
      true
    );
  });

  test('lista vazia continua recusada', () => {
    const resultado = createPlanoSchema.safeParse({ nome: 'Plano', pedidoIds: [] });

    expect(resultado.success).toBe(false);
    expect(resultado.error.issues.map((i) => i.message)).toContain(
      'Selecione ao menos um pedido.'
    );
  });
});
