import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  PackageCheck,
  Truck,
  Users,
  MapPin,
  BarChart2,
} from 'lucide-react'

const navItems = [
  { to: '/',            icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/entregas',    icon: PackageCheck,    label: 'Entregas'    },
  { to: '/veiculos',    icon: Truck,           label: 'Veículos'    },
  { to: '/motoristas',  icon: Users,           label: 'Motoristas'  },
  { to: '/rotas',       icon: MapPin,          label: 'Rotas'       },
  { to: '/relatorios',  icon: BarChart2,       label: 'Relatórios'  }, // ← corrigido
]

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center border-b border-gray-700">
        <span className="text-xl font-bold tracking-wide text-blue-400">
          🚚 Controlog
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700 text-xs text-gray-500 text-center">
        Controlog v1.0
      </div>
    </aside>
  )
}
