import { useState } from 'react'
import { Building2, MapPin, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'
import Pagination from '@/components/shared/Pagination'
import ConfirmDialog from '@/components/shared/ConfirmDialog'
import { useClientes, useCreateCliente, useDeleteCliente, useUpdateCliente } from './api'
import ClienteFormModal from './ClienteFormModal'
import type { Cliente, ClienteInput } from './types'

const filtros: { label: string; valor: boolean | undefined }[] = [
  { label: 'Todos', valor: undefined },
  { label: 'Ativos', valor: true },
  { label: 'Inativos', valor: false },
]

export default function Clientes() {
  const [busca, setBusca] = useState('')
  const [ativo, setAtivo] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [formAberto, setFormAberto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [excluindo, setExcluindo] = useState<Cliente | null>(null)

  const { data, isLoading } = useClientes({ busca: busca || undefined, ativo, page })
  const criar = useCreateCliente()
  const atualizar = useUpdateCliente()
  const excluir = useDeleteCliente()

  const clientes = data?.items ?? []

  function trocarBusca(valor: string) {
    setBusca(valor)
    setPage(1)
  }

  function trocarFiltro(valor: boolean | undefined) {
    setAtivo(valor)
    setPage(1)
  }

  function handleSalvar(dados: ClienteInput) {
    const acao = editando
      ? atualizar.mutateAsync({ id: editando.id, data: dados })
      : criar.mutateAsync(dados)

    acao
      .then(() => {
        toast.success(editando ? 'Cliente atualizado.' : 'Cliente cadastrado.')
        setFormAberto(false)
        setEditando(null)
      })
      .catch((erro) => toast.error(getErrorMessage(erro, 'Não foi possível salvar o cliente.')))
  }

  function handleExcluir() {
    if (!excluindo) return
    const { id, nome } = excluindo
    excluir
      .mutateAsync(id)
      .then(() => {
        toast.success(`${nome} excluído.`)
        setExcluindo(null)
      })
      .catch((erro) => {
        // A mensagem do servidor explica o bloqueio por pedidos vinculados e
        // sugere inativar — é mais útil que um texto genérico.
        toast.error(getErrorMessage(erro, 'Não foi possível excluir este cliente.'))
        setExcluindo(null)
      })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Clientes</h1>
          <p className="text-sm text-gray-600">
            {data?.pagination.total ?? 0} registros encontrados
          </p>
        </div>
        <button
          onClick={() => {
            setEditando(null)
            setFormAberto(true)
          }}
          className="flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="clientes-busca" className="sr-only">
            Buscar clientes
          </label>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="clientes-busca"
            type="search"
            value={busca}
            onChange={(e) => trocarBusca(e.target.value)}
            placeholder="Buscar por código, nome, endereço ou bairro..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <div className="flex gap-2">
          {filtros.map(({ label, valor }) => (
            <button
              key={label}
              onClick={() => trocarFiltro(valor)}
              className={`flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                ativo === valor
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-sm text-gray-600">
          Carregando clientes...
        </div>
      ) : clientes.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-sm text-gray-600">
          Nenhum cliente encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientes.map((cliente) => (
            <article key={cliente.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 grid place-items-center shrink-0">
                  <Building2 size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-800 truncate">{cliente.nome}</h2>
                  <p className="text-xs text-gray-500 font-mono">{cliente.codigo}</p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                    cliente.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {cliente.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <p className="text-sm text-gray-600 mt-3 flex items-start gap-1.5">
                <MapPin size={14} className="text-blue-500 shrink-0 mt-0.5" />
                <span className="min-w-0">
                  {cliente.endereco}
                  <br />
                  <span className="text-xs text-gray-500">
                    {cliente.bairro} — {cliente.cidade}/{cliente.uf}
                  </span>
                </span>
              </p>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Package size={13} className="text-blue-500" />
                  {cliente.totalPedidos} pedido(s)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditando(cliente)
                      setFormAberto(true)
                    }}
                    aria-label={`Editar ${cliente.nome}`}
                    className="w-9 h-9 grid place-items-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setExcluindo(cliente)}
                    aria-label={`Excluir ${cliente.nome}`}
                    className="w-9 h-9 grid place-items-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <Pagination pagination={data.pagination} onPageChange={setPage} />
      )}

      <ClienteFormModal
        aberto={formAberto}
        editando={editando}
        salvando={criar.isPending || atualizar.isPending}
        onSalvar={handleSalvar}
        onFechar={() => {
          setFormAberto(false)
          setEditando(null)
        }}
      />

      <ConfirmDialog
        open={!!excluindo}
        title="Excluir cliente"
        description={
          excluindo
            ? `Excluir ${excluindo.nome} (${excluindo.codigo})? Clientes com pedidos vinculados não podem ser excluídos — nesse caso, marque como inativo.`
            : ''
        }
        confirmLabel="Excluir"
        loading={excluir.isPending}
        onConfirm={handleExcluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  )
}
