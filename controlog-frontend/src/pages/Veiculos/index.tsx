import { useMemo, useState } from 'react'
import { Search, Plus, Eye, Pencil, Trash2, Wrench, CheckCircle, XCircle, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useCreateVeiculo, useDeleteVeiculo, useUpdateVeiculo, useVeiculos } from './api'
import VeiculoFormModal from './VeiculoFormModal'
import VeiculoDetalhes from './VeiculoDetalhes'
import { statusExibicao } from './status'
import type { StatusVeiculo, Veiculo } from './types'

const statusOptions: StatusVeiculo[] = ['DISPONIVEL', 'MANUTENCAO', 'INATIVO']

const statusLabel: Record<StatusVeiculo | 'Todos', string> = {
  DISPONIVEL: 'Disponível',
  MANUTENCAO: 'Manutenção',
  INATIVO: 'Inativo',
  Todos: 'Todos',
}

const statusStyle: Record<string, string> = {
  'Disponível': 'bg-green-100 text-green-700',
  'Em Rota':    'bg-yellow-100 text-yellow-700',
  'Manutenção': 'bg-orange-100 text-orange-700',
  'Inativo':    'bg-gray-100 text-gray-700',
}

const statusIcon: Record<string, React.ReactNode> = {
  'Disponível': <CheckCircle size={13} />,
  'Em Rota':    <Truck size={13} />,
  'Manutenção': <Wrench size={13} />,
  'Inativo':    <XCircle size={13} />,
}

export default function Veiculos() {
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusVeiculo | 'Todos'>('Todos')
  const [selected, setSelected]         = useState<Veiculo | null>(null)
  const [editando, setEditando]         = useState<Veiculo | null>(null)
  const [formAberto, setFormAberto]     = useState(false)
  const [excluindo, setExcluindo]       = useState<Veiculo | null>(null)

  const { data: veiculos = [], isLoading } = useVeiculos({
    busca: search || undefined,
    status: statusFilter === 'Todos' ? undefined : statusFilter,
  })
  const createMutation = useCreateVeiculo()
  const updateMutation = useUpdateVeiculo()
  const deleteMutation = useDeleteVeiculo()

  const totais = useMemo(() => ({
    disponiveis: veiculos.filter((v) => v.status === 'DISPONIVEL' && !v.emRota).length,
    emRota:      veiculos.filter((v) => v.emRota).length,
    manutencao:  veiculos.filter((v) => v.status === 'MANUTENCAO').length,
    inativos:    veiculos.filter((v) => v.status === 'INATIVO').length,
  }), [veiculos])

  function handleSave(data: { placa: string; modelo: string; capacidade: string; status: StatusVeiculo }) {
    const mutation = editando
      ? updateMutation.mutateAsync({ id: editando.id, data })
      : createMutation.mutateAsync(data)

    mutation
      .then(() => {
        toast.success(editando ? 'Veículo atualizado.' : 'Veículo cadastrado.')
        setFormAberto(false)
        setEditando(null)
      })
      .catch((error) => toast.error(getErrorMessage(error)))
  }

  function handleExcluir() {
    if (!excluindo) return
    deleteMutation
      .mutateAsync(excluindo.id)
      .then(() => {
        toast.success('Veículo excluído.')
        setExcluindo(null)
      })
      .catch((error) => {
        toast.error(getErrorMessage(error, 'Não foi possível excluir este veículo.'))
        setExcluindo(null)
      })
  }

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Veículos</h1>
          <p className="text-sm text-gray-600">{veiculos.length} registros encontrados</p>
        </div>
        <button
          onClick={() => { setEditando(null); setFormAberto(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Novo Veículo
        </button>
      </div>

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Disponíveis" value={totais.disponiveis} color="green"  emoji="✅" />
        <SummaryCard label="Em Rota"     value={totais.emRota}      color="yellow" emoji="🚛" />
        <SummaryCard label="Manutenção"  value={totais.manutencao}  color="orange" emoji="🔧" />
        <SummaryCard label="Inativos"    value={totais.inativos}    color="gray"   emoji="⛔" />
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por placa ou modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['Todos', ...statusOptions] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                statusFilter === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards de veículos ── */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Carregando veículos...
        </div>
      ) : veiculos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Nenhum veículo encontrado para os filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {veiculos.map((v) => {
            const status = statusExibicao(v)
            return (
              <div key={v.id} className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">
                      🚚
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{v.modelo}</p>
                      <p className="text-xs font-mono text-gray-600 tracking-wider">{v.placa}</p>
                    </div>
                  </div>
                </div>

                <span className={`self-start flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[status]}`}>
                  {statusIcon[status]}
                  {status}
                </span>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 text-xs">Capacidade</span>
                  <span className="text-xs font-medium">{v.capacidade}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                  <button onClick={() => setSelected(v)} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors">
                    <Eye size={14} />
                    Detalhes
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setEditando(v); setFormAberto(true) }}
                      aria-label={`Editar ${v.placa}`}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setExcluindo(v)}
                      aria-label={`Excluir ${v.placa}`}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      )}

      <VeiculoFormModal
        open={formAberto}
        veiculoEditando={editando}
        onClose={() => { setFormAberto(false); setEditando(null) }}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <VeiculoDetalhes veiculo={selected} onClose={() => setSelected(null)} />

      <ConfirmDialog
        open={!!excluindo}
        title="Excluir veículo"
        description={`Tem certeza que deseja excluir "${excluindo?.placa}"? Esta ação não pode ser desfeita. Veículos com rotas ativas vinculadas não podem ser excluídos (RN04).`}
        loading={deleteMutation.isPending}
        onConfirm={handleExcluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  )
}

function SummaryCard({
  label, value, color, emoji,
}: {
  label: string
  value: number
  color: 'green' | 'yellow' | 'orange' | 'gray'
  emoji: string
}) {
  const colors = {
    green:  'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    gray:   'bg-gray-50 text-gray-500 border-gray-100',
  }
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${colors[color]}`}>
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs mt-1 text-gray-700">{label}</p>
      </div>
    </div>
  )
}
