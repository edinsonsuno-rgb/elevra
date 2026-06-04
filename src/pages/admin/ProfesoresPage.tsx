import { useEffect, useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Avatar, Spinner, EmptyState, Modal } from '@/components/ui/index'
import { useAuth } from '@/hooks/useAuth'

interface Profesor {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: string
  tenant_id: string | null
  created_at: string
  email?: string
}

interface Invitacion {
  id: string
  email: string
  nombre: string
  usado: boolean
  token: string
  created_at: string
}

export default function ProfesoresPage() {
  const { role, tenantId, user } = useAuth()
  const navigate = useNavigate()

  const [profesores,   setProfesores]   = useState<Profesor[]>([])
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([])
  const [loading,      setLoading]      = useState(true)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [copiado,      setCopiado]      = useState<string | null>(null)

  const [form, setForm] = useState({ nombre: '', email: '' })

  // Solo admin puede ver esta página
  useEffect(() => {
    if (role && role !== 'admin') navigate('/dashboard')
  }, [role])

  useEffect(() => { if (tenantId) cargar() }, [tenantId])

  async function cargar() {
    const [{ data: profs }, { data: invs }] = await Promise.all([
      supabase.from('profiles')
        .select('id, display_name, avatar_url, role, tenant_id, created_at')
        .eq('tenant_id', tenantId!)
        .eq('role', 'instructor'),
      supabase.from('invitaciones')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false }),
    ])
    setProfesores(profs ?? [])
    setInvitaciones(invs ?? [])
    setLoading(false)
  }

  async function crearInvitacion(e: FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.email.trim()) return
    setSaving(true); setError(null)
    const { error: err } = await supabase.from('invitaciones').insert({
      nombre:     form.nombre,
      email:      form.email,
      tenant_id:  tenantId!,
      creado_por: user?.id,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setForm({ nombre: '', email: '' })
    setModalOpen(false)
    setSaving(false)
    cargar()
  }

  async function eliminarInvitacion(id: string) {
    if (!confirm('¿Eliminar esta invitación?')) return
    await supabase.from('invitaciones').delete().eq('id', id)
    cargar()
  }

  async function desactivarProfesor(id: string) {
    if (!confirm('¿Desactivar este profesor?')) return
    await supabase.from('profiles').update({ role: 'inactivo' }).eq('id', id)
    cargar()
  }

  function copiarLink(token: string, id: string) {
    const link = `${window.location.origin}/registro?token=${token}`
    navigator.clipboard.writeText(link)
    setCopiado(id)
    setTimeout(() => setCopiado(null), 2000)
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Equipo de profesores</h1>
          <p className="text-df-muted text-sm mt-0.5">
            {profesores.length} activos · {invitaciones.filter(i => !i.usado).length} invitaciones pendientes
          </p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="df-btn px-4 py-2.5 text-sm flex items-center gap-2">
          <i className="fa-solid fa-user-plus" /> Invitar profesor
        </button>
      </div>

      {/* Profesores activos */}
      {profesores.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-white mb-3">Profesores activos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profesores.map(p => (
              <div key={p.id} className="df-card p-4 group hover:border-df-violet/40 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar nombre={p.display_name ?? 'P'} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{p.display_name ?? 'Sin nombre'}</p>
                    <p className="text-xs text-df-muted">
                      Desde {new Date(p.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="df-badge-int text-xs">Instructor</span>
                  <button onClick={() => desactivarProfesor(p.id)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 transition-all">
                    <i className="fa-solid fa-user-slash mr-1" /> Desactivar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {profesores.length === 0 && invitaciones.length === 0 && (
        <EmptyState
          icon="fa-solid fa-users"
          title="Sin profesores aún"
          desc="Invita al primer profesor para que pueda acceder a la plataforma"
        />
      )}

      {/* Invitaciones pendientes */}
      {invitaciones.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-white mb-3">Invitaciones</h2>
          <div className="space-y-2">
            {invitaciones.map(inv => (
              <div key={inv.id} className="df-surface p-4 rounded-xl flex items-center gap-4 group">
                {/* Avatar inicial */}
                <div className="w-10 h-10 rounded-full bg-df-purple/20 border border-df-purple/30 flex items-center justify-center flex-shrink-0 font-bold text-df-violet text-sm">
                  {inv.nombre.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{inv.nombre}</p>
                  <p className="text-xs text-df-muted">{inv.email}</p>
                </div>

                {/* Estado */}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  inv.usado
                    ? 'bg-green-900/50 text-green-400'
                    : 'bg-amber-900/50 text-amber-400'
                }`}>
                  {inv.usado ? '✓ Registrado' : 'Pendiente'}
                </span>

                {/* Acciones */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!inv.usado && (
                    <button onClick={() => copiarLink(inv.token, inv.id)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                        copiado === inv.id
                          ? 'bg-green-900/30 text-green-400'
                          : 'df-surface text-df-muted hover:text-white hover:border-df-violet/40'
                      }`}>
                      <i className={`fa-solid ${copiado === inv.id ? 'fa-check' : 'fa-copy'} text-xs`} />
                      {copiado === inv.id ? '¡Copiado!' : 'Copiar link'}
                    </button>
                  )}
                  <button onClick={() => eliminarInvitacion(inv.id)}
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg text-red-400 hover:bg-red-900/20 flex items-center justify-center transition-all">
                    <i className="fa-solid fa-trash text-xs" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal invitar */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setError(null) }} title="Invitar profesor">
        <form onSubmit={crearInvitacion} className="space-y-4">
          <p className="text-xs text-df-muted">
            Se generará un link único de registro. Compártelo con el profesor para que cree su cuenta.
          </p>
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
              Nombre del profesor *
            </label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Laura Martínez" className="df-input" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
              Correo electrónico *
            </label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="laura@correo.com" className="df-input" required />
          </div>
          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation" /> {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { setModalOpen(false); setError(null) }}
              className="df-btn-outline border border-df-border px-5 py-2.5 text-sm rounded-xl flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="df-btn px-5 py-2.5 text-sm flex-1 flex items-center justify-center gap-2">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><i className="fa-solid fa-paper-plane" /> Generar invitación</>
              }
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}