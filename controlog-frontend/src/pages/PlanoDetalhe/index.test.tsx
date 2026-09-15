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
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

function pedido(id: string, codigo: string, rotaIndex: number | null = null) {
  return {
    id,
    codigo,
    cliente: 'Cliente Teste',
    endereco: 'Rua Teste, 1',
    cidade: 'Centro',
    lat: -26.3,
    lng: -48.8,
    unidades: 5,
    volumeM3: 0.5,
    criadoEm: new Date().toISOString(),
    planoId: 'plano1',
    rotaIndex,
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
    mockedApi.post.mockResolvedValue({ data: planoOtimizado });
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
