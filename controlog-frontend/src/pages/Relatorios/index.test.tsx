import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import Relatorios from './index';
import type { RelatorioResponse } from './api';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

const relatorioMock: RelatorioResponse = {
  periodo: { dataInicio: null, dataFim: null },
  rotasPorStatus: { ATIVA: 2, CONCLUIDA: 4 },
  entregasPorStatus: { ENTREGUE: 3, PENDENTE: 1 },
  totalEntregas: 4,
  motoristasMaisAtivos: [{ motorista: 'Carlos Silva', entregas: 2 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: relatorioMock });
});

// Nota: o Recharts não renderiza o conteúdo interno dos gráficos (eixos, barras)
// dentro de um ResponsiveContainer com largura 0, que é o que o jsdom sempre reporta.
// Por isso as asserções aqui verificam os KPIs e os títulos das seções, não o
// conteúdo desenhado pelos gráficos em si.
describe('Relatorios', () => {
  test('exibe os KPIs retornados pela API', async () => {
    renderWithProviders(<Relatorios />);

    expect(await screen.findByText('4')).toBeInTheDocument(); // Total de Entregas
    expect(screen.getByText('Total de Entregas')).toBeInTheDocument();
    expect(screen.getByText('Motoristas Mais Ativos')).toBeInTheDocument();
    // padrão inicial é "Últimos 30 dias", então já entra filtrando por período
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/relatorios',
      expect.objectContaining({
        params: expect.objectContaining({ dataInicio: expect.any(String), dataFim: expect.any(String) }),
      })
    );
  });

  test('refaz a consulta com dataInicio/dataFim ao trocar o período', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Relatorios />);
    await screen.findByText('Total de Entregas');

    await user.selectOptions(screen.getByRole('combobox'), 'Últimos 7 dias');

    await waitFor(() =>
      expect(mockedApi.get).toHaveBeenLastCalledWith(
        '/relatorios',
        expect.objectContaining({
          params: expect.objectContaining({ dataInicio: expect.any(String), dataFim: expect.any(String) }),
        })
      )
    );
  });

  test('não envia filtro de período quando "Todo o período" é selecionado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Relatorios />);
    await screen.findByText('Total de Entregas');

    await user.selectOptions(screen.getByRole('combobox'), 'Últimos 7 dias');
    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledTimes(2));

    await user.selectOptions(screen.getByRole('combobox'), 'Todo o período');

    await waitFor(() =>
      expect(mockedApi.get).toHaveBeenLastCalledWith('/relatorios', expect.objectContaining({ params: {} }))
    );
  });

  test('mostra mensagem de vazio quando não há motoristas ativos no período', async () => {
    mockedApi.get.mockResolvedValue({ data: { ...relatorioMock, motoristasMaisAtivos: [] } });

    renderWithProviders(<Relatorios />);

    expect(await screen.findByText('Nenhum dado encontrado para o período.')).toBeInTheDocument();
  });
});
