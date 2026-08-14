import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import { paginated } from '@/test/paginated';
import Veiculos from './index';
import type { Veiculo } from './types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

const sprinter: Veiculo = {
  id: 'v1',
  placa: 'ABC-1234',
  modelo: 'Mercedes Sprinter',
  capacidade: '1.500 kg',
  status: 'DISPONIVEL',
  emRota: true,
  criadoEm: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: paginated([sprinter]) });
});

describe('Veiculos', () => {
  test('lista os veículos retornados pela API', async () => {
    renderWithProviders(<Veiculos />);

    expect(await screen.findByText('Mercedes Sprinter')).toBeInTheDocument();
    expect(screen.getByText('ABC-1234')).toBeInTheDocument();
    // "Em Rota" aparece tanto no card de resumo quanto no badge do veículo
    expect(screen.getAllByText('Em Rota').length).toBeGreaterThan(0);
  });

  test('mostra estado vazio quando não há veículos', async () => {
    mockedApi.get.mockResolvedValue({ data: paginated([]) });
    renderWithProviders(<Veiculos />);

    expect(await screen.findByText('Nenhum veículo encontrado para os filtros aplicados.')).toBeInTheDocument();
  });

  test('cadastra um novo veículo com sucesso', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: { ...sprinter, id: 'v2', placa: 'DEF-5678' } });

    renderWithProviders(<Veiculos />);
    await screen.findByText('Mercedes Sprinter');

    await user.click(screen.getByRole('button', { name: /Novo Veículo/i }));
    await user.type(screen.getByPlaceholderText('ABC-1234'), 'DEF-5678');
    await user.type(screen.getByPlaceholderText('Ex: 5.000 kg'), '25.000 kg');
    await user.type(screen.getByPlaceholderText('Ex: Mercedes-Benz Axor 2544'), 'Volvo FH');
    await user.click(screen.getByRole('button', { name: 'Criar Veículo' }));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith(
      '/veiculos',
      expect.objectContaining({ placa: 'DEF-5678', modelo: 'Volvo FH' })
    ));
    expect(await screen.findByText('Veículo cadastrado.')).toBeInTheDocument();
  });

  // RN04 — Não é possível excluir um veículo que possui rotas ativas vinculadas
  test('exibe a mensagem de erro da API quando a exclusão é bloqueada (RN04)', async () => {
    const user = userEvent.setup();
    mockedApi.delete.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Não é possível excluir um veículo com rotas ativas vinculadas (RN04).' } },
    });

    renderWithProviders(<Veiculos />);
    await screen.findByText('Mercedes Sprinter');

    await user.click(screen.getByRole('button', { name: 'Excluir ABC-1234' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText('Não é possível excluir um veículo com rotas ativas vinculadas (RN04).')).toBeInTheDocument();
  });

  test('abre os detalhes do veículo ao clicar em Detalhes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Veiculos />);
    await screen.findByText('Mercedes Sprinter');

    await user.click(screen.getByRole('button', { name: 'Detalhes' }));

    expect(await screen.findAllByText('Capacidade')).not.toHaveLength(0);
    expect(screen.getAllByText('1.500 kg').length).toBeGreaterThan(0);
  });

  test('abre o formulário em modo edição ao clicar em editar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Veiculos />);
    await screen.findByText('Mercedes Sprinter');

    await user.click(screen.getByRole('button', { name: 'Editar ABC-1234' }));

    expect(await screen.findByRole('dialog', { name: 'Editar Veículo' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('ABC-1234')).toBeInTheDocument();
  });

  test('edita um veículo existente com sucesso', async () => {
    const user = userEvent.setup();
    mockedApi.put.mockResolvedValue({ data: { ...sprinter, capacidade: '2.000 kg' } });

    renderWithProviders(<Veiculos />);
    await screen.findByText('Mercedes Sprinter');

    await user.click(screen.getByRole('button', { name: 'Editar ABC-1234' }));
    await screen.findByRole('dialog', { name: 'Editar Veículo' });

    const capacidadeInput = screen.getByDisplayValue('1.500 kg');
    await user.clear(capacidadeInput);
    await user.type(capacidadeInput, '2.000 kg');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith(
      '/veiculos/v1',
      expect.objectContaining({ capacidade: '2.000 kg' })
    ));
    expect(await screen.findByText('Veículo atualizado.')).toBeInTheDocument();
  });
});
