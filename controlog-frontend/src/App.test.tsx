import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/renderWithProviders';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import App from './App';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
vi.mocked(api.get).mockResolvedValue({ data: {} });

beforeEach(() => {
  useAuthStore.setState({ usuario: null, accessToken: null, refreshToken: null });
  window.history.pushState({}, '', '/');
});

describe('App', () => {
  test('redireciona para /login quando não há sessão ativa', async () => {
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <App />
      </QueryClientProvider>
    );

    expect(
      await screen.findByRole('heading', { name: 'Bem-vindo de volta', level: 1 })
    ).toBeInTheDocument();
  });

  test('renderiza a área protegida quando há sessão ativa', async () => {
    useAuthStore.setState({ accessToken: 'token-valido', usuario: { id: 'u1', nome: 'Ricardo', email: 'r@controlog.com', perfil: 'GESTOR' } });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <App />
      </QueryClientProvider>
    );

    expect(await screen.findByText(/^Controlog v\d+\.\d+\.\d+$/)).toBeInTheDocument();
  });
});

describe('App — /ajuda alcança todos os perfis', () => {
  function entrarComo(perfil: 'GESTOR' | 'OPERADOR' | 'MOTORISTA') {
    useAuthStore.setState({
      usuario: { id: 'u1', nome: 'Teste', email: 't@x.com', perfil },
      accessToken: 'token',
      refreshToken: 'refresh',
    });
  }

  function abrir(caminho: string) {
    window.history.pushState({}, '', caminho);
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <App />
      </QueryClientProvider>
    );
  }

  // O bug: /ajuda estava declarada dentro dos DOIS blocos de perfil, e os dois
  // registram path="/". O React Router casava o primeiro — o do motorista — e
  // o RequireAuth dele mandava o gestor de volta para a tela inicial. Com
  // login de motorista funcionava, o que escondia o defeito.
  //
  // A asserção é o caminho continuar em /ajuda: era exatamente ele que mudava.
  test.each(['GESTOR', 'OPERADOR', 'MOTORISTA'] as const)(
    '%s abre a central de ajuda sem ser redirecionado',
    async (perfil) => {
      entrarComo(perfil);
      abrir('/ajuda');

      // Texto exclusivo do corpo da página: o título aparece também no
      // cabeçalho, então buscar pelo heading encontraria dois.
      expect(
        await screen.findByText(/dúvidas frequentes sobre o uso do controlog/i)
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe('/ajuda');
    }
  );

  // A separação por perfil segue valendo para o resto: a ajuda é a exceção, não
  // uma porta aberta.
  test('o motorista continua barrado nas telas de gestão', async () => {
    entrarComo('MOTORISTA');
    abrir('/motoristas');

    await waitFor(() => expect(window.location.pathname).toBe('/minhas-rotas'));
  });
});
