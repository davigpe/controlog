import { describe, expect, test } from 'vitest';
import { API_BASE_URL, resolverBaseUrl } from './apiBaseUrl';

describe('resolverBaseUrl', () => {
  // O caso do build de produção: o Dockerfile do frontend constrói com
  // VITE_API_URL vazia, porque o nginx da frente serve o site e encaminha
  // /api para a API no mesmo host. Sem o fallback, a base virava string
  // vazia e as chamadas saíam para /auth/... — 405 no nginx.
  test.each([
    { valor: '', rotulo: 'vazia' },
    { valor: undefined, rotulo: 'ausente' },
    { valor: '   ', rotulo: 'só espaços' },
  ])('cai para /api quando a variável está $rotulo', ({ valor }) => {
    expect(resolverBaseUrl(valor)).toBe('/api');
  });

  test('respeita a URL absoluta usada em desenvolvimento', () => {
    expect(resolverBaseUrl('http://localhost:3333')).toBe('http://localhost:3333');
  });

  // Concatenar `${base}/auth/login` com uma base terminada em barra geraria
  // //auth/login, que o nginx trata como outro caminho.
  test('remove a barra final para a concatenação não duplicar', () => {
    expect(resolverBaseUrl('https://api.exemplo.com/')).toBe('https://api.exemplo.com');
    expect(resolverBaseUrl('/api/')).toBe('/api');
  });

  test('API_BASE_URL nunca é vazia', () => {
    expect(API_BASE_URL).toBeTruthy();
  });
});
