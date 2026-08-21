import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DEPOSITO } from './gerarPedidos';
import OtimizacaoRotas from './index';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

// O mapa depende de react-leaflet, que não é montado em nenhum teste deste
// repositório (jsdom não simula bem o layout que o Leaflet precisa) — aqui
// mockamos o componente inteiro pra testar só o que a página faz de fato:
// gerar pedidos, chamar a API de otimização e mostrar o resultado.
vi.mock('./OtimizacaoRotasMapa', () => ({
  default: () => <div data-testid="mapa-mock" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OtimizacaoRotas', () => {
  test('mostra estado inicial sem pedidos gerados', () => {
    renderWithProviders(<OtimizacaoRotas />);

    expect(screen.getByText('Gere pedidos simulados para começar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Otimizar Rota/ })).toBeDisabled();
    expect(screen.queryByTestId('mapa-mock')).not.toBeInTheDocument();
  });

  test('gerar pedidos preenche a lista e habilita o botão de otimizar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<OtimizacaoRotas />);

    await user.click(screen.getByRole('button', { name: /Gerar Pedidos/ }));

    expect(screen.queryByText('Gere pedidos simulados para começar.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Otimizar Rota/ })).toBeEnabled();
    expect(screen.getByTestId('mapa-mock')).toBeInTheDocument();

    const linhas = within(screen.getByRole('table')).getAllByRole('row');
    expect(linhas.length - 1).toBe(12); // 12 é a quantidade padrão, -1 pelo cabeçalho
  });

  test('otimizar rota chama a API com os pedidos gerados e mostra o resultado', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({
      data: {
        ordem: [
          { id: 'pedido-1', lat: -26.31, lng: -48.84, endereco: 'Rua A, 1 - Centro', posicao: 1 },
          { id: 'pedido-2', lat: -26.29, lng: -48.86, endereco: 'Rua B, 2 - América', posicao: 2 },
        ],
        distanciaOtimizadaKm: 8.4,
        distanciaOriginalKm: 12.1,
        economiaPercentual: 30.6,
      },
    });

    renderWithProviders(<OtimizacaoRotas />);
    await user.click(screen.getByRole('button', { name: /Gerar Pedidos/ }));
    await user.click(screen.getByRole('button', { name: /Otimizar Rota/ }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/otimizacao-rotas/otimizar',
        expect.objectContaining({ origem: DEPOSITO, pedidos: expect.any(Array) })
      )
    );
    const [, payload] = mockedApi.post.mock.calls[0];
    expect((payload as { pedidos: unknown[] }).pedidos).toHaveLength(12);

    expect(await screen.findByText('8.4 km')).toBeInTheDocument();
    expect(screen.getByText('12.1 km')).toBeInTheDocument();
    expect(screen.getByText('30.6%')).toBeInTheDocument();
    expect(screen.getByText('Rua A, 1 - Centro')).toBeInTheDocument();
    expect(screen.getByText('Rota otimizada com sucesso.')).toBeInTheDocument();
  });

  test('mostra erro quando a API de otimização falha', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'No máximo 50 pedidos por otimização.' } },
    });

    renderWithProviders(<OtimizacaoRotas />);
    await user.click(screen.getByRole('button', { name: /Gerar Pedidos/ }));
    await user.click(screen.getByRole('button', { name: /Otimizar Rota/ }));

    expect(await screen.findByText('No máximo 50 pedidos por otimização.')).toBeInTheDocument();
  });
});
