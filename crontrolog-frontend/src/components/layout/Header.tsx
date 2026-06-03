import { useLocation } from 'react-router-dom'
import { Bell, UserCircle } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/':           'Dashboard',
  '/entregas':   'Entregas',
  '/veiculos':   'Veículos',
  '/motoristas': 'Motoristas',
  '/rotas':      'Rotas',
}

export default function Header() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] ?? 'Controlog'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-gray-800">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Notificações */}
        <button className="relative text-gray-500 hover:text-gray-800 transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {/* Usuário */}
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <UserCircle size={28} className="text-gray-400" />
          <span className="font-medium">Davi</span>
        </div>
      </div>
    </header>
  )
}
