import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Truck, Users, Package, CheckCircle, Clock, XCircle } from 'lucide-react'
import { useDashboardResumo } from './api'

const statusLabel: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_TRANSITO: 'Em Trânsito',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
}

const statusColor: Record<string, string> = {
  PENDENTE: '#ef4444',
  EM_TRANSITO: '#eab308',
  ENTREGUE: '#22c55e',
  CANCELADA: '#9ca3af',
}

export default function Dashboard() {
  const { data: resumo, isLoading } = useDashboardResumo()

  if (isLoading || !resumo) {
    return (
      <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
        Carregando indicadores...
      </div>
    )
  }

  const entregasChart = Object.entries(resumo.entregasPorStatus).map(([status, value]) => ({
    name: statusLabel[status] ?? status,
    value,
    color: statusColor[status] ?? '#94a3b8',
  }))

  return (
    <div className="space-y-6">

      {/* ── Cards de métricas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard label="Rotas Ativas"     value={resumo.rotas.ativas}     icon={Truck}       color="bg-blue-500"   />
        <MetricCard label="Rotas Concluídas" value={resumo.rotas.concluidas} icon={CheckCircle} color="bg-green-500"  />
        <MetricCard label="Rotas Canceladas" value={resumo.rotas.canceladas} icon={XCircle}      color="bg-red-500"    />
        <MetricCard label="Motoristas"       value={resumo.totalMotoristas}  icon={Users}        color="bg-purple-500" />
        <MetricCard label="Veículos"         value={resumo.totalVeiculos}    icon={Truck}        color="bg-indigo-500" />
        <MetricCard label="Total de Entregas" value={resumo.totalEntregas}   icon={Package}      color="bg-yellow-500" />
      </div>

      {/* ── Distribuição de entregas por status ── */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          Entregas por Status
        </h2>

        {entregasChart.length === 0 ? (
          <p className="text-sm text-gray-600 py-8 text-center">Nenhuma entrega cadastrada ainda.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={entregasChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {entregasChart.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>

            <div className="space-y-2">
              {entregasChart.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-gray-600">{s.name}</span>
                  </div>
                  <span className="font-semibold text-gray-800">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

function MetricCard({
  label, value, icon: Icon, color,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ size?: number }>
  color: string
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
      <div className={`${color} text-white p-3 rounded-lg`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  )
}
