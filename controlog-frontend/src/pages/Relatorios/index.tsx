import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Package, Users, Route, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useRelatorio } from './api'

type Periodo = '7d' | '30d' | '90d' | 'tudo'

const periodos: { value: Periodo; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'tudo', label: 'Todo o período' },
]

function calcularIntervalo(periodo: Periodo) {
  if (periodo === 'tudo') return {}
  const dias = { '7d': 7, '30d': 30, '90d': 90 }[periodo]
  const dataFim = new Date()
  const dataInicio = new Date()
  dataInicio.setDate(dataInicio.getDate() - dias)
  return {
    dataInicio: dataInicio.toISOString().slice(0, 10),
    dataFim: dataFim.toISOString().slice(0, 10),
  }
}

const rotaStatusLabel: Record<string, string> = { ATIVA: 'Ativas', CONCLUIDA: 'Concluídas', CANCELADA: 'Canceladas' }
const entregaStatusLabel: Record<string, string> = {
  PENDENTE: 'Pendentes', EM_TRANSITO: 'Em Trânsito', ENTREGUE: 'Entregues', CANCELADA: 'Canceladas',
}

export default function Relatorios() {
  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const params = useMemo(() => calcularIntervalo(periodo), [periodo])
  const { data: relatorio, isLoading } = useRelatorio(params)

  const rotasChart = useMemo(
    () => Object.entries(relatorio?.rotasPorStatus ?? {}).map(([status, value]) => ({
      status: rotaStatusLabel[status] ?? status,
      total: value,
    })),
    [relatorio]
  )

  const entregasChart = useMemo(
    () => Object.entries(relatorio?.entregasPorStatus ?? {}).map(([status, value]) => ({
      status: entregaStatusLabel[status] ?? status,
      total: value,
    })),
    [relatorio]
  )

  const kpis = useMemo(() => {
    const entregas = relatorio?.entregasPorStatus ?? {}
    return {
      total: relatorio?.totalEntregas ?? 0,
      entregues: entregas.ENTREGUE ?? 0,
      emTransito: entregas.EM_TRANSITO ?? 0,
      canceladas: entregas.CANCELADA ?? 0,
    }
  }, [relatorio])

  return (
    <div className="space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Relatórios</h1>
          <p className="text-sm text-gray-600">Visão geral do desempenho operacional</p>
        </div>

        <select
          aria-label="Período do relatório"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as Periodo)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-700"
        >
          {periodos.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {isLoading || !relatorio ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Carregando relatório...
        </div>
      ) : (
        <>
          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={<Package size={20} />} label="Total de Entregas" value={kpis.total} color="blue" />
            <KpiCard icon={<CheckCircle size={20} />} label="Entregues" value={kpis.entregues} color="green" />
            <KpiCard icon={<Clock size={20} />} label="Em Trânsito" value={kpis.emTransito} color="yellow" />
            <KpiCard icon={<XCircle size={20} />} label="Canceladas" value={kpis.canceladas} color="red" />
          </div>

          {/* ── Rotas por status + Motoristas mais ativos ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <SectionTitle icon={<Route size={16} />} title="Rotas por Status" subtitle="No período selecionado" />
              {rotasChart.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={rotasChart} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <SectionTitle icon={<Users size={16} />} title="Motoristas Mais Ativos" subtitle="Entregas concluídas no período" />
              {relatorio.motoristasMaisAtivos.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={relatorio.motoristasMaisAtivos}
                    layout="vertical"
                    barSize={16}
                    margin={{ left: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="motorista" tick={{ fontSize: 11 }} width={110} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                    <Bar dataKey="entregas" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Entregas por status ── */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <SectionTitle icon={<Package size={16} />} title="Entregas por Status" subtitle="Distribuição no período" />
            {entregasChart.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={entregasChart} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                  <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}

    </div>
  )
}

function EmptyState() {
  return <p className="text-sm text-gray-600 py-12 text-center">Nenhum dado encontrado para o período.</p>
}

function KpiCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode
  label: string
  value: number
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
        <p className="text-xs text-gray-600">{label}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
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
        <p className="text-xs text-gray-600">{subtitle}</p>
      </div>
    </div>
  )
}
