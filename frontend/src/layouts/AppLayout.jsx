import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  ChevronDown,
  FileStack,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Logo } from '../components/Logo'
import { useAuth } from '../features/auth/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { to: '/documents', label: 'Documentos', icon: FileStack },
]

function Sidebar({ mobile = false, onClose }) {
  const { user } = useAuth()
  return (
    <aside
      className={`${mobile ? 'h-full w-[280px]' : 'fixed inset-y-0 left-0 hidden w-64 lg:flex'} z-40 flex-col border-r border-white/[0.07] bg-[#090c13]/95 p-4 backdrop-blur-xl`}
    >
      <div className="flex h-14 items-center justify-between px-2">
        <Logo />
        {mobile && (
          <button aria-label="Fechar menu" onClick={onClose} className="text-slate-500">
            <X size={19} />
          </button>
        )}
      </div>
      <Link to="/documents/new" onClick={onClose} className="button-primary my-5 w-full">
        <Plus size={16} /> Novo documento
      </Link>
      <nav className="space-y-1">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-700">
          Workspace
        </p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/[0.07] text-white shadow-inner' : 'text-slate-500 hover:bg-white/[0.035] hover:text-slate-200'}`
            }
          >
            <Icon size={17} /> {label}
          </NavLink>
        ))}
        {user?.role === 'ADMIN' && (
          <NavLink
            to="/users"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/[0.07] text-white' : 'text-slate-500 hover:bg-white/[0.035] hover:text-slate-200'}`
            }
          >
            <Users size={17} /> Usuários
          </NavLink>
        )}
      </nav>
      <div className="mt-auto rounded-2xl border border-accent/15 bg-gradient-to-br from-accent/10 to-transparent p-4">
        <p className="text-xs font-semibold text-slate-300">NovaTech Solutions</p>
        <p className="mt-1 text-[11px] leading-4 text-slate-600">Ambiente de demonstração · MVP</p>
      </div>
    </aside>
  )
}

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 lg:hidden"
            onMouseDown={(event) => event.target === event.currentTarget && setMenuOpen(false)}
          >
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="h-full"
            >
              <Sidebar mobile onClose={() => setMenuOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center border-b border-white/[0.06] bg-ink/80 px-4 backdrop-blur-xl sm:px-7">
          <button
            aria-label="Abrir menu"
            className="mr-3 rounded-xl p-2 text-slate-400 hover:bg-white/5 lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={19} />
          </button>
          <div className="hidden max-w-xs flex-1 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-slate-600 sm:flex">
            <Search size={15} />
            <span className="text-xs">Navegue pelos seus documentos</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              aria-label="Notificações"
              disabled
              title="Notificações estão no roadmap"
              className="rounded-xl p-2.5 text-slate-600 disabled:cursor-not-allowed"
            >
              <Bell size={18} />
            </button>
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-white/5"
                onClick={() => setProfileOpen((value) => !value)}
              >
                <Avatar name={user?.name} />
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-semibold text-slate-200">{user?.name}</span>
                  <span className="block text-[10px] text-slate-600">
                    {user?.role === 'ADMIN' ? 'Administrador' : 'Colaborador'}
                  </span>
                </span>
                <ChevronDown size={13} className="text-slate-600" />
              </button>
              {profileOpen && (
                <div className="card absolute right-0 top-12 w-52 p-2 shadow-2xl">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white"
                  >
                    <LogOut size={15} /> Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 sm:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
