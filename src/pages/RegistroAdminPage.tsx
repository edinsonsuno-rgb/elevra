import { useEffect, useState, FormEvent } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface InvitacionValidada {
  id:     string
  nombre: string
  email:  string
  usado:  boolean
}

export default function RegistroAdminPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token')

  const [step,   setStep]   = useState<'validando' | 'formulario' | 'error' | 'listo'>('validando')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [invitacion, setInvitacion] = useState<InvitacionValidada | null>(null)
  const [form, setForm] = useState({ password: '', confirmar: '', showPass: false })

  useEffect(() => { validarToken() }, [token])

  async function validarToken() {
    if (!token) { setStep('error'); return }
    const { data, error } = await supabase
      .rpc('validar_invitacion_admin', { p_token: token })
      .maybeSingle() as { data: InvitacionValidada | null; error: any }

    if (error || !data) { setStep('error'); return }
    if (data.usado) { setStep('error'); return }

    setInvitacion(data)
    setStep('formulario')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!invitacion) return
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (form.password !== form.confirmar) { setError('Las contraseñas no coinciden'); return }

    setSaving(true); setError(null)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invitacion.email,
      password: form.password,
      options: { data: { full_name: invitacion.nombre } },
    })

    if (authError) { setError(authError.message); setSaving(false); return }
    if (!authData.user) { setError('Error al crear usuario'); setSaving(false); return }

    const { error: completarError } = await supabase.rpc('completar_registro_admin', {
      p_invitacion_id: invitacion.id,
      p_user_id: authData.user.id,
    })

    if (completarError) { setError(completarError.message); setSaving(false); return }

    setStep('listo')
    setSaving(false)
  }

  if (step === 'validando') {
    return <div className="min-h-screen flex items-center justify-center bg-df-bg">
      <div className="w-8 h-8 border-2 border-df-purple/30 border-t-df-purple rounded-full animate-spin" />
    </div>
  }

  if (step === 'error') {
    return <div className="min-h-screen flex items-center justify-center bg-df-bg p-4">
      <div className="df-card p-6 max-w-sm w-full text-center space-y-3">
        <i className="fa-solid fa-circle-exclamation text-3xl text-red-400" />
        <p className="text-white font-semibold">Enlace inválido o ya usado</p>
        <p className="text-df-muted text-sm">Pide al administrador principal que te genere una nueva invitación.</p>
        <Link to="/login" className="df-btn inline-block px-4 py-2 text-sm mt-2">Ir al login</Link>
      </div>
    </div>
  }

  if (step === 'listo') {
    return <div className="min-h-screen flex items-center justify-center bg-df-bg p-4">
      <div className="df-card p-6 max-w-sm w-full text-center space-y-3">
        <i className="fa-solid fa-circle-check text-3xl text-green-400" />
        <p className="text-white font-semibold">Cuenta creada</p>
        <p className="text-df-muted text-sm">Ya puedes iniciar sesión con tu correo y contraseña.</p>
        <Link to="/login" className="df-btn inline-block px-4 py-2 text-sm mt-2">Ir al login</Link>
      </div>
    </div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-df-bg p-4">
      <form onSubmit={handleSubmit} className="df-card p-6 max-w-sm w-full space-y-4">
        <div>
          <h1 className="text-lg font-black text-white">Crear cuenta de administrador</h1>
          <p className="text-df-muted text-sm mt-1">
            Invitado como <span className="text-df-violet font-semibold">{invitacion?.email}</span>
          </p>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div>
          <label className="text-xs text-df-muted">Contraseña</label>
          <div className="relative mt-1">
            <input
              type={form.showPass ? 'text' : 'password'}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-df-surface border border-df-border rounded-lg px-3 py-2 text-sm text-white pr-9" />
            <button type="button" onClick={() => setForm(f => ({ ...f, showPass: !f.showPass }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-df-muted text-xs">
              <i className={`fa-solid ${form.showPass ? 'fa-eye-slash' : 'fa-eye'}`} />
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-df-muted">Confirmar contraseña</label>
          <input
            type={form.showPass ? 'text' : 'password'}
            value={form.confirmar}
            onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
            className="w-full bg-df-surface border border-df-border rounded-lg px-3 py-2 text-sm text-white mt-1" />
        </div>

        <button type="submit" disabled={saving} className="w-full df-btn py-2.5 text-sm">
          {saving ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  )
}