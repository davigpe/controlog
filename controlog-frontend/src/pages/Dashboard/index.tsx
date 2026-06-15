import { useState, useMemo } from 'react'
import {
  PackageCheck, PackageSearch, Truck, CheckCircle,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Period = '7d' | '15d' | '30d'

// ─── Dados mockados ───────────────────────────────────────────────────────────
const allChartData = [
  { date: '03/05', concluidas: 8,  emRota: 3, pendentes: 2 },
  { date: '06/05', concluidas: 12, emRota: 5, pendentes: 1 },
  { date: '09/05', concluidas: 7,  emRota: 4, pendentes: 3 },
  { date: '12/05', concluidas: 15, emRota: 6, pendentes: 2 },
  { date: '15/05', concluidas: 10, emRota: 2, pendentes: 4 },
  { date: '18/05', concluidas: 18, emRota: 7, pendentes: 1 },
  { date: '21/05', concluidas: 9,  emRota: 3, pendentes: 2 },
  { date: '24/05', concluidas: 14, emRota: 5, pendentes: 3 },
  { date: '27/05', concluidas: 11, emRota: 4, pendentes: 1 },
  { date: '30/05', concluidas: 16, emRota: 8, pendentes: 2 },
  { date: '02/06', concluidas: 13, emRota: 6, pendentes: 3 },
  { date: '05/06', concluidas: 20, emRota: 9, pendentes: 1 },
  { date: '08/06', concluidas: 17, emRota: 7, pendentes: 2 },
  { date: '11/06', concluidas: 22, emRota: 10, pendentes: 4 },
  { date: '14/06', concluidas: 19, emRota: 8, pendentes: 2 },
  { date: '17/06', concluidas: 24, emRota: 11, pendentes: 3 },
  { date: '20/06', concluidas: 21, emRota: 9, pendentes: 1 },
  { date: '23/06', concluidas: 18, emRota: 7, pendentes: 2 },
  { date: '26/06', concluidas: 25, emRota: 12, pendentes: 3 },
  { date: '29/06', concluidas: 23, emRota: 10, pendentes: 2 },
  { date: '02/07', concluidas: 27, emRota: 13, pendentes: 4 },
  { date: '05/07', concluidas: 20, emRota: 8,  pendentes: 1 },
  { date: '08/07', concluidas: 28, emRota: 14, pendentes: 3 },
  { date: '11/07', concluidas: 24, emRota: 11, pendentes: 2 },
  { date: '14/07', concluidas: 30, emRota: 15, pendentes: 5 },
  { date: '17/07', concluidas: 26, emRota: 12, pendentes: 3 },
  { date: '20/07', concluidas: 22, emRota: 9,  pendentes: 2 },
  { date: '23/07', concluidas: 29, emRota: 14, pendentes: 4 },
  { date: '26/07', concluidas: 31, emRota: 16, pendentes: 3 },
  { date: '29/07', concluidas: 28, emRota: 13, pendentes: 2 },
]

const motoristasData = [
  { nome: 'João Silva',  entregas: 42 },
  { nome: 'Carlos Melo', entregas: 38 },
  { nome: 'Pedro Lima',  entregas: 35 },
  { nome: 'Ana Costa',   entregas: 29 },
  { nome: 'Lucas Dias',  entregas: 24 },
]

const recentDeliveries = [
  { id: '#001', cliente: 'Metalúrgica Sul',    destino: 'Joinville, SC',     status: 'Concluída', motorista: 'João Silva'  },
  { id: '#002', cliente: 'Comércio ABC',       destino: 'São Paulo, SP',     status: 'Em Rota',   motorista: 'Carlos Melo' },
  { id: '#003', cliente: 'Distribuidora XYZ',  destino: 'Curitiba, PR',      status: 'Pendente',  motorista: '-'           },
  { id: '#004', cliente: 'Indústria Norte',    destino: 'Florianópolis, SC', status: 'Em Rota',   motorista: 'Pedro Lima'  },
  { id: '#005', cliente: 'Loja Central',       destino: 'Blumenau, SC',      status: 'Concluída', motorista: 'Ana Costa'   },
]

const statusStyle: Record<string, string> = {
  'Concluída': 'bg-green-100 text-green-700',
  'Em Rota':   'bg-yellow-100 text-yellow-700',
  'Pendente':  'bg-red-100 text-red-700',
}

const periodSlice: Record<Period, number> = {
  '7d':  5,
  '15d': 10,
  '30d': 30,
}

const periodLabel: Record<Period, string> = {
  '7d':  'Últimos 7 dias',
  '15d': 'Últimos 15 dias',
  '30d': 'Últimos 30 dias',
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('15d')

  const chartData = useMemo(
    () => allChartData.slice(-periodSlice[period]),
    [period],
  )

  const metrics = useMemo(() => {
    const slice = chartData
    const total     = slice.reduce((s, d) => s + d.concluidas + d.emRota + d.pendentes, 0)
    const concluidas = slice.reduce((s, d) => s + d.concluidas, 0)
    const emRota     = slice.reduce((s, d) => s + d.emRota, 0)
    const pendentes  = slice.reduce((s, d) => s + d.pendentes, 0)
    return [
      { label: 'Total no Período', value: total,     icon: PackageSearch, color: 'bg-blue-500'   },
      { label: 'Em Rota',          value: emRota,    icon: Truck,         color: 'bg-yellow-500' },
      { label: 'Concluídas',       value: concluidas,icon: CheckCircle,   color: 'bg-green-500'  },
      { label: 'Pendentes',        value: pendentes, icon: PackageCheck,  color: 'bg-red-500'    },
    ]
  }, [chartData])

  return (
    <div className="space-y-6">

      {/* ── Filtro de período ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Exibindo: <span className="font-medium text-gray-700">{periodLabel[period]}</span></p>
        <div className="flex gap-2">
          {(['7d', '15d', '30d'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                period === p
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {periodLabel[p]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Cards de métricas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
            <div className={`${color} text-white p-3 rounded-lg`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Gráficos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Área — Evolução das entregas */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Evolução das Entregas</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradConcluidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gradEmRota" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#eab308" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gradPendentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="concluidas" name="Concluídas" stroke="#22c55e" fill="url(#gradConcluidas)" strokeWidth={2} />
              <Area type="monotone" dataKey="emRota"     name="Em Rota"    stroke="#eab308" fill="url(#gradEmRota)"     strokeWidth={2} />
              <Area type="monotone" dataKey="pendentes"  name="Pendentes"  stroke="#ef4444" fill="url(#gradPendentes)"  strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Barras — Top motoristas */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Top Motoristas</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={motoristasData}
              layout="vertical"
              margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nome" tick={{ fontSize: 11 }} width={80} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="entregas" name="Entregas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ── Tabela de últimas entregas ── */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-700">Últimas Entregas</h2>
          <span className="text-xs text-gray-400">{recentDeliveries.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">ID</th>
                <th className="px-6 py-3 text-left">Cliente</th>
                <th className="px-6 py-3 text-left">Destino</th>
                <th className="px-6 py-3 text-left">Motorista</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentDeliveries.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-700">{d.id}</td>
                  <td className="px-6 py-4 text-gray-600">{d.cliente}</td>
                  <td className="px-6 py-4 text-gray-600">{d.destino}</td>
                  <td className="px-6 py-4 text-gray-600">{d.motorista}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[d.status]}`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
