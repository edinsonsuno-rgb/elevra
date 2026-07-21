import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Avatar, Spinner, EmptyState, Modal } from '@/components/ui/index'
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
  inv_token:     string | null
  inv_pendiente: boolean
}

export default function InstructoresPage() {
  const { user } = useAuth()
  const [instructores,  setInstructores]  = useState<InstructorItem[]>([])
  const [loading,       setLoading]       = useState(true)
  const [precioMensual, setPrecioMensual] = useState(10000)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [linkGenerado,  setLinkGenerado]  = useState<string | null>(null)
  const [copiado,       setCopiado]       = useState(false)
  const [copiadoCard,   setCopiadoCard]   = useState<string | null>(null)
  const [subDisponible, setSubDisponible] = useState<boolean | null>(null)
  const [checkingSub,   setCheckingSub]   = useState(false)

  const [form, setForm] = useState({
    nombre: '', telefono: '', cc: '', email: '', gym: '', subdominio: '',
  })

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    // Escucha eventos de invitaciones usadas desde otras pestañas
    try {
      const bc = new BroadcastChannel('elevra-invitaciones')
      bc.onmessage = (ev) => {
        if (ev.data?.type === 'invitacion_usada') {
          const tid = ev.data?.tenantId
          if (tid) {
            setInstructores(prev => {
              const updated = prev.map(i => i.tenant_id === tid ? { ...i, inv_pendiente: false, inv_token: null } : i)
              setCache(CACHE_INSTRUCTORES, updated, TTL_INSTRUCTORES)
              return updated
            })
          } else {
            invalidateCache(CACHE_INSTRUCTORES)
            cargar()
          }
        }
      }
      return () => bc.close()
    } catch (err) {
      // BroadcastChannel no disponible; nada que hacer
      return () => {}
    }
  }, [])

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

    const [{ data: tenants }, { data: admins }, { data: alumnos }, { data: invs }] = await Promise.all([
      supabase.from('tenants').select('id, nombre, subdominio, al_dia').eq('activo', true).order('nombre'),
      supabase.from('profiles').select('id, display_name, avatar_url, tenant_id').eq('role', 'instructor'),
      supabase.from('alumnos').select('tenant_id').eq('activo', true),
      supabase.from('invitaciones').select('tenant_id, token, usado').eq('usado', false),
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
      const inv   = (invs   ?? []).find((i: any) => i.tenant_id === t.id)
      return {
        tenant_id:     t.id,
        tenant_nombre: t.nombre,
        subdominio:    t.subdominio,
        al_dia:        (t as any).al_dia ?? true,
        display_name:  admin?.display_name ?? null,
        avatar_url:    admin?.avatar_url ?? null,
        alumnos_count: conteo[t.id] ?? 0,
        inv_token:     inv?.token ?? null,
        inv_pendiente: !!inv,
      }
    })

    setCache(CACHE_INSTRUCTORES, lista, TTL_INSTRUCTORES)
    setInstructores(lista)
    setLoading(false)
  }

  async function verificarSubdominio(sub: string) {
    if (!sub || sub.length < 2) { setSubDisponible(null); setCheckingSub(false); return }
    setCheckingSub(true)
    try {
      const { data, error } = await supabase.from('tenants').select('id').eq('subdominio', sub).maybeSingle()
      if (error) {
        console.error('[verificarSubdominio] error', error)
        setSubDisponible(null)
      } else {
        setSubDisponible(!data)
      }
    } catch (err) {
      console.error('[verificarSubdominio] excepción', err)
      setSubDisponible(null)
    } finally {
      setCheckingSub(false)
    }
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

    // 1. Crear tenant con branding
    const newTenantId = crypto.randomUUID()

    let rpc: any = null
    let rpcErr: any = null
    try {
      const res = await supabase.rpc('admin_crear_instructor', {
        p_tenant_id:        newTenantId,
        p_nombre_gym:       form.gym.trim(),
        p_subdominio:       form.subdominio.trim().toLowerCase(),
        p_logo_url:         '',
        p_color_primario:   '#39D353',
        p_color_secundario: '#2ECC71',
        p_nombre:           form.nombre.trim(),
        p_telefono:         form.telefono.trim(),
        p_cc:               form.cc.trim(),
        p_email:            form.email.trim(),
        p_creado_por:       user?.id,
      }) as any
      rpc    = res.data
      rpcErr = res.error
    } catch (err: any) {
      console.error('[crearInstructor] RPC excepción:', err.message)
      setError(err.message)
      setSaving(false)
      return
    }

    if (rpcErr || !rpc?.token) {
      console.error('[crearInstructor] RPC error:', rpcErr)
      setError(rpcErr?.message ?? 'Error al crear el instructor')
      setSaving(false)
      return
    }

    const link = `https://${form.subdominio.trim().toLowerCase()}.elevra.lat/registro?token=${rpc.token}`
    setLinkGenerado(link)
    setSaving(false)

    // Update optimista: agrega el nuevo instructor al estado local sin recargar
    const nuevoItem: InstructorItem = {
      tenant_id:     newTenantId,
      tenant_nombre: form.gym.trim(),
      subdominio:    form.subdominio.trim().toLowerCase(),
      al_dia:        true,
      display_name:  form.nombre.trim(),
      avatar_url:    null,
      alumnos_count: 0,
      inv_token:     rpc.token,
      inv_pendiente: true,
    }
    setInstructores(prev => {
      const nueva = [...prev, nuevoItem].sort((a, b) => a.tenant_nombre.localeCompare(b.tenant_nombre))
      setCache(CACHE_INSTRUCTORES, nueva, TTL_INSTRUCTORES)
      return nueva
    })
    invalidateCache(CACHE_INSTRUCTORES) // fuerza recarga real en próxima visita
  }

  function buildLink(token: string, subdominio: string) {
    return `https://${subdominio}.elevra.lat/registro?token=${token}`
  }

  function copiarLink() {
    if (!linkGenerado) return
    navigator.clipboard.writeText(linkGenerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function copiarLinkCard(token: string, tenantId: string, subdominio: string) {
    navigator.clipboard.writeText(buildLink(token, subdominio))
    setCopiadoCard(tenantId)
    setTimeout(() => setCopiadoCard(null), 2000)
  }

  function abrirWhatsApp(token: string, nombre: string, subdominio: string) {
    const link = buildLink(token, subdominio)
    const msg  = encodeURIComponent(`Hola ${nombre}, te invito a activar tu cuenta en Elevra. Usa este link:\n${link}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  function cerrarModal() {
    setModalOpen(false)
    setError(null)
    setLinkGenerado(null)
    setCopiado(false)
    setForm({ nombre: '', telefono: '', cc: '', email: '', gym: '', subdominio: '' })
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
                    ins.inv_pendiente
                      ? 'bg-amber-900/40 text-amber-400'
                      : ins.al_dia
                        ? 'bg-green-900/40 text-green-400'
                        : 'bg-red-900/40 text-red-400'
                  }`}>
                    {ins.inv_pendiente
                      ? '⏳ Invitación pendiente'
                      : ins.al_dia ? '✓ Al día' : '⚠ Pendiente'}
                  </span>
                  {!ins.inv_pendiente && (
                    <span className="text-[10px] text-df-muted group-hover:text-df-violet transition-colors">
                      Ver perfil →
                    </span>
                  )}
                </div>

                {ins.inv_pendiente && ins.inv_token && (
                  <div className="flex gap-2" onClick={e => e.preventDefault()}>
                    <button
                      onClick={() => copiarLinkCard(ins.inv_token!, ins.tenant_id, ins.subdominio)}
                      className={`flex-1 text-xs px-3 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                        copiadoCard === ins.tenant_id
                          ? 'bg-green-900/30 text-green-400'
                          : 'df-surface text-df-muted hover:text-white'
                      }`}>
                      <i className={`fa-solid ${copiadoCard === ins.tenant_id ? 'fa-check' : 'fa-copy'} text-xs`} />
                      {copiadoCard === ins.tenant_id ? '¡Copiado!' : 'Copiar link'}
                    </button>
                    <button
                      onClick={() => abrirWhatsApp(ins.inv_token!, ins.display_name ?? ins.tenant_nombre, ins.subdominio)}
                      className="text-xs px-3 py-2 rounded-lg df-surface text-df-muted hover:text-green-400 transition-all flex items-center gap-1.5">
                      <i className="fa-brands fa-whatsapp text-sm" />
                      WhatsApp
                    </button>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {/* Modal nuevo instructor */}
      <Modal open={modalOpen} onClose={cerrarModal}
        title={linkGenerado ? '¡Instructor creado!' : 'Nuevo instructor'}>

        {linkGenerado ? (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center space-y-2">
              <i className="fa-solid fa-circle-check text-2xl text-green-400 block" />
              <p className="text-sm font-bold text-white">{form.gym}</p>
              <p className="text-xs text-df-muted">Comparte este link para que el instructor active su cuenta</p>
            </div>
            <div className="bg-df-bg border border-df-border rounded-xl p-3 font-mono text-xs text-df-muted break-all select-all">
              {linkGenerado}
            </div>
            <div className="flex gap-2">
              <button onClick={copiarLink}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  copiado ? 'bg-green-900/30 text-green-400' : 'df-surface text-df-muted hover:text-white'
                }`}>
                <i className={`fa-solid ${copiado ? 'fa-check' : 'fa-copy'} text-xs`} />
                {copiado ? '¡Copiado!' : 'Copiar link'}
              </button>
              <button
                onClick={() => linkGenerado && abrirWhatsApp(linkGenerado.split('token=')[1], form.nombre, form.subdominio.trim().toLowerCase())}
                className="text-xs px-3 py-2.5 rounded-xl df-surface text-df-muted hover:text-green-400 transition-all flex items-center gap-2">
                <i className="fa-brands fa-whatsapp text-sm" /> WhatsApp
              </button>
            </div>
            <button onClick={cerrarModal} className="df-btn w-full py-2.5 text-sm flex items-center justify-center gap-2">
              <i className="fa-solid fa-check" /> He terminado
            </button>
          </div>

        ) : (
          <form onSubmit={crearInstructor} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Nombre completo *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Laura Martínez" className="df-input" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Teléfono</label>
                <input type="tel" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                  placeholder="300 000 0000" className="df-input" />
              </div>
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Cédula</label>
                <input value={form.cc} onChange={e => setForm(f => ({ ...f, cc: e.target.value }))}
                  placeholder="1234567890" className="df-input" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Correo electrónico *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="laura@correo.com" className="df-input" required />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Nombre del negocio *</label>
                <input value={form.gym} onChange={e => setForm(f => ({ ...f, gym: e.target.value }))}
                  placeholder="Ej: Laura Fit" className="df-input" required />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Subdominio *</label>
                <div className="flex items-center gap-2">
                  <input value={form.subdominio} onChange={e => cambiarSubdominio(e.target.value)}
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
                      : subDisponible === true ? <><i className="fa-solid fa-circle-check" /> Disponible</>
                      : subDisponible === false ? <><i className="fa-solid fa-circle-xmark" /> Ya está en uso</>
                      : null}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation" /> {error}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={cerrarModal}
                className="df-btn-outline border border-df-border px-5 py-2.5 text-sm rounded-xl flex-1">Cancelar</button>
              <button type="submit" disabled={saving || checkingSub || subDisponible === false || !form.subdominio}
                className="df-btn px-5 py-2.5 text-sm flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><i className="fa-solid fa-paper-plane" /> Crear y generar link</>}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}