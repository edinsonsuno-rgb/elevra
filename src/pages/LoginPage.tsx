import { useState, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.16),_transparent_45%)] pointer-events-none" />
      <div className="relative w-full max-w-sm mx-auto">
        <div className="overflow-hidden rounded-[40px] border border-white/10 bg-[#0b081a]/95 shadow-[0_30px_90px_rgba(124,58,237,0.25)]">
          <div className="px-8 py-10 text-center">
            <div className="w-40 mx-auto mb-6">
              <img
                src="/logo.png"
                alt="Logo"
                className="mx-auto h-12 w-full object-contain drop-shadow-[0_0_18px_rgba(139,92,246,0.6)]"
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
                    <div key={i} className={`h-1.5 rounded ${i===0? 'w-12 bg-[#9b30ff]': 'w-2 bg-[#9b30ff]/30'}`} />
                  ))}
                </div>
                <button
                  onClick={() => setStarted(true)}
                  className="w-3/4 py-3 rounded-2xl text-white font-bold text-lg"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #9b30ff 50%, #a855f7 100%)',
                    boxShadow: '0 6px 32px rgba(124,58,237,0.55)'
                  }}
                >
                  COMENZAR
                </button>
                <p className="text-xs text-df-muted mt-3">¿Ya tienes cuenta? <span onClick={() => navigate('/login')} className="text-df-violet cursor-pointer">Inicia sesión</span></p>
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
