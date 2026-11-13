import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import PlanoDetalhe from './index';
import type { PlanoDetalhe as PlanoDetalheType } from './types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

interface Coordenada {
  lat: number;
  lng: number;
}

// Polígono que cobre só a região "norte" dos pedidos fixtures (lat ~10) e um
// que não cobre nenhum — permite montar seleções previsíveis sem coordenadas
// aleatórias.
const POLIGONO_NORTE: Coordenada[] = [
  { lat: 5, lng: 5 },
  { lat: 5, lng: 15 },
  { lat: 15, lng: 15 },
  { lat: 15, lng: 5 },
];
const POLIGONO_VAZIO: Coordenada[] = [
  { lat: 50, lng: 50 },
  { lat: 50, lng: 51 },
  { lat: 51, lng: 51 },
];

// Leaflet nunca é montado em teste automatizado neste projeto — o mock expõe
// os grupos recebidos e, em modo desenho, botões que chamam onCliqueMapa com
// coordenadas fixas, simulando o desenho do polígono sem eventos de mouse.
vi.mock('./PlanoMapa', () => ({
  default: ({
    grupos,
    naoAtribuidos,
    pedidosSelecionadosIds,
    grupoEmFocoIndice,
    modoDesenho,
    onCliqueMapa,
  }: {
    grupos: { indice: number; pedidos: { codigo: string }[] }[];
    naoAtribuidos?: { id: string }[];
    pedidosSelecionadosIds?: Set<string>;
    grupoEmFocoIndice?: number | null;
    modoDesenho?: boolean;
    onCliqueMapa?: (ponto: Coordenada) => void;
  }) => (
    <div
      data-testid="plano-mapa"
      data-selecionados={pedidosSelecionadosIds?.size ?? 0}
      data-nao-atribuidos={naoAtribuidos?.length ?? 0}
      data-grupo-foco={grupoEmFocoIndice ?? ''}
    >
      {grupos.map((grupo) => (
        <div key={grupo.indice} data-testid={`mapa-rota-${grupo.indice}`}>
          {grupo.pedidos.length} pedido(s)
        </div>
      ))}
      {modoDesenho && onCliqueMapa && (
        <>
          <button onClick={() => POLIGONO_NORTE.forEach(onCliqueMapa)}>desenhar polígono norte</button>
          <button onClick={() => POLIGONO_VAZIO.forEach(onCliqueMapa)}>desenhar polígono vazio</button>
        </>
      )}
    </div>
  ),
}));

function resultadoOtimizacaoFake(pedidos: { id: string }[]) {
  return {
    ordem: pedidos.map((p, indice) => ({ ...p, posicao: indice + 1 })),
    distanciaOtimizadaKm: 1,
    distanciaOriginalKm: 1,
    economiaPercentual: 0,
    rotaReal: null,
  };
}

function pedido(
  id: string,
  codigo: string,
  rotaIndex: number | null = null,
  rota: { codigo: string } | null = null,
  coords: Coordenada = { lat: -26.3, lng: -48.8 }
) {
  return {
    id,
    codigo,
    clienteNome: 'Cliente Teste', clienteId: null,
    endereco: 'Rua Teste, 1',
    cidade: 'Centro',
    lat: coords.lat,
    lng: coords.lng,
    unidades: 5,
    volumeM3: 0.5,
    criadoEm: new Date().toISOString(),
    planoId: 'plano1',
    rotaIndex,
    rota,
  };
}

// Dois pedidos "ao norte" (dentro de POLIGONO_NORTE) na Rota 1 e um "ao sul"
// fora dele na Rota 2 — base pros testes de seleção por polígono.
const NORTE = { lat: 10, lng: 10 };
const NORTE_2 = { lat: 10, lng: 12 };
const SUL = { lat: -10, lng: -10 };

function planoComRegioes(): PlanoDetalheType {
  return {
    id: 'plano1',
    nome: 'Plano Norte',
    status: 'OTIMIZADO',
    criadoEm: new Date().toISOString(),
    pedidos: [
      pedido('p1', 'PED-001', 1, null, NORTE),
      pedido('p2', 'PED-002', 1, null, NORTE_2),
      pedido('p3', 'PED-003', 2, null, SUL),
    ],
  };
}

function planoAberto(): PlanoDetalheType {
  return {
    id: 'plano1',
    nome: 'Plano Norte',
    status: 'ABERTO',
    criadoEm: new Date().toISOString(),
    pedidos: [pedido('p1', 'PED-001'), pedido('p2', 'PED-002'), pedido('p3', 'PED-003')],
  };
}

function renderPlano() {
  return renderWithProviders(
    <Routes>
      <Route path="/planos/:id" element={<PlanoDetalhe />} />
    </Routes>,
    { route: '/planos/plano1' }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlanoDetalhe', () => {
  test('mostra os pedidos do plano numa tabela plana enquanto está Aberto', async () => {
    mockedApi.get.mockResolvedValue({ data: planoAberto() });
    renderPlano();

    expect(await screen.findByText('Plano Norte')).toBeInTheDocument();
    expect(screen.getByText('Aberto')).toBeInTheDocument();
    expect(screen.getByText('PED-001')).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalledWith('/planos/plano1');
  });

  test('otimizar divide os pedidos em grupos e mostra uma seção por rota', async () => {
    const user = userEvent.setup();
    const planoOtimizado = {
      ...planoAberto(),
      status: 'OTIMIZADO' as const,
      pedidos: [pedido('p1', 'PED-001', 1), pedido('p2', 'PED-002', 1), pedido('p3', 'PED-003', 2)],
    };
    // useOtimizarPlano invalida a query e ela refaz um GET — precisa refletir
    // o plano já otimizado nessa segunda chamada, não só na resposta do POST.
    mockedApi.get.mockResolvedValueOnce({ data: planoAberto() }).mockResolvedValue({ data: planoOtimizado });
    // Dois endpoints diferentes atrás do mesmo mock de POST: o de otimizar o
    // plano (chunking) e o de otimizar cada rota pro mapa (traçado real).
    mockedApi.post.mockImplementation((url: string, body?: unknown) => {
      if (url === '/planos/plano1/otimizar') return Promise.resolve({ data: planoOtimizado });
      const { pedidos } = body as { pedidos?: { id: string }[] };
      return Promise.resolve({ data: resultadoOtimizacaoFake(pedidos ?? []) });
    });
    renderPlano();
    await screen.findByText('Plano Norte');

    const campoTamanho = screen.getByLabelText('Pedidos por rota');
    await user.clear(campoTamanho);
    await user.type(campoTamanho, '2');
    await user.click(screen.getByRole('button', { name: /Otimizar Plano/ }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith('/planos/plano1/otimizar', { tamanhoRota: 2 })
    );
    expect(await screen.findByText('Plano otimizado.')).toBeInTheDocument();
    expect(screen.getByText('Rota 1')).toBeInTheDocument();
    expect(screen.getByText('Rota 2')).toBeInTheDocument();

    const secaoRota1 = screen.getByText('Rota 1').closest('div')!.parentElement!;
    expect(within(secaoRota1).getByText('PED-001')).toBeInTheDocument();
    expect(within(secaoRota1).getByText('PED-002')).toBeInTheDocument();
    expect(within(secaoRota1).queryByText('PED-003')).not.toBeInTheDocument();
  });

  test('depois de otimizar, calcula o traçado de cada rota (uma chamada por grupo) e alimenta o mapa', async () => {
    const user = userEvent.setup();
    const planoOtimizado = {
      ...planoAberto(),
      status: 'OTIMIZADO' as const,
      pedidos: [pedido('p1', 'PED-001', 1), pedido('p2', 'PED-002', 1), pedido('p3', 'PED-003', 2)],
    };
    mockedApi.get.mockResolvedValueOnce({ data: planoAberto() }).mockResolvedValue({ data: planoOtimizado });
    mockedApi.post.mockImplementation((url: string, body?: unknown) => {
      if (url === '/planos/plano1/otimizar') return Promise.resolve({ data: planoOtimizado });
      const { pedidos } = body as { pedidos?: { id: string }[] };
      return Promise.resolve({ data: resultadoOtimizacaoFake(pedidos ?? []) });
    });
    renderPlano();
    await screen.findByText('Plano Norte');

    await user.click(screen.getByRole('button', { name: /Otimizar Plano/ }));
    await screen.findByText('Plano otimizado.');

    await waitFor(() => expect(screen.getByTestId('mapa-rota-1')).toHaveTextContent('2 pedido(s)'));
    expect(screen.getByTestId('mapa-rota-2')).toHaveTextContent('1 pedido(s)');

    const chamadasOtimizarRota = mockedApi.post.mock.calls.filter(([url]) => url === '/otimizacao-rotas/otimizar');
    expect(chamadasOtimizarRota).toHaveLength(2);
    expect(chamadasOtimizarRota[0][1]).toMatchObject({ pedidos: [{ id: 'p1' }, { id: 'p2' }] });
    expect(chamadasOtimizarRota[1][1]).toMatchObject({ pedidos: [{ id: 'p3' }] });
  });

  test('grupo já aprovado mostra o código da rota real; grupo pendente mostra o botão de aprovar', async () => {
    const planoComUmaRotaAprovada = {
      ...planoAberto(),
      status: 'OTIMIZADO' as const,
      pedidos: [
        pedido('p1', 'PED-001', 1, { codigo: 'RT-005' }),
        pedido('p2', 'PED-002', 1, { codigo: 'RT-005' }),
        pedido('p3', 'PED-003', 2),
      ],
    };
    mockedApi.get.mockResolvedValue({ data: planoComUmaRotaAprovada });
    mockedApi.post.mockResolvedValue({ data: resultadoOtimizacaoFake([]) });
    renderPlano();

    await screen.findByText('Rota 1');
    expect(screen.getByText('Aprovada — RT-005')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aprovar Rota' })).toBeInTheDocument();
  });

  test('clicar em Aprovar Rota abre o modal de aprovação com o grupo certo', async () => {
    const user = userEvent.setup();
    const planoOtimizado = {
      ...planoAberto(),
      status: 'OTIMIZADO' as const,
      pedidos: [pedido('p1', 'PED-001', 1), pedido('p2', 'PED-002', 1)],
    };
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/planos/plano1') return Promise.resolve({ data: planoOtimizado });
      return Promise.resolve({ data: { items: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 } } });
    });
    renderPlano();
    await screen.findByText('Rota 1');

    await user.click(screen.getByRole('button', { name: 'Aprovar Rota' }));

    expect(await screen.findByRole('dialog', { name: 'Aprovar Rota 1' })).toBeInTheDocument();
    expect(screen.getByText('2 pedido(s) vão virar uma rota real, com uma entrega vinculada pra cada um.')).toBeInTheDocument();
  });

  test('botão de reotimizar recalcula o traçado de uma única rota', async () => {
    const user = userEvent.setup();
    const planoOtimizado = {
      ...planoAberto(),
      status: 'OTIMIZADO' as const,
      pedidos: [pedido('p1', 'PED-001', 1), pedido('p2', 'PED-002', 1), pedido('p3', 'PED-003', 2)],
    };
    mockedApi.get.mockResolvedValue({ data: planoOtimizado });
    mockedApi.post.mockImplementation((_url: string, body?: unknown) => {
      const { pedidos } = body as { pedidos?: { id: string }[] };
      return Promise.resolve({ data: resultadoOtimizacaoFake(pedidos ?? []) });
    });
    renderPlano();
    await screen.findByText('Rota 1');

    // Cálculo automático inicial: uma chamada por grupo (2 grupos).
    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole('button', { name: 'Reotimizar Rota 1' }));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledTimes(3));
    const [url, body] = mockedApi.post.mock.calls[2];
    expect(url).toBe('/otimizacao-rotas/otimizar');
    expect((body as { pedidos: { id: string }[] }).pedidos.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(await screen.findByText('Traçado da Rota 1 recalculado.')).toBeInTheDocument();
  });

  test('selecionar por polígono e atribuir a seleção a outra rota', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockResolvedValue({ data: planoComRegioes() });
    mockedApi.post.mockImplementation((_url: string, body?: unknown) => {
      const { pedidos } = body as { pedidos?: { id: string }[] };
      return Promise.resolve({ data: resultadoOtimizacaoFake(pedidos ?? []) });
    });
    mockedApi.patch.mockResolvedValue({ data: planoComRegioes() });
    renderPlano();
    await screen.findByText('Rota 1');

    await user.click(screen.getByRole('button', { name: /Desenhar Polígono/ }));
    await user.click(await screen.findByRole('button', { name: 'desenhar polígono norte' }));
    await user.click(screen.getByRole('button', { name: /Finalizar Polígono/ }));

    // Os dois pedidos ao norte (p1 e p2) ficaram selecionados.
    expect(await screen.findByText('2 pedido(s) selecionado(s)')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Atribuir à rota existente'));
    await user.click(await screen.findByRole('option', { name: /Rota 2/ }));

    await waitFor(() =>
      expect(mockedApi.patch).toHaveBeenCalledWith('/planos/plano1/pedidos/rota', {
        pedidoIds: ['p1', 'p2'],
        rotaIndex: 2,
      })
    );
  });

  test('criar uma rota nova a partir da seleção usa o próximo índice livre', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockResolvedValue({ data: planoComRegioes() });
    mockedApi.post.mockImplementation((_url: string, body?: unknown) => {
      const { pedidos } = body as { pedidos?: { id: string }[] };
      return Promise.resolve({ data: resultadoOtimizacaoFake(pedidos ?? []) });
    });
    mockedApi.patch.mockResolvedValue({ data: planoComRegioes() });
    renderPlano();
    await screen.findByText('Rota 1');

    await user.click(screen.getByRole('button', { name: /Desenhar Polígono/ }));
    await user.click(await screen.findByRole('button', { name: 'desenhar polígono norte' }));
    await user.click(screen.getByRole('button', { name: /Finalizar Polígono/ }));
    await user.click(await screen.findByRole('button', { name: 'Criar rota' }));

    await waitFor(() =>
      expect(mockedApi.patch).toHaveBeenCalledWith('/planos/plano1/pedidos/rota', {
        pedidoIds: ['p1', 'p2'],
        rotaIndex: 3,
      })
    );
    expect(await screen.findByText('Rota 3 criada com 2 pedido(s).')).toBeInTheDocument();
  });

  test('desatribuir a seleção manda rotaIndex null', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockResolvedValue({ data: planoComRegioes() });
    mockedApi.post.mockImplementation((_url: string, body?: unknown) => {
      const { pedidos } = body as { pedidos?: { id: string }[] };
      return Promise.resolve({ data: resultadoOtimizacaoFake(pedidos ?? []) });
    });
    mockedApi.patch.mockResolvedValue({ data: planoComRegioes() });
    renderPlano();
    await screen.findByText('Rota 1');

    await user.click(screen.getByRole('button', { name: /Desenhar Polígono/ }));
    await user.click(await screen.findByRole('button', { name: 'desenhar polígono norte' }));
    await user.click(screen.getByRole('button', { name: /Finalizar Polígono/ }));
    await user.click(await screen.findByRole('button', { name: 'Desatribuir' }));

    await waitFor(() =>
      expect(mockedApi.patch).toHaveBeenCalledWith('/planos/plano1/pedidos/rota', {
        pedidoIds: ['p1', 'p2'],
        rotaIndex: null,
      })
    );
  });

  test('ação por rota "Desatribuir pedidos" ignora os que não são daquela rota', async () => {
    const user = userEvent.setup();
    // p1 (norte) é da Rota 1; p2 (norte também) passou pra Rota 2 — o polígono
    // pega os dois, mas desatribuir "da Rota 1" só pode tirar p1.
    const plano: PlanoDetalheType = {
      ...planoComRegioes(),
      pedidos: [
        pedido('p1', 'PED-001', 1, null, NORTE),
        pedido('p2', 'PED-002', 2, null, NORTE_2),
        pedido('p3', 'PED-003', 2, null, SUL),
      ],
    };
    mockedApi.get.mockResolvedValue({ data: plano });
    mockedApi.post.mockImplementation((_url: string, body?: unknown) => {
      const { pedidos } = body as { pedidos?: { id: string }[] };
      return Promise.resolve({ data: resultadoOtimizacaoFake(pedidos ?? []) });
    });
    mockedApi.patch.mockResolvedValue({ data: plano });
    renderPlano();
    await screen.findByText('Rota 1');

    const secaoRota1 = screen.getByRole('button', { name: 'Focar Rota 1' }).closest('div')!;
    await user.click(within(secaoRota1).getByRole('button', { name: 'Desatribuir pedidos' }));
    await user.click(await screen.findByRole('button', { name: 'desenhar polígono norte' }));
    await user.click(screen.getByRole('button', { name: /Finalizar Polígono/ }));

    await waitFor(() =>
      expect(mockedApi.patch).toHaveBeenCalledWith('/planos/plano1/pedidos/rota', {
        pedidoIds: ['p1'],
        rotaIndex: null,
      })
    );
    expect(
      await screen.findByText('1 pedido(s) selecionado(s) não pertenciam a essa rota e foram ignorados.')
    ).toBeInTheDocument();
  });

  test('polígono sem nenhum pedido avisa e encerra a seleção', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockResolvedValue({ data: planoComRegioes() });
    mockedApi.post.mockImplementation((_url: string, body?: unknown) => {
      const { pedidos } = body as { pedidos?: { id: string }[] };
      return Promise.resolve({ data: resultadoOtimizacaoFake(pedidos ?? []) });
    });
    renderPlano();
    await screen.findByText('Rota 1');

    await user.click(screen.getByRole('button', { name: /Desenhar Polígono/ }));
    await user.click(await screen.findByRole('button', { name: 'desenhar polígono vazio' }));
    await user.click(screen.getByRole('button', { name: /Finalizar Polígono/ }));

    expect(
      await screen.findByText('Nenhum pedido disponível dentro do polígono desenhado.')
    ).toBeInTheDocument();
    expect(mockedApi.patch).not.toHaveBeenCalled();
  });

  // Rota aprovada já virou Rota real com Entregas — o backend recusa movê-la,
  // e a interface nem oferece a ação.
  test('rota aprovada não mostra as ações de atribuir/desatribuir pedidos', async () => {
    const plano: PlanoDetalheType = {
      ...planoComRegioes(),
      pedidos: [
        pedido('p1', 'PED-001', 1, { codigo: 'RT-005' }, NORTE),
        pedido('p3', 'PED-003', 2, null, SUL),
      ],
    };
    mockedApi.get.mockResolvedValue({ data: plano });
    mockedApi.post.mockResolvedValue({ data: resultadoOtimizacaoFake([]) });
    renderPlano();
    await screen.findByText('Aprovada — RT-005');

    const secaoRota1 = screen.getByRole('button', { name: 'Focar Rota 1' }).closest('div')!;
    expect(within(secaoRota1).queryByRole('button', { name: 'Atribuir pedidos' })).not.toBeInTheDocument();

    const secaoRota2 = screen.getByRole('button', { name: 'Focar Rota 2' }).closest('div')!;
    expect(within(secaoRota2).getByRole('button', { name: 'Atribuir pedidos' })).toBeInTheDocument();
  });

  test('pedidos sem rota aparecem numa seção própria e vão pro mapa', async () => {
    const plano: PlanoDetalheType = {
      ...planoComRegioes(),
      pedidos: [
        pedido('p1', 'PED-001', 1, null, NORTE),
        pedido('p2', 'PED-002', null, null, NORTE_2),
      ],
    };
    mockedApi.get.mockResolvedValue({ data: plano });
    mockedApi.post.mockResolvedValue({ data: resultadoOtimizacaoFake([]) });
    renderPlano();

    expect(await screen.findByText('Sem rota')).toBeInTheDocument();
    expect(screen.getByText(/1 pedido\(s\) fora de qualquer rota/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('plano-mapa')).toHaveAttribute('data-nao-atribuidos', '1')
    );
  });

  test('clicar no nome da rota foca e desfoca ela no mapa', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockResolvedValue({ data: planoComRegioes() });
    mockedApi.post.mockResolvedValue({ data: resultadoOtimizacaoFake([]) });
    renderPlano();
    await screen.findByText('Rota 1');

    await user.click(screen.getByRole('button', { name: 'Focar Rota 1' }));
    expect(screen.getByTestId('plano-mapa')).toHaveAttribute('data-grupo-foco', '1');

    await user.click(screen.getByRole('button', { name: 'Desfocar Rota 1' }));
    expect(screen.getByTestId('plano-mapa')).toHaveAttribute('data-grupo-foco', '');
  });

  test('plano Aberto não mostra o mapa de rotas', async () => {
    mockedApi.get.mockResolvedValue({ data: planoAberto() });
    renderPlano();

    await screen.findByText('Plano Norte');
    expect(screen.queryByTestId('plano-mapa')).not.toBeInTheDocument();
  });

  test('renomear o plano', async () => {
    const user = userEvent.setup();
    mockedApi.get.mockResolvedValue({ data: planoAberto() });
    mockedApi.put.mockResolvedValue({ data: { ...planoAberto(), nome: 'Plano Renomeado' } });
    renderPlano();
    await screen.findByText('Plano Norte');

    await user.click(screen.getByRole('button', { name: 'Editar nome do plano' }));
    const campoNome = await screen.findByLabelText('Nome');
    await user.clear(campoNome);
    await user.type(campoNome, 'Plano Renomeado');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(mockedApi.put).toHaveBeenCalledWith('/planos/plano1', { nome: 'Plano Renomeado' }));
    expect(await screen.findByText('Plano renomeado.')).toBeInTheDocument();
  });

  test('plano sem nenhum pedido mostra estado vazio e desabilita "Otimizar Plano"', async () => {
    mockedApi.get.mockResolvedValue({ data: { ...planoAberto(), pedidos: [] } });
    renderPlano();

    expect(await screen.findByText('Este plano não tem nenhum pedido vinculado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Otimizar Plano/ })).toBeDisabled();
  });
});

describe('PlanoDetalhe — aprovar sem motorista e com veículo próprio', () => {
  function planoPronto() {
    return {
      ...planoAberto(),
      status: 'OTIMIZADO' as const,
      pedidos: [pedido('p1', 'PED-001', 1)],
    };
  }

  function soOPlano() {
    mockedApi.get.mockImplementation((url: string) => {
      if (url === '/planos/plano1') return Promise.resolve({ data: planoPronto() });
      return Promise.resolve({
        data: { items: [], pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 } },
      });
    });
  }

  // O caso que motivou a mudança: aprovar a rota antes de saber quem dirige.
  test('aprova com motorista e veículo em "A definir" e envia null nos dois', async () => {
    const user = userEvent.setup();
    soOPlano();
    mockedApi.post.mockResolvedValue({ data: { id: 'r1', codigo: 'RT-010' } });
    renderPlano();
    await screen.findByText('Rota 1');

    await user.click(screen.getByRole('button', { name: 'Aprovar Rota' }));
    await screen.findByRole('dialog', { name: 'Aprovar Rota 1' });
    await user.click(screen.getByRole('button', { name: 'Aprovar Rota' }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/planos/plano1/rotas/1/aprovar',
        expect.objectContaining({
          motoristaId: null,
          veiculoId: null,
          veiculoProprio: false,
        })
      )
    );
  });

  test('o modal explica que dá para definir o resto depois', async () => {
    const user = userEvent.setup();
    soOPlano();
    renderPlano();
    await screen.findByText('Rota 1');

    await user.click(screen.getByRole('button', { name: 'Aprovar Rota' }));
    await screen.findByRole('dialog', { name: 'Aprovar Rota 1' });

    expect(
      screen.getByText(/pode aprovar agora e definir o restante depois/i)
    ).toBeInTheDocument();
  });

  test('escolher "Veículo próprio" envia a marcação com veiculoId nulo', async () => {
    const user = userEvent.setup();
    soOPlano();
    mockedApi.post.mockResolvedValue({ data: { id: 'r1', codigo: 'RT-010' } });
    renderPlano();
    await screen.findByText('Rota 1');

    await user.click(screen.getByRole('button', { name: 'Aprovar Rota' }));
    await screen.findByRole('dialog', { name: 'Aprovar Rota 1' });

    await user.click(screen.getByLabelText('Veículo'));
    await user.click(await screen.findByRole('option', { name: 'Veículo próprio' }));
    await user.click(screen.getByRole('button', { name: 'Aprovar Rota' }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/planos/plano1/rotas/1/aprovar',
        expect.objectContaining({ veiculoProprio: true, veiculoId: null })
      )
    );
  });
});
