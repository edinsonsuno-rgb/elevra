import { useEffect, useState, FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Avatar, NivelBadge, Spinner } from '@/components/ui/index'

interface TenantData {
  id:             string
  nombre:         string
  subdominio:     string
  logo_url:       string | null
  color_primario: string
  al_dia:         boolean
  activo:         boolean
}

interface AdminProfile {
  id:           string
  display_name: string | null
  avatar_url:   string | null
  created_at:   string
}

interface AlumnoRow {
  id:       string
  nombre:   string
  email:    string | null
  foto_url: string | null
  nivel:    string
  activo:   boolean
  objetivo: string | null
}

interface PlanActivo {
  fecha_inicio: string
  fecha_fin:    string
  precio_dia:   number
}

function calcularMesActual(planes: PlanActivo[]): number {
  const hoy       = new Date()
  const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  let total = 0
  for (const p of planes) {
    if (!p.precio_dia) continue
    const inicio = new Date(p.fecha_inicio + 'T12:00:00')
    const fin    = new Date(p.fecha_fin    + 'T12:00:00')
    const desde  = inicio > primerDia ? inicio : primerDia
    const hasta  = fin    < hoy       ? fin    : hoy
    const dias   = Math.max(0, Math.floor((hasta.getTime() - desde.getTime()) / 86400000) + 1)
    total += p.precio_dia * dias
  }
  return Math.round(total)
}

export default function InstructorDetallePage() {
  const { tenantId } = useParams<{ tenantId: string }>()

  const [tenant,     setTenant]     = useState<TenantData | null>(null)
  const [admin,      setAdmin]      = useState<AdminProfile | null>(null)
  const [alumnos,    setAlumnos]    = useState<AlumnoRow[]>([])
  const [planes,     setPlanes]     = useState<PlanActivo[]>([])
  const [loading,    setLoading]    = useState(true)
  const [editing,    setEditing]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [form, setForm] = useState({
    nombre:       '',
    display_name: '',
    al_dia:       true,
  })

  useEffect(() => { if (tenantId) cargar() }, [tenantId])

  async function cargar() {
    const hoy          = new Date().toISOString().split('T')[0]
    const primerDelMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                          .toISOString().split('T')[0]

    const [{ data: t }, { data: p }, { data: a }, { data: pl }] = await Promise.all([
      supabase.from('tenants')
        .select('id, nombre, subdominio, logo_url, color_primario, al_dia, activo')
        .eq('id', tenantId!)
        .maybeSingle(),
      supabase.from('profiles')
        .select('id, display_name, avatar_url, created_at')
        .eq('tenant_id', tenantId!)
        .eq('role', 'admin')
        .maybeSingle(),
      supabase.from('alumnos')
        .select('id, nombre, email, foto_url, nivel, activo, objetivo')
        .eq('tenant_id', tenantId!)
        .order('nombre'),
      // Planes activos este mes (no invitado) con precio capturado
      supabase.from('alumno_planes')
        .select('fecha_inicio, fecha_fin, precio_dia')
        .eq('tenant_id', tenantId!)
        .eq('es_invitado', false)
        .lte('fecha_inicio', hoy)
        .gte('fecha_fin', primerDelMes),
    ])

    if (t) {
      const datos = t as TenantData
      setTenant(datos)
      setForm({
        nombre:       datos.nombre,
        display_name: (p as AdminProfile | null)?.display_name ?? '',
        al_dia:       datos.al_dia ?? true,
      })
    }
    if (p) setAdmin(p as AdminProfile)
    setAlumnos(a ?? [])
    setPlanes((pl ?? []) as PlanActivo[])
    setLoading(false)
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!tenant) return
    setSaving(true)

    await supabase.from('tenants').update({
      nombre: form.nombre,
      al_dia: form.al_dia,
    }).eq('id', tenant.id)

    if (admin && form.display_name !== (admin.display_name ?? '')) {
      await supabase.from('profiles')
        .update({ display_name: form.display_name })
        .eq('id', admin.id)
    }

    setTenant(prev => prev ? { ...prev, nombre: form.nombre, al_dia: form.al_dia } : prev)
    setAdmin(prev  => prev ? { ...prev, display_name: form.display_name || prev.display_name } : prev)
    setSaving(false)
    setEditing(false)
  }

  function cancelarEdicion() {
    if (tenant && admin) {
      setForm({ nombre: tenant.nombre, display_name: admin.display_name ?? '', al_dia: tenant.al_dia ?? true })
    }
    setEditing(false)
  }

  async function toggleAlDia() {
    if (!tenant) return
    const nuevo = !tenant.al_dia
    await supabase.from('tenants').update({ al_dia: nuevo }).eq('id', tenant.id)
    setTenant(prev => prev ? { ...prev, al_dia: nuevo } : prev)
  }

  if (loading) return <Spinner />

  if (!tenant) return (
    <div className="text-center py-20">
      <i className="fa-solid fa-circle-exclamation text-3xl text-df-muted block mb-3" />
      <p className="text-df-muted text-sm">Instructor no encontrado</p>
      <Link to="/instructores" className="text-sm text-df-violet mt-3 block hover:text-df-purple transition-colors">
        ← Volver a Instructores
      </Link>
    </div>
  )

  const activos   = alumnos.filter(a => a.activo)
  const mensual   = calcularMesActual(planes)
  const diasMes   = new Date().getDate()
  const diasTotal = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  // Proyección a fin de mes basada en planes activos hoy × precio_dia × días restantes
  const proyeccion = planes.length > 0
    ? Math.round(planes.reduce((s, p) => s + (p.precio_dia ?? 0), 0) * diasTotal)
    : 0

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/instructores"
          className="w-9 h-9 rounded-xl df-surface flex items-center justify-center text-df-muted hover:text-white transition-colors flex-shrink-0">
          <i className="fa-solid fa-arrow-left text-sm" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-white truncate">{tenant.nombre}</h1>
          <p className="text-xs text-df-muted">{tenant.subdominio}.elevra.lat</p>
        </div>
        {editing ? (
          <button onClick={cancelarEdicion}
            className="px-4 py-2 text-sm rounded-xl bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-all flex items-center gap-2">
            <i className="fa-solid fa-xmark text-xs" /> Cancelar
          </button>
        ) : (
          <button onClick={() => setEditing(true)}
            className="px-4 py-2 text-sm rounded-xl df-surface text-df-muted hover:text-white transition-all flex items-center gap-2">
            <i className="fa-solid fa-pen text-xs" /> Editar
          </button>
        )}
      </div>

      {/* Profile + Stats */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Perfil */}
        <div className="lg:col-span-2 df-card p-5 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar nombre={admin?.display_name ?? tenant.nombre} size="lg" />
            <div>
              <p className="font-bold text-white text-lg">
                {admin?.display_name ?? 'Sin nombre registrado'}
              </p>
              <p className="text-xs text-df-muted">
                {admin?.created_at
                  ? `Miembro desde ${new Date(admin.created_at).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}`
                  : 'Fecha desconocida'}
              </p>
            </div>
          </div>

          {editing ? (
            <form onSubmit={guardar} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                  Nombre del negocio
                </label>
                <input value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="df-input" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                  Nombre del instructor
                </label>
                <input value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  className="df-input" placeholder="Nombre completo" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-df-muted uppercase tracking-wider">Estado de pago</span>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, al_dia: !f.al_dia }))}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    form.al_dia ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                  }`}>
                  {form.al_dia ? '✓ Al día' : '⚠ Pendiente'}
                </button>
              </div>
              <button type="submit" disabled={saving}
                className="df-btn px-5 py-2.5 text-sm flex items-center gap-2">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <i className="fa-solid fa-floppy-disk" />
                }
                Guardar cambios
              </button>
            </form>
          ) : (
            <div className="space-y-2">
              <div className="df-surface rounded-xl p-3 flex items-center gap-3">
                <i className="fa-solid fa-globe text-df-muted text-sm w-4 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-df-muted uppercase tracking-wider">Subdominio</p>
                  <p className="text-sm text-white">{tenant.subdominio}.elevra.lat</p>
                </div>
              </div>
              <div className="df-surface rounded-xl p-3 flex items-center gap-3">
                <i className="fa-solid fa-chart-line text-df-muted text-sm w-4 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-df-muted uppercase tracking-wider">Proyección al cierre del mes</p>
                  <p className="text-sm text-white">
                    {proyeccion > 0
                      ? `$${proyeccion.toLocaleString('es-CO')} — basado en ${planes.length} planes activos`
                      : 'Sin planes de pago activos este mes'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-3">
          <div className="df-card p-4 text-center flex flex-col items-center justify-center flex-1">
            <p className="text-3xl font-black text-white">{planes.length}</p>
            <p className="text-xs text-df-muted uppercase tracking-wider mt-1">Planes activos mes</p>
            <p className="text-[10px] text-df-muted mt-0.5">
              {activos.length} alumnos · {alumnos.length - activos.length} inactivos
            </p>
          </div>

          <div className="df-card p-4 text-center flex flex-col items-center justify-center flex-1">
            <p className={`text-2xl font-black ${mensual > 0 ? 'text-white' : 'text-df-muted'}`}>
              {mensual > 0 ? `$${mensual.toLocaleString('es-CO')}` : '$0'}
            </p>
            <p className="text-xs text-df-muted uppercase tracking-wider mt-1">Acumulado mes</p>
            <p className="text-[10px] text-df-muted mt-0.5">Día {diasMes} de {diasTotal}</p>
          </div>

          <button onClick={toggleAlDia}
            className="df-card p-4 text-center flex flex-col items-center justify-center flex-1 hover:border-df-violet/30 transition-all">
            <span className={`text-sm font-black px-4 py-1.5 rounded-full ${
              tenant.al_dia
                ? 'bg-green-900/40 text-green-400'
                : 'bg-red-900/40 text-red-400'
            }`}>
              {tenant.al_dia ? '✓ Al día' : '⚠ Pendiente'}
            </span>
            <p className="text-[10px] text-df-muted uppercase tracking-wider mt-2">Estado de pago</p>
            <p className="text-[10px] text-df-muted mt-0.5">Clic para cambiar</p>
          </button>
        </div>
      </div>

      {/* Alumnos */}
      <div>
        <h2 className="text-sm font-bold text-white mb-3">
          Alumnos <span className="font-normal text-df-muted">({alumnos.length})</span>
        </h2>
        {alumnos.length === 0 ? (
          <div className="py-10 text-center">
            <i className="fa-solid fa-users text-2xl text-df-muted block mb-2" />
            <p className="text-sm text-df-muted">Sin alumnos registrados</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alumnos.map(a => (
              <div key={a.id} className="df-surface rounded-xl p-3 flex items-center gap-3">
                <Avatar nombre={a.nombre} foto_url={a.foto_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{a.nombre}</p>
                  <p className="text-xs text-df-muted truncate">{a.email ?? '—'}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <NivelBadge nivel={a.nivel as any} />
                  <div className={`w-1.5 h-1.5 rounded-full ${a.activo ? 'bg-green-400' : 'bg-zinc-600'}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
