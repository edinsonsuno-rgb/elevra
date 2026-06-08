import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Avatar, Spinner, EmptyState, Modal } from '@/components/ui/index'
import { useAuth } from '@/hooks/useAuth'

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
  const [modalOpen,     setModalOpen]     = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [linkGenerado,  setLinkGenerado]  = useState<string | null>(null)
  const [copiado,       setCopiado]       = useState(false)

  const [form, setForm] = useState({ nombre: '', email: '', gym: '', subdominio: '' })

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const [{ data: tenants }, { data: admins }, { data: alumnos }, { data: config }] = await Promise.all([
      supabase.from('tenants')
        .select('id, nombre, subdominio, al_dia')
        .eq('activo', true)
        .order('nombre'),
      supabase.from('profiles')
        .select('id, display_name, avatar_url, tenant_id')
        .eq('role', 'instructor'),
      supabase.from('alumnos')
        .select('tenant_id')
        .eq('activo', true),
      supabase.from('configuracion')
        .select('valor')
        .eq('clave', 'precio_por_alumno')
        .maybeSingle(),
    ])

    if (config) setPrecioMensual(Number(config.valor ?? 10000))

    const conteo: Record<string, number> = {}
    for (const a of (alumnos ?? [])) {
      conteo[a.tenant_id] = (conteo[a.tenant_id] ?? 0) + 1
    }

    setInstructores(
      (tenants ?? []).map(t => {
        const admin = (admins ?? []).find(a => a.tenant_id === t.id)
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
    )
    setLoading(false)
  }

  async function crearInstructor(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)

    // 1. Crear tenant
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        nombre:     form.gym.trim(),
        subdominio: form.subdominio.trim().toLowerCase(),
        activo:     true,
        al_dia:     true,
      })
      .select('id')
      .single()

    if (tenantErr || !tenant) {
      setError(tenantErr?.message ?? 'Error al crear el espacio')
      setSaving(false)
      return
    }

    // 2. Crear invitación ligada al tenant
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

    if (invErr || !inv) {
      setError(invErr?.message ?? 'Error al crear la invitación')
      setSaving(false)
      return
    }

    const link = `${window.location.origin}/registro?token=${inv.token}`
    setLinkGenerado(link)
    setSaving(false)
    cargar()
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
    setForm({ nombre: '', email: '', gym: '', subdominio: '' })
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
      <Modal open={modalOpen} onClose={cerrarModal} title="Nuevo instructor">
        {linkGenerado ? (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-center space-y-2">
              <i className="fa-solid fa-circle-check text-2xl text-green-400 block" />
              <p className="text-sm font-bold text-white">¡Instructor creado!</p>
              <p className="text-xs text-df-muted">Comparte este link para que complete su registro</p>
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
            <button onClick={cerrarModal} className="df-btn w-full py-2.5 text-sm">
              Listo
            </button>
          </div>
        ) : (
          <form onSubmit={crearInstructor} className="space-y-4">
            <p className="text-xs text-df-muted">
              Se creará el espacio y un link de registro para que el instructor active su cuenta.
            </p>
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                Nombre del instructor *
              </label>
              <input value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Laura Martínez" className="df-input" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                Correo electrónico *
              </label>
              <input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="laura@correo.com" className="df-input" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                Nombre del gimnasio / negocio *
              </label>
              <input value={form.gym}
                onChange={e => setForm(f => ({ ...f, gym: e.target.value }))}
                placeholder="Ej: Laura Fit" className="df-input" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                Subdominio *
              </label>
              <div className="flex items-center gap-2">
                <input value={form.subdominio}
                  onChange={e => setForm(f => ({ ...f, subdominio: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="laurafit" className="df-input flex-1" required />
                <span className="text-xs text-df-muted flex-shrink-0">.elevra.lat</span>
              </div>
            </div>
            {error && (
              <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation" /> {error}
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={cerrarModal}
                className="df-btn-outline border border-df-border px-5 py-2.5 text-sm rounded-xl flex-1">
                Cancelar
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
