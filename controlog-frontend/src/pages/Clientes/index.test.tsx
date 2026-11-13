import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import { paginated } from '@/test/paginated';
import Clientes from './index';
import type { Cliente } from './types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

const mercado: Cliente = {
  id: 'c1',
  codigo: 'CLI-001',
  nome: 'Mercado Bom Preço',
  endereco: 'Rua das Palmeiras, 120',
  bairro: 'Centro',
  cidade: 'Joinville',
  uf: 'SC',
  coordenadas: [-26.303486, -48.844667],
  ativo: true,
  criadoEm: new Date().toISOString(),
  totalPedidos: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: paginated([mercado]) });
});

describe('Clientes', () => {
  test('lista o cliente com código, endereço e total de pedidos', async () => {
    renderWithProviders(<Clientes />);

    expect(await screen.findByText('Mercado Bom Preço')).toBeInTheDocument();
    expect(screen.getByText('CLI-001')).toBeInTheDocument();
    expect(screen.getByText('Rua das Palmeiras, 120')).toBeInTheDocument();
    expect(screen.getByText(/3 pedido\(s\)/)).toBeInTheDocument();
  });

  test('mostra o estado ativo', async () => {
    renderWithProviders(<Clientes />);
    expect(await screen.findByText('Ativo')).toBeInTheDocument();
  });

  test('buscar manda o termo para a API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Clientes />);
    await screen.findByText('Mercado Bom Preço');

    await user.type(screen.getByLabelText('Buscar clientes'), 'palmeiras');

    await waitFor(() =>
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/clientes',
        expect.objectContaining({ params: expect.objectContaining({ busca: 'palmeiras' }) })
      )
    );
  });

  test('filtrar por inativos manda ativo=false', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Clientes />);
    await screen.findByText('Mercado Bom Preço');

    await user.click(screen.getByRole('button', { name: 'Inativos' }));

    await waitFor(() =>
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/clientes',
        expect.objectContaining({ params: expect.objectContaining({ ativo: false }) })
      )
    );
  });

  // A coordenada é o que posiciona o cliente no mapa e alimenta a otimização;
  // aceitar o cadastro sem ela só adiaria o erro.
  test('o formulário recusa cadastro sem coordenada', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Clientes />);
    await screen.findByText('Mercado Bom Preço');

    await user.click(screen.getByRole('button', { name: /novo cliente/i }));
    await screen.findByRole('dialog');

    await user.type(screen.getByLabelText('Código'), 'CLI-900');
    await user.type(screen.getByLabelText('Nome'), 'Teste');
    await user.type(screen.getByLabelText('Endereço'), 'Rua Teste, 10');
    await user.type(screen.getByLabelText('Bairro'), 'Centro');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByText('Informe a latitude.')).toBeInTheDocument();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  test('cadastrar manda os dados com as coordenadas', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: mercado });
    renderWithProviders(<Clientes />);
    await screen.findByText('Mercado Bom Preço');

    await user.click(screen.getByRole('button', { name: /novo cliente/i }));
    await screen.findByRole('dialog');

    await user.type(screen.getByLabelText('Código'), 'CLI-900');
    await user.type(screen.getByLabelText('Nome'), 'Padaria Teste');
    await user.type(screen.getByLabelText('Endereço'), 'Rua Teste, 10');
    await user.type(screen.getByLabelText('Bairro'), 'Centro');
    await user.type(screen.getByLabelText('Latitude'), '-26.31');
    await user.type(screen.getByLabelText('Longitude'), '-48.85');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/clientes',
        expect.objectContaining({
          codigo: 'CLI-900',
          nome: 'Padaria Teste',
          lat: -26.31,
          lng: -48.85,
          // Padrão da praça da operação, para não redigitar a cada cadastro.
          cidade: 'Joinville',
          uf: 'SC',
        })
      )
    );
  });

  test('o aviso de exclusão explica o bloqueio por pedidos vinculados', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Clientes />);
    await screen.findByText('Mercado Bom Preço');

    await user.click(screen.getByRole('button', { name: /excluir mercado bom preço/i }));

    expect(await screen.findByText(/marque como inativo/i)).toBeInTheDocument();
  });
});
