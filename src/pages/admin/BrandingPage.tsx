import { useState, useEffect, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useTenant, TenantBrand } from '@/contexts/TenantContext'

const FORM_VACIO = {
  nombre:           '',
  subdominio:       '',
  logo_url:         '',
  color_primario:   '#9b30ff',
  color_secundario: '#7c3aed',
}

export default function BrandingPage() {
  const { refetch } = useTenant()

  const [tenants,   setTenants]   = useState<TenantBrand[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editando,  setEditando]  = useState<TenantBrand | null>(null)
  const [form,      setForm]      = useState(FORM_VACIO)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => { cargarTenants() }, [])

  async function cargarTenants() {
    const { data } = await supabase.from('tenants').select('*').order('created_at')
    setTenants((data ?? []) as TenantBrand[])
    setLoading(false)
  }

  function abrirEditar(t: TenantBrand) {
    setEditando(t)
    setForm({
      nombre:           t.nombre,
      subdominio:       t.subdominio,
      logo_url:         t.logo_url ?? '',
      color_primario:   t.color_primario,
      color_secundario: t.color_secundario,
    })
    setError(null)
    setSaved(false)
  }

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editando) return
    setSaving(true); setError(null)

    const { error: err } = await supabase.from('tenants').update({
      nombre:             form.nombre.trim(),
      logo_url:           form.logo_url.trim() || null,
      color_primario:     form.color_primario,
      color_secundario:   form.color_secundario,
      usar_marca_elevra:  false,
    }).eq('id', editando.id)

    if (err) {
      setError(err.message)
    } else {
      // Actualizar lista local
      setTenants(prev => prev.map(t =>
        t.id === editando.id
          ? { ...t, nombre: form.nombre, logo_url: form.logo_url || null,
              color_primario: form.color_primario, color_secundario: form.color_secundario,
              usar_marca_elevra: false }
          : t
      ))
      // Si es el tenant activo del subdominio actual, aplicar colores en vivo
      refetch()
      setSaved(true)
      setTimeout(() => { setSaved(false); setEditando(null) }, 1500)
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-df-purple/30 border-t-df-purple rounded-full animate-spin" />
    </div>
  )

  const logoSrc = (url: string | null) => url || '/logo.png'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">Branding de espacios</h1>
        <p className="text-df-muted text-sm mt-0.5">{tenants.length} espacio{tenants.length !== 1 ? 's' : ''} registrado{tenants.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-4">
        {tenants.map(t => (
          <div key={t.id} className="df-card overflow-hidden">

            {/* Cabecera del tenant */}
            <div className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-df-surface border border-df-border flex items-center justify-center flex-shrink-0">
                <img
                  src={logoSrc(t.logo_url)}
                  alt={t.nombre}
                  className="w-full h-full object-contain p-1"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = '/logo.png' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white">{t.nombre}</p>
                <p className="text-xs text-df-muted font-mono">{t.subdominio}.elevra.lat</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-5 h-5 rounded-full border border-df-border" style={{ background: t.color_primario }} title="Color principal" />
                <div className="w-5 h-5 rounded-full border border-df-border" style={{ background: t.color_secundario }} title="Color secundario" />
                <button
                  onClick={() => editando?.id === t.id ? setEditando(null) : abrirEditar(t)}
                  className="ml-2 df-surface px-3 py-1.5 rounded-xl text-xs font-semibold text-df-muted hover:text-white transition-all flex items-center gap-1.5"
                >
                  <i className={`fa-solid ${editando?.id === t.id ? 'fa-chevron-up' : 'fa-pen'} text-xs`} />
                  {editando?.id === t.id ? 'Cerrar' : 'Editar'}
                </button>
              </div>
            </div>

            {/* Formulario inline */}
            {editando?.id === t.id && (
              <form onSubmit={handleSubmit} className="border-t border-df-border p-4 space-y-4 bg-df-surface/30">

                {/* Logo */}
                <div>
                  <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Logo (URL)</label>
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-df-surface border border-df-border flex items-center justify-center flex-shrink-0">
                      <img
                        src={form.logo_url || '/logo.png'}
                        alt="Preview"
                        className="w-full h-full object-contain p-0.5"
                        onError={e => { (e.currentTarget as HTMLImageElement).src = '/logo.png' }}
                      />
                    </div>
                    <input
                      value={form.logo_url}
                      onChange={e => set('logo_url', e.target.value)}
                      placeholder="https://... URL del logo"
                      className="df-input text-sm"
                    />
                  </div>
                  <p className="text-[10px] text-df-muted mt-1">Deja vacío para usar el logo de Elevra</p>
                </div>

                {/* Nombre */}
                <div>
                  <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Nombre del espacio</label>
                  <input
                    value={form.nombre}
                    onChange={e => set('nombre', e.target.value)}
                    placeholder="Ej: Dorita Fit"
                    className="df-input text-sm"
                    required
                  />
                </div>

                {/* Colores */}
                <div>
                  <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-3 block">Colores</label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { key: 'color_primario',   label: 'Principal' },
                      { key: 'color_secundario', label: 'Secundario' },
                    ] as const).map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-[11px] text-df-muted mb-1.5 block">{label}</label>
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer relative">
                            <input type="color" value={form[key]} onChange={e => set(key, e.target.value)} className="sr-only" />
                            <div className="w-9 h-9 rounded-xl border border-df-border" style={{ background: form[key] }} />
                          </label>
                          <input value={form[key]} onChange={e => set(key, e.target.value)} maxLength={7} className="df-input font-mono text-xs" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div
                  className="rounded-xl p-3 flex items-center justify-between"
                  style={{ background: `linear-gradient(135deg, ${form.color_secundario}22, ${form.color_primario}22)`, border: `1px solid ${form.color_primario}44` }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg overflow-hidden bg-df-surface flex items-center justify-center">
                      <img src={form.logo_url || '/logo.png'} alt="" className="w-full h-full object-contain" onError={e => { (e.currentTarget as HTMLImageElement).src = '/logo.png' }} />
                    </div>
                    <span className="text-sm font-bold text-white">{form.nombre || 'Sin nombre'}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                    style={{ background: `linear-gradient(135deg, ${form.color_secundario}, ${form.color_primario})` }}>
                    Vista previa
                  </div>
                </div>

                {error && (
                  <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation" /> {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditando(null)}
                    className="df-btn-outline border border-df-border px-4 py-2 text-sm rounded-xl flex-1">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving} className="df-btn px-4 py-2 text-sm flex-1 flex items-center justify-center gap-2">
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : saved ? <><i className="fa-solid fa-check" /> ¡Guardado!</>
                      : <><i className="fa-solid fa-floppy-disk" /> Guardar</>}
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}

        {tenants.length === 0 && (
          <div className="df-card p-8 text-center text-df-muted text-sm">
            No hay espacios registrados aún.
          </div>
        )}
      </div>
    </div>
  )
}