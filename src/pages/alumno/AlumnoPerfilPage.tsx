import { useState, FormEvent, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui/index'

export default function PerfilPage() {
  const { user, displayName, updateDisplayName } = useAuth()
  const [nombre,    setNombre]    = useState(displayName ?? '')
  const [whatsapp,  setWhatsapp]  = useState('')
  const [saving,    setSaving]    = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [passForm,  setPassForm]  = useState({ actual: '', nueva: '', confirmar: '', show: false })
  const [passErr,   setPassErr]   = useState<string | null>(null)
  const [passSaved, setPassSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('display_name, whatsapp').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setNombre(data.display_name ?? '')
          setWhatsapp(data.whatsapp ?? '')
        }
        setLoading(false)
      })
  }, [user])

  async function handlePerfil(e: FormEvent) {
    e.preventDefault()
    setSaving(true); setSuccess(false)
    await updateDisplayName(nombre)
    await supabase.from('profiles').upsert({ id: user?.id, whatsapp: whatsapp || null })
    setSaving(false); setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault()
    setPassErr(null); setPassSaved(false)
    if (!passForm.actual) { setPassErr('Ingresa tu contraseña actual'); return }
    if (passForm.nueva.length < 6) { setPassErr('Mínimo 6 caracteres'); return }
    if (passForm.nueva !== passForm.confirmar) { setPassErr('Las contraseñas no coinciden'); return }

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: user!.email!, password: passForm.actual,
    })
    if (authErr) { setPassErr('La contraseña actual no es correcta'); return }

    const { error } = await supabase.auth.updateUser({ password: passForm.nueva })
    if (error) { setPassErr(error.message); return }
    setPassForm({ actual: '', nueva: '', confirmar: '', show: false })
    setPassSaved(true)
    setTimeout(() => setPassSaved(false), 3000)
  }

  if (loading || !user) return <Spinner />

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

        <form onSubmit={handlePerfil} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
              Nombre visible
            </label>
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre" className="df-input" />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
              WhatsApp
            </label>
            <div className="relative">
              <i className="fa-brands fa-whatsapp absolute left-4 top-1/2 -translate-y-1/2 text-green-400 text-sm" />
              <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                placeholder="573001234567 (sin + ni espacios)"
                className="df-input pl-10" />
            </div>
            <p className="text-[10px] text-df-muted mt-1">
              <i className="fa-solid fa-circle-info mr-1 text-df-violet" />
              Tus alumnos podrán contactarte directamente por WhatsApp
            </p>
          </div>

          {success && (
            <p className="text-xs text-green-400 flex items-center gap-1.5">
              <i className="fa-solid fa-check" /> Perfil actualizado
            </p>
          )}
          <button type="submit" disabled={saving}
            className="df-btn px-5 py-2.5 text-sm flex items-center gap-2">
            {saving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><i className="fa-solid fa-floppy-disk" /> Guardar</>
            }
          </button>
        </form>
      </div>

      {/* Cambiar contraseña */}
      <div className="df-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">Cambiar contraseña</h2>
        <form onSubmit={handlePassword} className="space-y-3">
          <div className="relative">
            <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm" />
            <input type={passForm.show ? 'text' : 'password'} value={passForm.actual}
              onChange={e => setPassForm(f => ({ ...f, actual: e.target.value }))}
              placeholder="Contraseña actual" className="df-input !pl-10 pr-12" />
          </div>
          <div className="relative">
            <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm" />
            <input type={passForm.show ? 'text' : 'password'} value={passForm.nueva}
              onChange={e => setPassForm(f => ({ ...f, nueva: e.target.value }))}
              placeholder="Nueva contraseña" className="df-input !pl-10 pr-12" />
            <button type="button" onClick={() => setPassForm(f => ({ ...f, show: !f.show }))}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-df-muted hover:text-white transition-colors">
              <i className={`fa-solid ${passForm.show ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
            </button>
          </div>
          <div className="relative">
            <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm" />
            <input type={passForm.show ? 'text' : 'password'} value={passForm.confirmar}
              onChange={e => setPassForm(f => ({ ...f, confirmar: e.target.value }))}
              placeholder="Confirmar contraseña" className="df-input !pl-10" />
          </div>
          {passErr  && <p className="text-xs text-red-400 flex items-center gap-1"><i className="fa-solid fa-triangle-exclamation" />{passErr}</p>}
          {passSaved && <p className="text-xs text-green-400 flex items-center gap-1"><i className="fa-solid fa-check" />Contraseña actualizada</p>}
          <button type="submit"
            className="df-btn px-5 py-2.5 text-sm flex items-center gap-2">
            <i className="fa-solid fa-lock" /> Actualizar contraseña
          </button>
        </form>
      </div>

      {/* Zona peligro */}
      <div className="df-card p-5 border-red-900/40 space-y-3">
        <h2 className="text-sm font-bold text-red-400">Zona de peligro</h2>
        <button
          onClick={async () => { if (confirm('¿Cerrar sesión?')) await supabase.auth.signOut() }}
          className="df-surface border border-red-900/40 hover:border-red-500/40 text-red-400 hover:bg-red-900/10 px-4 py-2.5 text-sm rounded-xl transition-all flex items-center gap-2">
          <i className="fa-solid fa-arrow-right-from-bracket" /> Cerrar sesión
        </button>
      </div>
    </div>
  )
}