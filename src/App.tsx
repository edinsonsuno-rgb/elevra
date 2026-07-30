import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { TenantProvider, useTenant } from '@/contexts/TenantContext'
import AppLayout        from '@/components/layout/AppLayout'
import AlumnoLayout     from '@/components/layout/AlumnoLayout'
import Lottie           from 'lottie-react'
import loadingAnim      from '@/assets/loading-dumbbell.json'

import SplashPage                from '@/pages/SplashPage'
import LoginPage                 from '@/pages/LoginPage'
import ResetPasswordPage         from '@/pages/ResetPasswordPage'
import UpdatePasswordPage        from '@/pages/UpdatePasswordPage'
import RegistroProfesorPage      from '@/pages/RegistroProfesorPage'
import RegistroAdminPage         from '@/pages/RegistroAdminPage'
import RegistroAlumnoPage        from '@/pages/RegistroAlumnoPage'

// Profe / Admin
import DashboardPage             from '@/pages/DashboardPage'
import AlumnosPage               from '@/pages/alumnos/AlumnosPage'
import AlumnoDetallePage         from '@/pages/alumnos/AlumnoDetallePage'
import AlumnoFormPage            from '@/pages/alumnos/AlumnoFormPage'
import AsignarPlanPage           from '@/pages/alumnos/AsignarPlanPage'
import AsignarRutinaPage         from '@/pages/alumnos/AsignarRutinaPage'
import EditarRutinaPage          from '@/pages/alumnos/EditarRutinaPage'
import RutinasPage               from '@/pages/rutinas/RutinasPage'
import RutinaDetallePage         from '@/pages/rutinas/RutinaDetallePage'
import RutinaFormPage            from '@/pages/rutinas/RutinaFormPage'
import EjercicioDetallePage      from '@/pages/rutinas/EjercicioDetallePage'
import CatalogoEjerciciosPage    from '@/pages/catalogo/CatalogoEjerciciosPage'
import CatalogoEjercicioFormPage from '@/pages/catalogo/CatalogoEjercicioFormPage'
import AgendaPage                from '@/pages/agenda/AgendaPage'
import SesionFormPage            from '@/pages/agenda/SesionFormPage'
import CobrosPage                from '@/pages/cobros/CobrosPage'
import CobroFormPage             from '@/pages/cobros/CobroFormPage'
import VideosPage                from '@/pages/videos/VideosPage'
import MensajesPage              from '@/pages/mensajes/MensajesPage'
import PerfilPage                from '@/pages/PerfilPage'
import ProfesoresPage            from '@/pages/admin/ProfesoresPage'
import PlanesPage                from '@/pages/admin/PlanesPage'
import ConfiguracionPage         from '@/pages/admin/ConfiguracionPage'
import BrandingPage              from '@/pages/admin/BrandingPage'
import InstructoresPage          from '@/pages/admin/InstructoresPage'
import InstructorDetallePage     from '@/pages/admin/InstructorDetallePage'
import AdministradoresPage       from '@/pages/admin/AdministradoresPage'

// Alumno
import AlumnoDashboard           from '@/pages/alumno/AlumnoDashboard'
import AlumnoRutinaPage          from '@/pages/alumno/AlumnoRutinaPage'
import AlumnoSesionesPage        from '@/pages/alumno/AlumnoSesionesPage'
import AlumnoPerfilPage          from '@/pages/alumno/AlumnoPerfilPage'
import AlumnoEntrenamientoPage   from '@/pages/alumno/AlumnoEntrenamientoPage'
import AlumnoProgresoPage        from '@/pages/alumno/AlumnoProgresoPage'

import { Spinner } from '@/components/ui/index'

function RootRedirect() {
  const { user, role, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!role) return <Spinner />
  if (role === 'alumno') return <Navigate to="/alumno" replace />
  return <Navigate to="/dashboard" replace />
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!role) return <Spinner />
  return <>{children}</>
}

function TenantGate({ children }: { children: React.ReactNode }) {
  const { loading } = useTenant()
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-df-bg">
        <Lottie animationData={loadingAnim} loop style={{ width: 140, height: 140 }} />
      </div>
    )
  }
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth()
  if (loading) return <Spinner />
  if (!role && user) return <Spinner />
  if (user) return <Navigate to={role === 'alumno' ? '/alumno' : '/dashboard'} replace />
  return <TenantGate>{children}</TenantGate>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role, loading } = useAuth()
  if (loading) return <Spinner />
  if (role && role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { superadmin, loading } = useAuth()
  if (loading) return <Spinner />
  if (!superadmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <TenantProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"                element={<RootRedirect />} />
          <Route path="/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/splash"          element={<PublicRoute><SplashPage /></PublicRoute>} />
          <Route path="/reset-password"  element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          <Route path="/update-password" element={<TenantGate><UpdatePasswordPage /></TenantGate>} />
          <Route path="/registro"        element={<RegistroProfesorPage />} />
          <Route path="/registro-admin"  element={<RegistroAdminPage />} />
          <Route path="/registro-alumno" element={<RegistroAlumnoPage />} />

          {/* ── Rutas del ALUMNO ── */}
          <Route element={<ProtectedRoute><AlumnoLayout /></ProtectedRoute>}>
            <Route path="/alumno"          element={<AlumnoDashboard />} />
            <Route path="/alumno/rutina"   element={<AlumnoRutinaPage />} />
            <Route path="/alumno/progreso" element={<AlumnoProgresoPage />} />
            <Route path="/alumno/sesiones" element={<AlumnoSesionesPage />} />
            <Route path="/alumno/perfil"   element={<AlumnoPerfilPage />} />
            <Route path="/alumno/entrenamiento/:dia" element={<AlumnoEntrenamientoPage />} />
          </Route>

          {/* ── Rutas del PROFE / ADMIN ── */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard"                  element={<DashboardPage />} />
            <Route path="/alumnos"                    element={<AlumnosPage />} />
            <Route path="/alumnos/nuevo"              element={<AlumnoFormPage />} />
            <Route path="/alumnos/:id"                element={<AlumnoDetallePage />} />
            <Route path="/alumnos/:id/editar"         element={<AlumnoFormPage />} />
            <Route path="/alumnos/:id/plan"           element={<AsignarPlanPage />} />
            <Route path="/alumnos/:id/rutina"         element={<AsignarRutinaPage />} />
            <Route path="/alumnos/:id/rutina/editar"  element={<EditarRutinaPage />} />
            <Route path="/rutinas"                    element={<RutinasPage />} />
            <Route path="/rutinas/nueva"              element={<RutinaFormPage />} />
            <Route path="/rutinas/:id"                element={<RutinaDetallePage />} />
            <Route path="/rutinas/:id/editar"         element={<RutinaFormPage />} />
            <Route path="/ejercicios/:id"             element={<EjercicioDetallePage />} />
            <Route path="/catalogo"                   element={<CatalogoEjerciciosPage />} />
            <Route path="/catalogo/nuevo"             element={<CatalogoEjercicioFormPage />} />
            <Route path="/catalogo/:id/editar"        element={<CatalogoEjercicioFormPage />} />
            <Route path="/agenda"                     element={<AgendaPage />} />
            <Route path="/agenda/nueva"               element={<SesionFormPage />} />
            <Route path="/agenda/:id/editar"          element={<SesionFormPage />} />
            <Route path="/cobros"                     element={<CobrosPage />} />
            <Route path="/cobros/nuevo"               element={<CobroFormPage />} />
            <Route path="/cobros/:id/editar"          element={<CobroFormPage />} />
            <Route path="/videos"                     element={<VideosPage />} />
            <Route path="/mensajes"                   element={<MensajesPage />} />
            <Route path="/perfil"                     element={<PerfilPage />} />
            <Route path="/profesores"    element={<AdminRoute><ProfesoresPage /></AdminRoute>} />
            <Route path="/planes"        element={<AdminRoute><PlanesPage /></AdminRoute>} />
            <Route path="/configuracion" element={<AdminRoute><ConfiguracionPage /></AdminRoute>} />
            <Route path="/mi-marca"          element={<SuperAdminRoute><BrandingPage /></SuperAdminRoute>} />
            <Route path="/instructores"      element={<SuperAdminRoute><InstructoresPage /></SuperAdminRoute>} />
            <Route path="/instructores/:tenantId" element={<SuperAdminRoute><InstructorDetallePage /></SuperAdminRoute>} />
            <Route path="/administradores"   element={<SuperAdminRoute><AdministradoresPage /></SuperAdminRoute>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </TenantProvider>
  )
}