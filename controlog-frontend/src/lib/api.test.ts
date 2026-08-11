import { beforeEach, describe, expect, test } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { api, getErrorMessage } from './api';
import { useAuthStore } from '@/stores/authStore';

function buildAxiosError(status: number, message?: string) {
  return new AxiosError(
    'Request failed',
    String(status),
    { headers: new AxiosHeaders() },
    {},
    {
      status,
      statusText: 'Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: message ? { message } : {},
    }
  );
}

describe('getErrorMessage', () => {
  test('extrai a mensagem retornada pela API em um AxiosError', () => {
    const error = buildAxiosError(409, 'Não é possível excluir um motorista com rotas ativas vinculadas (RN03).');

    expect(getErrorMessage(error)).toBe(
      'Não é possível excluir um motorista com rotas ativas vinculadas (RN03).'
    );
  });

  test('usa a mensagem de fallback quando a API não retorna "message"', () => {
    const error = buildAxiosError(500);

    expect(getErrorMessage(error, 'Falha ao salvar.')).toBe('Falha ao salvar.');
  });

  test('usa o fallback padrão para erros que não são do Axios', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('Ocorreu um erro inesperado.');
  });

  test('usa o fallback padrão para valores não relacionados a erro', () => {
    expect(getErrorMessage('qualquer coisa')).toBe('Ocorreu um erro inesperado.');
  });
});

describe('interceptor de requisição', () => {
  beforeEach(() => {
    useAuthStore.setState({ usuario: null, accessToken: null, refreshToken: null });
  });

  function runRequestInterceptor(config: { headers: AxiosHeaders }) {
    const handler = (api.interceptors.request as unknown as {
      handlers: { fulfilled: (c: typeof config) => typeof config }[];
    }).handlers[0];
    return handler.fulfilled(config);
  }

  test('anexa o header Authorization quando há accessToken', () => {
    useAuthStore.setState({ accessToken: 'meu-token' });

    const result = runRequestInterceptor({ headers: new AxiosHeaders() });

    expect(result.headers.Authorization).toBe('Bearer meu-token');
  });

  test('não anexa Authorization quando não há accessToken', () => {
    const result = runRequestInterceptor({ headers: new AxiosHeaders() });

    expect(result.headers.Authorization).toBeUndefined();
  });
});

describe('interceptor de resposta (RN01 / refresh de token)', () => {
  beforeEach(() => {
    useAuthStore.setState({ usuario: null, accessToken: null, refreshToken: null });
  });

  function runResponseErrorInterceptor(error: AxiosError) {
    const handler = (api.interceptors.response as unknown as {
      handlers: { rejected: (e: AxiosError) => Promise<unknown> }[];
    }).handlers[0];
    return handler.rejected(error);
  }

  test('rejeita direto quando o erro não é 401', async () => {
    const error = new AxiosError('erro', undefined, undefined, undefined, {
      status: 500,
      statusText: 'Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {},
    });

    await expect(runResponseErrorInterceptor(error)).rejects.toBe(error);
  });

  test('faz logout e rejeita quando dá 401 e não há refreshToken', async () => {
    const error = new AxiosError('não autorizado', undefined, { headers: new AxiosHeaders() }, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: {},
    });

    await expect(runResponseErrorInterceptor(error)).rejects.toBe(error);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
