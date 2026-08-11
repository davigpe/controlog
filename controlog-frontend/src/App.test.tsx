import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

    expect(await screen.findByText('Entre com sua conta para continuar')).toBeInTheDocument();
  });

  test('renderiza a área protegida quando há sessão ativa', async () => {
    useAuthStore.setState({ accessToken: 'token-valido', usuario: { id: 'u1', nome: 'Ricardo', email: 'r@controlog.com', perfil: 'GESTOR' } });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <App />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Controlog v1.0')).toBeInTheDocument();
  });
});
