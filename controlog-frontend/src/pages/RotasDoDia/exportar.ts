import { LABEL_BASE, LABEL_STATUS, dataPorExtenso, horarioDaBase } from './formato'
import type { RotasDoDiaResponse } from './types'

const CABECALHO = [
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
].map((value) => ({ value, fontWeight: 'bold' as const }))

const LARGURAS = [12, 10, 26, 26, 26, 24, 12, 11, 12, 13].map((width) => ({ width }))

export function nomeDoArquivo(data: string): string {
  return `rotas-${data}.xlsx`
}

/**
 * Exporta o espelho do dia em .xlsx.
 *
 * A planilha é montada no navegador a partir dos dados que a tela já tem —
 * não há um segundo endpoint devolvendo o arquivo pronto. Assim o que o
 * usuário baixa é exatamente o que ele está vendo, inclusive a visão (por
 * horário da rota ou por cadastro) que ele escolheu.
 *
 * A biblioteca entra por import() dinâmico: são ~60 kB que só fazem sentido
 * no clique do botão.
 */
export async function exportarRotasDoDia(relatorio: RotasDoDiaResponse): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  const linhas = relatorio.rotas.map((rota) => [
    { value: rota.codigo, type: String },
    { value: horarioDaBase(rota, relatorio.base), type: String },
    { value: rota.origem, type: String },
    { value: rota.destino, type: String },
    { value: rota.motorista.nome, type: String },
    { value: rota.veiculo.modelo, type: String },
    { value: rota.veiculo.placa, type: String },
    { value: rota.totalEntregas, type: Number },
    { value: rota.entregasConcluidas, type: Number },
    { value: LABEL_STATUS[rota.status], type: String },
  ])

  // Cabeçalho do relatório acima da tabela: sem ele, a planilha baixada perde
  // de que dia e de que visão ela é assim que sai da pasta de downloads.
  const titulo = [
    [{ value: `Rotas do dia ${dataPorExtenso(relatorio.data)}`, fontWeight: 'bold' as const }],
    [{ value: `Visão: ${LABEL_BASE[relatorio.base]}` }],
    [
      {
        value:
          `${relatorio.totalRotas} rota(s) · ${relatorio.totalEntregas} entrega(s) · ` +
          `${relatorio.entregasConcluidas} concluída(s)`,
      },
    ],
    [],
  ]

  await writeXlsxFile([
    {
      data: [...titulo, CABECALHO, ...linhas],
      sheet: `Rotas ${dataPorExtenso(relatorio.data)}`.replace(/\//g, '-'),
      columns: LARGURAS,
    },
  ]).toFile(nomeDoArquivo(relatorio.data))
}
