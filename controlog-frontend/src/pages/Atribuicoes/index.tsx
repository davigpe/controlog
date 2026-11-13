import { useState } from 'react'
import { Calendar, Package, Search, Truck, UserCog, Users } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'
import Pagination from '@/components/shared/Pagination'
import { useRotas, useUpdateRota } from '@/pages/Rotas/api'
import { useMotoristas } from '@/pages/Motoristas/api'
import { nomeDoMotorista, placaDoVeiculo } from '@/pages/Rotas/apresentacao'
import type { Rota, StatusRota } from '@/pages/Rotas/types'
import AtribuirModal from './AtribuirModal'

const filtros: { label: string; valor: StatusRota | 'Todas' }[] = [
  { label: 'Ativas',     valor: 'ATIVA' },
  { label: 'Concluídas', valor: 'CONCLUIDA' },
  { label: 'Canceladas', valor: 'CANCELADA' },
  { label: 'Todas',      valor: 'Todas' },
]

const statusStyle: Record<StatusRota, string> = {
  ATIVA:     'bg-green-100 text-green-700',
  CONCLUIDA: 'bg-blue-100 text-blue-700',
  CANCELADA: 'bg-gray-100 text-gray-700',
}

const statusLabel: Record<StatusRota, string> = {
  ATIVA: 'Ativa',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
}

export default function Atribuicoes() {
  // Começa nas Ativas: são as rotas que ainda dá pra reatribuir de forma útil.
  const [filtro, setFiltro] = useState<StatusRota | 'Todas'>('ATIVA')
  const [busca, setBusca] = useState('')
  const [page, setPage] = useState(1)
  const [atribuindo, setAtribuindo] = useState<Rota | null>(null)

  const { data, isLoading } = useRotas({
    busca: busca || undefined,
    status: filtro === 'Todas' ? undefined : filtro,
    page,
  })
  const updateMutation = useUpdateRota()

  // Carga atual por motorista, pra decidir quem ainda tem folga antes de
  // atribuir — `emRota` já vem calculado do backend.
  const { data: motoristasData } = useMotoristas({ status: 'ATIVO', pageSize: 100 })
  const motoristas = motoristasData?.items ?? []
  const emRota = motoristas.filter((m) => m.emRota).length

  const rotas = data?.items ?? []

  function trocarFiltro(valor: StatusRota | 'Todas') {
    setFiltro(valor)
    setPage(1)
  }

  function trocarBusca(valor: string) {
    setBusca(valor)
    setPage(1)
  }

  function handleAtribuir(dados: {
    motoristaId: string | null
    veiculoId: string | null
    veiculoProprio: boolean
  }) {
    if (!atribuindo) return
    const codigo = atribuindo.codigo
    updateMutation
      .mutateAsync({ id: atribuindo.id, data: dados })
      .then(() => {
        toast.success(`Rota ${codigo} atribuída.`)
        setAtribuindo(null)
      })
      .catch((error) => toast.error(getErrorMessage(error, 'Não foi possível atribuir esta rota.')))
  }

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Atribuição de Rotas</h1>
        <p className="text-sm text-gray-600">
          Rotas aprovadas e quem está responsável por cada uma. Trocar o motorista leva
          as entregas da rota junto.
        </p>
      </div>

      {/* ── Resumo da equipe ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Rotas no filtro atual" value={data?.pagination.total ?? 0} color="blue" />
        <SummaryCard label="Motoristas ativos" value={motoristas.length} color="green" />
        <SummaryCard label="Motoristas em rota" value={emRota} color="yellow" />
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, destino ou motorista..."
            value={busca}
            onChange={(e) => trocarBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {filtros.map(({ label, valor }) => (
            <button
              key={valor}
              onClick={() => trocarFiltro(valor)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                filtro === valor
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Rotas ── */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Carregando rotas...
        </div>
      ) : rotas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Nenhuma rota aprovada para este filtro. Rotas aparecem aqui depois de serem
          aprovadas em um plano.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Rota</th>
                <th className="px-4 py-3 text-left font-medium">Destino</th>
                <th className="px-4 py-3 text-left font-medium">Data/Hora</th>
                <th className="px-4 py-3 text-left font-medium">Entregas</th>
                <th className="px-4 py-3 text-left font-medium">Responsável</th>
                <th className="px-4 py-3 text-center font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {rotas.map((rota) => (
                <tr key={rota.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{rota.codigo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[rota.status]}`}>
                        {statusLabel[rota.status]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-[12rem] truncate">{rota.destino}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-blue-500" />
                      {new Date(rota.dataHora).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <Package size={14} className="text-blue-500" />
                      {rota.totalEntregas}
                      {rota.entregasPendentes > 0 && (
                        <span className="text-yellow-700 font-medium">
                          ({rota.entregasPendentes} pendente{rota.entregasPendentes > 1 ? 's' : ''})
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="flex items-center gap-1.5 text-gray-700">
                      <Users size={14} className="text-blue-500" />
                      <span className={rota.motorista ? undefined : 'text-gray-500 italic'}>
                        {nomeDoMotorista(rota.motorista)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-600 mt-0.5">
                      <Truck size={13} className="text-blue-500" />
                      <span className={rota.veiculo ? undefined : 'text-gray-500 italic'}>
                        {placaDoVeiculo(rota)}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex justify-center">
                      <button
                        onClick={() => setAtribuindo(rota)}
                        aria-label={`Atribuir ${rota.codigo}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <UserCog size={14} />
                        Atribuir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination pagination={data.pagination} onPageChange={setPage} />}

      <AtribuirModal
        rota={atribuindo}
        onClose={() => setAtribuindo(null)}
        onSave={handleAtribuir}
        saving={updateMutation.isPending}
      />
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: 'blue' | 'green' | 'yellow' }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 text-gray-700">{label}</p>
    </div>
  )
}
