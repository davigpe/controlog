import { booleanoDeQuery } from '../src/validators/comum.validators.js';
import { listMotoristasQuerySchema } from '../src/validators/motorista.validators.js';
import { listVeiculosQuerySchema } from '../src/validators/veiculo.validators.js';
import { listPedidosQuerySchema } from '../src/validators/pedido.validators.js';

describe('booleanoDeQuery', () => {
  // O caso que zerou o card "Motoristas Ativos": com z.coerce.boolean(), a
  // string 'false' virava true, porque Boolean('false') é true.
  test("a string 'false' vira false, e não true", () => {
    expect(booleanoDeQuery.parse('false')).toBe(false);
  });

  test.each([
    ['true', true],
    ['false', false],
    ['1', true],
    ['0', false],
    [true, true],
    [false, false],
  ])('%p vira %p', (entrada, esperado) => {
    expect(booleanoDeQuery.parse(entrada)).toBe(esperado);
  });

  // Recusar em vez de devolver false: um valor que ninguém reconhece,
  // virando "false" em silêncio, é a mesma classe de bug que este helper
  // conserta — só que sem nada na tela para denunciá-lo.
  test.each(['flase', 'sim', '', 'null', 'undefined', '2'])(
    'recusa %p em vez de adivinhar',
    (entrada) => {
      expect(booleanoDeQuery.safeParse(entrada).success).toBe(false);
    }
  );
});

describe('schemas de listagem que filtram por booleano', () => {
  // Guarda contra a regressão voltar por outro caminho: o que importa não é o
  // helper isolado, e sim o que cada schema realmente entrega ao service.
  test('motoristas: emRota=false chega ao service como false', () => {
    const r = listMotoristasQuerySchema.parse({ status: 'ATIVO', emRota: 'false' });
    expect(r.emRota).toBe(false);
    expect(r.status).toBe('ATIVO');
  });

  test('motoristas: emRota=true chega como true', () => {
    expect(listMotoristasQuerySchema.parse({ emRota: 'true' }).emRota).toBe(true);
  });

  test('motoristas: sem emRota, o filtro não existe', () => {
    expect(listMotoristasQuerySchema.parse({}).emRota).toBeUndefined();
  });

  test('veiculos: emRota=false chega ao service como false', () => {
    expect(listVeiculosQuerySchema.parse({ emRota: 'false' }).emRota).toBe(false);
  });

  test('pedidos: disponivel=false chega ao service como false', () => {
    expect(listPedidosQuerySchema.parse({ disponivel: 'false' }).disponivel).toBe(false);
  });
});
