import { useState } from 'react'
import { CalendarDays, CheckCircle, Clock, Download, PackageCheck, Route } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRotasDoDia } from './api'
import { exportarRotasDoDia } from './exportar'
import {
  AJUDA_BASE,
  LABEL_BASE,
  LABEL_STATUS,
  dataPorExtenso,
  hojeISO,
  horarioDaBase,
} from './formato'
import type { BaseDoDia, RotaDoDia } from './types'

const statusStyle: Record<RotaDoDia['status'], string> = {
  ATIVA: 'bg-blue-100 text-blue-700',
  CONCLUIDA: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-gray-100 text-gray-700',
}

const BASES: BaseDoDia[] = ['dataHora', 'criadoEm']

export default function RotasDoDia() {
  const [data, setData] = useState(hojeISO)
  const [base, setBase] = useState<BaseDoDia>('dataHora')
  const [exportando, setExportando] = useState(false)

  const { data: relatorio, isLoading } = useRotasDoDia({ data, base })
  const rotas = relatorio?.rotas ?? []

  async function handleExportar() {
    if (!relatorio) return
    setExportando(true)
    try {
      await exportarRotasDoDia(relatorio)
      toast.success('Planilha gerada.')
    } catch {
      toast.error('Não foi possível gerar a planilha.')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Rotas do Dia</h1>
          <p className="text-sm text-gray-600">
            Movimento de {dataPorExtenso(data)} — {AJUDA_BASE[base].toLowerCase()}
          </p>
        </div>
        <button
          onClick={handleExportar}
          disabled={exportando || rotas.length === 0}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Download size={16} />
          {exportando ? 'Gerando...' : 'Exportar Excel'}
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            aria-label="Dia"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* "Carregadas no dia" tem duas leituras no uso real — a tela deixa
            escolher em vez de arbitrar uma. */}
        <Select value={base} onValueChange={(v) => setBase(v as BaseDoDia)}>
          <SelectTrigger aria-label="Contar o dia por" className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BASES.map((valor) => (
              <SelectItem key={valor} value={valor}>
                <span className="flex flex-col items-start">
                  <span>{LABEL_BASE[valor]}</span>
                  <span className="text-xs text-gray-500">{AJUDA_BASE[valor]}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Rotas no dia"       value={relatorio?.totalRotas ?? 0}         color="blue"  icon={Route} />
        <SummaryCard label="Entregas previstas" value={relatorio?.totalEntregas ?? 0}      color="gray"  icon={PackageCheck} />
        <SummaryCard label="Entregas concluídas" value={relatorio?.entregasConcluidas ?? 0} color="green" icon={CheckCircle} />
      </div>

      {/* ── Tabela ── */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Carregando rotas do dia...
        </div>
      ) : rotas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Nenhuma rota em {dataPorExtenso(data)}.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">Horário</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Rota</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Destino</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Motorista</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Veículo</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Entregas</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rotas.map((rota) => (
                <tr key={rota.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-medium text-gray-800">
                      <Clock size={13} className="text-gray-400" />
                      {horarioDaBase(rota, base)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{rota.codigo}</td>
                  <td className="px-4 py-3 text-gray-700">{rota.destino}</td>
                  <td className="px-4 py-3 text-gray-700">{rota.motorista.nome}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {rota.veiculo.modelo}
                    <span className="block font-mono text-xs text-gray-500">{rota.veiculo.placa}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {rota.entregasConcluidas} de {rota.totalEntregas}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[rota.status]}`}>
                      {LABEL_STATUS[rota.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label, value, color, icon: Icon,
}: {
  label: string
  value: number
  color: 'blue' | 'green' | 'gray'
  icon: React.ComponentType<{ size?: number }>
}) {
  const colors = {
    blue:  'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    gray:  'bg-gray-50 text-gray-500 border-gray-100',
  }
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colors[color]}`}>
      <Icon size={24} />
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs mt-1 text-gray-700">{label}</p>
      </div>
    </div>
  )
}
