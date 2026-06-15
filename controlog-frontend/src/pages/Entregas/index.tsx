import { useState, useMemo } from 'react'
import { Search, Filter, Plus, Eye } from 'lucide-react'
import EntregaModal from './EntregaModal'
import EntregaForm from './EntregaForm'
import type { Entrega, StatusEntrega } from './types'

// ─── Dados mockados ────────────────────────────────────────────────────────────
const initialEntregas: Entrega[] = [
  { id: '#001', cliente: 'Metalúrgica Sul',       destino: 'Joinville, SC',          endereco: 'Rua das Indústrias, 500 - Joinville, SC',            motorista: 'João Silva',   veiculo: 'Ford Cargo - ABC-1234',         status: 'Concluída', dataPrevista: '01/06/2025', dataConclusao: '01/06/2025', peso: '1.200 kg', observacoes: 'Entregar no portão lateral.' },
  { id: '#002', cliente: 'Comércio ABC',          destino: 'São Paulo, SP',           endereco: 'Av. Paulista, 1200 - São Paulo, SP',                  motorista: 'Carlos Melo',  veiculo: 'VW Delivery - DEF-5678',        status: 'Em Rota',   dataPrevista: '02/06/2025', peso: '850 kg' },
  { id: '#003', cliente: 'Distribuidora XYZ',     destino: 'Curitiba, PR',            endereco: 'Rua XV de Novembro, 300 - Curitiba, PR',              motorista: '-',            veiculo: '-',                             status: 'Pendente',  dataPrevista: '03/06/2025', peso: '2.000 kg', observacoes: 'Aguardando confirmação do cliente.' },
  { id: '#004', cliente: 'Indústria Norte',       destino: 'Florianópolis, SC',       endereco: 'Rod. SC-401, km 12 - Florianópolis, SC',              motorista: 'Pedro Lima',   veiculo: 'Mercedes Axor - GHI-9012',      status: 'Em Rota',   dataPrevista: '02/06/2025', peso: '3.500 kg' },
  { id: '#005', cliente: 'Loja Central',          destino: 'Blumenau, SC',            endereco: 'Rua XV de Novembro, 800 - Blumenau, SC',              motorista: 'Ana Costa',    veiculo: 'Ford Cargo - JKL-3456',         status: 'Concluída', dataPrevista: '31/05/2025', dataConclusao: '31/05/2025', peso: '600 kg' },
  { id: '#006', cliente: 'Supermercado BomPreço', destino: 'Chapecó, SC',             endereco: 'Av. Getúlio Vargas, 450 - Chapecó, SC',               motorista: 'Lucas Dias',   veiculo: 'VW Constellation - MNO-7890',   status: 'Em Rota',   dataPrevista: '03/06/2025', peso: '4.200 kg' },
  { id: '#007', cliente: 'Farmácia Saúde',        destino: 'Itajaí, SC',              endereco: 'Rua Lauro Müller, 200 - Itajaí, SC',                  motorista: 'João Silva',   veiculo: 'Ford Cargo - ABC-1234',         status: 'Pendente',  dataPrevista: '04/06/2025', peso: '320 kg',  observacoes: 'Carga frágil, manusear com cuidado.' },
  { id: '#008', cliente: 'Construtora Alpha',     destino: 'Balneário Camboriú, SC',  endereco: 'Av. Brasil, 900 - Balneário Camboriú, SC',             motorista: 'Pedro Lima',   veiculo: 'Mercedes Axor - GHI-9012',      status: 'Cancelada', dataPrevista: '01/06/2025', peso: '5.000 kg', observacoes: 'Cancelado a pedido do cliente.' },
  { id: '#009', cliente: 'TechStore',             destino: 'Lages, SC',               endereco: 'Rua Caetano Vieira, 50 - Lages, SC',                  motorista: 'Ana Costa',    veiculo: 'Ford Cargo - JKL-3456',         status: 'Concluída', dataPrevista: '30/05/2025', dataConclusao: '30/05/2025', peso: '780 kg' },
  { id: '#010', cliente: 'Agropecuária Boa Terra',destino: 'Criciúma, SC',            endereco: 'Av. Universitária, 1100 - Criciúma, SC',              motorista: 'Carlos Melo',  veiculo: 'VW Delivery - DEF-5678',        status: 'Pendente',  dataPrevista: '05/06/2025', peso: '1.800 kg' },
]

const statusOptions: StatusEntrega[] = ['Concluída', 'Em Rota', 'Pendente', 'Cancelada']

const statusStyle: Record<StatusEntrega, string> = {
  'Concluída': 'bg-green-100 text-green-700',
  'Em Rota':   'bg-yellow-100 text-yellow-700',
  'Pendente':  'bg-red-100 text-red-700',
  'Cancelada': 'bg-gray-100 text-gray-500',
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function Entregas() {
  const [entregas, setEntregas]           = useState<Entrega[]>(initialEntregas)
  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<StatusEntrega | 'Todos'>('Todos')
  const [selected, setSelected]           = useState<Entrega | null>(null)
  const [showForm, setShowForm]           = useState(false)

  function handleSave(nova: Entrega) {
    setEntregas((prev) => [nova, ...prev])
  }

  const filtered = useMemo(() => {
    return entregas.filter((e) => {
      const matchSearch =
        e.id.toLowerCase().includes(search.toLowerCase())         ||
        e.cliente.toLowerCase().includes(search.toLowerCase())    ||
        e.destino.toLowerCase().includes(search.toLowerCase())    ||
        e.motorista.toLowerCase().includes(search.toLowerCase())

      const matchStatus = statusFilter === 'Todos' || e.status === statusFilter

      return matchSearch && matchStatus
    })
  }, [entregas, search, statusFilter])

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Entregas</h1>
          <p className="text-sm text-gray-500">{filtered.length} registros encontrados</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
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
            placeholder="Buscar por ID, cliente, destino ou motorista..."
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
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">ID</th>
                <th className="px-6 py-3 text-left">Cliente</th>
                <th className="px-6 py-3 text-left">Destino</th>
                <th className="px-6 py-3 text-left">Motorista</th>
                <th className="px-6 py-3 text-left">Prev. Entrega</th>
                <th className="px-6 py-3 text-left">Peso</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-sm">
                    Nenhuma entrega encontrada para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filtered.map((entrega) => (
                  <tr key={entrega.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-700">{entrega.id}</td>
                    <td className="px-6 py-4 text-gray-600">{entrega.cliente}</td>
                    <td className="px-6 py-4 text-gray-600">{entrega.destino}</td>
                    <td className="px-6 py-4 text-gray-600">{entrega.motorista}</td>
                    <td className="px-6 py-4 text-gray-600">{entrega.dataPrevista}</td>
                    <td className="px-6 py-4 text-gray-600">{entrega.peso}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[entrega.status]}`}>
                        {entrega.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelected(entrega)}
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
                      >
                        <Eye size={14} />
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modais ── */}
      <EntregaModal entrega={selected} onClose={() => setSelected(null)} />
      {showForm && <EntregaForm onClose={() => setShowForm(false)} onSave={handleSave} />}

    </div>
  )
}
