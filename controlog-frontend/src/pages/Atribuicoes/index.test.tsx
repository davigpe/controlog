import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import { paginated } from '@/test/paginated';
import Atribuicoes from './index';
import type { Rota } from '@/pages/Rotas/types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

const CARLOS = '11111111-1111-4111-8111-111111111111';
const ANA = '33333333-3333-4333-8333-333333333333';
const VEICULO = '22222222-2222-4222-8222-222222222222';

const rota: Rota = {
  id: 'r1',
  codigo: 'RT-001',
  origem: 'Centro de Distribuição',
  destino: 'Centro, Glória',
  status: 'ATIVA',
  dataHora: '2026-10-15T08:00:00.000Z',
  criadoEm: '2026-10-14T08:00:00.000Z',
  coordenadasOrigem: [-26.3045, -48.8487],
  coordenadasDestino: [-26.28, -48.84],
  motorista: { id: CARLOS, nome: 'Carlos Silva' },
  veiculo: { id: VEICULO, placa: 'ABC-1234', modelo: 'Mercedes Sprinter' },
  veiculoProprio: false,
  totalEntregas: 3,
  entregasPendentes: 2,
};

const motoristas = [
  { id: CARLOS, nome: 'Carlos Silva', cnh: '1', telefone: '1', status: 'ATIVO', emRota: true, entregasRealizadas: 0, criadoEm: '', acessoEmail: null },
  { id: ANA, nome: 'Ana Souza', cnh: '2', telefone: '2', status: 'ATIVO', emRota: false, entregasRealizadas: 0, criadoEm: '', acessoEmail: null },
];
const veiculos = [
  { id: VEICULO, placa: 'ABC-1234', modelo: 'Mercedes Sprinter', capacidade: '1.500 kg', status: 'DISPONIVEL', emRota: true, criadoEm: '' },
];

function mockGet(rotas: Rota[] = [rota]) {
  mockedApi.get.mockImplementation((url: string) => {
    if (url === '/rotas') return Promise.resolve({ data: paginated(rotas) });
    if (url === '/motoristas') return Promise.resolve({ data: paginated(motoristas) });
    if (url === '/veiculos') return Promise.resolve({ data: paginated(veiculos) });
    return Promise.resolve({ data: paginated([]) });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGet();
});

describe('Atribuicoes', () => {
  test('lista as rotas aprovadas com motorista, veículo e contagem de entregas', async () => {
    renderWithProviders(<Atribuicoes />);

    expect(await screen.findByText('RT-001')).toBeInTheDocument();
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    expect(screen.getByText('ABC-1234')).toBeInTheDocument();
    expect(screen.getByText('(2 pendentes)')).toBeInTheDocument();
  });

  // O filtro padrão é "Ativas": são as rotas que ainda faz sentido reatribuir.
  test('abre filtrando por rotas ativas', async () => {
    renderWithProviders(<Atribuicoes />);
    await screen.findByText('RT-001');

    expect(mockedApi.get).toHaveBeenCalledWith(
      '/rotas',
      expect.objectContaining({ params: expect.objectContaining({ status: 'ATIVA' }) })
    );
  });

  test('trocar o filtro de status reconsulta a API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Atribuicoes />);
    await screen.findByText('RT-001');

    await user.click(screen.getByRole('button', { name: 'Concluídas' }));

    await waitFor(() =>
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/rotas',
        expect.objectContaining({ params: expect.objectContaining({ status: 'CONCLUIDA' }) })
      )
    );
  });

  test('atribuir a rota a outro motorista envia o novo motoristaId', async () => {
    const user = userEvent.setup();
    mockedApi.put.mockResolvedValue({ data: { ...rota, motorista: { id: ANA, nome: 'Ana Souza' } } });

    renderWithProviders(<Atribuicoes />);
    await screen.findByText('RT-001');

    await user.click(screen.getByRole('button', { name: 'Atribuir RT-001' }));
    await screen.findByRole('dialog', { name: 'Atribuir RT-001' });

    await user.click(screen.getByLabelText('Motorista'));
    await user.click(await screen.findByRole('option', { name: /Ana Souza/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar atribuição' }));

    await waitFor(() =>
      expect(mockedApi.put).toHaveBeenCalledWith('/rotas/r1', {
        motoristaId: ANA,
        veiculoId: VEICULO,
        // Acompanha o veiculoId sempre: a API representa os tres estados do
        // veiculo em dois campos, e mandar um sem o outro deixaria a rota
        // num estado que a constraint do banco recusa.
        veiculoProprio: false,
      })
    );
    expect(await screen.findByText('Rota RT-001 atribuída.')).toBeInTheDocument();
  });

  test('o modal avisa que as entregas pendentes vão junto', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Atribuicoes />);
    await screen.findByText('RT-001');

    await user.click(screen.getByRole('button', { name: 'Atribuir RT-001' }));

    expect(
      await screen.findByText(/2 entrega\(s\) pendente\(s\) — elas passam junto para o novo motorista/)
    ).toBeInTheDocument();
  });

  test('salvar fica desabilitado enquanto nada muda', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Atribuicoes />);
    await screen.findByText('RT-001');

    await user.click(screen.getByRole('button', { name: 'Atribuir RT-001' }));
    await screen.findByRole('dialog', { name: 'Atribuir RT-001' });

    expect(screen.getByRole('button', { name: 'Salvar atribuição' })).toBeDisabled();
  });

  test('erro da API ao atribuir mostra a mensagem do backend', async () => {
    const user = userEvent.setup();
    mockedApi.put.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Motorista informado não existe.' } },
    });

    renderWithProviders(<Atribuicoes />);
    await screen.findByText('RT-001');

    await user.click(screen.getByRole('button', { name: 'Atribuir RT-001' }));
    await screen.findByRole('dialog', { name: 'Atribuir RT-001' });
    await user.click(screen.getByLabelText('Motorista'));
    await user.click(await screen.findByRole('option', { name: /Ana Souza/ }));
    await user.click(screen.getByRole('button', { name: 'Salvar atribuição' }));

    expect(await screen.findByText('Motorista informado não existe.')).toBeInTheDocument();
  });

  test('sem rotas aprovadas mostra o estado vazio explicando a origem delas', async () => {
    mockGet([]);
    renderWithProviders(<Atribuicoes />);

    expect(await screen.findByText(/Nenhuma rota aprovada para este filtro/)).toBeInTheDocument();
  });
});

describe('Atribuições — motorista e veículo opcionais', () => {
  beforeEach(() => {
    mockedApi.get.mockImplementation(async (url: string) => {
      if (url === '/rotas') return { data: paginated([rota]) };
      if (url === '/motoristas') return { data: paginated(motoristas) };
      if (url === '/veiculos') return { data: paginated(veiculos) };
      return { data: paginated([]) };
    });
  });

  // Aprovar a rota antes de saber quem dirige é o caso que motivou tornar o
  // vínculo opcional; desfazer a atribuição é o mesmo caminho de volta.
  test('escolher "A definir" no motorista envia null', async () => {
    const user = userEvent.setup();
    mockedApi.put.mockResolvedValue({ data: { ...rota, motorista: null } });

    renderWithProviders(<Atribuicoes />);
    await screen.findByText('RT-001');

    await user.click(screen.getByRole('button', { name: 'Atribuir RT-001' }));
    await screen.findByRole('dialog', { name: 'Atribuir RT-001' });

    await user.click(screen.getByLabelText('Motorista'));
    await user.click(await screen.findByRole('option', { name: 'A definir' }));
    await user.click(screen.getByRole('button', { name: 'Salvar atribuição' }));

    await waitFor(() =>
      expect(mockedApi.put).toHaveBeenCalledWith('/rotas/r1', {
        motoristaId: null,
        veiculoId: VEICULO,
        veiculoProprio: false,
      })
    );
  });

  test('escolher "Veículo próprio" envia a marcação e zera o veiculoId', async () => {
    const user = userEvent.setup();
    mockedApi.put.mockResolvedValue({ data: { ...rota, veiculo: null, veiculoProprio: true } });

    renderWithProviders(<Atribuicoes />);
    await screen.findByText('RT-001');

    await user.click(screen.getByRole('button', { name: 'Atribuir RT-001' }));
    await screen.findByRole('dialog', { name: 'Atribuir RT-001' });

    await user.click(screen.getByLabelText('Veículo'));
    await user.click(await screen.findByRole('option', { name: 'Veículo próprio' }));
    await user.click(screen.getByRole('button', { name: 'Salvar atribuição' }));

    await waitFor(() =>
      expect(mockedApi.put).toHaveBeenCalledWith('/rotas/r1', {
        motoristaId: rota.motorista!.id,
        veiculoId: null,
        veiculoProprio: true,
      })
    );
  });

  test('uma rota sem motorista mostra "A definir" na lista', async () => {
    mockedApi.get.mockImplementation(async (url: string) => {
      if (url === '/rotas') {
        return { data: paginated([{ ...rota, motorista: null, veiculo: null, veiculoProprio: false }]) };
      }
      return { data: paginated([]) };
    });

    renderWithProviders(<Atribuicoes />);
    expect(await screen.findAllByText('A definir')).not.toHaveLength(0);
  });
});
