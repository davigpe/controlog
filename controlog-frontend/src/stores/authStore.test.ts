import { beforeEach, describe, expect, test, vi } from 'vitest';
import axios from 'axios';
import { useAuthStore } from './authStore';
// ?raw do Vite: lê o fonte como texto sem precisar dos tipos do Node, que o
// tsconfig.app não inclui (types: vite/client).
import fonteDoAuthStore from './authStore?raw';

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

  test('forgotPassword chama o endpoint de esqueci-senha com o e-mail informado', async () => {
    mockedAxios.post.mockResolvedValue({ data: { message: 'ok' } });

    await useAuthStore.getState().forgotPassword('gestor@controlog.com');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/esqueci-senha'),
      { email: 'gestor@controlog.com' }
    );
  });

  test('resetPassword chama o endpoint de redefinir-senha com token e nova senha', async () => {
    mockedAxios.post.mockResolvedValue({ data: { message: 'ok' } });

    await useAuthStore.getState().resetPassword('token-abc', 'novaSenhaSegura123');

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/redefinir-senha'),
      { token: 'token-abc', novaSenha: 'novaSenhaSegura123' }
    );
  });

  test('resetPassword propaga erro quando o token é inválido', async () => {
    mockedAxios.post.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Token de redefinição inválido ou expirado.' } },
    });

    await expect(useAuthStore.getState().resetPassword('invalido', 'novaSenhaSegura123')).rejects.toBeDefined();
  });
});

// Regressão. O authStore chama axios cru, montando a base à mão, enquanto o
// resto do app usa o cliente de lib/api.ts — e tem de ser assim, porque
// lib/api.ts importa este store para ler o token no interceptor, e importá-lo
// de volta criaria um ciclo. O preço disso foi uma segunda cópia da expressão
// da base, que ficou para trás sem o fallback `|| '/api'` quando lib/api.ts
// ganhou o dele. No build de produção, com VITE_API_URL vazia, as cinco rotas
// de autenticação saíam para /auth/... em vez de /api/auth/... e o nginx
// respondia 405: login, cadastro e recuperação de senha inacessíveis pelo
// site, com todos os testes passando, porque todos mockam a rede.
//
// Comparar as duas bases como elas estão não pegaria nada: em teste a
// VITE_API_URL vem preenchida do .env, e as duas cópias dariam o mesmo valor.
// O que impede a divergência é proibir a segunda cópia de existir. A regra do
// fallback em si está coberta em lib/apiBaseUrl.test.ts.
describe('base da API', () => {
  test('o authStore não resolve a própria base a partir de import.meta.env', () => {
    expect(fonteDoAuthStore).not.toMatch(/import\.meta\.env/);
    expect(fonteDoAuthStore).toMatch(/API_BASE_URL/);
  });

  test('o cliente de lib/api.ts usa a mesma base compartilhada', async () => {
    const [{ api }, { API_BASE_URL }] = await Promise.all([
      import('@/lib/api'),
      import('@/lib/apiBaseUrl'),
    ]);

    expect(api.defaults.baseURL).toBe(API_BASE_URL);
  });

  test.each([
    ['login', () => useAuthStore.getState().login('a@b.com', 'controlog123')],
    ['register', () => useAuthStore.getState().register('A', 'a@b.com', 'controlog123')],
    ['forgotPassword', () => useAuthStore.getState().forgotPassword('a@b.com')],
    ['resetPassword', () => useAuthStore.getState().resetPassword('tok', 'controlog123')],
  ])('%s chama uma URL sob a base compartilhada', async (_nome, acao) => {
    const { API_BASE_URL } = await import('@/lib/apiBaseUrl');
    mockedAxios.post.mockResolvedValue({ data: {} });

    await acao();

    const [url] = mockedAxios.post.mock.calls.at(-1)!;
    expect(String(url).startsWith(`${API_BASE_URL}/auth/`)).toBe(true);
  });
});
