import { useRef, useState } from 'react'
import axios from 'axios'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  LIMITE_IMPORTACAO,
  PlanilhaInvalidaError,
  baixarModeloMotoristas,
  lerPlanilhaMotoristas,
  type LinhaPlanilha,
} from './planilha'
import type { MotoristaInput } from './types'

/** Um problema numa linha, já traduzido para o número de linha da planilha. */
interface ErroDeLinha {
  linhaPlanilha: number
  mensagem: string
}

interface Props {
  open: boolean
  onClose: () => void
  /** Deve rejeitar quando a API recusa, para que os erros apareçam aqui. */
  onImportar: (motoristas: MotoristaInput[]) => Promise<void>
  saving?: boolean
}

/**
 * Extrai a lista de linhas com problema devolvida pela API e troca o índice
 * do array pelo número da linha na planilha — é o número que o usuário vê no
 * Excel, e o único com que ele consegue trabalhar.
 */
function errosDaResposta(erro: unknown, linhas: LinhaPlanilha[]): ErroDeLinha[] {
  if (!axios.isAxiosError(erro)) return []
  const details = erro.response?.data?.details as
    | { erros?: { indice: number; mensagem: string }[] }
    | undefined

  return (details?.erros ?? []).map(({ indice, mensagem }) => ({
    linhaPlanilha: linhas[indice]?.linhaPlanilha ?? indice + 1,
    mensagem,
  }))
}

const PREVIA_MAXIMA = 5

export default function ImportarMotoristasModal({ open, onClose, onImportar, saving }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [linhas, setLinhas] = useState<LinhaPlanilha[]>([])
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [erroGeral, setErroGeral] = useState('')
  const [errosDeLinha, setErrosDeLinha] = useState<ErroDeLinha[]>([])
  const [baixandoModelo, setBaixandoModelo] = useState(false)

  function limpar() {
    setLinhas([])
    setNomeArquivo('')
    setErroGeral('')
    setErrosDeLinha([])
    if (inputRef.current) inputRef.current.value = ''
  }

  function fechar() {
    limpar()
    onClose()
  }

  async function handleArquivo(arquivo: File | undefined) {
    if (!arquivo) return
    setErroGeral('')
    setErrosDeLinha([])
    setNomeArquivo(arquivo.name)

    try {
      setLinhas(await lerPlanilhaMotoristas(arquivo))
    } catch (erro) {
      setLinhas([])
      setErroGeral(
        erro instanceof PlanilhaInvalidaError
          ? erro.message
          : 'Não foi possível ler a planilha. Confira se o arquivo é um .xlsx válido.'
      )
    }
  }

  async function handleBaixarModelo() {
    setBaixandoModelo(true)
    try {
      await baixarModeloMotoristas()
    } catch {
      setErroGeral('Não foi possível gerar o modelo. Tente novamente.')
    } finally {
      setBaixandoModelo(false)
    }
  }

  async function handleImportar() {
    setErrosDeLinha([])
    try {
      await onImportar(linhas.map((linha) => linha.dados))
      limpar()
    } catch (erro) {
      const porLinha = errosDaResposta(erro, linhas)
      if (porLinha.length > 0) {
        setErrosDeLinha(porLinha)
      } else {
        setErroGeral(
          axios.isAxiosError(erro)
            ? (erro.response?.data?.message ?? 'Não foi possível importar a planilha.')
            : 'Não foi possível importar a planilha.'
        )
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar motoristas por planilha</DialogTitle>
          <DialogDescription>
            Cadastre vários motoristas de uma vez a partir de um arquivo .xlsx. Baixe o modelo,
            preencha e envie de volta — até {LIMITE_IMPORTACAO} por arquivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleBaixarModelo}
            disabled={baixandoModelo}
            className="w-full justify-start gap-2"
          >
            <Download size={16} />
            {baixandoModelo ? 'Gerando modelo...' : 'Baixar modelo da planilha (.xlsx)'}
          </Button>

          <div className="space-y-1">
            <Label htmlFor="importar-planilha">Planilha preenchida</Label>
            <input
              ref={inputRef}
              id="importar-planilha"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => handleArquivo(e.target.files?.[0])}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {erroGeral && (
            <p role="alert" className="text-sm text-red-600">
              {erroGeral}
            </p>
          )}

          {linhas.length > 0 && (
            <div className="rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700">
                <FileSpreadsheet size={16} className="text-green-600" />
                {linhas.length} {linhas.length === 1 ? 'motorista lido' : 'motoristas lidos'} de{' '}
                {nomeArquivo}
              </div>
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th scope="col" className="px-4 py-1.5 text-left font-medium">
                      Linha
                    </th>
                    <th scope="col" className="px-4 py-1.5 text-left font-medium">
                      Nome
                    </th>
                    <th scope="col" className="px-4 py-1.5 text-left font-medium">
                      CNH
                    </th>
                    <th scope="col" className="px-4 py-1.5 text-left font-medium">
                      Telefone
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.slice(0, PREVIA_MAXIMA).map(({ linhaPlanilha, dados }) => (
                    <tr key={linhaPlanilha} className="border-t border-gray-50">
                      <td className="px-4 py-1.5 text-gray-500">{linhaPlanilha}</td>
                      <td className="px-4 py-1.5">{dados.nome}</td>
                      <td className="px-4 py-1.5 font-mono text-xs">{dados.cnh}</td>
                      <td className="px-4 py-1.5">{dados.telefone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {linhas.length > PREVIA_MAXIMA && (
                <p className="border-t border-gray-50 px-4 py-2 text-xs text-gray-500">
                  e mais {linhas.length - PREVIA_MAXIMA}...
                </p>
              )}
            </div>
          )}

          {errosDeLinha.length > 0 && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-700">
                Nada foi importado. Corrija {errosDeLinha.length === 1 ? 'a linha' : 'as linhas'}{' '}
                abaixo na planilha e envie de novo.
              </p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-red-700">
                {errosDeLinha.map((erro) => (
                  <li key={erro.linhaPlanilha}>
                    <span className="font-medium">Linha {erro.linhaPlanilha}:</span>{' '}
                    {erro.mensagem}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleImportar}
            disabled={linhas.length === 0 || saving}
            className="gap-2"
          >
            <Upload size={16} />
            {saving
              ? 'Importando...'
              : `Importar ${linhas.length} ${linhas.length === 1 ? 'motorista' : 'motoristas'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
