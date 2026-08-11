import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import Dashboard from './index';
import type { DashboardResumo } from './api';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

const resumoMock: DashboardResumo = {
  rotas: { ativas: 3, concluidas: 5, canceladas: 1, total: 9 },
  totalMotoristas: 6,
  totalVeiculos: 8,
  totalEntregas: 20,
  entregasPorStatus: { PENDENTE: 4, ENTREGUE: 16 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dashboard', () => {
  test('mostra estado de carregamento antes da resposta da API', () => {
    mockedApi.get.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<Dashboard />);

    expect(screen.getByText('Carregando indicadores...')).toBeInTheDocument();
  });

  test('exibe os indicadores retornados pelo resumo do dashboard', async () => {
    mockedApi.get.mockResolvedValue({ data: resumoMock });

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('3')).toBeInTheDocument(); // Rotas Ativas
    expect(screen.getByText('Rotas Ativas')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument(); // Motoristas
    expect(screen.getByText('20')).toBeInTheDocument(); // Total de Entregas
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('Entregue')).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalledWith('/dashboard/resumo');
  });

  test('mostra mensagem apropriada quando não há entregas cadastradas', async () => {
    mockedApi.get.mockResolvedValue({
      data: { ...resumoMock, totalEntregas: 0, entregasPorStatus: {} },
    });

    renderWithProviders(<Dashboard />);

    expect(await screen.findByText('Nenhuma entrega cadastrada ainda.')).toBeInTheDocument();
  });
});
