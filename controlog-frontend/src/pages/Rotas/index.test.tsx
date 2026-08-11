import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import RotasPage from './index';
import type { Rota } from './types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

const rotaAtiva: Rota = {
  id: 'r1',
  codigo: 'RT-001',
  origem: 'Joinville, SC',
  destino: 'Florianópolis, SC',
  status: 'ATIVA',
  dataHora: new Date().toISOString(),
  criadoEm: new Date().toISOString(),
  coordenadasOrigem: [-26.3045, -48.8487],
  coordenadasDestino: [-27.5954, -48.548],
  motorista: { id: 'm1', nome: 'Carlos Silva' },
  veiculo: { id: 'v1', placa: 'ABC-1234', modelo: 'Mercedes Sprinter' },
};

const motoristas = [{ id: 'm1', nome: 'Carlos Silva', cnh: '1', telefone: '1', status: 'ATIVO', emRota: true, entregasRealizadas: 0, criadoEm: '' }];
const veiculos = [{ id: 'v1', placa: 'ABC-1234', modelo: 'Mercedes Sprinter', capacidade: '1.500 kg', status: 'DISPONIVEL', emRota: true, criadoEm: '' }];

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/rotas') return Promise.resolve({ data: [rotaAtiva] });
    if (url === '/motoristas') return Promise.resolve({ data: motoristas });
    if (url === '/veiculos') return Promise.resolve({ data: veiculos });
    return Promise.resolve({ data: [] });
  });
});

describe('Rotas', () => {
  test('lista as rotas retornadas pela API', async () => {
    renderWithProviders(<RotasPage />);

    expect(await screen.findByText('RT-001')).toBeInTheDocument();
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    expect(screen.getByText(/Mercedes Sprinter/)).toBeInTheDocument();
  });

  test('abre o modal de nova rota com os selects de motorista e veículo populados', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RotasPage />);
    await screen.findByText('RT-001');

    await user.click(screen.getByRole('button', { name: /Nova Rota/i }));

    expect(await screen.findByRole('dialog', { name: 'Nova Rota' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('RT-001')).toBeInTheDocument();
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/motoristas', expect.anything()));
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledWith('/veiculos', expect.anything()));
  });

  // RN08 — Não é possível excluir uma rota que possua entregas pendentes vinculadas
  test('exibe a mensagem de erro da API quando a exclusão é bloqueada (RN08)', async () => {
    const user = userEvent.setup();
    mockedApi.delete.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Não é possível excluir uma rota com entregas pendentes vinculadas (RN08).' } },
    });

    renderWithProviders(<RotasPage />);
    await screen.findByText('RT-001');

    await user.click(screen.getByRole('button', { name: 'Excluir RT-001' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText('Não é possível excluir uma rota com entregas pendentes vinculadas (RN08).')
    ).toBeInTheDocument();
  });

  test('exclui uma rota sem vínculos com sucesso', async () => {
    const user = userEvent.setup();
    mockedApi.delete.mockResolvedValue({ data: undefined });

    renderWithProviders(<RotasPage />);
    await screen.findByText('RT-001');

    await user.click(screen.getByRole('button', { name: 'Excluir RT-001' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText('Rota excluída.')).toBeInTheDocument();
    expect(mockedApi.delete).toHaveBeenCalledWith('/rotas/r1');
  });
});
