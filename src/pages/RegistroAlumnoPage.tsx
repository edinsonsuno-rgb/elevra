import { useEffect, useState, FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { invalidateCache } from '@/lib/queryCache'
import { useTenant } from '@/contexts/TenantContext'
import Turnstile from '@/components/ui/Turnstile'

const TIPO_DOCUMENTO = ['CC', 'CE', 'TI', 'PA'] as const

interface AlumnoInvitado {
  id:               string
  nombre:           string
  email:            string | null
  documento:        string | null
  tipo_documento:   string | null
  invitacion_usada: boolean
  tenant_id:        string
}

export default function RegistroAlumnoPage() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const token     = params.get('token')

  const [step,      setStep]      = useState<'validando'|'formulario'|'error'|'listo'>('validando')
  const [alumno,    setAlumno]    = useState<AlumnoInvitado | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)

  const [form, setForm] = useState({
    password:   '',
    confirmar:  '',
    showPass:   false,
  })
  const { tenant } = useTenant()

  useEffect(() => { validarToken() }, [token])

  async function validarToken() {
    if (!token) { setStep('error'); return }

    const { data, error } = await supabase
      .rpc('validar_alumno_invitacion', { p_token: token })
      .maybeSingle() as { data: AlumnoInvitado | null; error: any }

    if (error || !data)        { setStep('error'); return }
    if (data.invitacion_usada) { setStep('error'); return }

    setAlumno(data)
    setStep('formulario')
  }

  function set(key: string, val: any) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!alumno) return
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (form.password !== form.confirmar) { setError('Las contraseñas no coinciden'); return }

    setSaving(true); setError(null)

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email:    alumno.email ?? `${alumno.documento}@elevra.app`,
      password: form.password,
      options:  { data: { full_name: alumno.nombre }, captchaToken: captchaToken ?? undefined }
    })

    if (authError) {
      setError(authError.message); setSaving(false)
      setCaptchaResetKey(k => k + 1)
      return
    }
    if (!authData.user) { setError('Error al crear cuenta'); setSaving(false); return }

    // Vincula perfil (tenant_id + rol) y el registro de alumno (user_id + invitación usada)
    // en una sola operación confiable del lado del servidor.
    const { error: linkError } = await supabase.rpc('completar_registro_alumno', {
      p_alumno_id: alumno.id,
      p_user_id:   authData.user.id,
      p_tenant_id: alumno.tenant_id,
      p_nombre:    alumno.nombre,
    })

    if (linkError) {
      console.error('[registro-alumno] completar_registro_alumno falló:', linkError.message)
      setError('Tu cuenta fue creada, pero hubo un problema al vincularla. Contacta a tu instructor.')
      setSaving(false)
      return
    }

    setStep('listo')
    setSaving(false)
    // Invalidate cache and notify other tabs so instructors list updates
    invalidateCache('admin:instructores')
    try {
      const bc = new BroadcastChannel('elevra-invitaciones')
      bc.postMessage({ type: 'invitacion_usada', tenantId: alumno.tenant_id })
      bc.close()
    } catch (err) {
      console.warn('BroadcastChannel no disponible', err)
    }
  }

  // ── Validando ──
  if (step === 'validando') return (
    <div className="min-h-screen bg-df-bg circuit-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-df-border border-t-df-violet rounded-full animate-spin" />
        <p className="text-df-muted text-sm">Validando invitación...</p>
      </div>
    </div>
  )

  // ── Error ──
  if (step === 'error') return (
    <div className="min-h-screen bg-df-bg circuit-bg flex items-center justify-center p-4">
      <div className="df-card p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
          <i className="fa-solid fa-link-slash text-2xl text-red-400" />
        </div>
        <h1 className="text-lg font-black text-white">Link inválido</h1>
        <p className="text-xs text-df-muted">
          Este link de invitación no existe, ya fue usado o ha expirado.
          Contacta a tu instructor para obtener uno nuevo.
        </p>
      </div>
    </div>
  )

  // ── Listo ──
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
          <img src={tenant.logo_url ?? '/logo.png'} alt="Logo"
            className="h-12 w-auto max-w-[160px] object-contain drop-shadow-[0_0_18px_rgba(139,92,246,0.6)]" />
          <div className="text-center">
            <h1 className="font-display text-2xl text-white tracking-widest">CREAR CUENTA</h1>
            <p className="text-xs text-df-muted mt-1">
              Bienvenido, <span className="text-df-violet font-semibold">{alumno?.nombre}</span>
            </p>
          </div>
        </div>

        {/* Info alumno */}
        <div className="df-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-df-purple/20 border border-df-purple/30 flex items-center justify-center font-bold text-df-violet flex-shrink-0">
            {alumno?.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{alumno?.nombre}</p>
            <p className="text-xs text-df-muted">
              {alumno?.tipo_documento} {alumno?.documento}
              {alumno?.email && <span className="ml-2">· {alumno.email}</span>}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="df-card p-5 space-y-4 glow-purple">
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
                  className="df-input !pl-10 pr-12" required
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
                  className="df-input !pl-10" required
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

          <Turnstile onVerify={setCaptchaToken} resetKey={captchaResetKey} />

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