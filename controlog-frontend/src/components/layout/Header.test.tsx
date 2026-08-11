import { beforeEach, describe, expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import { useAuthStore } from '@/stores/authStore';
import Header from './Header';

function renderHeader(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/login" element={<div>Tela de Login</div>} />
        <Route path="*" element={<Header />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthStore.setState({
    usuario: { id: 'u1', nome: 'Ricardo Menezes', email: 'gestor@controlog.com', perfil: 'GESTOR' },
    accessToken: 'token',
    refreshToken: 'refresh',
  });
});

describe('Header', () => {
  test('exibe o nome e o perfil do usuário autenticado', () => {
    renderHeader('/');

    expect(screen.getByText('Ricardo Menezes')).toBeInTheDocument();
    expect(screen.getByText('GESTOR')).toBeInTheDocument();
  });

  test('exibe o título correspondente à rota atual', () => {
    renderHeader('/motoristas');

    expect(screen.getByRole('heading', { name: 'Motoristas' })).toBeInTheDocument();
  });

  test('logout limpa a sessão e redireciona para /login', async () => {
    const user = userEvent.setup();
    renderHeader('/');

    await user.click(screen.getByTitle('Sair'));

    expect(await screen.findByText('Tela de Login')).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
