import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/contexts/TenantContext'
import Turnstile from '@/components/ui/Turnstile'

export default function ResetPasswordPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const { tenant } = useTenant()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
      captchaToken: captchaToken ?? undefined,
    })
    if (error) {
      setError(error.message); setLoading(false)
      setCaptchaResetKey(k => k + 1)
      return
    }
    setSent(true); setLoading(false)
  }

  return (
    <div className="min-h-screen bg-df-bg circuit-bg flex items-center justify-center p-4">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-df-purple/10 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8 gap-3">
          <img src={tenant.logo_url ?? '/logo.png'} alt="Logo" className="h-14 w-auto drop-shadow-[0_0_18px_rgba(139,92,246,0.6)]" />
          <h1 className="font-display text-3xl text-white tracking-widest">RECUPERAR</h1>
        </div>

        <div className="df-card p-6 glow-purple">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <i className="fa-solid fa-envelope-circle-check text-2xl text-green-400" />
              </div>
              <p className="text-sm text-white font-bold">¡Correo enviado!</p>
              <p className="text-xs text-df-muted">Revisa tu bandeja y sigue el enlace para restablecer tu contraseña.</p>
              <Link to="/login" className="df-btn px-6 py-2 text-sm inline-block mt-2">Volver al login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-df-muted">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
              <div className="relative">
                <i className="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-white/65 text-sm" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@correo.com" className="df-input !pl-10" />
              </div>
              {error && <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>}
              <Turnstile onVerify={setCaptchaToken} resetKey={captchaResetKey} />
              <button type="submit" disabled={loading} className="df-btn w-full py-3 text-sm flex items-center justify-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <i className="fa-solid fa-paper-plane" />}
                Enviar enlace
              </button>
              <Link to="/login" className="block text-center text-xs text-df-muted hover:text-df-violet transition-colors mt-2">
                ← Volver al login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}