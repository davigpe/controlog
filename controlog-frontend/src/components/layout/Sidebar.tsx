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
  Building2,
  HelpCircle,
} from 'lucide-react'
import { Logo, LogoSimbolo } from '@/components/shared/Logo'
import { useTelaGrande } from '@/lib/useTelaGrande'
import { PERFIS_GESTAO, type Perfil } from '@/lib/perfil'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'

interface ItemDeMenu {
  to: string
  icon: typeof Truck
  label: string
  perfis: Perfil[]
}

interface GrupoDeMenu {
  /** Null no primeiro grupo: "Início" não precisa de rótulo acima de um item só. */
  titulo: string | null
  itens: ItemDeMenu[]
}

// Agrupado por etapa do trabalho, não por entidade: a pessoa chega ao sistema
// com uma tarefa em mente ("preciso planejar o dia", "preciso ver como foi"),
// e uma lista plana de onze links obrigava a ler todos para achar um.
//
// A ordem dos grupos segue o fluxo real: cadastra-se uma vez, planeja-se todo
// dia, acompanha-se durante o dia, analisa-se depois.
const grupos: GrupoDeMenu[] = [
  {
    titulo: null,
    itens: [
      { to: '/minhas-rotas', icon: MapPin,          label: 'Minhas Rotas', perfis: ['MOTORISTA'] },
      { to: '/',             icon: LayoutDashboard, label: 'Dashboard',    perfis: PERFIS_GESTAO },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { to: '/clientes',   icon: Building2, label: 'Clientes',   perfis: PERFIS_GESTAO },
      { to: '/motoristas', icon: Users,     label: 'Motoristas', perfis: PERFIS_GESTAO },
      { to: '/veiculos',   icon: Truck,     label: 'Veículos',   perfis: PERFIS_GESTAO },
    ],
  },
  {
    titulo: 'Planejamento',
    itens: [
      { to: '/pedidos', icon: Package,       label: 'Pedidos', perfis: PERFIS_GESTAO },
      { to: '/planos',  icon: ClipboardList, label: 'Planos',  perfis: PERFIS_GESTAO },
    ],
  },
  {
    titulo: 'Operação',
    itens: [
      { to: '/rotas',        icon: MapPin,       label: 'Rotas',               perfis: PERFIS_GESTAO },
      { to: '/atribuicoes',  icon: UserCog,      label: 'Atribuição de Rotas', perfis: PERFIS_GESTAO },
      { to: '/rotas-do-dia', icon: CalendarDays, label: 'Rotas do Dia',        perfis: PERFIS_GESTAO },
      { to: '/entregas',     icon: PackageCheck, label: 'Entregas',            perfis: PERFIS_GESTAO },
    ],
  },
  {
    titulo: 'Relatórios',
    itens: [
      { to: '/relatorios', icon: BarChart2, label: 'Relatórios', perfis: PERFIS_GESTAO },
    ],
  },
  {
    titulo: 'Suporte',
    // Visível também para o motorista: é quem mais precisa de ajuda em campo,
    // e era o único perfil sem nada além da própria tela.
    itens: [
      { to: '/ajuda', icon: HelpCircle, label: 'Central de ajuda', perfis: [...PERFIS_GESTAO, 'MOTORISTA'] },
    ],
  },
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
  const perfilAtual = perfil ?? 'OPERADOR'
  const gruposVisiveis = grupos
    .map((g) => ({ ...g, itens: g.itens.filter((i) => i.perfis.includes(perfilAtual)) }))
    // Grupo que ficou sem itens para este perfil não vira um título solto.
    .filter((g) => g.itens.length > 0)

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
      <nav className={`flex-1 py-4 overflow-y-auto ${recolhida ? 'px-2' : 'px-3'}`}>
        {gruposVisiveis.map((grupo, indice) => (
          <div key={grupo.titulo ?? 'inicio'} className={indice > 0 ? 'mt-5' : undefined}>
            {/* Recolhida, o título some: não cabe em 64px e viraria reticências.
                No lugar dele entra um separador, que preserva a noção de que
                há grupos sem precisar de texto. */}
            {grupo.titulo &&
              (recolhida ? (
                <hr className="border-gray-700 mx-2 mb-2" aria-hidden="true" />
              ) : (
                <h2 className="px-4 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  {grupo.titulo}
                </h2>
              ))}

            <div className="space-y-1">
              {grupo.itens.map(({ to, icon: Icon, label }) => (
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
                      acessível do link — senão o menu viraria links sem nome. */}
                  <span className={recolhida ? 'sr-only' : undefined}>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
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
