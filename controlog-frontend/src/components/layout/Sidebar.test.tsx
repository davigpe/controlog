import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  test('renderiza um link de navegação para cada módulo', () => {
    render(
      <MemoryRouter initialEntries={['/motoristas']}>
        <Sidebar />
      </MemoryRouter>
    );

    for (const label of ['Dashboard', 'Entregas', 'Veículos', 'Motoristas', 'Rotas', 'Relatórios']) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  test('marca o link da rota atual como ativo', () => {
    render(
      <MemoryRouter initialEntries={['/motoristas']}>
        <Sidebar />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /Motoristas/ })).toHaveClass('bg-blue-600');
    expect(screen.getByRole('link', { name: /Rotas/ })).not.toHaveClass('bg-blue-600');
  });
});
