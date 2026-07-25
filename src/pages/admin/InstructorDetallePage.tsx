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
  logo_icono_url:   string | null
  color_primario:   string
  color_secundario: string
  color_terciario:  string
  color_texto1:     string
  color_texto2:     string
  card_brillo:      number
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

type RpcResponse<T = any> = {
  data: T
  error: any
}

async function rpcConTimeout<T = any>(
  nombre: string,
  params?: Record<string, any>,
  timeout = 20_000
): Promise<T> {
  return await Promise.race([
    supabase.rpc(nombre, params),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`La conexión está tardando más de lo normal. Intenta de nuevo.`)), timeout)
    ),
  ]) as T
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
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null)
  const [form, setForm] = useState({
    nombre:           '',
    display_name:     '',
    al_dia:           true,
    logo_url:         '',
    logo_icono_url:   '',
    color_primario:   '#9b30ff',
    color_secundario: '#7c3aed',
    color_terciario:  '#000000',
    color_texto1:     '#FFFFFF',
    color_texto2:     '#FFFFFF',
    card_brillo:      26,
  })
  const [colorTexto, setColorTexto] = useState({
    color_primario:   '#9b30ff',
    color_secundario: '#7c3aed',
    color_terciario:  '#000000',
    color_texto1:     '#FFFFFF',
    color_texto2:     '#FFFFFF',
  })

  function isValidHex(v: string) { return /^#[0-9a-fA-F]{6}$/.test(v) }

  function onColorTexto(key: 'color_primario' | 'color_secundario' | 'color_terciario' | 'color_texto1' | 'color_texto2', val: string) {
    setColorTexto(p => ({ ...p, [key]: val }))
    if (isValidHex(val)) setForm(f => ({ ...f, [key]: val }))
  }

  useEffect(() => { if (tenantId) cargar() }, [tenantId])

  useEffect(() => {
    if (!notification) return

    const timeout = window.setTimeout(() => setNotification(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [notification])

  async function cargar() {
    const hoy          = new Date().toISOString().split('T')[0]
    const primerDelMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                          .toISOString().split('T')[0]

    const [{ data: t }, { data: p }, { data: a }, { data: pl }] = await Promise.all([
      supabase.from('tenants')
        .select('id, nombre, subdominio, logo_url, logo_icono_url, color_primario, color_secundario, color_terciario, color_texto1, color_texto2, card_brillo, al_dia, activo')
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
      const ct = datos.color_terciario  ?? '#000000'
      const t1 = datos.color_texto1     ?? '#FFFFFF'
      const t2 = datos.color_texto2     ?? '#FFFFFF'
      const cb = datos.card_brillo      ?? 26
      setForm({
        nombre:           datos.nombre,
        display_name:     (p as AdminProfile | null)?.display_name ?? '',
        al_dia:           datos.al_dia ?? true,
        logo_url:         datos.logo_url ?? '',
        logo_icono_url:   datos.logo_icono_url ?? '',
        color_primario:   cp,
        color_secundario: cs,
        color_terciario:  ct,
        color_texto1:     t1,
        color_texto2:     t2,
        card_brillo:      cb,
      })
      setColorTexto({ color_primario: cp, color_secundario: cs, color_terciario: ct, color_texto1: t1, color_texto2: t2 })
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

    try {
      const { error: tenantError } = await rpcConTimeout<RpcResponse>(
        'admin_actualizar_tenant',
        {
          p_tenant_id: tenant.id,
          p_nombre: form.nombre,
          p_logo_url: form.logo_url.trim(),
          p_color_primario: form.color_primario,
          p_color_secundario: form.color_secundario,
          p_al_dia: form.al_dia,
          p_color_terciario: form.color_terciario,
          p_color_texto1: form.color_texto1,
          p_color_texto2: form.color_texto2,
        }
      )

      if (tenantError) {
        throw tenantError
      }

      const { error: brilloError } = await rpcConTimeout<RpcResponse>(
        'admin_actualizar_card_brillo',
        {
          p_tenant_id: tenant.id,
          p_card_brillo: form.card_brillo,
        }
      )

      if (brilloError) {
        throw brilloError
      }

      const { error: logoIconoError } = await rpcConTimeout<RpcResponse>(
        'admin_actualizar_logo_icono',
        {
          p_tenant_id: tenant.id,
          p_logo_icono_url: form.logo_icono_url.trim(),
        }
      )

      if (logoIconoError) {
        throw logoIconoError
      }

      if (admin?.id && form.display_name) {
        const { error: profileError } = await rpcConTimeout<RpcResponse>(
          'admin_actualizar_display_name',
          {
            p_profile_id: admin.id,
            p_display_name: form.display_name,
          }
        )

        if (profileError) {
          throw profileError
        }
      }

      setTenant(prev => prev ? {
        ...prev,
        nombre: form.nombre,
        al_dia: form.al_dia,
        logo_url: form.logo_url || null,
        logo_icono_url: form.logo_icono_url || null,
        color_primario: form.color_primario,
        color_secundario: form.color_secundario,
        color_terciario: form.color_terciario,
        color_texto1: form.color_texto1,
        color_texto2: form.color_texto2,
        card_brillo: form.card_brillo,
      } : prev)

      setAdmin(prev => prev ? {
        ...prev,
        display_name: form.display_name || prev.display_name,
      } : prev)

      setNotification({ message: 'Cambios guardados correctamente.', type: 'success' })
      setEditing(false)
    } catch (err: any) {
      console.error('[guardar]', err)
      setNotification({ message: err?.message ?? 'Ocurrió un error al guardar los cambios.', type: 'error' })
    } finally {
      setSaving(false)
    }
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
        color_terciario:  tenant.color_terciario ?? '#000000',
        color_texto1:     tenant.color_texto1 ?? '#FFFFFF',
        color_texto2:     tenant.color_texto2 ?? '#FFFFFF',
        card_brillo:      tenant.card_brillo ?? 26,
      })
      setColorTexto({
        color_primario:   tenant.color_primario ?? '#9b30ff',
        color_secundario: tenant.color_secundario ?? '#7c3aed',
        color_terciario:  tenant.color_terciario ?? '#000000',
        color_texto1:     tenant.color_texto1 ?? '#FFFFFF',
        color_texto2:     tenant.color_texto2 ?? '#FFFFFF',
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

  function copiarSubdominio() {
    if (!tenant) return
    const texto = `${tenant.subdominio}.elevra.lat`
    navigator.clipboard.writeText(texto)
      .then(() => setNotification({ message: 'Subdominio copiado al portapapeles', type: 'success' }))
      .catch(() => setNotification({ message: 'No se pudo copiar el subdominio', type: 'error' }))
  }

  const [showShareMenu, setShowShareMenu] = useState(false)

  function shareTo(platform: 'whatsapp' | 'telegram' | 'twitter' | 'facebook') {
    if (!tenant) return
    const url = `https://${tenant.subdominio}.elevra.lat`
    const text = encodeURIComponent(`Visita ${tenant.nombre} en Elevra: ${url}`)
    let shareUrl = ''
    switch (platform) {
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${text}`
        break
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
    }
    try {
      window.open(shareUrl, '_blank', 'noopener')
      setShowShareMenu(false)
    } catch (err) {
      setNotification({ message: 'No se pudo abrir la opción de compartir', type: 'error' })
    }
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
      {notification && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${notification.type === 'error'
          ? 'border-red-500/30 bg-red-950/40 text-red-300'
          : 'border-green-500/30 bg-green-950/40 text-green-300'}`}>
          {notification.message}
        </div>
      )}

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

              {/* Logo de descarga (favicon / ícono al instalar la app) */}
              <div>
                <ImageUpload
                  label="Logo de descarga"
                  value={form.logo_icono_url || null}
                  onChange={url => setForm(f => ({ ...f, logo_icono_url: url }))}
                  bucket="ejercicios"
                  folder="logos-icono"
                />
                <p className="text-xs text-df-muted mt-1.5 leading-relaxed">
                  Este es el ícono que se ve en la pestaña del navegador y al instalar la
                  app en el celular (no el logo grande del banner). Especificaciones:
                  imagen <b className="text-white/80">cuadrada</b> (ej. 512×512px),
                  formato <b className="text-white/80">PNG</b>, con{' '}
                  <b className="text-white/80">fondo transparente o sólido</b>, sin texto
                  pequeño ni bordes pegados al borde de la imagen (deja un margen).
                </p>
              </div>

              {/* Colores */}
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Colores de la app</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'color_primario'   as const, label: 'Principal' },
                    { key: 'color_secundario' as const, label: 'Secundario' },
                    { key: 'color_terciario'  as const, label: 'Terciario' },
                    { key: 'color_texto1'     as const, label: 'Texto 1' },
                    { key: 'color_texto2'     as const, label: 'Texto 2' },
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

              {/* Brillo de las tarjetas (solo dashboard, no afecta login) */}
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">
                  Brillo de las tarjetas
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={form.card_brillo}
                    onChange={e => setForm(f => ({ ...f, card_brillo: Number(e.target.value) }))}
                    className="flex-1 accent-df-purple"
                  />
                  <span className="text-xs text-df-muted font-mono w-10 text-right">{form.card_brillo}%</span>
                </div>
                <p className="text-[11px] text-df-muted mt-1.5">
                  Controla qué tan sólidas o translúcidas se ven las tarjetas del dashboard. Guarda y refresca en otro dispositivo para ver el cambio.
                </p>
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

              <div className="df-surface rounded-xl p-3 flex items-center gap-3 justify-between relative">
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-globe text-df-muted text-sm w-4 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-df-muted uppercase tracking-wider">Subdominio</p>
                    <p className="text-sm text-white truncate">{tenant.subdominio}.elevra.lat</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={copiarSubdominio} title="Copiar subdominio"
                    className="px-2 py-1 rounded-md bg-df-surface text-df-muted hover:bg-white/5 transition-colors flex items-center gap-2">
                    <i className="fa-solid fa-copy text-xs" />
                  </button>
                  <div className="relative">
                    <button type="button" onClick={() => setShowShareMenu(s => !s)} title="Compartir"
                      className="px-2 py-1 rounded-md bg-df-surface text-df-muted hover:bg-white/5 transition-colors flex items-center gap-2">
                      <i className="fa-solid fa-share-nodes text-xs" />
                    </button>
                    {showShareMenu && (
                      <div className="absolute right-0 mt-2 w-44 bg-df-surface border border-df-border rounded-md p-2 shadow-lg z-30">
                        <button onClick={() => shareTo('whatsapp')}
                          className="w-full text-left px-2 py-1 rounded hover:bg-white/5 flex items-center gap-2">
                          <i className="fa-brands fa-whatsapp text-green-400 w-5" /> WhatsApp
                        </button>
                        <button onClick={() => shareTo('telegram')}
                          className="w-full text-left px-2 py-1 rounded hover:bg-white/5 flex items-center gap-2">
                          <i className="fa-brands fa-telegram text-sky-400 w-5" /> Telegram
                        </button>
                        <button onClick={() => shareTo('twitter')}
                          className="w-full text-left px-2 py-1 rounded hover:bg-white/5 flex items-center gap-2">
                          <i className="fa-brands fa-twitter text-sky-300 w-5" /> Twitter
                        </button>
                        <button onClick={() => shareTo('facebook')}
                          className="w-full text-left px-2 py-1 rounded hover:bg-white/5 flex items-center gap-2">
                          <i className="fa-brands fa-facebook text-blue-600 w-5" /> Facebook
                        </button>
                      </div>
                    )}
                  </div>
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