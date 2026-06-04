import { useEffect, useState, FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/index'
import { useProfesional } from '@/hooks/useProfesional'

export default function RutinaFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { profesional } = useProfesional()

  const [loading, setLoading] = useState(isEdit)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const [form, setForm] = useState({
    nombre:      '',
    descripcion: '',
    publica:     false,
  })

  useEffect(() => {
    if (!isEdit) return
    supabase.from('rutinas').select('*').eq('id', id!).single().then(({ data }) => {
      if (data) setForm({
        nombre:      data.nombre,
        descripcion: data.descripcion ?? '',
        publica:     data.publica,
      })
      setLoading(false)
    })
  }, [id])

  function set(key: string, val: any) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError(null)
    const payload = { ...form, tenant_id: profesional?.tenant_id }
    const { error: err } = isEdit
      ? await supabase.from('rutinas').update(payload).eq('id', id!)
      : await supabase.from('rutinas').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    navigate('/rutinas')
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/rutinas" className="text-df-muted hover:text-white transition-colors">
          <i className="fa-solid fa-arrow-left" />
        </Link>
        <h1 className="text-xl font-black text-white">
          {isEdit ? 'Editar rutina' : 'Nueva rutina'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="df-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Información general</h2>

          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
              Nombre *
            </label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
              placeholder="Ej: Rutina de fuerza para María" className="df-input" required />
          </div>

          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
              Descripción
            </label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              placeholder="Objetivo y descripción de la rutina..." rows={3}
              className="df-input resize-none" />
          </div>
        </div>

        <div className="df-surface p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Rutina pública</p>
            <p className="text-xs text-df-muted">Visible en el catálogo para tus alumnos</p>
          </div>
          <button type="button" onClick={() => set('publica', !form.publica)}
            className={`relative w-12 h-6 rounded-full transition-all ${form.publica ? 'bg-df-purple' : 'bg-df-border'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow ${form.publica ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/rutinas"
            className="df-btn-outline border border-df-border px-6 py-3 text-sm rounded-xl flex-1 text-center">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="df-btn px-6 py-3 text-sm flex-1 flex items-center justify-center gap-2">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              : <><i className="fa-solid fa-check" /> {isEdit ? 'Guardar cambios' : 'Crear rutina'}</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}