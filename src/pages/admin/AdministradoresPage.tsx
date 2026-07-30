import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Avatar, Spinner, Modal } from '@/components/ui/index'

interface AdminItem {
  user_id:      string
  nombre:       string | null
  email:        string
  es_principal: boolean
  created_at:   string
}

export default function AdministradoresPage() {
  const [admins,  setAdmins]  = useState<AdminItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [linkGenerado, setLinkGenerado] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '' })
  const [quitando, setQuitando] = useState<string | null>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.rpc('admin_listar_admins')
    setAdmins(data ?? [])
    setLoading(false)
  }

  async function invitar(e: FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.email.trim()) { setError('Completa nombre y correo'); return }
    setSaving(true); setError(null)

    const { data: token, error: err } = await supabase.rpc('admin_crear_invitacion_admin', {
      p_nombre: form.nombre.trim(),
      p_email:  form.email.trim(),
    })

    if (err || !token) {
      setError(err?.message ?? 'Error al crear la invitación')
      setSaving(false)
      return
    }

    setLinkGenerado(`https://elevra.lat/registro-admin?token=${token}`)
    setSaving(false)
  }

  async function copiarLink() {
    if (!linkGenerado) return
    await navigator.clipboard.writeText(linkGenerado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function cerrarModal() {
    setModalOpen(false)
    setForm({ nombre: '', email: '' })
    setLinkGenerado(null)
    setError(null)
  }

  async function quitarAdmin(userId: string) {
    if (!confirm('¿Quitar los permisos de administrador a esta persona?')) return
    setQuitando(userId)
    const { error: err } = await supabase.rpc('admin_quitar_admin', { p_user_id: userId })
    if (err) {
      alert(err.message)
    } else {
      setAdmins(prev => prev.filter(a => a.user_id !== userId))
    }
    setQuitando(null)
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Administradores</h1>
          <p className="text-df-muted text-sm mt-1">Personas con acceso total a la plataforma</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="df-btn px-4 py-2.5 text-sm flex items-center gap-2">
          <i className="fa-solid fa-user-plus" /> Invitar admin
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {admins.map(a => (
          <div key={a.user_id} className="df-card p-4 flex items-center gap-3">
            <Avatar nombre={a.nombre ?? a.email} foto_url={null} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {a.nombre ?? 'Sin nombre'}
                {a.es_principal && (
                  <span className="ml-2 text-[10px] font-bold bg-df-purple/20 text-df-violet px-2 py-0.5 rounded-full align-middle">
                    Principal
                  </span>
                )}
              </p>
              <p className="text-df-muted text-xs truncate">{a.email}</p>
            </div>
            {!a.es_principal && (
              <button onClick={() => quitarAdmin(a.user_id)} disabled={quitando === a.user_id}
                className="w-8 h-8 flex items-center justify-center text-df-muted hover:text-red-400 transition-all">
                {quitando === a.user_id
                  ? <div className="w-4 h-4 border-2 border-df-muted/30 border-t-df-muted rounded-full animate-spin" />
                  : <i className="fa-solid fa-user-minus text-sm" />
                }
              </button>
            )}
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={cerrarModal} title="Invitar nuevo administrador">
        {linkGenerado ? (
          <div className="space-y-4">
            <p className="text-sm text-df-muted">
              Comparte este enlace con la persona para que complete su registro. Es de un solo uso.
            </p>
            <div className="df-surface p-3 rounded-lg flex items-center gap-2">
              <p className="text-xs text-white truncate flex-1">{linkGenerado}</p>
              <button onClick={copiarLink} className="df-btn px-3 py-1.5 text-xs flex-shrink-0">
                {copiado ? <i className="fa-solid fa-check" /> : <i className="fa-solid fa-copy" />}
              </button>
            </div>
            <button onClick={cerrarModal} className="w-full df-btn py-2.5 text-sm">Listo</button>
          </div>
        ) : (
          <form onSubmit={invitar} className="space-y-4">
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div>
              <label className="text-xs text-df-muted">Nombre</label>
              <input type="text" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                className="w-full bg-df-card border border-df-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-df-muted">Correo</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-df-card border border-df-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
            </div>
            <button type="submit" disabled={saving} className="w-full df-btn py-2.5 text-sm">
              {saving ? 'Generando...' : 'Generar enlace de invitación'}
            </button>
          </form>
        )}
      </Modal>
    </div>
  )
}