import { beforeEach, describe, expect, test, vi } from 'vitest';
import axios from 'axios';
import { useAuthStore } from './authStore';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, post: vi.fn() } };
});
const mockedAxios = vi.mocked(axios, true);

const usuarioMock = { id: 'u1', nome: 'Ricardo Menezes', email: 'gestor@controlog.com', perfil: 'GESTOR' as const };

beforeEach(() => {
  useAuthStore.setState({ usuario: null, accessToken: null, refreshToken: null });
  vi.clearAllMocks();
});

describe('authStore', () => {
  test('login armazena usuário e tokens ao suceder', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { usuario: usuarioMock, accessToken: 'access-1', refreshToken: 'refresh-1' },
    });

    await useAuthStore.getState().login('gestor@controlog.com', 'controlog123');

    const state = useAuthStore.getState();
    expect(state.usuario).toEqual(usuarioMock);
    expect(state.accessToken).toBe('access-1');
    expect(state.refreshToken).toBe('refresh-1');
  });

  test('login propaga erro quando a API rejeita', async () => {
    mockedAxios.post.mockRejectedValue({ response: { status: 401 } });

    await expect(useAuthStore.getState().login('gestor@controlog.com', 'senha-errada')).rejects.toBeDefined();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  test('register armazena usuário e tokens ao suceder', async () => {
    mockedAxios.post.mockResolvedValue({
      data: { usuario: usuarioMock, accessToken: 'access-2', refreshToken: 'refresh-2' },
    });

    await useAuthStore.getState().register('Ricardo Menezes', 'gestor@controlog.com', 'controlog123');

    expect(useAuthStore.getState().accessToken).toBe('access-2');
  });

  test('logout limpa usuário e tokens', () => {
    useAuthStore.setState({ usuario: usuarioMock, accessToken: 'a', refreshToken: 'r' });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.usuario).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
  });

  test('refresh troca o access token quando há refresh token válido', async () => {
    useAuthStore.setState({ usuario: usuarioMock, accessToken: 'antigo', refreshToken: 'refresh-1' });
    mockedAxios.post.mockResolvedValue({ data: { accessToken: 'novo-token' } });

    const token = await useAuthStore.getState().refresh();

    expect(token).toBe('novo-token');
    expect(useAuthStore.getState().accessToken).toBe('novo-token');
  });

  test('refresh retorna null e não chama a API quando não há refresh token', async () => {
    useAuthStore.setState({ usuario: null, accessToken: null, refreshToken: null });

    const token = await useAuthStore.getState().refresh();

    expect(token).toBeNull();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test('refresh faz logout quando o refresh token é rejeitado', async () => {
    useAuthStore.setState({ usuario: usuarioMock, accessToken: 'antigo', refreshToken: 'refresh-expirado' });
    mockedAxios.post.mockRejectedValue({ response: { status: 401 } });

    const token = await useAuthStore.getState().refresh();

    expect(token).toBeNull();
    expect(useAuthStore.getState().usuario).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
