import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import Entregas from './index';
import type { Entrega } from './types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

const entregaEmTransito: Entrega = {
  id: 'e1',
  codigo: 'EN-001',
  destino: 'Florianópolis, SC',
  status: 'EM_TRANSITO',
  dataPrevista: new Date().toISOString(),
  dataEfetiva: null,
  criadoEm: new Date().toISOString(),
  rota: { id: 'r1', codigo: 'RT-001' },
  motorista: { id: 'm1', nome: 'Carlos Silva' },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/entregas') return Promise.resolve({ data: [entregaEmTransito] });
    if (url === '/rotas') return Promise.resolve({ data: [] });
    if (url === '/motoristas') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });
});

describe('Entregas', () => {
  test('lista as entregas retornadas pela API', async () => {
    renderWithProviders(<Entregas />);

    expect(await screen.findByText('EN-001')).toBeInTheDocument();
    expect(screen.getByText('RT-001')).toBeInTheDocument();
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    // "Em Trânsito" aparece tanto no filtro de status quanto no badge da linha
    expect(screen.getAllByText('Em Trânsito').length).toBeGreaterThan(0);
  });

  test('mostra estado vazio quando não há entregas', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });
    renderWithProviders(<Entregas />);

    expect(await screen.findByText('Nenhuma entrega encontrada para os filtros aplicados.')).toBeInTheDocument();
  });

  test('exclui uma entrega com sucesso', async () => {
    const user = userEvent.setup();
    mockedApi.delete.mockResolvedValue({ data: undefined });

    renderWithProviders(<Entregas />);
    await screen.findByText('EN-001');

    await user.click(screen.getByRole('button', { name: 'Excluir EN-001' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText('Entrega excluída.')).toBeInTheDocument();
    expect(mockedApi.delete).toHaveBeenCalledWith('/entregas/e1');
  });

  test('exibe detalhes da entrega ao clicar em Detalhes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Entregas />);
    await screen.findByText('EN-001');

    await user.click(screen.getByRole('button', { name: /Detalhes/i }));

    expect(await screen.findByRole('dialog', { name: 'Entrega EN-001' })).toBeInTheDocument();
  });
});
