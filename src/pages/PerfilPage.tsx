import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/index'

export default function PerfilPage() {
  const { user, displayName, updateDisplayName } = useAuth()
  const [nombre,   setNombre]   = useState(displayName ?? '')
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [passForm, setPassForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [passErr,  setPassErr]  = useState<string | null>(null)
  const [passSaved, setPassSaved] = useState(false)

  async function handleNombre(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setSuccess(false)
    await updateDisplayName(nombre)
    setSaving(false); setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault()
    setPassErr(null); setPassSaved(false)
    if (passForm.nueva.length < 6) { setPassErr('La contraseña debe tener al menos 6 caracteres'); return }
    if (passForm.nueva !== passForm.confirmar) { setPassErr('Las contraseñas no coinciden'); return }
    const { error } = await supabase.auth.updateUser({ password: passForm.nueva })
    if (error) { setPassErr(error.message); return }
    setPassForm({ actual: '', nueva: '', confirmar: '' })
    setPassSaved(true)
    setTimeout(() => setPassSaved(false), 3000)
  }

  if (!user) return <Spinner />

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-black text-white">Mi perfil</h1>

      {/* Info cuenta */}
      <div className="df-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">Información de la cuenta</h2>
        <div className="df-surface p-3 rounded-xl flex items-center gap-3">
          <i className="fa-solid fa-envelope text-df-muted text-sm" />
          <div>
            <p className="text-[10px] text-df-muted uppercase tracking-wider">Correo</p>
            <p className="text-sm text-white">{user.email}</p>
          </div>
        </div>
        <form onSubmit={handleNombre} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Nombre visible</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre" className="df-input" />
          </div>
          {success && (
            <p className="text-xs text-green-400 flex items-center gap-1.5">
              <i className="fa-solid fa-check" /> Nombre actualizado
            </p>
          )}
          <button type="submit" disabled={saving}
            className="df-btn px-5 py-2.5 text-sm flex items-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <i className="fa-solid fa-floppy-disk" />}
            Guardar nombre
          </button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="df-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">Cambiar contraseña</h2>
        <form onSubmit={handlePassword} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Nueva contraseña</label>
            <input type="password" value={passForm.nueva}
              onChange={e => setPassForm(f => ({ ...f, nueva: e.target.value }))}
              placeholder="Mínimo 6 caracteres" className="df-input" />
          </div>
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Confirmar contraseña</label>
            <input type="password" value={passForm.confirmar}
              onChange={e => setPassForm(f => ({ ...f, confirmar: e.target.value }))}
              placeholder="Repite la contraseña" className="df-input" />
          </div>
          {passErr && <p className="text-xs text-red-400 flex items-center gap-1.5"><i className="fa-solid fa-triangle-exclamation" /> {passErr}</p>}
          {passSaved && <p className="text-xs text-green-400 flex items-center gap-1.5"><i className="fa-solid fa-check" /> Contraseña actualizada</p>}
          <button type="submit" className="df-btn px-5 py-2.5 text-sm flex items-center gap-2">
            <i className="fa-solid fa-lock" /> Actualizar contraseña
          </button>
        </form>
      </div>

      {/* Peligro */}
      <div className="df-card p-5 border-red-900/40 space-y-3">
        <h2 className="text-sm font-bold text-red-400">Zona de peligro</h2>
        <p className="text-xs text-df-muted">Estas acciones son irreversibles. Procede con cuidado.</p>
        <button
          onClick={async () => { if (confirm('¿Cerrar sesión?')) await supabase.auth.signOut() }}
          className="df-surface border border-red-900/40 hover:border-red-500/40 text-red-400 hover:bg-red-900/10 px-4 py-2.5 text-sm rounded-xl transition-all flex items-center gap-2">
          <i className="fa-solid fa-arrow-right-from-bracket" /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}
