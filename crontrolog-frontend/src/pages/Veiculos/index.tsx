import { useState, useMemo } from 'react'
import { Search, Plus, Eye, Wrench, CheckCircle, XCircle, Truck } from 'lucide-react'
import VeiculoModal from './VeiculoModal'
import VeiculoForm from './VeiculoForm'
import type { Veiculo, StatusVeiculo } from './types'

// ─── Dados mockados ────────────────────────────────────────────────────────────
const initialVeiculos: Veiculo[] = [
  { id: 'V001', placa: 'ABC-1234', marca: 'Ford',         modelo: 'Cargo 1723',      ano: '2020', tipo: 'Caminhão',   capacidade: '8.000 kg',  status: 'Em Rota',    motorista: 'João Silva',   kmAtual: '128.450 km', ultimaRevisao: '10/01/2025', proximaRevisao: '10/07/2025' },
  { id: 'V002', placa: 'DEF-5678', marca: 'Volkswagen',   modelo: 'Delivery 9.170',  ano: '2021', tipo: 'Utilitário', capacidade: '3.500 kg',  status: 'Em Rota',    motorista: 'Carlos Melo',  kmAtual: '87.230 km',  ultimaRevisao: '05/02/2025', proximaRevisao: '05/08/2025' },
  { id: 'V003', placa: 'GHI-9012', marca: 'Mercedes-Benz',modelo: 'Axor 2544',       ano: '2019', tipo: 'Caminhão',   capacidade: '15.000 kg', status: 'Em Rota',    motorista: 'Pedro Lima',   kmAtual: '214.700 km', ultimaRevisao: '20/12/2024', proximaRevisao: '20/06/2025', observacoes: 'Revisão de freios agendada.' },
  { id: 'V004', placa: 'JKL-3456', marca: 'Ford',         modelo: 'Cargo 2428',      ano: '2022', tipo: 'Caminhão',   capacidade: '10.000 kg', status: 'Disponível', motorista: 'Não atribuído',kmAtual: '54.900 km',  ultimaRevisao: '15/03/2025', proximaRevisao: '15/09/2025' },
  { id: 'V005', placa: 'MNO-7890', marca: 'Volkswagen',   modelo: 'Constellation 24', ano: '2021', tipo: 'Carreta',   capacidade: '25.000 kg', status: 'Em Rota',    motorista: 'Lucas Dias',   kmAtual: '176.320 km', ultimaRevisao: '01/02/2025', proximaRevisao: '01/08/2025' },
  { id: 'V006', placa: 'PQR-1122', marca: 'Iveco',        modelo: 'Daily 35S14',     ano: '2023', tipo: 'Van',        capacidade: '1.500 kg',  status: 'Disponível', motorista: 'Não atribuído',kmAtual: '22.100 km',  ultimaRevisao: '10/04/2025', proximaRevisao: '10/10/2025' },
  { id: 'V007', placa: 'STU-3344', marca: 'Scania',       modelo: 'R 450',           ano: '2018', tipo: 'Carreta',    capacidade: '30.000 kg', status: 'Manutenção', motorista: 'Não atribuído',kmAtual: '398.600 km', ultimaRevisao: '28/04/2025', proximaRevisao: '28/10/2025', observacoes: 'Em manutenção preventiva no motor.' },
  { id: 'V008', placa: 'VWX-5566', marca: 'Mercedes-Benz',modelo: 'Sprinter 415',    ano: '2022', tipo: 'Van',        capacidade: '1.200 kg',  status: 'Inativo',    motorista: 'Não atribuído',kmAtual: '61.450 km',  ultimaRevisao: '03/01/2025', proximaRevisao: '03/07/2025', observacoes: 'Aguardando peças para reparo.' },
]

const statusOptions: StatusVeiculo[] = ['Disponível', 'Em Rota', 'Manutenção', 'Inativo']

const statusStyle: Record<StatusVeiculo, string> = {
  'Disponível': 'bg-green-100 text-green-700',
  'Em Rota':    'bg-yellow-100 text-yellow-700',
  'Manutenção': 'bg-orange-100 text-orange-700',
  'Inativo':    'bg-gray-100 text-gray-500',
}

const statusIcon: Record<StatusVeiculo, React.ReactNode> = {
  'Disponível': <CheckCircle size={13} />,
  'Em Rota':    <Truck size={13} />,
  'Manutenção': <Wrench size={13} />,
  'Inativo':    <XCircle size={13} />,
}

const tipoEmoji: Record<string, string> = {
  'Caminhão':   '🚛',
  'Van':        '🚐',
  'Utilitário': '🚚',
  'Carreta':    '🚜',
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function Veiculos() {
  const [veiculos, setVeiculos]         = useState<Veiculo[]>(initialVeiculos)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusVeiculo | 'Todos'>('Todos')
  const [selected, setSelected]         = useState<Veiculo | null>(null)
  const [showForm, setShowForm]         = useState(false)

  function handleSave(novo: Veiculo) {
    setVeiculos((prev) => [novo, ...prev])
  }

  const filtered = useMemo(() => {
    return veiculos.filter((v) => {
      const matchSearch =
        v.placa.toLowerCase().includes(search.toLowerCase())    ||
        v.modelo.toLowerCase().includes(search.toLowerCase())   ||
        v.marca.toLowerCase().includes(search.toLowerCase())    ||
        v.motorista.toLowerCase().includes(search.toLowerCase())||
        v.tipo.toLowerCase().includes(search.toLowerCase())

      const matchStatus = statusFilter === 'Todos' || v.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [veiculos, search, statusFilter])

  const totais = useMemo(() => ({
    disponiveis: veiculos.filter((v) => v.status === 'Disponível').length,
    emRota:      veiculos.filter((v) => v.status === 'Em Rota').length,
    manutencao:  veiculos.filter((v) => v.status === 'Manutenção').length,
    inativos:    veiculos.filter((v) => v.status === 'Inativo').length,
  }), [veiculos])

  return (
    <div className="space-y-5">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Veículos</h1>
          <p className="text-sm text-gray-500">{filtered.length} registros encontrados</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
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
            placeholder="Buscar por placa, modelo, marca, tipo ou motorista..."
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

      {/* ── Cards de veículos ── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-400 text-sm">
          Nenhum veículo encontrado para os filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((v) => (
            <div key={v.id} className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">

              {/* Topo */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl shrink-0">
                    {tipoEmoji[v.tipo] ?? '🚚'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{v.marca} {v.modelo}</p>
                    <p className="text-xs font-mono text-gray-400 tracking-wider">{v.placa}</p>
                  </div>
                </div>
              </div>

              {/* Status */}
              <span className={`self-start flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[v.status]}`}>
                {statusIcon[v.status]}
                {v.status}
              </span>

              {/* Infos */}
              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">Tipo</span>
                  <span className="text-xs font-medium">{v.tipo} · {v.ano}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">Capacidade</span>
                  <span className="text-xs font-medium">{v.capacidade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">KM Atual</span>
                  <span className="text-xs font-medium">{v.kmAtual}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-xs">Motorista</span>
                  <span className="text-xs font-medium truncate max-w-[120px]">{v.motorista}</span>
                </div>
              </div>

              {/* Revisão */}
              <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 flex justify-between">
                <span>Próx. revisão</span>
                <span className="font-medium text-gray-700">{v.proximaRevisao}</span>
              </div>

              {/* Ação */}
              <button
                onClick={() => setSelected(v)}
                className="flex items-center justify-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors pt-1 border-t border-gray-100"
              >
                <Eye size={14} />
                Ver detalhes
              </button>

            </div>
          ))}
        </div>
      )}

      {/* ── Modais ── */}
      <VeiculoModal veiculo={selected} onClose={() => setSelected(null)} />
      {showForm && <VeiculoForm onClose={() => setShowForm(false)} onSave={handleSave} />}

    </div>
  )
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
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
        <p className="text-xs mt-1 opacity-80">{label}</p>
      </div>
    </div>
  )
}
