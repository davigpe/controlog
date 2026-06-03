import { useState, useMemo } from 'react'
import { Search, Plus, Eye, Truck, CheckCircle, XCircle } from 'lucide-react'
import MotoristaModal from './MotoristaModal'
import MotoristaForm from './MotoristaForm'
import type { Motorista, StatusMotorista } from './types'

// ─── Dados mockados ────────────────────────────────────────────────────────────
const initialMotoristas: Motorista[] = [
  { id: 'M001', nome: 'João Silva',   cnh: '12345678901', categoriaCnh: 'E', telefone: '(47) 99111-1111', email: 'joao.silva@controlog.com',   status: 'Ativo',    veiculo: 'Ford Cargo - ABC-1234',       entregasRealizadas: 42, dataAdmissao: '10/03/2021' },
  { id: 'M002', nome: 'Carlos Melo',  cnh: '23456789012', categoriaCnh: 'D', telefone: '(47) 99222-2222', email: 'carlos.melo@controlog.com',  status: 'Em Rota',  veiculo: 'VW Delivery - DEF-5678',      entregasRealizadas: 38, dataAdmissao: '15/06/2021' },
  { id: 'M003', nome: 'Pedro Lima',   cnh: '34567890123', categoriaCnh: 'E', telefone: '(47) 99333-3333', email: 'pedro.lima@controlog.com',   status: 'Em Rota',  veiculo: 'Mercedes Axor - GHI-9012',    entregasRealizadas: 35, dataAdmissao: '02/09/2020', observacoes: 'Especialista em cargas pesadas.' },
  { id: 'M004', nome: 'Ana Costa',    cnh: '45678901234', categoriaCnh: 'C', telefone: '(47) 99444-4444', email: 'ana.costa@controlog.com',    status: 'Ativo',    veiculo: 'Ford Cargo - JKL-3456',       entregasRealizadas: 29, dataAdmissao: '20/01/2022' },
  { id: 'M005', nome: 'Lucas Dias',   cnh: '56789012345', categoriaCnh: 'E', telefone: '(47) 99555-5555', email: 'lucas.dias@controlog.com',   status: 'Em Rota',  veiculo: 'VW Constellation - MNO-7890', entregasRealizadas: 24, dataAdmissao: '08/04/2022' },
  { id: 'M006', nome: 'Fernanda Ramos', cnh: '67890123456', categoriaCnh: 'D', telefone: '(47) 99666-6666', email: 'fernanda.ramos@controlog.com', status: 'Inativo', veiculo: 'Não atribuído', entregasRealizadas: 18, dataAdmissao: '14/11/2019', observacoes: 'Afastada por licença médica.' },
]

const statusOptions: StatusMotorista[] = ['Ativo', 'Em Rota', 'Inativo']

const statusStyle: Record<StatusMotorista, string> = {
  'Ativo':   'bg-green-100 text-green-700',
  'Em Rota': 'bg-yellow-100 text-yellow-700',
  'Inativo': 'bg-gray-100 text-gray-500',
}

const statusIcon: Record<StatusMotorista, React.ReactNode> = {
  'Ativo':   <CheckCircle size={13} />,
  'Em Rota': <Truck size={13} />,
  'Inativo': <XCircle size={13} />,
}

export default function Motoristas() {
  const [motoristas, setMotoristas]     = useState<Motorista[]>(initialMotoristas)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusMotorista | 'Todos'>('Todos')
  const [selected, setSelected]         = useState<Motorista | null>(null)
  const [showForm, setShowForm]         = useState(false)

  function handleSave(novo: Motorista) {
    setMotoristas((prev) => [novo, ...prev])
  }

  const filtered = useMemo(() => {
    return motoristas.filter((m) => {
      const matchSearch =
        m.nome.toLowerCase().includes(search.toLowerCase())     ||
        m.id.toLowerCase().includes(search.toLowerCase())       ||
        m.veiculo.toLowerCase().includes(search.toLowerCase())  ||
        m.telefone.includes(search)

      const matchStatus = statusFilter === 'Todos' || m.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [motoristas, search, statusFilter])

  // Totalizadores
  const totais = useMemo(() => ({
    ativos:   motoristas.filter((m) => m.status === 'Ativo').length,
    emRota:   motoristas.filter((m) => m.status === 'Em Rota').length,
    inativos: motoristas.filter((m) => m.status === 'Inativo').length,
  }), [motoristas])

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Motoristas</h1>
          <p className="text-sm text-gray-500">{filtered.length} registros encontrados</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Novo Motorista
        </button>
      </div>

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Motoristas Ativos"   value={totais.ativos}  color="green"  />
        <SummaryCard label="Em Rota Agora"        value={totais.emRota}  color="yellow" />
        <SummaryCard label="Inativos"             value={totais.inativos} color="gray"  />
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, ID, veículo ou telefone..."
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
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards de motoristas ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-400 text-sm">
          Nenhum motorista encontrado para os filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">

              {/* Topo do card */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                  {m.nome.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{m.nome}</p>
                  <p className="text-xs text-gray-400">{m.id}</p>
                </div>
                <span className={`ml-auto flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${statusStyle[m.status]}`}>
                  {statusIcon[m.status]}
                  {m.status}
                </span>
              </div>

              {/* Infos */}
              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">{m.veiculo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs font-medium w-3.5">CNH</span>
                  <span>{m.cnh} — Cat. {m.categoriaCnh}</span>
                </div>
              </div>

              {/* Rodapé do card */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">{m.entregasRealizadas}</p>
                  <p className="text-xs text-gray-400">Entregas</p>
                </div>
                <button
                  onClick={() => setSelected(m)}
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
                >
                  <Eye size={14} />
                  Ver detalhes
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── Modais ── */}
      <MotoristaModal motorista={selected} onClose={() => setSelected(null)} />
      {showForm && <MotoristaForm onClose={() => setShowForm(false)} onSave={handleSave} />}

    </div>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({
  label, value, color,
}: {
  label: string
  value: number
  color: 'green' | 'yellow' | 'gray'
}) {
  const colors = {
    green:  'bg-green-50 text-green-600 border-green-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    gray:   'bg-gray-50 text-gray-500 border-gray-100',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </div>
  )
}
