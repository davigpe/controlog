import { describe, expect, test } from 'vitest';
import { capturarDownload, comoArquivo } from '@/test/capturarDownload';
import {
  LIMITE_IMPORTACAO,
  PlanilhaInvalidaError,
  baixarModeloMotoristas,
  lerPlanilhaMotoristas,
} from './planilha';

/**
 * Ida e volta de verdade: monta um .xlsx com a mesma biblioteca que gera o
 * modelo e manda o arquivo para o leitor da aplicação. Os testes de tela
 * mockam essa parte, então sem isto nada verificaria que o que o sistema
 * escreve é o que o sistema consegue ler de volta.
 */
async function planilhaDeTeste(linhas: string[][]): Promise<File> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const blob = await writeXlsxFile(
    linhas.map((linha) => linha.map((value) => ({ value, type: String }))),
    { sheet: 'Motoristas' }
  ).toBlob();

  return new File([blob], 'motoristas.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

const CABECALHO = ['Nome', 'CNH', 'Telefone', 'Status'];

describe('lerPlanilhaMotoristas', () => {
  test('lê as linhas de uma planilha no formato do modelo', async () => {
    const arquivo = await planilhaDeTeste([
      CABECALHO,
      ['Carlos Silva', '12345678901', '(47) 99111-1111', 'Ativo'],
      ['Ana Souza', '23456789012', '(47) 99222-2222', 'Inativo'],
    ]);

    const linhas = await lerPlanilhaMotoristas(arquivo);

    expect(linhas).toEqual([
      {
        linhaPlanilha: 2,
        dados: {
          nome: 'Carlos Silva',
          cnh: '12345678901',
          telefone: '(47) 99111-1111',
          status: 'ATIVO',
        },
      },
      {
        linhaPlanilha: 3,
        dados: {
          nome: 'Ana Souza',
          cnh: '23456789012',
          telefone: '(47) 99222-2222',
          status: 'INATIVO',
        },
      },
    ]);
  });

  test('status em branco fica de fora, para o backend aplicar o padrão', async () => {
    const arquivo = await planilhaDeTeste([
      CABECALHO,
      ['Carlos Silva', '12345678901', '(47) 99111-1111', ''],
    ]);

    const [linha] = await lerPlanilhaMotoristas(arquivo);

    expect(linha.dados.status).toBeUndefined();
  });

  // A planilha chega de gente diferente: exigir o cabeçalho exato do modelo
  // só geraria reenvio.
  test('aceita sinônimos e acentos no cabeçalho, em qualquer ordem', async () => {
    const arquivo = await planilhaDeTeste([
      ['Celular', 'Nome Completo', 'Situação', 'CNH'],
      ['(47) 99111-1111', 'Carlos Silva', 'Ativo', '12345678901'],
    ]);

    const [linha] = await lerPlanilhaMotoristas(arquivo);

    expect(linha.dados).toEqual({
      nome: 'Carlos Silva',
      cnh: '12345678901',
      telefone: '(47) 99111-1111',
      status: 'ATIVO',
    });
  });

  test('pula linhas em branco sem perder a numeração das seguintes', async () => {
    const arquivo = await planilhaDeTeste([
      CABECALHO,
      ['', '', '', ''],
      ['Ana Souza', '23456789012', '(47) 99222-2222', ''],
    ]);

    const linhas = await lerPlanilhaMotoristas(arquivo);

    expect(linhas).toHaveLength(1);
    // A linha 2 ficou vazia; Ana está na linha 3 do arquivo.
    expect(linhas[0].linhaPlanilha).toBe(3);
  });

  test('ignora o que vier acima do cabeçalho', async () => {
    const arquivo = await planilhaDeTeste([
      ['Cadastro de motoristas - filial Joinville'],
      [''],
      CABECALHO,
      ['Carlos Silva', '12345678901', '(47) 99111-1111', 'Ativo'],
    ]);

    const [linha] = await lerPlanilhaMotoristas(arquivo);

    expect(linha).toMatchObject({ linhaPlanilha: 4, dados: { nome: 'Carlos Silva' } });
  });

  test('recusa planilha sem a coluna Nome', async () => {
    const arquivo = await planilhaDeTeste([
      ['Documento', 'Fone'],
      ['12345678901', '(47) 99111-1111'],
    ]);

    await expect(lerPlanilhaMotoristas(arquivo)).rejects.toThrow(PlanilhaInvalidaError);
  });

  test('recusa planilha sem a coluna CNH', async () => {
    const arquivo = await planilhaDeTeste([
      ['Nome', 'Telefone'],
      ['Carlos Silva', '(47) 99111-1111'],
    ]);

    await expect(lerPlanilhaMotoristas(arquivo)).rejects.toThrow(/CNH/);
  });

  test('recusa planilha só com o cabeçalho', async () => {
    const arquivo = await planilhaDeTeste([CABECALHO]);

    await expect(lerPlanilhaMotoristas(arquivo)).rejects.toThrow(/nenhuma linha preenchida/);
  });

  test('recusa um arquivo que não é planilha', async () => {
    const arquivo = new File(['isto nao e um xlsx'], 'motoristas.xlsx');

    await expect(lerPlanilhaMotoristas(arquivo)).rejects.toThrow(PlanilhaInvalidaError);
  });

  test(`recusa mais de ${LIMITE_IMPORTACAO} linhas`, async () => {
    const excedente = Array.from({ length: LIMITE_IMPORTACAO + 1 }, (_, i) => [
      `Motorista ${i}`,
      String(10000000000 + i),
      '(47) 99111-1111',
      'Ativo',
    ]);
    const arquivo = await planilhaDeTeste([CABECALHO, ...excedente]);

    await expect(lerPlanilhaMotoristas(arquivo)).rejects.toThrow(
      new RegExp(`no máximo ${LIMITE_IMPORTACAO}`)
    );
  });
});

// O modelo só cumpre o papel dele se o próprio sistema conseguir ler de volta
// um arquivo preenchido a partir dele. Estes testes fecham esse ciclo.
describe('baixarModeloMotoristas', () => {
  test('gera um .xlsx válido, com o cabeçalho que o leitor reconhece', async () => {
    const blob = await capturarDownload(() => baixarModeloMotoristas());
    const { readSheet } = await import('read-excel-file/browser');

    const linhas = await readSheet(comoArquivo(blob));

    expect(linhas[0]).toEqual(['Nome', 'CNH', 'Telefone', 'Status']);
  });

  test('o modelo preenchido é lido pelo próprio sistema', async () => {
    const blob = await capturarDownload(() => baixarModeloMotoristas());

    // O modelo já vem com três linhas de exemplo — são elas que o leitor
    // tem de conseguir interpretar.
    const linhas = await lerPlanilhaMotoristas(comoArquivo(blob));

    expect(linhas).toHaveLength(3);
    expect(linhas[0].dados).toEqual({
      nome: 'Carlos Silva',
      cnh: '12345678901',
      telefone: '(47) 99111-1111',
      status: 'ATIVO',
    });
    expect(linhas[2].dados.status).toBe('INATIVO');
  });

  test('traz a aba de instruções junto da aba de preenchimento', async () => {
    const blob = await capturarDownload(() => baixarModeloMotoristas());
    const { default: readXlsxFile } = await import('read-excel-file/browser');

    const abas = await readXlsxFile(comoArquivo(blob));

    expect(abas.map((aba) => aba.sheet)).toEqual(['Motoristas', 'Instruções']);
  });

  // A CNH tem de sair como texto: gravada como número, o Excel come o zero
  // à esquerda de um registro como "01234567890".
  test('grava a CNH como texto, não como número', async () => {
    const blob = await capturarDownload(() => baixarModeloMotoristas());
    const { readSheet } = await import('read-excel-file/browser');

    const linhas = await readSheet(comoArquivo(blob));

    expect(typeof linhas[1][1]).toBe('string');
  });
});
