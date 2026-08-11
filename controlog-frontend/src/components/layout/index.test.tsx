import { beforeEach, describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import Layout from './index';

beforeEach(() => {
  useAuthStore.setState({
    usuario: { id: 'u1', nome: 'Ricardo Menezes', email: 'gestor@controlog.com', perfil: 'GESTOR' },
    accessToken: 'token',
    refreshToken: 'refresh',
  });
});

describe('Layout', () => {
  test('renderiza Sidebar, Header e o conteúdo da rota filha (Outlet)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<div>Conteúdo da página</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Controlog v1.0')).toBeInTheDocument(); // Sidebar
    expect(screen.getByText('Ricardo Menezes')).toBeInTheDocument(); // Header
    expect(screen.getByText('Conteúdo da página')).toBeInTheDocument(); // Outlet
  });
});
