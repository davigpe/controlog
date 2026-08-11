import { beforeEach, describe, expect, test, vi } from 'vitest';
import axios from 'axios';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { useAuthStore } from '@/stores/authStore';
import Login from './index';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, post: vi.fn() } };
});
const mockedAxios = vi.mocked(axios, true);

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>Dashboard protegido</div>} />
      </Routes>
      <Toaster />
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthStore.setState({ usuario: null, accessToken: null, refreshToken: null });
  vi.clearAllMocks();
});

describe('Login', () => {
  test('mostra erros de validação para campos vazios', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test('faz login com sucesso e navega para a área protegida', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({
      data: {
        usuario: { id: 'u1', nome: 'Ricardo Menezes', email: 'gestor@controlog.com', perfil: 'GESTOR' },
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      },
    });

    renderLogin();

    await user.type(screen.getByLabelText('E-mail'), 'gestor@controlog.com');
    await user.type(screen.getByLabelText('Senha'), 'controlog123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Dashboard protegido')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBe('access-1');
  });

  test('exibe toast de erro quando as credenciais são inválidas', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockRejectedValue({
      response: { data: { message: 'E-mail ou senha inválidos.' } },
      isAxiosError: true,
    });

    renderLogin();

    await user.type(screen.getByLabelText('E-mail'), 'gestor@controlog.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBeNull());
    expect(screen.queryByText('Dashboard protegido')).not.toBeInTheDocument();
  });

  test('redireciona quem já está autenticado direto para a área protegida', () => {
    useAuthStore.setState({ accessToken: 'ja-logado' });

    renderLogin();

    expect(screen.getByText('Dashboard protegido')).toBeInTheDocument();
  });
});
