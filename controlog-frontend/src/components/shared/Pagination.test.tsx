import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';

describe('Pagination', () => {
  test('não renderiza nada quando totalPages é 1 ou menos', () => {
    const { container } = render(
      <Pagination
        pagination={{ page: 1, pageSize: 10, total: 5, totalPages: 1 }}
        onPageChange={() => {}}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test('exibe página atual, total de páginas e total de registros', () => {
    render(
      <Pagination
        pagination={{ page: 2, pageSize: 10, total: 25, totalPages: 3 }}
        onPageChange={() => {}}
      />
    );

    expect(screen.getByText('Página 2 de 3 · 25 registros no total')).toBeInTheDocument();
  });

  test('desabilita "Anterior" na primeira página e chama onPageChange ao avançar', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    render(
      <Pagination
        pagination={{ page: 1, pageSize: 10, total: 25, totalPages: 3 }}
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Próxima página' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  test('desabilita "Próxima" na última página', () => {
    render(
      <Pagination
        pagination={{ page: 3, pageSize: 10, total: 25, totalPages: 3 }}
        onPageChange={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
  });
});
