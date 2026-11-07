import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  PackageCheck,
  Truck,
  Users,
  MapPin,
  Route,
  Package,
  ClipboardList,
  BarChart2,
  UserCog,
  CalendarDays,
} from 'lucide-react'
import { Logo, LogoSimbolo } from '@/components/shared/Logo'
import { PERFIS_GESTAO, type Perfil } from '@/lib/perfil'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'

const navItems: { to: string; icon: typeof Truck; label: string; perfis: Perfil[] }[] = [
  { to: '/minhas-rotas',      icon: MapPin,          label: 'Minhas Rotas',        perfis: ['MOTORISTA'] },
  { to: '/',                  icon: LayoutDashboard, label: 'Dashboard',           perfis: PERFIS_GESTAO },
  { to: '/entregas',          icon: PackageCheck,    label: 'Entregas',            perfis: PERFIS_GESTAO },
  { to: '/veiculos',          icon: Truck,           label: 'Veículos',            perfis: PERFIS_GESTAO },
  { to: '/motoristas',        icon: Users,           label: 'Motoristas',          perfis: PERFIS_GESTAO },
  { to: '/rotas',             icon: MapPin,          label: 'Rotas',               perfis: PERFIS_GESTAO },
  { to: '/atribuicoes',       icon: UserCog,         label: 'Atribuição de Rotas', perfis: PERFIS_GESTAO },
  { to: '/otimizacao-rotas',  icon: Route,           label: 'Otimização de Rotas', perfis: PERFIS_GESTAO },
  { to: '/pedidos',           icon: Package,         label: 'Pedidos',             perfis: PERFIS_GESTAO },
  { to: '/planos',            icon: ClipboardList,   label: 'Planos',              perfis: PERFIS_GESTAO },
  { to: '/rotas-do-dia',      icon: CalendarDays,    label: 'Rotas do Dia',        perfis: PERFIS_GESTAO },
  { to: '/relatorios',        icon: BarChart2,       label: 'Relatórios',          perfis: PERFIS_GESTAO },
]

export default function Sidebar() {
  const perfil = useAuthStore((s) => s.usuario?.perfil)
  const recolhida = useUiStore((s) => s.sidebarRecolhida)
  // Sem perfil carregado, mostra o menu de gestão (comportamento de antes) —
  // o acesso em si é barrado pelo RequireAuth e pelo backend, não pelo menu.
  const itens = navItems.filter((item) => item.perfis.includes(perfil ?? 'OPERADOR'))

  return (
    <aside
      className={`min-h-screen bg-gray-900 text-white flex flex-col transition-[width] duration-200 ${
        recolhida ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo — recolhida, sobra só o símbolo, que é legível sozinho por
          aparecer embutido no wordmark quando a sidebar está aberta. */}
      <div className="h-16 flex items-center justify-center border-b border-gray-700">
        {recolhida ? (
          <span role="img" aria-label="Controlog">
            <LogoSimbolo tema="tinta" className="h-7 w-7" />
          </span>
        ) : (
          <Logo tema="tinta" className="text-[34px]" />
        )}
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-4 space-y-1 ${recolhida ? 'px-2' : 'px-3'}`}>
        {itens.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={recolhida ? label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-lg text-sm font-medium transition-colors ${
                recolhida ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5'
              } ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {/* Recolhida, o rótulo some da tela mas continua sendo o nome
                acessível do link — senão o menu viraria 11 links sem nome. */}
            <span className={recolhida ? 'sr-only' : undefined}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 text-xs text-gray-400 text-center">
        {recolhida ? `v${APP_VERSION}` : `Controlog v${APP_VERSION}`}
      </div>
    </aside>
  )
}
