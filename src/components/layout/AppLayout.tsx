import { NavLink, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { Avatar } from '@/components/ui/index'
import InstalarAppButton from '@/components/ui/InstalarAppButton'
import WhatsAppFloat from '@/components/ui/WhatsAppFloat'
import Lottie from 'lottie-react'
import loadingAnim from '@/assets/loading-dumbbell.json'


const NAV_ADMIN_BASE = [

  { to: '/planes',       icon: 'fa-solid fa-clipboard-list',   label: 'Planes' },
  { to: '/configuracion',icon: 'fa-solid fa-gear',             label: 'Configuración' },
]
const NAV_SUPERADMIN = [
  { to: '/instructores', icon: 'fa-solid fa-users-gear', label: 'Instructores' },
  { to: '/mi-marca',     icon: 'fa-solid fa-palette',    label: 'Mi marca'     },
]

export default function AppLayout() {
  const { displayName, role, signOut, superadmin } = useAuth()
  const { tenant, loading: tenantLoading } = useTenant()
  const navigate = useNavigate()

  if (role === 'alumno') return <Navigate to="/alumno" replace />

  if (tenantLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-df-bg">
        <Lottie animationData={loadingAnim} loop style={{ width: 140, height: 140 }} />
      </div>
    )
  }

  const location = useLocation()
  const isAdmin  = role === 'admin'
  const esInicio = location.pathname === '/dashboard' || location.pathname === '/alumno'

  const NAV_BASE = [
    { to: '/dashboard',  icon: 'fa-solid fa-house',               label: 'Inicio' },
    ...(!isAdmin ? [{ to: '/alumnos', icon: 'fa-solid fa-users', label: 'Alumnos' }] : []),
    { to: '/rutinas',    icon: 'fa-solid fa-dumbbell',            label: 'Rutinas' },
    { to: '/catalogo',   icon: 'fa-solid fa-layer-group',         label: 'Catálogo' },
    { to: '/agenda',     icon: 'fa-solid fa-calendar-days',       label: 'Agenda' },
    { to: '/cobros',     icon: 'fa-solid fa-file-invoice-dollar', label: 'Cobros' },
    { to: '/videos',     icon: 'fa-solid fa-clapperboard',        label: 'Videos' },
    { to: '/mensajes',   icon: 'fa-solid fa-message',             label: 'Mensajes' },
  ]

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-df-bg overflow-hidden">
      <aside className="w-16 lg:w-56 flex-shrink-0 bg-df-card border-r border-df-border flex flex-col py-4">
        <div className="px-3 lg:px-4 mb-6 overflow-hidden">
          <img src={tenant.logo_url ?? '/logo.png'} alt={tenant.nombre} className="h-8 w-auto max-w-full object-contain" />
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
          {NAV_BASE.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                 ${isActive
                   ? 'bg-df-purple/20 text-df-violet border border-df-purple/30'
                   : 'text-df-muted hover:text-white hover:bg-df-surface'}`
              }>
              <i className={`${item.icon} text-sm w-4 text-center`} />
              <span className="hidden lg:block text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="my-2 mx-1 border-t border-df-border" />
              <p className="hidden lg:block text-[10px] text-df-muted uppercase tracking-widest px-3 mb-1">
                Administración
              </p>
              {[...NAV_ADMIN_BASE, ...(superadmin ? NAV_SUPERADMIN : [])].map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                     ${isActive
                       ? 'bg-df-pink/20 text-df-pink border border-df-pink/30'
                       : 'text-df-muted hover:text-white hover:bg-df-surface'}`
                  }>
                  <i className={`${item.icon} text-sm w-4 text-center`} />
                  <span className="hidden lg:block text-sm font-medium">{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="px-2 pt-4 border-t border-df-border space-y-1">
          <NavLink to="/perfil"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
               ${isActive ? 'bg-df-purple/20 text-df-violet' : 'text-df-muted hover:text-white hover:bg-df-surface'}`
            }>
            <Avatar nombre={displayName ?? 'U'} size="xs" />
            <div className="hidden lg:block min-w-0">
              <p className="text-sm font-medium truncate">{displayName ?? 'Perfil'}</p>
              {isAdmin && <p className="text-[10px] text-df-pink">Admin</p>}
            </div>
          </NavLink>
          <InstalarAppButton />
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-df-muted hover:text-red-400 hover:bg-red-900/10 transition-all">
            <i className="fa-solid fa-arrow-right-from-bracket text-sm w-4 text-center" />
            <span className="hidden lg:block text-sm font-medium">Salir</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-5 lg:p-8">
          <Outlet />
        </div>
      </main>

      {esInicio && <WhatsAppFloat mostrarProfe={false} />}
    </div>
  )
}