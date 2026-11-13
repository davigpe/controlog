import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  PackageCheck,
  Truck,
  Users,
  MapPin,
  Package,
  ClipboardList,
  BarChart2,
  UserCog,
  CalendarDays,
} from 'lucide-react'
import { Logo, LogoSimbolo } from '@/components/shared/Logo'
import { useTelaGrande } from '@/lib/useTelaGrande'
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
  { to: '/pedidos',           icon: Package,         label: 'Pedidos',             perfis: PERFIS_GESTAO },
  { to: '/planos',            icon: ClipboardList,   label: 'Planos',              perfis: PERFIS_GESTAO },
  { to: '/rotas-do-dia',      icon: CalendarDays,    label: 'Rotas do Dia',        perfis: PERFIS_GESTAO },
  { to: '/relatorios',        icon: BarChart2,       label: 'Relatórios',          perfis: PERFIS_GESTAO },
]

export default function Sidebar() {
  const perfil = useAuthStore((s) => s.usuario?.perfil)
  // A preferencia de recolher vale so onde a sidebar e uma coluna. Ver
  // useTelaGrande para o motivo de nao resolver isto com classes lg:.
  const telaGrande = useTelaGrande()
  const recolhida = useUiStore((s) => s.sidebarRecolhida) && telaGrande
  const menuAberto = useUiStore((s) => s.menuMobileAberto)
  const fecharMenu = useUiStore((s) => s.fecharMenuMobile)
  const { pathname } = useLocation()

  // Navegar fecha a gaveta. Sem isto, tocar num item no celular levaria à
  // tela nova com o menu ainda por cima dela.
  useEffect(() => {
    fecharMenu()
  }, [pathname, fecharMenu])

  // Esc fecha, como em qualquer sobreposição. Só enquanto está aberta, para
  // não deixar um listener global pendurado o tempo todo.
  useEffect(() => {
    if (!menuAberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fecharMenu()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [menuAberto, fecharMenu])
  // Sem perfil carregado, mostra o menu de gestão (comportamento de antes) —
  // o acesso em si é barrado pelo RequireAuth e pelo backend, não pelo menu.
  const itens = navItems.filter((item) => item.perfis.includes(perfil ?? 'OPERADOR'))

  return (
    <>
      {/* Fundo escurecido, só no celular. Clicar fora fecha, que é o gesto
          esperado numa gaveta. */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={fecharMenu}
          aria-hidden="true"
        />
      )}

      <aside
        // Em telas grandes volta a ser uma coluna no fluxo (lg:static) e a
        // largura obedece a preferencia de recolher. Abaixo disso e uma gaveta
        // fixa, fora da tela ate ser aberta — a sidebar de 256px ocuparia dois
        // tercos de um celular de 375px.
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white flex flex-col transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:min-h-screen lg:transition-[width] ${
          menuAberto ? 'translate-x-0' : '-translate-x-full'
        } ${recolhida ? 'lg:w-16' : 'lg:w-64'}`}
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
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto ${recolhida ? 'px-2' : 'px-3'}`}>
        {itens.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={recolhida ? label : undefined}
            className={({ isActive }) =>
              // py-3 no celular: 44px de altura, o alvo de toque minimo
              // recomendado. No desktop volta a 2.5 para caber a lista toda.
              `flex items-center rounded-lg text-sm font-medium transition-colors py-3 lg:py-2.5 ${
                recolhida ? 'justify-center px-0' : 'gap-3 px-4'
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
    </>
  )
}
