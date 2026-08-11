import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import Motoristas from './index';
import type { Motorista } from './types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

const carlos: Motorista = {
  id: 'm1',
  nome: 'Carlos Silva',
  cnh: '12345678901',
  telefone: '(47) 99111-1111',
  status: 'ATIVO',
  emRota: true,
  entregasRealizadas: 42,
  criadoEm: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: [carlos] });
});

describe('Motoristas', () => {
  test('lista os motoristas retornados pela API', async () => {
    renderWithProviders(<Motoristas />);

    expect(await screen.findByText('Carlos Silva')).toBeInTheDocument();
    expect(screen.getByText('Em Rota')).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalledWith('/motoristas', expect.objectContaining({ params: expect.anything() }));
  });

  test('mostra estado vazio quando não há motoristas', async () => {
    mockedApi.get.mockResolvedValue({ data: [] });
    renderWithProviders(<Motoristas />);

    expect(await screen.findByText('Nenhum motorista encontrado para os filtros aplicados.')).toBeInTheDocument();
  });

  test('cadastra um novo motorista com sucesso', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: { ...carlos, id: 'm2', nome: 'Ana Souza' } });

    renderWithProviders(<Motoristas />);
    await screen.findByText('Carlos Silva');

    await user.click(screen.getByRole('button', { name: /Novo Motorista/i }));
    await user.type(screen.getByPlaceholderText('Nome do motorista'), 'Ana Souza');
    await user.type(screen.getByPlaceholderText('00000000000'), '23456789012');
    await user.type(screen.getByPlaceholderText('(47) 99999-9999'), '(47) 99222-2222');
    await user.click(screen.getByRole('button', { name: 'Criar Motorista' }));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith(
      '/motoristas',
      expect.objectContaining({ nome: 'Ana Souza', cnh: '23456789012' })
    ));
    expect(await screen.findByText('Motorista cadastrado.')).toBeInTheDocument();
  });

  // RN03 — Não é possível excluir um motorista que possui rotas ativas vinculadas
  test('exibe a mensagem de erro da API quando a exclusão é bloqueada (RN03)', async () => {
    const user = userEvent.setup();
    mockedApi.delete.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Não é possível excluir um motorista com rotas ativas vinculadas (RN03).' } },
    });

    renderWithProviders(<Motoristas />);
    await screen.findByText('Carlos Silva');

    await user.click(screen.getByRole('button', { name: 'Excluir Carlos Silva' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText('Não é possível excluir um motorista com rotas ativas vinculadas (RN03).')).toBeInTheDocument();
  });

  test('abre os detalhes do motorista ao clicar em Detalhes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Motoristas />);
    await screen.findByText('Carlos Silva');

    await user.click(screen.getByRole('button', { name: 'Detalhes' }));

    expect(await screen.findByText('Entregas concluídas')).toBeInTheDocument();
    expect(screen.getAllByText('42').length).toBeGreaterThan(0);
  });

  test('abre o formulário em modo edição ao clicar em editar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Motoristas />);
    await screen.findByText('Carlos Silva');

    await user.click(screen.getByRole('button', { name: 'Editar Carlos Silva' }));

    expect(await screen.findByRole('dialog', { name: 'Editar Motorista' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Carlos Silva')).toBeInTheDocument();
  });
});
