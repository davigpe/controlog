import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import { paginated } from '@/test/paginated';
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
    if (url === '/entregas') return Promise.resolve({ data: paginated([entregaEmTransito]) });
    if (url === '/rotas') return Promise.resolve({ data: paginated([]) });
    if (url === '/motoristas') return Promise.resolve({ data: paginated([]) });
    return Promise.resolve({ data: paginated([]) });
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
    mockedApi.get.mockResolvedValue({ data: paginated([]) });
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

  test('cadastra uma nova entrega com sucesso', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: { ...entregaEmTransito, id: 'e2', codigo: 'EN-002' } });

    renderWithProviders(<Entregas />);
    await screen.findByText('EN-001');

    await user.click(screen.getByRole('button', { name: /Nova Entrega/i }));
    await screen.findByRole('dialog', { name: 'Nova Entrega' });

    await user.type(screen.getByPlaceholderText('EN-001'), 'EN-002');
    await user.type(screen.getByPlaceholderText('Florianópolis, SC'), 'Blumenau, SC');
    await user.click(screen.getByRole('button', { name: 'Criar Entrega' }));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith(
      '/entregas',
      expect.objectContaining({ codigo: 'EN-002', destino: 'Blumenau, SC' })
    ));
    expect(await screen.findByText('Entrega cadastrada.')).toBeInTheDocument();
  });

  test('edita uma entrega existente com sucesso', async () => {
    const user = userEvent.setup();
    mockedApi.put.mockResolvedValue({ data: { ...entregaEmTransito, destino: 'Blumenau, SC' } });

    renderWithProviders(<Entregas />);
    await screen.findByText('EN-001');

    await user.click(screen.getByRole('button', { name: 'Editar EN-001' }));
    await screen.findByRole('dialog', { name: 'Editar Entrega' });

    const destinoInput = screen.getByDisplayValue('Florianópolis, SC');
    await user.clear(destinoInput);
    await user.type(destinoInput, 'Blumenau, SC');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith(
      '/entregas/e1',
      expect.objectContaining({ destino: 'Blumenau, SC' })
    ));
    expect(await screen.findByText('Entrega atualizada.')).toBeInTheDocument();
  });

  test('avança de página ao clicar em "Próxima"', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/entregas') {
        return Promise.resolve({
          data: { items: [entregaEmTransito], pagination: { page: 1, pageSize: 10, total: 25, totalPages: 3 } },
        });
      }
      return Promise.resolve({ data: paginated([]) });
    });

    renderWithProviders(<Entregas />);
    await screen.findByText('EN-001');

    await user.click(screen.getByRole('button', { name: 'Próxima página' }));

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith(
      '/entregas',
      expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })
    ));
  });
});
