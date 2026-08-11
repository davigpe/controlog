import { describe, expect, test, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render } from '@testing-library/react';
import RequireAuth from './RequireAuth';
import { useAuthStore } from '@/stores/authStore';

function renderApp(initialRoute: string) {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<div>Tela de Login</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<div>Área protegida</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthStore.setState({ usuario: null, accessToken: null, refreshToken: null });
});

describe('RequireAuth', () => {
  test('redireciona para /login quando não há accessToken', () => {
    renderApp('/');

    expect(screen.getByText('Tela de Login')).toBeInTheDocument();
    expect(screen.queryByText('Área protegida')).not.toBeInTheDocument();
  });

  test('renderiza a rota protegida quando há accessToken', () => {
    useAuthStore.setState({ accessToken: 'token-valido' });

    renderApp('/');

    expect(screen.getByText('Área protegida')).toBeInTheDocument();
  });
});
