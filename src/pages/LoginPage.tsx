import { useState, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [pass, setPass]         = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [showPass, setShowPass] = useState(false)
  const location = useLocation()
  const [started, setStarted]   = useState(() => new URLSearchParams(location.search).get('start') === '1')
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const { tenant } = useTenant()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, pass)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-df-bg circuit-bg flex items-center justify-center p-4">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top, ${tenant.color_primario}33, transparent 55%),
                       radial-gradient(circle at bottom, ${tenant.color_secundario}22, transparent 60%)`,
        }}
      />
      <div className="relative w-full max-w-sm mx-auto">
        <div
          className="overflow-hidden rounded-[40px]"
          style={{
            background: `${tenant.color_primario}33`,
            border: `1px solid ${tenant.color_primario}4D`,
            boxShadow: `0 30px 90px ${tenant.color_primario}26`,
          }}
        >
          <div className="px-8 py-10 text-center">
            <div className="w-40 mx-auto mb-6">
              <img
                src={tenant.logo_url ?? '/logo.png'}
                alt={tenant.nombre}
                className="mx-auto h-12 w-full object-contain"
                style={{ filter: tenant.usar_marca_elevra ? `drop-shadow(0 0 18px ${tenant.color_primario}80)` : 'none' }}
              />
            </div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-df-muted mb-3">
              tu mejor versión
            </p>
            <h1 className="font-display text-3xl text-white font-black mb-4">
              empieza hoy
            </h1>
            <p className="mx-auto max-w-[300px] text-sm text-df-muted leading-6">
              Entrenamientos personalizados, seguimiento de progreso y motivación para lograr tus objetivos.
            </p>
          </div>

          <div className="px-8 py-8">
            {!started ? (
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-2">
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      height: 6, borderRadius: 3,
                      width: i === 0 ? 48 : 8,
                      background: i === 0 ? 'var(--brand-primary)' : 'color-mix(in srgb, var(--brand-primary) 30%, transparent)',
                    }} />
                  ))}
                </div>
                <button
                  onClick={() => setStarted(true)}
                  className="w-3/4 py-3 rounded-2xl text-white font-bold text-lg"
                  style={{
                    background: 'linear-gradient(160deg, color-mix(in srgb, var(--brand-primary) 100%, white 30%) 0%, var(--brand-primary) 45%, color-mix(in srgb, var(--brand-primary) 100%, black 25%) 100%)',
                    border: '1px solid color-mix(in srgb, var(--brand-primary) 100%, white 40%)',
                    boxShadow: `0 8px 32px ${tenant.color_primario}70, 0 2px 8px ${tenant.color_primario}50, inset 0 1px 0 rgba(255,255,255,0.35)`,
                  }}
                >
                  COMENZAR
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-df-muted uppercase tracking-[0.3em] mb-2 block">
                    correo electrónico
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="df-input !pl-8 pr-16"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-df-muted uppercase tracking-[0.3em] mb-2 block">
                    contraseña
                  </label>
                  <div className="relative">
                    <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 z-20 text-df-muted text-sm" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={pass}
                      onChange={e => setPass(e.target.value)}
                      placeholder="••••••••"
                      className="df-input !pl-8 pr-16"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-30 text-df-muted hover:text-white transition-colors"
                    >
                      <i className={`fa-solid ${showPass ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-500/30 rounded-3xl p-3 text-xs text-red-400 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="df-btn w-full py-4 text-sm font-semibold rounded-3xl flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ingresando...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-arrow-right-to-bracket" />
                      ingresar
                    </>
                  )}
                </button>

                <div className="mt-6 text-center text-xs text-df-muted">
                  <a href="/reset-password" className="underline underline-offset-2 decoration-df-purple/30 hover:text-white">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}