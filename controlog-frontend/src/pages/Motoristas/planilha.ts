import type { Row, SheetData } from 'read-excel-file/browser'
import type { MotoristaInput, StatusMotorista } from './types'

/** Teto por importação — o mesmo do backend (LIMITE_IMPORTACAO_MOTORISTAS). */
export const LIMITE_IMPORTACAO = 500

export const NOME_ARQUIVO_MODELO = 'modelo-importacao-motoristas.xlsx'

/**
 * Uma linha já lida da planilha. Guarda o número da linha no arquivo original
 * para que um erro devolvido pela API possa ser mostrado como "linha 14" — e
 * não como "item 12", que não ajuda quem está com a planilha aberta ao lado.
 */
export interface LinhaPlanilha {
  linhaPlanilha: number
  dados: MotoristaInput
}

export class PlanilhaInvalidaError extends Error {}

/*
 * As duas bibliotecas de planilha somam ~145 kB no bundle e só servem a esta
 * tela, então entram por import() dinâmico: quem abre o sistema no celular
 * para ver as próprias rotas não baixa nada disso.
 */

/** Minúsculas, sem acento e sem espaços nas pontas — para casar cabeçalhos. */
function normalizar(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
}

/**
 * O Excel devolve número quando a célula só tem dígitos, e Date quando o
 * conteúdo parece data. Para CNH e telefone o que interessa é sempre o texto.
 */
function comoTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  if (valor instanceof Date) return valor.toLocaleDateString('pt-BR')
  return String(valor).trim()
}

const COLUNA_PADRAO = { nome: 'Nome', cnh: 'CNH', telefone: 'Telefone', status: 'Status' } as const

type Campo = keyof typeof COLUNA_PADRAO

/**
 * Sinônimos aceitos em cada coluna: a planilha chega de gente diferente, e
 * exigir o cabeçalho exato do modelo só geraria reenvio.
 */
const SINONIMOS: Record<Campo, string[]> = {
  nome: ['nome', 'nome completo', 'motorista'],
  cnh: ['cnh', 'numero da cnh', 'n da cnh', 'registro'],
  telefone: ['telefone', 'celular', 'fone', 'contato'],
  status: ['status', 'situacao'],
}

function statusDaPlanilha(valor: string): StatusMotorista | undefined {
  const texto = normalizar(valor)
  if (texto === '') return undefined
  if (texto === 'ativo') return 'ATIVO'
  if (texto === 'inativo') return 'INATIVO'
  // Valor fora das duas opções segue adiante como veio: quem reprova é o
  // backend, que é a autoridade única sobre o que é um status válido.
  return valor.trim().toUpperCase() as StatusMotorista
}

/**
 * Lê o .xlsx e devolve as linhas preenchidas.
 *
 * A validação campo a campo fica no backend de propósito — repeti-la aqui
 * criaria duas listas de regras para manter em sincronia. Aqui só se checa o
 * que é sobre o arquivo em si: se ele abre, se tem um cabeçalho reconhecível
 * e se tem linhas dentro do limite.
 */
export async function lerPlanilhaMotoristas(arquivo: File): Promise<LinhaPlanilha[]> {
  // Tipado à mão porque readSheet tem sobrecargas: sem schema ela devolve
  // SheetData, mas a inferência cai na sobrecarga com schema.
  const { readSheet } = await import('read-excel-file/browser')

  let linhas: SheetData
  try {
    linhas = await readSheet(arquivo)
  } catch {
    throw new PlanilhaInvalidaError(
      'Não foi possível abrir o arquivo. Envie uma planilha .xlsx (Excel 2007 ou mais novo).'
    )
  }

  const indiceCabecalho = linhas.findIndex((linha) =>
    linha.some((celula) => SINONIMOS.nome.includes(normalizar(celula)))
  )
  if (indiceCabecalho === -1) {
    throw new PlanilhaInvalidaError(
      'A planilha não tem uma coluna "Nome". Baixe o modelo e preencha a partir dele.'
    )
  }

  const cabecalho = linhas[indiceCabecalho].map(normalizar)
  const colunaDe = (campo: Campo) =>
    cabecalho.findIndex((titulo) => SINONIMOS[campo].includes(titulo))

  const colunas: Record<Campo, number> = {
    nome: colunaDe('nome'),
    cnh: colunaDe('cnh'),
    telefone: colunaDe('telefone'),
    status: colunaDe('status'),
  }

  const faltando = (['cnh', 'telefone'] as const).filter((campo) => colunas[campo] === -1)
  if (faltando.length > 0) {
    const nomes = faltando.map((campo) => `"${COLUNA_PADRAO[campo]}"`).join(' e ')
    throw new PlanilhaInvalidaError(
      `A planilha não tem ${faltando.length === 1 ? 'a coluna' : 'as colunas'} ${nomes}. ` +
        'Baixe o modelo e preencha a partir dele.'
    )
  }

  const celula = (linha: Row, indice: number) =>
    indice === -1 ? '' : comoTexto(linha[indice])

  const resultado: LinhaPlanilha[] = []
  for (let i = indiceCabecalho + 1; i < linhas.length; i += 1) {
    const linha = linhas[i]
    const nome = celula(linha, colunas.nome)
    const cnh = celula(linha, colunas.cnh)
    const telefone = celula(linha, colunas.telefone)
    const status = statusDaPlanilha(celula(linha, colunas.status))

    // Linha totalmente em branco é espaçamento da planilha, não um erro.
    if (nome === '' && cnh === '' && telefone === '') continue

    resultado.push({
      // +1 porque o índice do array é base 0 e a planilha conta a partir de 1.
      linhaPlanilha: i + 1,
      dados: { nome, cnh, telefone, ...(status ? { status } : {}) },
    })
  }

  if (resultado.length === 0) {
    throw new PlanilhaInvalidaError('A planilha não tem nenhuma linha preenchida.')
  }
  if (resultado.length > LIMITE_IMPORTACAO) {
    throw new PlanilhaInvalidaError(
      `A planilha tem ${resultado.length} linhas. Importe no máximo ${LIMITE_IMPORTACAO} por vez.`
    )
  }

  return resultado
}

const CABECALHO = (['Nome', 'CNH', 'Telefone', 'Status'] as const).map((value) => ({
  value,
  fontWeight: 'bold' as const,
}))

// type: String para que o Excel guarde a CNH como texto e não coma o zero à
// esquerda de um registro como "01234567890".
const EXEMPLOS = [
  ['Carlos Silva', '12345678901', '(47) 99111-1111', 'Ativo'],
  ['Ana Souza', '23456789012', '(47) 99222-2222', 'Ativo'],
  ['Pedro Lima', '34567890123', '(47) 99333-3333', 'Inativo'],
].map((linha) => linha.map((value) => ({ value, type: String })))

const INSTRUCOES: [string, string][] = [
  ['Como preencher', ''],
  ['', ''],
  ['Nome', 'Obrigatório. Nome completo do motorista (mínimo 2 caracteres).'],
  ['CNH', 'Obrigatório. Única no sistema — duas linhas com a mesma CNH são recusadas.'],
  ['Telefone', 'Obrigatório. Com DDD, mínimo 8 caracteres.'],
  ['Status', 'Opcional. "Ativo" ou "Inativo". Em branco, entra como Ativo.'],
  ['', ''],
  ['Apague as três linhas de exemplo', 'Elas estão aqui só para mostrar o formato.'],
  ['Formate CNH e Telefone como Texto', 'Senão o Excel remove o zero à esquerda.'],
  [`Máximo de ${LIMITE_IMPORTACAO} linhas por arquivo`, ''],
  [
    'A importação é tudo ou nada',
    'Se alguma linha tiver problema, nada é cadastrado e o sistema lista as linhas a corrigir.',
  ],
]

/** Gera e baixa o modelo .xlsx — duas abas: a de preencher e a de instruções. */
export async function baixarModeloMotoristas(): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  await writeXlsxFile([
    {
      data: [CABECALHO, ...EXEMPLOS],
      sheet: 'Motoristas',
      columns: [{ width: 32 }, { width: 18 }, { width: 20 }, { width: 12 }],
    },
    {
      data: INSTRUCOES.map(([titulo, texto]) => [
        { value: titulo, fontWeight: 'bold' as const },
        { value: texto },
      ]),
      sheet: 'Instruções',
      columns: [{ width: 38 }, { width: 72 }],
    },
  ]).toFile(NOME_ARQUIVO_MODELO)
}
