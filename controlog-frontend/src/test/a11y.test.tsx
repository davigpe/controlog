import { beforeEach, describe, expect, test, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { axe } from './axeHelper';
import { renderWithProviders } from './renderWithProviders';
import { paginated } from './paginated';
import Login from '@/pages/Login';
import EsqueciSenha from '@/pages/EsqueciSenha';
import RedefinirSenha from '@/pages/RedefinirSenha';
import Dashboard from '@/pages/Dashboard';
import Motoristas from '@/pages/Motoristas';
import Veiculos from '@/pages/Veiculos';
import Entregas from '@/pages/Entregas';
import Rotas from '@/pages/Rotas';
import Relatorios from '@/pages/Relatorios';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});
const mockedApi = vi.mocked(api, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: paginated([]) });
});

// Guarda de regressão: sem erros estruturais de acessibilidade (nome acessível de
// botões/campos/selects, labels de formulário, atributos ARIA válidos — WCAG 2.1 AA).
// Contraste de cor é verificado à parte, num navegador real (ver docs/AUDITORIA_ACESSIBILIDADE.md).
describe('acessibilidade (regressão estrutural)', () => {
  test('Login não tem violações de acessibilidade', async () => {
    const { container } = renderWithProviders(<Login />, { route: '/login' });
    await expect(axe(container)).resolves.toHaveNoViolations();
  });

  test('Esqueci minha senha não tem violações de acessibilidade', async () => {
    const { container } = renderWithProviders(<EsqueciSenha />, { route: '/esqueci-senha' });
    await expect(axe(container)).resolves.toHaveNoViolations();
  });

  test('Redefinir senha (com token) não tem violações de acessibilidade', async () => {
    const { container } = renderWithProviders(<RedefinirSenha />, {
      route: '/redefinir-senha?token=abc123',
    });
    await expect(axe(container)).resolves.toHaveNoViolations();
  });

  test('Redefinir senha (sem token) não tem violações de acessibilidade', async () => {
    const { container } = renderWithProviders(<RedefinirSenha />, { route: '/redefinir-senha' });
    await expect(axe(container)).resolves.toHaveNoViolations();
  });

  test('Dashboard não tem violações de acessibilidade', async () => {
    mockedApi.get.mockResolvedValue({
      data: { rotas: { ativas: 0, concluidas: 0, canceladas: 0, total: 0 }, totalMotoristas: 0, totalVeiculos: 0, totalEntregas: 0, entregasPorStatus: {} },
    });
    const { container, findByText } = renderWithProviders(<Dashboard />);
    await findByText('Rotas Ativas');
    await expect(axe(container)).resolves.toHaveNoViolations();
  });

  test('Motoristas (lista vazia) não tem violações de acessibilidade', async () => {
    const { container, findByText } = renderWithProviders(<Motoristas />);
    await findByText('Nenhum motorista encontrado para os filtros aplicados.');
    await expect(axe(container)).resolves.toHaveNoViolations();
  });

  test('Motoristas — modal Novo Motorista não tem violações de acessibilidade', async () => {
    const user = userEvent.setup();
    const { container, findByRole } = renderWithProviders(<Motoristas />);
    await user.click(await findByRole('button', { name: /Novo Motorista/i }));
    await findByRole('dialog');
    await expect(axe(container)).resolves.toHaveNoViolations();
  });

  test('Veículos (lista vazia) não tem violações de acessibilidade', async () => {
    const { container, findByText } = renderWithProviders(<Veiculos />);
    await findByText('Nenhum veículo encontrado para os filtros aplicados.');
    await expect(axe(container)).resolves.toHaveNoViolations();
  });

  test('Entregas (lista vazia) não tem violações de acessibilidade', async () => {
    const { container, findByText } = renderWithProviders(<Entregas />);
    await findByText('Nenhuma entrega encontrada para os filtros aplicados.');
    await expect(axe(container)).resolves.toHaveNoViolations();
  });

  test('Rotas (lista vazia) não tem violações de acessibilidade', async () => {
    const { container, findByText } = renderWithProviders(<Rotas />);
    await findByText('Nenhuma rota encontrada.');
    await expect(axe(container)).resolves.toHaveNoViolations();
  });

  test('Rotas — modal Nova Rota não tem violações de acessibilidade', async () => {
    const user = userEvent.setup();
    const { container, findByRole } = renderWithProviders(<Rotas />);
    await user.click(await findByRole('button', { name: /Nova Rota/i }));
    await findByRole('dialog');
    await expect(axe(container)).resolves.toHaveNoViolations();
  });

  test('Relatórios não tem violações de acessibilidade', async () => {
    mockedApi.get.mockResolvedValue({
      data: { periodo: { dataInicio: null, dataFim: null }, rotasPorStatus: {}, entregasPorStatus: {}, totalEntregas: 0, motoristasMaisAtivos: [] },
    });
    const { container, findByText } = renderWithProviders(<Relatorios />);
    await findByText('Total de Entregas');
    await expect(axe(container)).resolves.toHaveNoViolations();
  });
});
