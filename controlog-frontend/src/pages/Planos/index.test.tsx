import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import { paginated } from '@/test/paginated';
import Planos from './index';
import type { PlanoResumo } from './types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

const PLANOS: PlanoResumo[] = [
  { id: 'plano1', nome: 'Plano Norte', status: 'ABERTO', criadoEm: new Date().toISOString(), totalPedidos: 5 },
  { id: 'plano2', nome: 'Plano Sul', status: 'OTIMIZADO', criadoEm: new Date().toISOString(), totalPedidos: 12 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: paginated(PLANOS) });
});

describe('Planos', () => {
  test('lista os planos em cards, com status e contagem de pedidos', async () => {
    renderWithProviders(<Planos />);

    expect(await screen.findByText('Plano Norte')).toBeInTheDocument();
    expect(screen.getByText('Plano Sul')).toBeInTheDocument();
    expect(screen.getByText('5 pedido(s)')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
    expect(screen.getByText('Otimizado')).toBeInTheDocument();
  });

  test('estado vazio quando não há planos', async () => {
    mockedApi.get.mockResolvedValue({ data: paginated([]) });
    renderWithProviders(<Planos />);

    expect(
      await screen.findByText('Nenhum plano criado ainda. Selecione pedidos na tela de Pedidos pra criar o primeiro.')
    ).toBeInTheDocument();
  });

  test('excluir um plano (com confirmação) chama a API', async () => {
    const user = userEvent.setup();
    mockedApi.delete.mockResolvedValue({ data: undefined });
    renderWithProviders(<Planos />);
    await screen.findByText('Plano Norte');

    await user.click(screen.getByRole('button', { name: 'Excluir Plano Norte' }));
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(mockedApi.delete).toHaveBeenCalledWith('/planos/plano1'));
    expect(await screen.findByText('Plano excluído. Os pedidos dele voltaram a ficar disponíveis.')).toBeInTheDocument();
  });
});
