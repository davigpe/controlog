import { parseTrustProxy } from '../src/config/env.js';

describe('parseTrustProxy', () => {
  test('sem valor: confia em 1 proxy em produção (Railway)', () => {
    expect(parseTrustProxy(undefined, 'production')).toBe(1);
    expect(parseTrustProxy('', 'production')).toBe(1);
  });

  test('sem valor: não confia em proxy em dev/test (evita IP forjado via X-Forwarded-For)', () => {
    expect(parseTrustProxy(undefined, 'development')).toBe(false);
    expect(parseTrustProxy(undefined, 'test')).toBe(false);
    expect(parseTrustProxy('', 'development')).toBe(false);
  });

  test('número em texto vira número de proxies', () => {
    expect(parseTrustProxy('1', 'development')).toBe(1);
    expect(parseTrustProxy('2', 'production')).toBe(2);
    expect(parseTrustProxy('0', 'production')).toBe(0);
  });

  test('"false" desliga mesmo em produção', () => {
    expect(parseTrustProxy('false', 'production')).toBe(false);
  });

  test('outros valores (ex.: sub-rede) são repassados ao Express', () => {
    expect(parseTrustProxy('loopback', 'production')).toBe('loopback');
    expect(parseTrustProxy('10.0.0.0/8', 'production')).toBe('10.0.0.0/8');
  });
});
