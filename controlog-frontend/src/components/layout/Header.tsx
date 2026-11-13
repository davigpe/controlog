import { useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, UserCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'

const pageTitles: Record<string, string> = {
  '/':              'Dashboard',
  '/entregas':      'Entregas',
  '/veiculos':      'Veículos',
  '/motoristas':    'Motoristas',
  '/clientes':      'Clientes',
  '/rotas':         'Rotas',
  '/atribuicoes':   'Atribuição de Rotas',
  '/relatorios':    'Relatórios',
  '/minhas-rotas':  'Minhas Rotas',
  '/ajuda':         'Central de ajuda',
}

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const usuario = useAuthStore((s) => s.usuario)
  const logout = useAuthStore((s) => s.logout)
  const recolhida = useUiStore((s) => s.sidebarRecolhida)
  const alternarSidebar = useUiStore((s) => s.alternarSidebar)
  const abrirMenuMobile = useUiStore((s) => s.abrirMenuMobile)
  const menuMobileAberto = useUiStore((s) => s.menuMobileAberto)
  const title = pageTitles[pathname] ?? 'Controlog'

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Dois botões, um por tamanho de tela: no celular a sidebar é uma
            gaveta que abre e fecha, no desktop é uma coluna fixa que recolhe.
            São ações diferentes, então não dá para reaproveitar o mesmo. */}
        <button
          onClick={abrirMenuMobile}
          aria-label="Abrir menu"
          aria-expanded={menuMobileAberto}
          // w-10 h-10: 40px de alvo de toque. O ícone sozinho daria 20px.
          className="lg:hidden -ml-2 w-10 h-10 grid place-items-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Menu size={22} />
        </button>

        <button
          onClick={alternarSidebar}
          aria-label={recolhida ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          aria-expanded={!recolhida}
          className="hidden lg:block text-gray-500 hover:text-gray-800 transition-colors"
        >
          {recolhida ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>

        <h1 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Usuário — no celular sobra o avatar; o nome tem título para quem
            precisar conferir com um toque longo. */}
        <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
          <UserCircle size={28} className="text-gray-400 shrink-0" />
          <div className="leading-tight hidden md:block min-w-0">
            <p className="font-medium truncate">{usuario?.nome ?? 'Usuário'}</p>
            <p className="text-xs text-gray-600">{usuario?.perfil}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Sair"
          aria-label="Sair"
          className="w-10 h-10 grid place-items-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
