import { NavLink, Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/index'
import WhatsAppFloat from '@/components/ui/WhatsAppFloat'

const NAV = [
  { to: '/alumno',           icon: 'fa-solid fa-house',        label: 'Inicio'    },
  { to: '/alumno/rutina',    icon: 'fa-solid fa-dumbbell',     label: 'Rutina'    },
  { to: '/alumno/rutinas',   icon: 'fa-solid fa-layer-group',  label: 'Rutinas'   },
  { to: '/alumno/videos',    icon: 'fa-solid fa-clapperboard', label: 'Videos'    },
  { to: '/alumno/sesiones',  icon: 'fa-solid fa-calendar',     label: 'Sesiones'  },
  { to: '/alumno/mensajes',  icon: 'fa-solid fa-message',      label: 'Mensajes'  },
  { to: '/alumno/progreso',  icon: 'fa-solid fa-chart-line',   label: 'Progreso'  },
  { to: '/alumno/perfil',    icon: 'fa-solid fa-user',         label: 'Perfil'    },
]

export default function AlumnoLayout() {
  const { role, loading, activa, displayName, signOut } = useAuth() as any
  const { tenant } = useTenant()
  const navigate = useNavigate()
  const location = useLocation()
  const esInicio = location.pathname === '/dashboard' || location.pathname === '/alumno'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  if (loading) return <Spinner />
  if (role !== 'alumno') return <Navigate to="/dashboard" replace />

  if (activa === false || activa === null) return (
    <div className="min-h-screen bg-df-bg circuit-bg flex items-center justify-center p-4">
      <div className="df-card p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
          <i className="fa-solid fa-lock text-2xl text-amber-400" />
        </div>
        <h1 className="text-lg font-black text-white">Cuenta inactiva</h1>
        <p className="text-xs text-df-muted">
          Tu plan ha vencido o no tienes un plan activo.
          Contacta a tu instructor para renovar.
        </p>
        <button onClick={handleSignOut}
          className="w-full df-surface border border-red-900/40 text-red-400 hover:bg-red-900/10 px-4 py-2.5 text-sm rounded-xl transition-all flex items-center justify-center gap-2">
          <i className="fa-solid fa-arrow-right-from-bracket" /> Cerrar sesión
        </button>
      </div>
      <WhatsAppFloat mostrarProfe={false} />
    </div>
  )

  return (
    <div className="flex h-screen bg-df-bg overflow-hidden">
      <aside className="w-16 lg:w-56 flex-shrink-0 bg-df-card border-r border-df-border flex flex-col py-4">
        <div className="px-3 lg:px-4 mb-6">
          <img src={tenant.logo_url ?? '/logo.png'} alt={tenant.nombre} className="h-8 w-auto max-w-[120px] object-contain" />
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-2 overflow-y-auto">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to}
              end={item.to === '/alumno'}
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
        </nav>

        <div className="px-2 pt-4 border-t border-df-border space-y-1">
          <NavLink to="/alumno/perfil"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all
               ${isActive ? 'bg-df-purple/20 text-df-violet' : 'text-df-muted hover:text-white hover:bg-df-surface'}`
            }>
            <div className="w-6 h-6 rounded-full bg-df-purple/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-df-violet">
              {(displayName ?? 'A').charAt(0).toUpperCase()}
            </div>
            <span className="hidden lg:block text-sm font-medium truncate">{displayName ?? 'Mi perfil'}</span>
          </NavLink>
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-df-muted hover:text-red-400 hover:bg-red-900/10 transition-all">
            <i className="fa-solid fa-arrow-right-from-bracket text-sm w-4 text-center" />
            <span className="hidden lg:block text-sm font-medium">Salir</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-5 lg:p-8">
          <Outlet />
        </div>
      </main>

      {esInicio && <WhatsAppFloat mostrarProfe={true} />}
    </div>
  )
}