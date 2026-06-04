import { useEffect, useState, FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const TIPO_DOCUMENTO = ['CC', 'CE', 'PA'] as const

export default function RegistroProfesorPage() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const token      = params.get('token')

  const [step,     setStep]     = useState<'validando' | 'formulario' | 'error' | 'listo'>('validando')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [invitacion, setInvitacion] = useState<{ id: string; nombre: string; email: string; tenant_id: string } | null>(null)

  const [form, setForm] = useState({
    nombre:         '',
    tipo_documento: 'CC' as typeof TIPO_DOCUMENTO[number],
    documento:      '',
    password:       '',
    confirmar:      '',
    showPass:       false,
  })

  useEffect(() => { validarToken() }, [token])

  async function validarToken() {
    if (!token) { setStep('error'); return }

    const { data, error } = await supabase
      .from('invitaciones')
      .select('id, nombre, email, tenant_id, usado')
      .eq('token', token)
      .single()

    if (error || !data) { setStep('error'); return }
    if (data.usado) { setStep('error'); return }

    setInvitacion(data)
    setForm(f => ({ ...f, nombre: data.nombre }))
    setStep('formulario')
  }

  function set(key: string, val: any) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!invitacion) return
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (form.password !== form.confirmar) { setError('Las contraseñas no coinciden'); return }
    if (!form.documento.trim()) { setError('El documento es obligatorio'); return }

    setSaving(true); setError(null)

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email:    invitacion.email,
      password: form.password,
      options: {
        data: { full_name: form.nombre }
      }
    })

    if (authError) { setError(authError.message); setSaving(false); return }
    if (!authData.user) { setError('Error al crear usuario'); setSaving(false); return }

    // 2. Actualizar perfil con datos del instructor
    const { error: profileError } = await supabase.from('profiles').upsert({
      id:           authData.user.id,
      display_name: form.nombre,
      role:         'instructor',
      tenant_id:    invitacion.tenant_id,
    })

    if (profileError) { setError(profileError.message); setSaving(false); return }

    // 3. Marcar invitación como usada
    await supabase.from('invitaciones').update({ usado: true }).eq('id', invitacion.id)

    setStep('listo')
    setSaving(false)
  }

  // ── Pantalla validando ──
  if (step === 'validando') return (
    <div className="min-h-screen bg-df-bg circuit-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-df-border border-t-df-violet rounded-full animate-spin" />
        <p className="text-df-muted text-sm">Validando invitación...</p>
      </div>
    </div>
  )

  // ── Pantalla error ──
  if (step === 'error') return (
    <div className="min-h-screen bg-df-bg circuit-bg flex items-center justify-center p-4">
      <div className="df-card p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
          <i className="fa-solid fa-link-slash text-2xl text-red-400" />
        </div>
        <h1 className="text-lg font-black text-white">Link inválido</h1>
        <p className="text-xs text-df-muted">
          Este link de invitación no existe, ya fue usado o ha expirado.
          Contacta al administrador para obtener uno nuevo.
        </p>
      </div>
    </div>
  )

  // ── Pantalla listo ──
  if (step === 'listo') return (
    <div className="min-h-screen bg-df-bg circuit-bg flex items-center justify-center p-4">
      <div className="df-card p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <i className="fa-solid fa-circle-check text-2xl text-green-400" />
        </div>
        <h1 className="text-lg font-black text-white">¡Cuenta creada!</h1>
        <p className="text-xs text-df-muted">
          Tu cuenta fue creada exitosamente. Ya puedes iniciar sesión con tu correo y contraseña.
        </p>
        <button onClick={() => navigate('/login')}
          className="df-btn w-full py-3 text-sm flex items-center justify-center gap-2">
          <i className="fa-solid fa-arrow-right-to-bracket" /> Ir al login
        </button>
      </div>
    </div>
  )

  // ── Formulario ──
  return (
    <div className="min-h-screen bg-df-bg circuit-bg flex items-center justify-center p-4">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-df-purple/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="Logo"
            className="h-12 w-auto max-w-[160px] object-contain drop-shadow-[0_0_18px_rgba(139,92,246,0.6)]" />
          <div className="text-center">
            <h1 className="font-display text-2xl text-white tracking-widest">CREAR CUENTA</h1>
            <p className="text-xs text-df-muted mt-1">
              Invitado como <span className="text-df-violet font-semibold">{invitacion?.email}</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Info personal */}
          <div className="df-card p-5 space-y-4 glow-purple">
            <h2 className="text-sm font-bold text-white">Información personal</h2>

            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                Nombre completo *
              </label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                placeholder="Tu nombre completo" className="df-input" required />
            </div>

            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                Documento de identidad *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select value={form.tipo_documento} onChange={e => set('tipo_documento', e.target.value)}
                  className="df-input col-span-1">
                  {TIPO_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={form.documento} onChange={e => set('documento', e.target.value)}
                  placeholder="Número de documento" className="df-input col-span-2" required />
              </div>
            </div>
          </div>

          {/* Contraseña */}
          <div className="df-card p-6 space-y-4">
            <h2 className="text-sm font-bold text-white">Crear contraseña</h2>

            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                Contraseña *
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm" />
                <input
                  type={form.showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="df-input !p-8 pr-16" required
                />
                <button type="button" onClick={() => set('showPass', !form.showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-df-muted hover:text-white transition-colors">
                  <i className={`fa-solid ${form.showPass ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                Confirmar contraseña *
              </label>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm" />
                <input
                  type={form.showPass ? 'text' : 'password'}
                  value={form.confirmar}
                  onChange={e => set('confirmar', e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="df-input !p-8 pr-16" required
                />
              </div>
              {form.confirmar && form.password !== form.confirmar && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-triangle-exclamation" /> Las contraseñas no coinciden
                </p>
              )}
              {form.confirmar && form.password === form.confirmar && (
                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-check" /> Las contraseñas coinciden
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation" /> {error}
            </div>
          )}

          <button type="submit" disabled={saving || form.password !== form.confirmar}
            className="df-btn w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando cuenta...</>
              : <><i className="fa-solid fa-user-check" /> Crear mi cuenta</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}