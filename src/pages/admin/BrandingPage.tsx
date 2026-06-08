import { useState, useEffect, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useTenant } from '@/contexts/TenantContext'

export default function BrandingPage() {
  const { tenantId } = useAuth() as any
  const { refetch }  = useTenant()

  const [form, setForm] = useState({
    nombre:           '',
    logo_url:         '',
    color_primario:   '#9b30ff',
    color_secundario: '#7c3aed',
  })
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [hasTenant, setHasTenant] = useState<boolean | null>(null)

  useEffect(() => {
    if (!tenantId) return
    supabase.from('tenants').select('*').eq('id', tenantId).maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHasTenant(true)
          setForm({
            nombre:           data.nombre           ?? '',
            logo_url:         data.logo_url         ?? '',
            color_primario:   data.color_primario   ?? '#9b30ff',
            color_secundario: data.color_secundario ?? '#7c3aed',
          })
        } else {
          setHasTenant(false)
        }
      })
  }, [tenantId])

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tenantId) return
    setSaving(true); setError(null)

    const { error: err } = await supabase.from('tenants').update({
      nombre:           form.nombre.trim(),
      logo_url:         form.logo_url.trim() || null,
      color_primario:   form.color_primario,
      color_secundario: form.color_secundario,
    }).eq('id', tenantId)

    if (err) {
      setError(err.message)
    } else {
      // Aplica colores inmediatamente en esta sesión
      const root = document.documentElement
      root.style.setProperty('--brand-primary',    form.color_primario)
      root.style.setProperty('--brand-secondary',  form.color_secundario)
      root.style.setProperty('--color-primario',   form.color_primario)
      root.style.setProperty('--color-secundario', form.color_secundario)
      refetch()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  if (hasTenant === null) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-df-purple/30 border-t-df-purple rounded-full animate-spin" />
    </div>
  )

  if (hasTenant === false) return (
    <div className="df-card p-8 max-w-md text-center space-y-3">
      <div className="w-12 h-12 bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
        <i className="fa-solid fa-store text-amber-400 text-xl" />
      </div>
      <h2 className="text-white font-black">Subdominio no configurado</h2>
      <p className="text-df-muted text-sm">
        Tu espacio aún no tiene un subdominio en Elevra.<br />
        Contacta con el equipo de Elevra para activarlo.
      </p>
    </div>
  )

  const logoSrc = form.logo_url.trim() || '/logo.png'

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-black text-white">Mi marca</h1>
        <p className="text-df-muted text-sm mt-0.5">Logo, nombre y colores de tu espacio</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Logo */}
        <div>
          <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Logo</label>
          <div className="flex gap-3 items-start">
            <div className="w-16 h-16 bg-df-surface border border-df-border rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                src={logoSrc}
                alt="Logo preview"
                className="w-full h-full object-contain p-1"
                onError={e => { (e.currentTarget as HTMLImageElement).src = '/logo.png' }}
              />
            </div>
            <div className="flex-1">
              <input
                value={form.logo_url}
                onChange={e => set('logo_url', e.target.value)}
                placeholder="https://... URL de tu logo"
                className="df-input"
              />
              <p className="text-[10px] text-df-muted mt-1.5">
                Sube tu logo a <span className="text-df-violet">Imgur</span>, <span className="text-df-violet">Cloudinary</span> o cualquier servicio y pega la URL aquí.
                Si no configuras uno se mostrará el logo de Elevra.
              </p>
            </div>
          </div>
        </div>

        {/* Nombre */}
        <div>
          <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Nombre de tu espacio</label>
          <input
            value={form.nombre}
            onChange={e => set('nombre', e.target.value)}
            placeholder="Ej: Dorita Fit"
            className="df-input"
            required
          />
        </div>

        {/* Colores */}
        <div>
          <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-3 block">Colores</label>
          <div className="grid grid-cols-2 gap-4">
            {([
              { key: 'color_primario',   label: 'Color principal' },
              { key: 'color_secundario', label: 'Color secundario' },
            ] as const).map(({ key, label }) => (
              <div key={key}>
                <label className="text-[11px] text-df-muted mb-2 block">{label}</label>
                <div className="flex items-center gap-2">
                  <label className="relative cursor-pointer">
                    <input
                      type="color"
                      value={form[key]}
                      onChange={e => set(key, e.target.value)}
                      className="sr-only"
                    />
                    <div
                      className="w-10 h-10 rounded-xl border border-df-border"
                      style={{ background: form[key] }}
                    />
                  </label>
                  <input
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    maxLength={7}
                    className="df-input font-mono text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vista previa */}
        <div>
          <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Vista previa</label>
          <div className="df-card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center bg-df-surface flex-shrink-0">
              <img
                src={logoSrc}
                alt="Logo"
                className="w-full h-full object-contain"
                onError={e => { (e.currentTarget as HTMLImageElement).src = '/logo.png' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{form.nombre || 'Tu espacio'}</p>
              <p className="text-[10px] text-df-muted">Vista previa</p>
            </div>
            <div
              className="px-4 py-2 rounded-xl text-white text-xs font-bold flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${form.color_secundario} 0%, ${form.color_primario} 100%)`,
                boxShadow:  `0 4px 16px ${form.color_primario}55`,
              }}
            >
              COMENZAR
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        )}

        <button type="submit" disabled={saving} className="df-btn w-full py-3 text-sm flex items-center justify-center gap-2">
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : saved ? (
            <><i className="fa-solid fa-check" /> ¡Guardado!</>
          ) : (
            <><i className="fa-solid fa-floppy-disk" /> Guardar cambios</>
          )}
        </button>
      </form>
    </div>
  )
}
