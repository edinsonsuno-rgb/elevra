import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Avatar, Spinner, EmptyState, Modal } from '@/components/ui/index'
import ImageUpload from '@/components/ui/ImageUpload'
import { useAuth } from '@/hooks/useAuth'
import { getCache, setCache, invalidateCache } from '@/lib/queryCache'

const CACHE_INSTRUCTORES = 'admin:instructores'
const CACHE_PRECIO       = 'config:precio_por_alumno'
const TTL_INSTRUCTORES   = 15 * 60 * 1000   // 15 min
const TTL_PRECIO         = 24 * 60 * 60 * 1000 // 24 h

interface InstructorItem {
  tenant_id:     string
  tenant_nombre: string
  subdominio:    string
  al_dia:        boolean
  display_name:  string | null
  avatar_url:    string | null
  alumnos_count: number
}

export default function InstructoresPage() {
  const { user } = useAuth()
  const [instructores,  setInstructores]  = useState<InstructorItem[]>([])
  const [loading,       setLoading]       = useState(true)
  const [precioMensual, setPrecioMensual] = useState(10000)
  const [modalOpen,      setModalOpen]      = useState(false)
  const [paso,           setPaso]           = useState<1 | 2>(1)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [linkGenerado,   setLinkGenerado]   = useState<string | null>(null)
  const [copiado,        setCopiado]        = useState(false)
  const [subDisponible,  setSubDisponible]  = useState<boolean | null>(null)
  const [checkingSub,    setCheckingSub]    = useState(false)

  const [form, setForm] = useState({
    nombre: '', email: '', gym: '', subdominio: '',
    logo_url: '', color_primario: '#39D353', color_secundario: '#2ECC71',
  })
  // Texto crudo de los inputs de color (puede ser hex incompleto mientras el usuario escribe)
  const [colorTexto, setColorTexto] = useState({ color_primario: '#39D353', color_secundario: '#2ECC71' })

  function isValidHex(v: string) { return /^#[0-9a-fA-F]{6}$/.test(v) }

  function onColorTexto(key: 'color_primario' | 'color_secundario', val: string) {
    setColorTexto(p => ({ ...p, [key]: val }))
    if (isValidHex(val)) setForm(f => ({ ...f, [key]: val }))
  }

  useEffect(() => { cargar() }, [])

  async function cargar() {
    // Precio: cache 24h (casi nunca cambia)
    const precioCached = getCache<number>(CACHE_PRECIO)
    if (precioCached !== null) {
      setPrecioMensual(precioCached)
    }

    // Lista de instructores: cache 15 min
    const listaCached = getCache<InstructorItem[]>(CACHE_INSTRUCTORES)
    if (listaCached) {
      setInstructores(listaCached)
      setLoading(false)
      if (precioCached !== null) return  // todo en cache, sin consultas
    }

    const [{ data: tenants }, { data: admins }, { data: alumnos }] = await Promise.all([
      supabase.from('tenants').select('id, nombre, subdominio, al_dia').eq('activo', true).order('nombre'),
      supabase.from('profiles').select('id, display_name, avatar_url, tenant_id').eq('role', 'instructor'),
      supabase.from('alumnos').select('tenant_id').eq('activo', true),
    ])

    if (precioCached === null) {
      const { data: config } = await supabase.from('configuracion').select('valor').eq('clave', 'precio_por_alumno').maybeSingle()
      if (config) {
        const precio = Number(config.valor ?? 10000)
        setPrecioMensual(precio)
        setCache(CACHE_PRECIO, precio, TTL_PRECIO)
      }
    }

    const conteo: Record<string, number> = {}
    for (const a of (alumnos ?? [])) {
      conteo[a.tenant_id] = (conteo[a.tenant_id] ?? 0) + 1
    }

    const lista: InstructorItem[] = (tenants ?? []).map((t: any) => {
      const admin = (admins ?? []).find((a: any) => a.tenant_id === t.id)
      return {
        tenant_id:     t.id,
        tenant_nombre: t.nombre,
        subdominio:    t.subdominio,
        al_dia:        (t as any).al_dia ?? true,
        display_name:  admin?.display_name ?? null,
        avatar_url:    admin?.avatar_url ?? null,
        alumnos_count: conteo[t.id] ?? 0,
      }
    })

    setCache(CACHE_INSTRUCTORES, lista, TTL_INSTRUCTORES)
    setInstructores(lista)
    setLoading(false)
  }

  async function verificarSubdominio(sub: string) {
    if (!sub || sub.length < 2) { setSubDisponible(null); return }
    setCheckingSub(true)
    const { data } = await supabase.from('tenants').select('id').eq('subdominio', sub).maybeSingle()
    setSubDisponible(!data)
    setCheckingSub(false)
  }

  function cambiarSubdominio(val: string) {
    const limpio = val.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setForm(f => ({ ...f, subdominio: limpio }))
    setSubDisponible(null)
    clearTimeout((window as any)._subTimer)
    ;(window as any)._subTimer = setTimeout(() => verificarSubdominio(limpio), 600)
  }

  async function crearInstructor(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    console.log('[crearInstructor] inicio', { form, userId: user?.id })

    // 1. Crear tenant con branding
    console.log('[crearInstructor] paso 1 — insertando tenant...')
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        nombre:           form.gym.trim(),
        subdominio:       form.subdominio.trim().toLowerCase(),
        activo:           true,
        al_dia:           true,
        logo_url:         form.logo_url || null,
        color_primario:   form.color_primario,
        color_secundario: form.color_secundario,
      })
      .select('id')
      .single()

    console.log('[crearInstructor] paso 1 resultado', { tenant, tenantErr })

    if (tenantErr || !tenant) {
      setError(tenantErr?.message ?? 'Error al crear el espacio')
      setSaving(false)
      return
    }

    // 2. Crear invitación ligada al tenant
    console.log('[crearInstructor] paso 2 — insertando invitación...', { tenantId: tenant.id })
    const { data: inv, error: invErr } = await supabase
      .from('invitaciones')
      .insert({
        nombre:     form.nombre.trim(),
        email:      form.email.trim(),
        tenant_id:  tenant.id,
        creado_por: user?.id,
      })
      .select('token')
      .single()

    console.log('[crearInstructor] paso 2 resultado', { inv, invErr })

    if (invErr || !inv) {
      setError(invErr?.message ?? 'Error al crear la invitación')
      setSaving(false)
      return
    }

    console.log('[crearInstructor] éxito — generando link...')
    const link = `${window.location.origin}/registro?token=${inv.token}`
    setLinkGenerado(link)
    setSaving(false)

    // Update optimista: agrega el nuevo instructor al estado local sin recargar
    const nuevoItem: InstructorItem = {
      tenant_id:     tenant.id,
      tenant_nombre: form.gym.trim(),
      subdominio:    form.subdominio.trim().toLowerCase(),
      al_dia:        true,
      display_name:  form.nombre.trim(),
      avatar_url:    null,
      alumnos_count: 0,
    }
    setInstructores(prev => {
      const nueva = [...prev, nuevoItem].sort((a, b) => a.tenant_nombre.localeCompare(b.tenant_nombre))
      setCache(CACHE_INSTRUCTORES, nueva, TTL_INSTRUCTORES)
      return nueva
    })
    invalidateCache(CACHE_INSTRUCTORES) // fuerza recarga real en próxima visita
  }

  function copiarLink() {
    if (!linkGenerado) return
    navigator.clipboard.writeText(linkGenerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function cerrarModal() {
    setModalOpen(false)
    setError(null)
    setLinkGenerado(null)
    setCopiado(false)
    setPaso(1)
    setForm({ nombre: '', email: '', gym: '', subdominio: '', logo_url: '', color_primario: '#39D353', color_secundario: '#2ECC71' })
    setColorTexto({ color_primario: '#39D353', color_secundario: '#2ECC71' })
  }

  if (loading) return <Spinner />

  const totalAlumnos = instructores.reduce((s, i) => s + i.alumnos_count, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Instructores</h1>
          <p className="text-df-muted text-sm mt-0.5">
            {instructores.length} activos · {totalAlumnos} alumnos en total
          </p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="df-btn px-4 py-2.5 text-sm flex items-center gap-2">
          <i className="fa-solid fa-user-plus" /> Nuevo instructor
        </button>
      </div>

      {instructores.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-chalkboard-user"
          title="Sin instructores"
          desc="Agrega el primer instructor para comenzar"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {instructores.map(ins => {
            const mensual = ins.alumnos_count * precioMensual
            return (
              <Link
                key={ins.tenant_id}
                to={`/instructores/${ins.tenant_id}`}
                className="df-card p-4 hover:border-df-violet/40 transition-all group flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar nombre={ins.display_name ?? ins.tenant_nombre} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate group-hover:text-df-violet transition-colors">
                      {ins.display_name ?? ins.tenant_nombre}
                    </p>
                    <p className="text-xs text-df-muted">{ins.subdominio}.elevra.lat</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ins.al_dia ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="df-surface rounded-xl p-2 text-center">
                    <p className="text-base font-black text-white">{ins.alumnos_count}</p>
                    <p className="text-[10px] text-df-muted uppercase tracking-wide">Alumnos</p>
                  </div>
                  <div className="df-surface rounded-xl p-2 text-center">
                    <p className="text-base font-black text-white">
                      {mensual > 0 ? `$${mensual.toLocaleString('es-CO')}` : '—'}
                    </p>
                    <p className="text-[10px] text-df-muted uppercase tracking-wide">Este mes</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    ins.al_dia
                      ? 'bg-green-900/40 text-green-400'
                      : 'bg-red-900/40 text-red-400'
                  }`}>
                    {ins.al_dia ? '✓ Al día' : '⚠ Pendiente'}
                  </span>
                  <span className="text-[10px] text-df-muted group-hover:text-df-violet transition-colors">
                    Ver perfil →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Modal nuevo instructor */}
      <Modal open={modalOpen} onClose={cerrarModal}
        title={linkGenerado ? '¡Instructor creado!' : paso === 1 ? 'Nuevo instructor — Datos' : 'Nuevo instructor — Marca'}>

        {linkGenerado ? (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center space-y-2">
              <i className="fa-solid fa-circle-check text-2xl text-green-400 block" />
              <p className="text-sm font-bold text-white">{form.gym}</p>
              <p className="text-xs text-df-muted">Comparte este link para que el instructor active su cuenta</p>
            </div>
            <div className="df-surface rounded-xl p-3 flex items-center gap-2">
              <p className="text-xs text-df-muted flex-1 truncate">{linkGenerado}</p>
              <button onClick={copiarLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0 transition-all flex items-center gap-1.5 ${
                  copiado ? 'bg-green-900/30 text-green-400' : 'df-btn'
                }`}>
                <i className={`fa-solid ${copiado ? 'fa-check' : 'fa-copy'} text-xs`} />
                {copiado ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <button onClick={cerrarModal} className="df-btn w-full py-2.5 text-sm">Listo</button>
          </div>

        ) : paso === 1 ? (
          /* ── Paso 1: Datos básicos ── */
          <form onSubmit={e => { e.preventDefault(); setPaso(2) }} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Nombre del instructor *</label>
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Laura Martínez" className="df-input" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Correo electrónico *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="laura@correo.com" className="df-input" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Nombre del negocio *</label>
              <input value={form.gym} onChange={e => setForm(f => ({ ...f, gym: e.target.value }))}
                placeholder="Ej: Laura Fit" className="df-input" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Subdominio *</label>
              <div className="flex items-center gap-2">
                <input value={form.subdominio}
                  onChange={e => cambiarSubdominio(e.target.value)}
                  placeholder="laurafit" className="df-input flex-1" required />
                <span className="text-xs text-df-muted flex-shrink-0">.elevra.lat</span>
              </div>
              {form.subdominio.length >= 2 && (
                <p className={`text-xs mt-1.5 flex items-center gap-1.5 ${
                  checkingSub ? 'text-df-muted' :
                  subDisponible === true ? 'text-green-400' :
                  subDisponible === false ? 'text-red-400' : 'text-df-muted'
                }`}>
                  {checkingSub
                    ? <><div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> Verificando...</>
                    : subDisponible === true
                      ? <><i className="fa-solid fa-circle-check" /> Disponible</>
                      : subDisponible === false
                        ? <><i className="fa-solid fa-circle-xmark" /> Ya está en uso</>
                        : null
                  }
                </p>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={cerrarModal}
                className="df-btn-outline border border-df-border px-5 py-2.5 text-sm rounded-xl flex-1">Cancelar</button>
              <button type="submit"
                disabled={checkingSub || subDisponible === false || !form.subdominio}
                className="df-btn px-5 py-2.5 text-sm flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                Siguiente <i className="fa-solid fa-arrow-right text-xs" />
              </button>
            </div>
          </form>

        ) : (
          /* ── Paso 2: Logo y colores ── */
          <form onSubmit={crearInstructor} className="space-y-4">
            <ImageUpload
              label="Logo del negocio"
              value={form.logo_url || null}
              onChange={url => setForm(f => ({ ...f, logo_url: url }))}
              bucket="ejercicios"
              folder="logos"
            />
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
                <span className="text-sm font-bold text-white">{form.gym || 'Sin nombre'}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                style={{ background: `linear-gradient(135deg, ${form.color_secundario}, ${form.color_primario})` }}>
                Vista previa
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation" /> {error}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setPaso(1)}
                className="df-btn-outline border border-df-border px-5 py-2.5 text-sm rounded-xl flex-1 flex items-center justify-center gap-2">
                <i className="fa-solid fa-arrow-left text-xs" /> Atrás
              </button>
              <button type="submit" disabled={saving}
                className="df-btn px-5 py-2.5 text-sm flex-1 flex items-center justify-center gap-2">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><i className="fa-solid fa-paper-plane" /> Crear y generar link</>
                }
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
