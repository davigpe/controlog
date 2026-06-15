import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  Package, Users, Truck, TrendingUp,
  CheckCircle, Clock, XCircle, Download,
} from 'lucide-react'

// ─── Dados mockados ────────────────────────────────────────────────────────────

const entregasPorMes = [
  { mes: 'Jan', concluidas: 38, emRota: 5, canceladas: 2 },
  { mes: 'Fev', concluidas: 42, emRota: 6, canceladas: 1 },
  { mes: 'Mar', concluidas: 35, emRota: 8, canceladas: 3 },
  { mes: 'Abr', concluidas: 50, emRota: 4, canceladas: 2 },
  { mes: 'Mai', concluidas: 47, emRota: 7, canceladas: 1 },
  { mes: 'Jun', concluidas: 53, emRota: 9, canceladas: 4 },
]

const entregasPorMotorista = [
  { nome: 'João Silva',      entregas: 42 },
  { nome: 'Carlos Melo',     entregas: 38 },
  { nome: 'Pedro Lima',      entregas: 35 },
  { nome: 'Ana Costa',       entregas: 29 },
  { nome: 'Lucas Dias',      entregas: 24 },
  { nome: 'Fernanda Ramos',  entregas: 18 },
]

const statusEntregas = [
  { name: 'Concluídas', value: 265, color: '#22c55e' },
  { name: 'Em Rota',    value: 39,  color: '#eab308' },
  { name: 'Pendentes',  value: 28,  color: '#ef4444' },
  { name: 'Canceladas', value: 13,  color: '#9ca3af' },
]

const kmPorVeiculo = [
  { veiculo: 'ABC-1234', km: 128450 },
  { veiculo: 'DEF-5678', km: 87230  },
  { veiculo: 'GHI-9012', km: 214700 },
  { veiculo: 'JKL-3456', km: 54900  },
  { veiculo: 'MNO-7890', km: 176320 },
  { veiculo: 'PQR-1122', km: 22100  },
]

const periodos = ['Últimos 30 dias', 'Últimos 3 meses', 'Últimos 6 meses', 'Este ano']

// ─── Componente ───────────────────────────────────────────────────────────────
export default function Relatorios() {
  const [periodo, setPeriodo] = useState('Últimos 6 meses')

  const kpis = useMemo(() => {
    const total      = statusEntregas.reduce((acc, s) => acc + s.value, 0)
    const concluidas = statusEntregas.find((s) => s.name === 'Concluídas')?.value ?? 0
    return {
      total,
      concluidas,
      taxaSucesso: ((concluidas / total) * 100).toFixed(1),
      emRota:      statusEntregas.find((s) => s.name === 'Em Rota')?.value ?? 0,
      canceladas:  statusEntregas.find((s) => s.name === 'Canceladas')?.value ?? 0,
    }
  }, [])

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Relatórios</h1>
          <p className="text-sm text-gray-500">Visão geral do desempenho operacional</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de período */}
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
          >
            {periodos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Exportar */}
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <Download size={15} />
            Exportar
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<Package size={20} />}
          label="Total de Entregas"
          value={kpis.total}
          color="blue"
        />
        <KpiCard
          icon={<CheckCircle size={20} />}
          label="Concluídas"
          value={kpis.concluidas}
          badge={`${kpis.taxaSucesso}% taxa`}
          color="green"
        />
        <KpiCard
          icon={<Clock size={20} />}
          label="Em Rota"
          value={kpis.emRota}
          color="yellow"
        />
        <KpiCard
          icon={<XCircle size={20} />}
          label="Canceladas"
          value={kpis.canceladas}
          color="red"
        />
      </div>

      {/* ── Linha 1: Entregas por mês + Pizza de status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Gráfico de barras — entregas por mês */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
          <SectionTitle
            icon={<TrendingUp size={16} />}
            title="Entregas por Mês"
            subtitle="Distribuição mensal por status"
          />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={entregasPorMes} barSize={14} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="concluidas" name="Concluídas" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="emRota"     name="Em Rota"    fill="#eab308" radius={[4, 4, 0, 0]} />
              <Bar dataKey="canceladas" name="Canceladas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de pizza — status geral */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <SectionTitle
            icon={<Package size={16} />}
            title="Status Geral"
            subtitle="Proporção de entregas"
          />
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={statusEntregas}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {statusEntregas.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legenda manual */}
          <div className="mt-2 space-y-2">
            {statusEntregas.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-gray-600">{s.name}</span>
                </div>
                <span className="font-semibold text-gray-800">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Linha 2: Entregas por motorista + KM por veículo ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Barras horizontais — motoristas */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <SectionTitle
            icon={<Users size={16} />}
            title="Entregas por Motorista"
            subtitle="Total acumulado no período"
          />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={entregasPorMotorista}
              layout="vertical"
              barSize={14}
              margin={{ left: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="nome"
                tick={{ fontSize: 11 }}
                width={110}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Bar dataKey="entregas" name="Entregas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Linha — KM por veículo */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <SectionTitle
            icon={<Truck size={16} />}
            title="Quilometragem por Veículo"
            subtitle="KM acumulado por placa"
          />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={kmPorVeiculo} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="veiculo" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => [`${v.toLocaleString('pt-BR')} km`, 'KM']}
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Bar dataKey="km" name="KM" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Linha 3: Evolução de concluídas ── */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <SectionTitle
          icon={<TrendingUp size={16} />}
          title="Evolução de Entregas Concluídas"
          subtitle="Tendência mensal"
        />
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={entregasPorMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="concluidas"
              name="Concluídas"
              stroke="#22c55e"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#22c55e' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="canceladas"
              name="Canceladas"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#ef4444' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, badge, color,
}: {
  icon: React.ReactNode
  label: string
  value: number
  badge?: string
  color: 'blue' | 'green' | 'yellow' | 'red'
}) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'bg-blue-100'   },
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'bg-green-100'  },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', icon: 'bg-yellow-100' },
    red:    { bg: 'bg-red-50',    text: 'text-red-600',    icon: 'bg-red-100'    },
  }
  const c = colors[color]

  return (
    <div className={`rounded-xl p-4 ${c.bg} flex items-center gap-4`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.icon} ${c.text} shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        {badge && <p className="text-xs text-gray-400 mt-0.5">{badge}</p>}
      </div>
    </div>
  )
}

function SectionTitle({
  icon, title, subtitle,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-blue-500">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
  )
}
