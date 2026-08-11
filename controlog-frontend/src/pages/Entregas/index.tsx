import { useState } from 'react'
import { Search, Filter, Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import EntregaDetalhes from './EntregaDetalhes'
import EntregaFormModal from './EntregaFormModal'
import { useCreateEntrega, useDeleteEntrega, useEntregas, useUpdateEntrega } from './api'
import type { Entrega, EntregaInput, StatusEntrega } from './types'

const statusOptions: StatusEntrega[] = ['PENDENTE', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA']

const statusStyle: Record<StatusEntrega, string> = {
  ENTREGUE: 'bg-green-100 text-green-700',
  EM_TRANSITO: 'bg-yellow-100 text-yellow-700',
  PENDENTE: 'bg-red-100 text-red-700',
  CANCELADA: 'bg-gray-100 text-gray-700',
}

const statusLabel: Record<StatusEntrega, string> = {
  PENDENTE: 'Pendente',
  EM_TRANSITO: 'Em Trânsito',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function Entregas() {
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusEntrega | 'Todos'>('Todos')
  const [selected, setSelected]         = useState<Entrega | null>(null)
  const [editando, setEditando]         = useState<Entrega | null>(null)
  const [formAberto, setFormAberto]     = useState(false)
  const [excluindo, setExcluindo]       = useState<Entrega | null>(null)

  const { data: entregas = [], isLoading } = useEntregas({
    busca: search || undefined,
    status: statusFilter === 'Todos' ? undefined : statusFilter,
  })
  const createMutation = useCreateEntrega()
  const updateMutation = useUpdateEntrega()
  const deleteMutation = useDeleteEntrega()

  function handleSave(data: EntregaInput) {
    const mutation = editando
      ? updateMutation.mutateAsync({ id: editando.id, data })
      : createMutation.mutateAsync(data)

    mutation
      .then(() => {
        toast.success(editando ? 'Entrega atualizada.' : 'Entrega cadastrada.')
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
        toast.success('Entrega excluída.')
        setExcluindo(null)
      })
      .catch((error) => {
        toast.error(getErrorMessage(error, 'Não foi possível excluir esta entrega.'))
        setExcluindo(null)
      })
  }

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Entregas</h1>
          <p className="text-sm text-gray-600">{entregas.length} registros encontrados</p>
        </div>
        <button
          onClick={() => { setEditando(null); setFormAberto(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nova Entrega
        </button>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, destino, motorista ou rota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400 shrink-0" />
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
                {s === 'Todos' ? 'Todos' : statusLabel[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">Código</th>
                <th className="px-6 py-3 text-left">Rota</th>
                <th className="px-6 py-3 text-left">Destino</th>
                <th className="px-6 py-3 text-left">Motorista</th>
                <th className="px-6 py-3 text-left">Prev. Entrega</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-600 text-sm">
                    Carregando entregas...
                  </td>
                </tr>
              ) : entregas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-600 text-sm">
                    Nenhuma entrega encontrada para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                entregas.map((entrega) => (
                  <tr key={entrega.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-700">{entrega.codigo}</td>
                    <td className="px-6 py-4 text-gray-600">{entrega.rota.codigo}</td>
                    <td className="px-6 py-4 text-gray-600">{entrega.destino}</td>
                    <td className="px-6 py-4 text-gray-600">{entrega.motorista.nome}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(entrega.dataPrevista).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[entrega.status]}`}>
                        {statusLabel[entrega.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => setSelected(entrega)} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors">
                          <Eye size={14} />
                          Detalhes
                        </button>
                        <button
                          onClick={() => { setEditando(entrega); setFormAberto(true) }}
                          aria-label={`Editar ${entrega.codigo}`}
                          className="text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setExcluindo(entrega)}
                          aria-label={`Excluir ${entrega.codigo}`}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modais ── */}
      <EntregaDetalhes entrega={selected} onClose={() => setSelected(null)} />
      <EntregaFormModal
        open={formAberto}
        entregaEditando={editando}
        onClose={() => { setFormAberto(false); setEditando(null) }}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      />
      <ConfirmDialog
        open={!!excluindo}
        title="Excluir entrega"
        description={`Tem certeza que deseja excluir a entrega "${excluindo?.codigo}"? Esta ação não pode ser desfeita.`}
        loading={deleteMutation.isPending}
        onConfirm={handleExcluir}
        onCancel={() => setExcluindo(null)}
      />

    </div>
  )
}
