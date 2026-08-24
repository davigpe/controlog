import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import OtimizacaoRotas from './index';
import type { Coordenada, Pedido } from './types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

// 4 pedidos fixos, em dois grupos geograficamente separados — permite montar
// polígonos de teste que selecionam um grupo sem tocar o outro, sem depender
// das coordenadas aleatórias que gerarPedidos() geraria de verdade.
const PEDIDO_NORTE_1: Pedido = { id: 'p1', lat: 10, lng: 10, endereco: 'Rua A, 1 - Centro', unidades: 5, volumeM3: 0.5 };
const PEDIDO_NORTE_2: Pedido = { id: 'p2', lat: 10, lng: 12, endereco: 'Rua B, 2 - Centro', unidades: 3, volumeM3: 0.3 };
const PEDIDO_SUL_1: Pedido = { id: 'p3', lat: -10, lng: -10, endereco: 'Rua C, 3 - Bucarein', unidades: 2, volumeM3: 0.2 };
const PEDIDO_SUL_2: Pedido = { id: 'p4', lat: -10, lng: -12, endereco: 'Rua D, 4 - Bucarein', unidades: 1, volumeM3: 0.1 };
const PEDIDOS_FIXTURE = [PEDIDO_NORTE_1, PEDIDO_NORTE_2, PEDIDO_SUL_1, PEDIDO_SUL_2];

const POLIGONO_NORTE: Coordenada[] = [
  { lat: 5, lng: 5 },
  { lat: 5, lng: 15 },
  { lat: 15, lng: 15 },
  { lat: 15, lng: 5 },
];
const POLIGONO_SUL: Coordenada[] = [
  { lat: -15, lng: -15 },
  { lat: -15, lng: -5 },
  { lat: -5, lng: -5 },
  { lat: -5, lng: -15 },
];
const POLIGONO_VAZIO: Coordenada[] = [
  { lat: 50, lng: 50 },
  { lat: 50, lng: 51 },
  { lat: 51, lng: 51 },
];

vi.mock('./gerarPedidos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./gerarPedidos')>();
  return { ...actual, gerarPedidos: () => PEDIDOS_FIXTURE };
});

// O mapa depende de react-leaflet, que não é montado em nenhum teste deste
// repositório (jsdom não simula bem o layout que o Leaflet precisa) — aqui
// mockamos o componente inteiro. Pra simular "desenhar um polígono" sem
// eventos reais de mouse, o mock expõe botões que chamam onCliqueMapa com
// coordenadas fixas formando os polígonos norte/sul acima.
vi.mock('./OtimizacaoRotasMapa', () => ({
  default: ({
    onCliqueMapa,
    rotas,
    pedidosSelecionadosIds,
    rotaEmFocoId,
    modoDesenho,
  }: {
    onCliqueMapa: (ponto: Coordenada) => void;
    rotas: { id: string }[];
    pedidosSelecionadosIds: Set<string>;
    rotaEmFocoId: string | null;
    modoDesenho: boolean;
  }) => (
    <div
      data-testid="mapa-mock"
      data-rotas-count={rotas.length}
      data-selecionados={pedidosSelecionadosIds.size}
      data-rota-foco={rotaEmFocoId ?? ''}
    >
      {modoDesenho && (
        <>
          <button onClick={() => POLIGONO_NORTE.forEach(onCliqueMapa)}>desenhar polígono norte</button>
          <button onClick={() => POLIGONO_SUL.forEach(onCliqueMapa)}>desenhar polígono sul</button>
          <button onClick={() => POLIGONO_VAZIO.forEach(onCliqueMapa)}>desenhar polígono vazio</button>
        </>
      )}
    </div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.post.mockImplementation(async (_url: string, payload: unknown) => {
    const { pedidos } = payload as { pedidos: Pedido[] };
    return {
      data: {
        ordem: pedidos.map((p, i) => ({ ...p, posicao: i + 1 })),
        distanciaOtimizadaKm: 5,
        distanciaOriginalKm: 6,
        economiaPercentual: 16.7,
        rotaReal: null,
      },
    };
  });
});

async function gerarPedidosNaTela(user: ReturnType<typeof userEvent.setup>) {
  renderWithProviders(<OtimizacaoRotas />);
  await user.click(screen.getByRole('button', { name: /Gerar Pedidos/ }));
}

async function criarRotaViaPoligono(user: ReturnType<typeof userEvent.setup>, direcao: 'norte' | 'sul') {
  await user.click(screen.getByRole('button', { name: /Desenhar Polígono/ }));
  await user.click(screen.getByRole('button', { name: new RegExp(`desenhar polígono ${direcao}`) }));
  await user.click(screen.getByRole('button', { name: /Finalizar Polígono/ }));
  await user.click(await screen.findByRole('button', { name: /Criar rota/ }));
}

describe('OtimizacaoRotas', () => {
  test('mostra estado inicial sem pedidos gerados', () => {
    renderWithProviders(<OtimizacaoRotas />);

    expect(screen.getByText('Gere pedidos simulados para começar.')).toBeInTheDocument();
    expect(screen.queryByTestId('mapa-mock')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Desenhar Polígono/ })).not.toBeInTheDocument();
  });

  test('gerar pedidos mostra o mapa e habilita o desenho de polígono', async () => {
    const user = userEvent.setup();
    await gerarPedidosNaTela(user);

    expect(screen.queryByText('Gere pedidos simulados para começar.')).not.toBeInTheDocument();
    expect(screen.getByTestId('mapa-mock')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Desenhar Polígono/ })).toBeInTheDocument();
    expect(screen.getByText('Nenhuma rota criada ainda. Desenhe um polígono no mapa pra começar.')).toBeInTheDocument();
  });

  test('desenhar um polígono seleciona só os pedidos dentro dele, e "Criar rota" monta a rota com esses pedidos', async () => {
    const user = userEvent.setup();
    await gerarPedidosNaTela(user);

    await user.click(screen.getByRole('button', { name: /Desenhar Polígono/ }));
    await user.click(screen.getByRole('button', { name: /desenhar polígono norte/ }));

    expect(screen.getByRole('button', { name: /Finalizar Polígono \(4\)/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Finalizar Polígono/ }));

    expect(await screen.findByText('2 pedido(s) selecionado(s)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Criar rota/ }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/otimizacao-rotas/otimizar',
        expect.objectContaining({ pedidos: expect.arrayContaining([PEDIDO_NORTE_1, PEDIDO_NORTE_2]) })
      )
    );
    const [, payload] = mockedApi.post.mock.calls[0];
    expect((payload as { pedidos: Pedido[] }).pedidos).toHaveLength(2);

    expect(await screen.findByText('Rota 1')).toBeInTheDocument();
    const linha = screen.getByText('Rota 1').closest('tr')!;
    expect(within(linha).getByText('2')).toBeInTheDocument(); // pedidos
    expect(within(linha).getByText('8')).toBeInTheDocument(); // unidades: 5+3
    expect(within(linha).getByText('0.80 m³')).toBeInTheDocument(); // volume: 0.5+0.3
    expect(await within(linha).findByText('Calculada')).toBeInTheDocument();
    expect(screen.getByTestId('mapa-mock')).toHaveAttribute('data-rotas-count', '1');
  });

  test('polígono sem nenhum pedido dentro mostra erro e não cria rota', async () => {
    const user = userEvent.setup();
    await gerarPedidosNaTela(user);

    await user.click(screen.getByRole('button', { name: /Desenhar Polígono/ }));
    await user.click(screen.getByRole('button', { name: /desenhar polígono vazio/ }));
    await user.click(screen.getByRole('button', { name: /Finalizar Polígono/ }));

    expect(await screen.findByText('Nenhum pedido dentro do polígono desenhado.')).toBeInTheDocument();
    expect(screen.queryByText(/pedido\(s\) selecionado\(s\)/)).not.toBeInTheDocument();
    expect(mockedApi.post).not.toHaveBeenCalled();
    expect(screen.getByText('Nenhuma rota criada ainda. Desenhe um polígono no mapa pra começar.')).toBeInTheDocument();
  });

  test('mover pedidos de uma rota pra outra recalcula as duas rotas afetadas', async () => {
    const user = userEvent.setup();
    await gerarPedidosNaTela(user);

    await criarRotaViaPoligono(user, 'norte');
    await screen.findByText('Rota 1');
    await criarRotaViaPoligono(user, 'sul');
    await screen.findByText('Rota 2');

    expect(mockedApi.post).toHaveBeenCalledTimes(2);

    // Ação de linha "Atribuir pedidos" na Rota 1 arma o desenho mirando nela;
    // desenhar o polígono sul move p3/p4 (hoje na Rota 2) pra Rota 1.
    const linhaRota1 = screen.getByText('Rota 1').closest('tr')!;
    await user.click(within(linhaRota1).getByRole('button', { name: /Ações de Rota 1/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Atribuir pedidos/ }));

    expect(await screen.findByText(/Desenhando pra atribuir pedidos à "Rota 1"/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /desenhar polígono sul/ }));
    await user.click(screen.getByRole('button', { name: /Finalizar Polígono/ }));

    // 2 criações + 1 recálculo: a Rota 1 (que ganhou pedidos) recalcula; a
    // Rota 2 (que ficou sem nenhum) é pulada — recalcular rota vazia geraria
    // um 400 espúrio do backend, então isso é guardado de propósito.
    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledTimes(3));

    const linhaRota1Depois = screen.getByText('Rota 1').closest('tr')!;
    const linhaRota2Depois = screen.getByText('Rota 2').closest('tr')!;
    expect(within(linhaRota1Depois).getAllByRole('cell')[2]).toHaveTextContent('4');
    expect(within(linhaRota2Depois).getAllByRole('cell')[2]).toHaveTextContent('0');
  });

  test('desatribuir pedidos de uma rota específica via ação de linha', async () => {
    const user = userEvent.setup();
    await gerarPedidosNaTela(user);
    await criarRotaViaPoligono(user, 'norte');
    await screen.findByText('Rota 1');

    const linha = screen.getByText('Rota 1').closest('tr')!;
    await user.click(within(linha).getByRole('button', { name: /Ações de Rota 1/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Desatribuir pedidos/ }));
    await user.click(screen.getByRole('button', { name: /desenhar polígono norte/ }));
    await user.click(screen.getByRole('button', { name: /Finalizar Polígono/ }));

    await waitFor(() => {
      const linhaAtual = screen.getByText('Rota 1').closest('tr')!;
      const celulaPedidos = within(linhaAtual).getAllByRole('cell')[2];
      expect(celulaPedidos).toHaveTextContent('0');
    });
  });

  test('renomear rota', async () => {
    const user = userEvent.setup();
    await gerarPedidosNaTela(user);
    await criarRotaViaPoligono(user, 'norte');
    await screen.findByText('Rota 1');

    const linha = screen.getByText('Rota 1').closest('tr')!;
    await user.click(within(linha).getByRole('button', { name: /Ações de Rota 1/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Editar nome/ }));

    const campoNome = await screen.findByLabelText('Nome');
    await user.clear(campoNome);
    await user.type(campoNome, 'Zona Industrial');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Zona Industrial')).toBeInTheDocument();
    expect(screen.getByText('Rota renomeada.')).toBeInTheDocument();
  });

  test('excluir rota (com confirmação) devolve os pedidos pro grupo não atribuído', async () => {
    const user = userEvent.setup();
    await gerarPedidosNaTela(user);
    await criarRotaViaPoligono(user, 'norte');
    await screen.findByText('Rota 1');

    const linha = screen.getByText('Rota 1').closest('tr')!;
    await user.click(within(linha).getByRole('button', { name: /Ações de Rota 1/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Excluir rota/ }));

    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    expect(screen.queryByText('Rota 1')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhuma rota criada ainda. Desenhe um polígono no mapa pra começar.')).toBeInTheDocument();
    expect(screen.getByText('0/4 pedidos atribuídos', { exact: false })).toBeInTheDocument();
  });

  test('clicar na linha da tabela alterna o foco daquela rota no mapa', async () => {
    const user = userEvent.setup();
    await gerarPedidosNaTela(user);
    await criarRotaViaPoligono(user, 'norte');
    const linha = await screen.findByText('Rota 1');

    await user.click(linha);
    expect(screen.getByTestId('mapa-mock').dataset.rotaFoco).not.toBe('');

    await user.click(linha);
    expect(screen.getByTestId('mapa-mock').dataset.rotaFoco).toBe('');
  });

  test('erro da API ao recalcular marca a rota como erro e mostra um toast', async () => {
    mockedApi.post.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Falha ao otimizar.' } },
    });
    const user = userEvent.setup();
    await gerarPedidosNaTela(user);

    await criarRotaViaPoligono(user, 'norte');

    expect(await screen.findByText('Falha ao otimizar.')).toBeInTheDocument();
    const linha = await screen.findByText('Rota 1');
    expect(await within(linha.closest('tr')!).findByText('Erro')).toBeInTheDocument();
  });
});
