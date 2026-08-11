import { useMemo, useState } from 'react'
import { Search, Plus, Eye, Pencil, Trash2, Truck, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useCreateMotorista, useDeleteMotorista, useMotoristas, useUpdateMotorista } from './api'
import MotoristaFormModal from './MotoristaFormModal'
import MotoristaDetalhes from './MotoristaDetalhes'
import { statusExibicao } from './status'
import type { Motorista, StatusMotorista } from './types'

const statusOptions: StatusMotorista[] = ['ATIVO', 'INATIVO']

const statusStyle: Record<string, string> = {
  'Ativo':   'bg-green-100 text-green-700',
  'Em Rota': 'bg-yellow-100 text-yellow-700',
  'Inativo': 'bg-gray-100 text-gray-700',
}

const statusIcon: Record<string, React.ReactNode> = {
  'Ativo':   <CheckCircle size={13} />,
  'Em Rota': <Truck size={13} />,
  'Inativo': <XCircle size={13} />,
}

export default function Motoristas() {
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusMotorista | 'Todos'>('Todos')
  const [selected, setSelected]         = useState<Motorista | null>(null)
  const [editando, setEditando]         = useState<Motorista | null>(null)
  const [formAberto, setFormAberto]     = useState(false)
  const [excluindo, setExcluindo]       = useState<Motorista | null>(null)

  const { data: motoristas = [], isLoading } = useMotoristas({
    busca: search || undefined,
    status: statusFilter === 'Todos' ? undefined : statusFilter,
  })
  const createMutation = useCreateMotorista()
  const updateMutation = useUpdateMotorista()
  const deleteMutation = useDeleteMotorista()

  const totais = useMemo(() => ({
    ativos:   motoristas.filter((m) => m.status === 'ATIVO' && !m.emRota).length,
    emRota:   motoristas.filter((m) => m.emRota).length,
    inativos: motoristas.filter((m) => m.status === 'INATIVO').length,
  }), [motoristas])

  function handleSave(data: { nome: string; cnh: string; telefone: string; status: StatusMotorista }) {
    const mutation = editando
      ? updateMutation.mutateAsync({ id: editando.id, data })
      : createMutation.mutateAsync(data)

    mutation
      .then(() => {
        toast.success(editando ? 'Motorista atualizado.' : 'Motorista cadastrado.')
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
        toast.success('Motorista excluído.')
        setExcluindo(null)
      })
      .catch((error) => {
        toast.error(getErrorMessage(error, 'Não foi possível excluir este motorista.'))
        setExcluindo(null)
      })
  }

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Motoristas</h1>
          <p className="text-sm text-gray-600">{motoristas.length} registros encontrados</p>
        </div>
        <button
          onClick={() => { setEditando(null); setFormAberto(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Novo Motorista
        </button>
      </div>

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Motoristas Ativos" value={totais.ativos}  color="green"  />
        <SummaryCard label="Em Rota Agora"      value={totais.emRota} color="yellow" />
        <SummaryCard label="Inativos"           value={totais.inativos} color="gray" />
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CNH ou telefone..."
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
              {s === 'ATIVO' ? 'Ativo' : s === 'INATIVO' ? 'Inativo' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards de motoristas ── */}
      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Carregando motoristas...
        </div>
      ) : motoristas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Nenhum motorista encontrado para os filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {motoristas.map((m) => {
            const status = statusExibicao(m)
            return (
              <div key={m.id} className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                    {m.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{m.nome}</p>
                    <p className="text-xs text-gray-600">{m.cnh}</p>
                  </div>
                  <span className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${statusStyle[status]}`}>
                    {statusIcon[status]}
                    {status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-600">{m.entregasRealizadas}</p>
                    <p className="text-xs text-gray-600">Entregas</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelected(m)} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors">
                      <Eye size={14} />
                      Detalhes
                    </button>
                    <button
                      onClick={() => { setEditando(m); setFormAberto(true) }}
                      aria-label={`Editar ${m.nome}`}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setExcluindo(m)}
                      aria-label={`Excluir ${m.nome}`}
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

      <MotoristaFormModal
        open={formAberto}
        motoristaEditando={editando}
        onClose={() => { setFormAberto(false); setEditando(null) }}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <MotoristaDetalhes motorista={selected} onClose={() => setSelected(null)} />

      <ConfirmDialog
        open={!!excluindo}
        title="Excluir motorista"
        description={`Tem certeza que deseja excluir "${excluindo?.nome}"? Esta ação não pode ser desfeita. Motoristas com rotas ativas vinculadas não podem ser excluídos (RN03).`}
        loading={deleteMutation.isPending}
        onConfirm={handleExcluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: 'green' | 'yellow' | 'gray' }) {
  const colors = {
    green:  'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    gray:   'bg-gray-50 text-gray-500 border-gray-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 text-gray-700">{label}</p>
    </div>
  )
}
