import { useEffect, useState, FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Avatar, NivelBadge, Spinner } from '@/components/ui/index'
import ImageUpload from '@/components/ui/ImageUpload'

interface TenantData {
  id:               string
  nombre:           string
  subdominio:       string
  logo_url:         string | null
  color_primario:   string
  color_secundario: string
  al_dia:           boolean
  activo:           boolean
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
    nombre:           '',
    display_name:     '',
    al_dia:           true,
    logo_url:         '',
    color_primario:   '#9b30ff',
    color_secundario: '#7c3aed',
  })
  const [colorTexto, setColorTexto] = useState({ color_primario: '#9b30ff', color_secundario: '#7c3aed' })

  function isValidHex(v: string) { return /^#[0-9a-fA-F]{6}$/.test(v) }

  function onColorTexto(key: 'color_primario' | 'color_secundario', val: string) {
    setColorTexto(p => ({ ...p, [key]: val }))
    if (isValidHex(val)) setForm(f => ({ ...f, [key]: val }))
  }

  useEffect(() => { if (tenantId) cargar() }, [tenantId])

  async function cargar() {
    const hoy          = new Date().toISOString().split('T')[0]
    const primerDelMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                          .toISOString().split('T')[0]

    const [{ data: t }, { data: p }, { data: a }, { data: pl }] = await Promise.all([
      supabase.from('tenants')
        .select('id, nombre, subdominio, logo_url, color_primario, color_secundario, al_dia, activo')
        .eq('id', tenantId!)
        .maybeSingle(),
      supabase.from('profiles')
        .select('id, display_name, avatar_url, created_at')
        .eq('tenant_id', tenantId!)
        .eq('role', 'instructor')
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
      const cp = datos.color_primario   ?? '#9b30ff'
      const cs = datos.color_secundario ?? '#7c3aed'
      setForm({
        nombre:           datos.nombre,
        display_name:     (p as AdminProfile | null)?.display_name ?? '',
        al_dia:           datos.al_dia ?? true,
        logo_url:         datos.logo_url ?? '',
        color_primario:   cp,
        color_secundario: cs,
      })
      setColorTexto({ color_primario: cp, color_secundario: cs })
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
    console.log('VERSION DEBUG 19-07-2026 01:00')
    alert('VERSION NUEVA')
    console.log('ELEVRA DEBUG VERSION 12-06-2026')

    const params = {
      p_tenant_id:        tenant.id,
      p_nombre:           form.nombre,
      p_al_dia:           form.al_dia,
      p_logo_url:         form.logo_url.trim(),
      p_color_primario:   form.color_primario,
      p_color_secundario: form.color_secundario,
    }
    console.log('[guardar] llamando RPC...', params)

    const { data: authData, error: authError } = await supabase.auth.getUser()
    console.log('[guardar] supabase.auth.getUser()', {
      userId: authData?.user?.id,
      authError,
    })

    const { data: esAdminGlobalData, error: esAdminGlobalError } = await supabase.rpc('es_admin_global')
    console.log('[guardar] es_admin_global', {
      data: esAdminGlobalData,
      error: esAdminGlobalError,
    })

    let error: any = null
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('admin_actualizar_tenant', params) as any
      console.log('[guardar] RPC resultado:', rpcData)
      console.log('[guardar] RPC error:', rpcError)
      error = rpcError
    } catch (err: any) {
      console.error('[guardar] excepción:', err.message)
      error = err
    }

    if (!error && admin?.id && form.display_name) {
      const t1 = Date.now()
      console.log('[guardar] llamando RPC display_name...', { p_profile_id: admin.id, p_display_name: form.display_name })
      try {
        const res2 = await Promise.race([
          supabase.rpc('admin_actualizar_display_name', {
            p_profile_id:   admin.id,
            p_display_name: form.display_name,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout 20s')), 20_000)
          ),
        ]) as any
        error = res2.error
        console.log('[guardar] RPC display_name respondió en', Date.now() - t1, 'ms — error:', error)
        if (error) console.error('[guardar] admin_actualizar_display_name fallo:', error.message)
      } catch (err: any) {
        console.error('[guardar] admin_actualizar_display_name excepción:', err.message)
        error = err
      }
    }

    if (error) {
      console.error('[guardar] fallo:', error.message)
      setSaving(false)
      return
    }

    setTenant(prev => prev ? {
      ...prev,
      nombre:           form.nombre,
      al_dia:           form.al_dia,
      logo_url:         form.logo_url || null,
      color_primario:   form.color_primario,
      color_secundario: form.color_secundario,
    } : prev)
    setAdmin(prev => prev ? { ...prev, display_name: form.display_name || prev.display_name } : prev)
    setSaving(false)
    setEditing(false)
  }

  function cancelarEdicion() {
    if (tenant && admin) {
      setForm({
        nombre:           tenant.nombre,
        display_name:     admin.display_name ?? '',
        al_dia:           tenant.al_dia ?? true,
        logo_url:         tenant.logo_url ?? '',
        color_primario:   tenant.color_primario ?? '#9b30ff',
        color_secundario: tenant.color_secundario ?? '#7c3aed',
      })
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

              {/* Logo */}
              <ImageUpload
                label="Logo"
                value={form.logo_url || null}
                onChange={url => setForm(f => ({ ...f, logo_url: url }))}
                bucket="ejercicios"
                folder="logos"
              />

              {/* Colores */}
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Colores de la app</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'color_primario'   as const, label: 'Principal' },
                    { key: 'color_secundario' as const, label: 'Secundario' },
                  ]).map(({ key, label }) => (
                    <div key={key}>
                      <p className="text-[11px] text-df-muted mb-1.5">{label}</p>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <input type="color" value={form[key]}
                            onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setColorTexto(p => ({ ...p, [key]: e.target.value })) }}
                            className="sr-only" />
                          <div className="w-9 h-9 rounded-xl border border-df-border" style={{ background: form[key] }} />
                        </label>
                        <input value={colorTexto[key]}
                          onChange={e => onColorTexto(key, e.target.value)}
                          maxLength={7} className="df-input font-mono text-xs" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl p-3 flex items-center justify-between"
                style={{ background: `linear-gradient(135deg, ${form.color_secundario}22, ${form.color_primario}22)`, border: `1px solid ${form.color_primario}44` }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-df-surface flex items-center justify-center">
                    <img src={form.logo_url || '/logo.png'} alt="" className="w-full h-full object-contain"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = '/logo.png' }} />
                  </div>
                  <span className="text-sm font-bold text-white">{form.nombre || 'Sin nombre'}</span>
                </div>
                <div className="px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                  style={{ background: `linear-gradient(135deg, ${form.color_secundario}, ${form.color_primario})` }}>
                  Vista previa
                </div>
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
              {/* Branding */}
              <div className="rounded-xl p-3 flex items-center justify-between"
                style={{
                  background: `linear-gradient(135deg, ${tenant.color_secundario ?? '#7c3aed'}22, ${tenant.color_primario ?? '#9b30ff'}22)`,
                  border: `1px solid ${tenant.color_primario ?? '#9b30ff'}44`
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl overflow-hidden bg-df-surface border border-df-border flex items-center justify-center flex-shrink-0">
                    <img src={tenant.logo_url ?? '/logo.png'} alt={tenant.nombre}
                      className="w-full h-full object-contain p-0.5"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = '/logo.png' }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-df-muted uppercase tracking-wider">Marca</p>
                    <p className="text-sm text-white font-semibold">{tenant.nombre}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full border border-white/20" style={{ background: tenant.color_primario ?? '#9b30ff' }} title="Color principal" />
                  <div className="w-5 h-5 rounded-full border border-white/20" style={{ background: tenant.color_secundario ?? '#7c3aed' }} title="Color secundario" />
                </div>
              </div>

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
