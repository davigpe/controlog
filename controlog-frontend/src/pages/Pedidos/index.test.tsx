import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import { paginated } from '@/test/paginated';
import Pedidos from './index';
import type { Pedido } from './types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

function pedido(id: string, codigo: string): Pedido {
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
    planoId: null,
    rotaIndex: null,
  };
}

const PEDIDOS = [pedido('p1', 'PED-001'), pedido('p2', 'PED-002'), pedido('p3', 'PED-003')];

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: paginated(PEDIDOS) });
});

describe('Pedidos', () => {
  test('lista os pedidos disponíveis', async () => {
    renderWithProviders(<Pedidos />);

    expect(await screen.findByText('PED-001')).toBeInTheDocument();
    expect(screen.getByText('PED-002')).toBeInTheDocument();
    expect(mockedApi.get).toHaveBeenCalledWith(
      '/pedidos',
      expect.objectContaining({ params: expect.objectContaining({ disponivel: true }) })
    );
  });

  test('gerar pedidos aleatórios chama a API com a quantidade informada', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: [] });
    renderWithProviders(<Pedidos />);
    await screen.findByText('PED-001');

    const campoQuantidade = screen.getByLabelText('Quantidade a gerar');
    await user.clear(campoQuantidade);
    await user.type(campoQuantidade, '15');
    await user.click(screen.getByRole('button', { name: /Gerar Pedidos Aleatórios/ }));

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/pedidos/gerar', { quantidade: 15 }));
    expect(await screen.findByText('15 pedido(s) gerado(s).')).toBeInTheDocument();
  });

  test('selecionar pedidos e criar um plano chama a API com os ids certos', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: { id: 'plano1' } });
    renderWithProviders(<Pedidos />);
    await screen.findByText('PED-001');

    await user.click(screen.getByRole('checkbox', { name: 'Selecionar pedido PED-001' }));
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar pedido PED-002' }));

    expect(screen.getByText('2 pedido(s) selecionado(s)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar Plano' }));

    const campoNome = await screen.findByLabelText('Nome do plano');
    await user.type(campoNome, 'Plano da Manhã');
    await user.click(screen.getByRole('button', { name: 'Criar Plano' }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith('/planos', { nome: 'Plano da Manhã', pedidoIds: ['p1', 'p2'] })
    );
    expect(await screen.findByText('Plano criado.')).toBeInTheDocument();
  });

  test('selecionar todos marca e desmarca cada linha', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Pedidos />);
    await screen.findByText('PED-001');

    await user.click(screen.getByRole('checkbox', { name: 'Selecionar todos os pedidos' }));
    expect(screen.getByText('3 pedido(s) selecionado(s)')).toBeInTheDocument();
    for (const codigo of ['PED-001', 'PED-002', 'PED-003']) {
      expect(screen.getByRole('checkbox', { name: `Selecionar pedido ${codigo}` })).toBeChecked();
    }

    await user.click(screen.getByRole('checkbox', { name: 'Selecionar todos os pedidos' }));
    expect(screen.queryByText(/pedido\(s\) selecionado\(s\)/)).not.toBeInTheDocument();
  });

  test('estado vazio quando não há pedidos disponíveis', async () => {
    mockedApi.get.mockResolvedValue({ data: paginated([]) });
    renderWithProviders(<Pedidos />);

    expect(await screen.findByText('Nenhum pedido disponível — gere alguns pra começar.')).toBeInTheDocument();
  });
});
