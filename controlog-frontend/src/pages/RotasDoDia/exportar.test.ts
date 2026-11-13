import { describe, expect, test } from 'vitest';
import { capturarDownload, comoArquivo } from '@/test/capturarDownload';
import { exportarRotasDoDia, nomeDoArquivo } from './exportar';
import type { RotaDoDia, RotasDoDiaResponse } from './types';

const rota = (overrides: Partial<RotaDoDia> = {}): RotaDoDia => ({
  id: 'r1',
  codigo: 'RT-001',
  origem: 'Centro de Distribuição',
  destino: 'Joinville',
  status: 'ATIVA',
  // 11:00Z é 08:00 no fuso de operação.
  dataHora: '2026-11-07T11:00:00.000Z',
  criadoEm: '2026-11-06T18:30:00.000Z',
  motorista: { id: 'm1', nome: 'Carlos Silva' },
  veiculo: { id: 'v1', placa: 'ABC-1234', modelo: 'Iveco Daily' },
  veiculoProprio: false,
  totalEntregas: 4,
  entregasConcluidas: 1,
  ...overrides,
});

const relatorio = (overrides: Partial<RotasDoDiaResponse> = {}): RotasDoDiaResponse => ({
  data: '2026-11-07',
  base: 'dataHora',
  totalRotas: 2,
  totalEntregas: 6,
  entregasConcluidas: 3,
  rotas: [
    rota(),
    rota({
      id: 'r2',
      codigo: 'RT-002',
      destino: 'Araquari',
      status: 'CONCLUIDA',
      dataHora: '2026-11-07T17:45:00.000Z',
      totalEntregas: 2,
      entregasConcluidas: 2,
    }),
  ],
  ...overrides,
});

/** Lê de volta o arquivo que a exportação mandaria baixar. */
async function exportarELer(dados: RotasDoDiaResponse) {
  const blob = await capturarDownload(() => exportarRotasDoDia(dados));
  const { readSheet } = await import('read-excel-file/browser');
  return readSheet(comoArquivo(blob));
}

describe('exportarRotasDoDia', () => {
  test('gera um .xlsx válido com uma linha por rota', async () => {
    const linhas = await exportarELer(relatorio());

    // 3 linhas de cabeçalho do relatório + 1 em branco + cabeçalho da tabela.
    const cabecalhoTabela = linhas[4];
    expect(cabecalhoTabela).toEqual([
      'Código',
      'Horário',
      'Origem',
      'Destino',
      'Motorista',
      'Veículo',
      'Placa',
      'Entregas',
      'Concluídas',
      'Status',
    ]);
    expect(linhas).toHaveLength(7);
  });

  test('leva data, visão e totais no topo, para o arquivo se explicar sozinho', async () => {
    const linhas = await exportarELer(relatorio());

    expect(linhas[0][0]).toBe('Rotas do dia 07/11/2026');
    expect(linhas[1][0]).toBe('Visão: Horário da rota');
    expect(linhas[2][0]).toContain('2 rota(s)');
    expect(linhas[2][0]).toContain('3 concluída(s)');
  });

  test('exporta o horário no fuso de operação e o status traduzido', async () => {
    const linhas = await exportarELer(relatorio());

    expect(linhas[5]).toEqual([
      'RT-001',
      '08:00',
      'Centro de Distribuição',
      'Joinville',
      'Carlos Silva',
      'Iveco Daily',
      'ABC-1234',
      4,
      1,
      'Ativa',
    ]);
    expect(linhas[6][1]).toBe('14:45');
    expect(linhas[6][9]).toBe('Concluída');
  });

  // A planilha tem de refletir a visão escolhida na tela, senão o horário
  // exportado não bate com o que o usuário estava vendo.
  test('na visão por cadastro, exporta o horário do cadastro', async () => {
    const linhas = await exportarELer(relatorio({ base: 'criadoEm' }));

    expect(linhas[1][0]).toBe('Visão: Cadastro no sistema');
    // 2026-11-06T18:30Z é 15:30 no fuso de operação.
    expect(linhas[5][1]).toBe('15:30');
  });

  test('quantidades saem como número, para somar no Excel', async () => {
    const linhas = await exportarELer(relatorio());

    expect(typeof linhas[5][7]).toBe('number');
    expect(typeof linhas[5][8]).toBe('number');
  });

  test('o nome do arquivo identifica o dia', () => {
    expect(nomeDoArquivo('2026-11-07')).toBe('rotas-2026-11-07.xlsx');
  });
});
