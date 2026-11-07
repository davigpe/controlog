import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import RotasDoDia from './index';
import type { RotaDoDia, RotasDoDiaResponse } from './types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

// A geração do .xlsx é mockada: o que se verifica aqui é que o botão exporta
// exatamente o relatório que está na tela, não o conteúdo do arquivo.
vi.mock('./exportar', () => ({
  exportarRotasDoDia: vi.fn(),
  nomeDoArquivo: (data: string) => `rotas-${data}.xlsx`,
}));

const { exportarRotasDoDia } = await import('./exportar');
const mockedApi = vi.mocked(api, true);
const mockedExportar = vi.mocked(exportarRotasDoDia);

const rota = (overrides: Partial<RotaDoDia> = {}): RotaDoDia => ({
  id: 'r1',
  codigo: 'RT-001',
  origem: 'Centro de Distribuição',
  destino: 'Joinville',
  status: 'ATIVA',
  // 11:00Z é 08:00 em Brasília.
  dataHora: '2026-11-07T11:00:00.000Z',
  criadoEm: '2026-11-06T18:00:00.000Z',
  motorista: { id: 'm1', nome: 'Carlos Silva' },
  veiculo: { id: 'v1', placa: 'ABC-1234', modelo: 'Iveco Daily' },
  totalEntregas: 4,
  entregasConcluidas: 1,
  ...overrides,
});

const relatorio = (overrides: Partial<RotasDoDiaResponse> = {}): RotasDoDiaResponse => ({
  data: '2026-11-07',
  base: 'dataHora',
  totalRotas: 1,
  totalEntregas: 4,
  entregasConcluidas: 1,
  rotas: [rota()],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: relatorio() });
});

describe('Rotas do Dia', () => {
  test('lista as rotas do dia com o horário de cada uma', async () => {
    renderWithProviders(<RotasDoDia />);

    expect(await screen.findByText('RT-001')).toBeInTheDocument();
    // 11:00Z formatado no fuso de operação (UTC-3).
    expect(screen.getByText('08:00')).toBeInTheDocument();
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    expect(screen.getByText('1 de 4')).toBeInTheDocument();
  });

  test('mostra os totais do dia nos cards de resumo', async () => {
    mockedApi.get.mockResolvedValue({
      data: relatorio({ totalRotas: 7, totalEntregas: 31, entregasConcluidas: 12 }),
    });
    renderWithProviders(<RotasDoDia />);

    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  test('consulta a data escolhida', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RotasDoDia />);
    await screen.findByText('RT-001');

    await user.clear(screen.getByLabelText('Dia'));
    await user.type(screen.getByLabelText('Dia'), '2026-11-03');

    await waitFor(() =>
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/relatorios/rotas-do-dia',
        expect.objectContaining({ params: expect.objectContaining({ data: '2026-11-03' }) })
      )
    );
  });

  // "Carregadas no dia" tem duas leituras — a tela deixa escolher.
  test('alterna entre horário da rota e cadastro no sistema', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RotasDoDia />);
    await screen.findByText('RT-001');

    await user.click(screen.getByRole('combobox', { name: 'Contar o dia por' }));
    await user.click(await screen.findByRole('option', { name: /Cadastro no sistema/ }));

    await waitFor(() =>
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/relatorios/rotas-do-dia',
        expect.objectContaining({ params: expect.objectContaining({ base: 'criadoEm' }) })
      )
    );
  });

  test('exporta o relatório que está na tela', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RotasDoDia />);
    await screen.findByText('RT-001');

    await user.click(screen.getByRole('button', { name: /Exportar Excel/i }));

    await waitFor(() =>
      expect(mockedExportar).toHaveBeenCalledWith(
        expect.objectContaining({ data: '2026-11-07', totalRotas: 1 })
      )
    );
    expect(await screen.findByText('Planilha gerada.')).toBeInTheDocument();
  });

  test('não deixa exportar um dia sem rotas', async () => {
    mockedApi.get.mockResolvedValue({
      data: relatorio({ totalRotas: 0, totalEntregas: 0, entregasConcluidas: 0, rotas: [] }),
    });
    renderWithProviders(<RotasDoDia />);

    expect(await screen.findByText(/Nenhuma rota em 07\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exportar Excel/i })).toBeDisabled();
  });
});
