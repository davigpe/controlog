import { beforeEach, describe, expect, test, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from '@/lib/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import { paginated } from '@/test/paginated';
import Motoristas from './index';
import { PlanilhaInvalidaError, type LinhaPlanilha } from './planilha';
import type { Motorista } from './types';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } };
});

// A leitura do .xlsx é mockada: o que estes testes verificam é o fluxo da
// tela (prévia, envio, erro por linha), não a biblioteca de planilha.
vi.mock('./planilha', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./planilha')>();
  return {
    ...actual,
    lerPlanilhaMotoristas: vi.fn(),
    baixarModeloMotoristas: vi.fn(),
  };
});

const { lerPlanilhaMotoristas, baixarModeloMotoristas } = await import('./planilha');
const mockedApi = vi.mocked(api, true);
const mockedLer = vi.mocked(lerPlanilhaMotoristas);
const mockedModelo = vi.mocked(baixarModeloMotoristas);

const carlos: Motorista = {
  id: 'm1',
  nome: 'Carlos Silva',
  cnh: '12345678901',
  telefone: '(47) 99111-1111',
  status: 'ATIVO',
  emRota: false,
  entregasRealizadas: 0,
  criadoEm: new Date().toISOString(),
  acessoEmail: null,
};

const linhas: LinhaPlanilha[] = [
  { linhaPlanilha: 2, dados: { nome: 'Ana Souza', cnh: '23456789012', telefone: '(47) 99222-2222' } },
  { linhaPlanilha: 3, dados: { nome: 'Pedro Lima', cnh: '34567890123', telefone: '(47) 99333-3333' } },
];

const arquivo = () =>
  new File(['conteudo'], 'motoristas.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

async function abrirModalComArquivo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Importar planilha/i }));
  await user.upload(screen.getByLabelText('Planilha preenchida'), arquivo());
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.get.mockResolvedValue({ data: paginated([carlos]) });
  mockedLer.mockResolvedValue(linhas);
});

describe('Importação de motoristas por planilha', () => {
  test('baixa o modelo da planilha', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Motoristas />);
    await screen.findByText('Carlos Silva');

    await user.click(screen.getByRole('button', { name: /Importar planilha/i }));
    await user.click(screen.getByRole('button', { name: /Baixar modelo/i }));

    await waitFor(() => expect(mockedModelo).toHaveBeenCalledTimes(1));
  });

  test('mostra a prévia das linhas lidas do arquivo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Motoristas />);
    await screen.findByText('Carlos Silva');

    await abrirModalComArquivo(user);

    expect(await screen.findByText(/2 motoristas lidos de motoristas\.xlsx/)).toBeInTheDocument();
    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Pedro Lima')).toBeInTheDocument();
  });

  test('envia as linhas para a API e avisa quantas entraram', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockResolvedValue({ data: { importados: 2 } });

    renderWithProviders(<Motoristas />);
    await screen.findByText('Carlos Silva');
    await abrirModalComArquivo(user);

    await user.click(await screen.findByRole('button', { name: 'Importar 2 motoristas' }));

    await waitFor(() =>
      expect(mockedApi.post).toHaveBeenCalledWith('/motoristas/importar', {
        motoristas: [linhas[0].dados, linhas[1].dados],
      })
    );
    expect(await screen.findByText('2 motoristas importados.')).toBeInTheDocument();
  });

  // O backend devolve o índice no array; a tela precisa mostrar o número da
  // linha da planilha, que é o que o usuário enxerga no Excel.
  test('traduz o índice recusado pela API no número da linha da planilha', async () => {
    const user = userEvent.setup();
    mockedApi.post.mockRejectedValue({
      isAxiosError: true,
      response: {
        data: {
          message: 'A planilha tem 1 linha com problema. Nada foi importado.',
          details: { erros: [{ indice: 1, mensagem: 'CNH já cadastrada no sistema (Pedro Lima).' }] },
        },
      },
    });

    renderWithProviders(<Motoristas />);
    await screen.findByText('Carlos Silva');
    await abrirModalComArquivo(user);
    await user.click(await screen.findByRole('button', { name: 'Importar 2 motoristas' }));

    // Índice 1 do array corresponde à linha 3 da planilha.
    expect(await screen.findByText('Linha 3:')).toBeInTheDocument();
    expect(
      screen.getByText(/CNH já cadastrada no sistema \(Pedro Lima\)\./)
    ).toBeInTheDocument();
  });

  test('explica o problema quando o arquivo não é uma planilha válida', async () => {
    const user = userEvent.setup();
    mockedLer.mockRejectedValue(
      new PlanilhaInvalidaError('A planilha não tem uma coluna "Nome". Baixe o modelo e preencha a partir dele.')
    );

    renderWithProviders(<Motoristas />);
    await screen.findByText('Carlos Silva');
    await abrirModalComArquivo(user);

    expect(
      await screen.findByText(/A planilha não tem uma coluna "Nome"/)
    ).toBeInTheDocument();
    expect(mockedApi.post).not.toHaveBeenCalled();
  });

  test('não deixa importar enquanto nenhum arquivo foi lido', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Motoristas />);
    await screen.findByText('Carlos Silva');

    await user.click(screen.getByRole('button', { name: /Importar planilha/i }));

    expect(screen.getByRole('button', { name: 'Importar 0 motoristas' })).toBeDisabled();
  });
});
