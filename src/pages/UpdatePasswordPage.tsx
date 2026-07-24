import { useEffect, useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useTenant } from '@/contexts/TenantContext'

export default function UpdatePasswordPage() {
  const [password, setPassword]   = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [done, setDone]           = useState(false)
  const [listo, setListo]         = useState(false) // true cuando ya se validó la sesión de recuperación
  const { tenant } = useTenant()
  const navigate = useNavigate()

  useEffect(() => {
    // El link del correo hace que supabase-js cree una sesión temporal de
    // recuperación al cargar esta página (lee el token del hash de la URL).
    // Esperamos a que esté lista antes de mostrar el formulario.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setListo(true)
      else setError('El enlace no es válido o ya expiró. Solicita uno nuevo.')
    })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return }
    if (password !== password2) { setError('Las contraseñas no coinciden.'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => navigate('/login'), 2500)
  }

  return (
    <div className="min-h-screen bg-df-bg circuit-bg flex items-center justify-center p-4">
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-df-purple/10 rounded-full blur-3xl pointer-events-none" />
      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8 gap-3">
          <img src={tenant.logo_url ?? '/logo.png'} alt="Logo" className="h-14 w-auto drop-shadow-[0_0_18px_rgba(139,92,246,0.6)]" />
          <h1 className="font-display text-3xl text-white tracking-widest">NUEVA CONTRASEÑA</h1>
        </div>

        <div className="df-card p-6 glow-purple">
          {done ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <i className="fa-solid fa-circle-check text-2xl text-green-400" />
              </div>
              <p className="text-sm text-white font-bold">¡Contraseña actualizada!</p>
              <p className="text-xs text-white/65">Ya puedes iniciar sesión con tu nueva contraseña. Te llevamos al login...</p>
            </div>
          ) : !listo ? (
            error ? (
              <div className="text-center space-y-3 py-4">
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>
              </div>
            ) : (
              <div className="flex justify-center py-6">
                <div className="w-8 h-8 border-4 border-df-border border-t-df-violet rounded-full animate-spin" />
              </div>
            )
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-white/65">Ingresa tu nueva contraseña.</p>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-white/65 text-sm" />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Nueva contraseña" className="df-input pl-10" />
              </div>
              <div className="relative">
                <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-white/65 text-sm" />
                <input type="password" required value={password2} onChange={e => setPassword2(e.target.value)}
                  placeholder="Confirmar contraseña" className="df-input pl-10" />
              </div>
              {error && <p className="text-xs text-red-400 bg-red-900/20 border border-red-500/30 rounded-xl px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="df-btn w-full py-3 text-sm flex items-center justify-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <i className="fa-solid fa-check" />}
                Guardar contraseña
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}