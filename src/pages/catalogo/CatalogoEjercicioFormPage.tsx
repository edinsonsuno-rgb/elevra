import { useEffect, useState, FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { invalidateCache } from '@/lib/queryCache'
import { Spinner } from '@/components/ui/index'
import ImageUpload from '@/components/ui/ImageUpload'
import { useAuth } from '@/hooks/useAuth'

const ZONAS = [
  { key: 'superior', label: 'Superior', icon: 'fa-solid fa-hand-fist' },
  { key: 'media',    label: 'Media',    icon: 'fa-solid fa-circle' },
  { key: 'inferior', label: 'Inferior', icon: 'fa-solid fa-shoe-prints' },
] as const

const MUSCULOS: Record<string, string[]> = {
  superior: ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps'],
  media:    ['Abdomen', 'Oblicuos', 'Lumbar'],
  inferior: ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Pantorrillas'],
}

const FORM_INICIAL = {
  nombre:           '',
  descripcion:      '',
  imagen_url:       '',
  foto_inicio_url:  '',
  foto_fin_url:     '',
  zona:             '' as 'superior' | 'media' | 'inferior' | '',
  musculo:          '',
  seg_principiante: 4,
  seg_intermedio:   3,
  seg_avanzado:     2,
}

export default function CatalogoEjercicioFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user, role } = useAuth()

  const [loading, setLoading] = useState(isEdit)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [form,    setForm]    = useState(FORM_INICIAL)

  useEffect(() => {
    if (role && role !== 'admin') navigate('/catalogo')
  }, [role])

  useEffect(() => {
    if (!isEdit) return
    supabase.from('catalogo_ejercicios').select('*').eq('id', id!).single()
      .then(({ data }) => {
        if (data) setForm({
          nombre:           data.nombre,
          descripcion:      data.descripcion ?? '',
          imagen_url:       data.imagen_url ?? '',
          foto_inicio_url:  data.foto_inicio_url ?? '',
          foto_fin_url:     data.foto_fin_url ?? '',
          zona:             data.zona ?? '',
          musculo:          data.musculo ?? '',
          seg_principiante: data.seg_principiante,
          seg_intermedio:   data.seg_intermedio,
          seg_avanzado:     data.seg_avanzado,
        })
        setLoading(false)
      })
  }, [id])

  function set(key: string, val: any) {
    setForm(f => {
      const updated = { ...f, [key]: val }
      // Si cambia la zona, resetear músculo
      if (key === 'zona') updated.musculo = ''
      return updated
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.zona)          { setError('Selecciona la zona corporal'); return }
    if (!form.musculo)       { setError('Selecciona el músculo principal'); return }
    setSaving(true); setError(null)

    // Chequeo de nombre duplicado (ignora mayúsculas/minúsculas y espacios)
    let dupQuery = supabase
      .from('catalogo_ejercicios')
      .select('id')
      .ilike('nombre', form.nombre.trim())
    if (isEdit) dupQuery = dupQuery.neq('id', id!)
    const { data: existentes } = await dupQuery
    if (existentes && existentes.length > 0) {
      setError(`Ya existe un ejercicio llamado "${form.nombre.trim()}". Usa otro nombre.`)
      setSaving(false)
      return
    }

    const payload = { ...form, creado_por: user?.id }
    const { error: err } = isEdit
      ? await supabase.from('catalogo_ejercicios').update(payload).eq('id', id!)
      : await supabase.from('catalogo_ejercicios').insert(payload)
    if (err) {
      setError(
        err.code === '23505'
          ? `Ya existe un ejercicio llamado "${form.nombre.trim()}". Usa otro nombre.`
          : err.message
      )
      setSaving(false)
      return
    }
    invalidateCache('catalogo_ejercicios')
    navigate('/catalogo')
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/catalogo" className="text-df-muted hover:text-white transition-colors">
          <i className="fa-solid fa-arrow-left" />
        </Link>
        <h1 className="text-xl font-black text-white">
          {isEdit ? 'Editar ejercicio' : 'Nuevo ejercicio'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Información */}
        <div className="df-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Información del ejercicio</h2>
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Nombre *</label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
              placeholder="Ej: Sentadilla con barra" className="df-input" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Descripción</label>
            <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
              placeholder="Técnica, indicaciones importantes..." rows={3}
              className="df-input resize-none" />
          </div>
        </div>

        {/* Zona y músculo — cascada */}
        <div className="df-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Clasificación muscular</h2>

          {/* Zona — Nivel 1 */}
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">
              Zona corporal *
            </label>
            <div className="flex gap-2">
              {ZONAS.map(z => (
                <button type="button" key={z.key} onClick={() => set('zona', z.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all
                    ${form.zona === z.key
                      ? 'bg-df-purple text-white'
                      : 'df-surface text-df-muted hover:text-white'}`}>
                  <i className={z.icon} /> {z.label}
                </button>
              ))}
            </div>
          </div>

          {/* Músculo — Nivel 2 (aparece cuando hay zona) */}
          {form.zona && (
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">
                Músculo principal *
              </label>
              <div className="flex flex-wrap gap-2">
                {MUSCULOS[form.zona]?.map(m => (
                  <button type="button" key={m} onClick={() => set('musculo', m)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold transition-all
                      ${form.musculo === m
                        ? 'bg-df-pink/20 text-df-pink border border-df-pink/40'
                        : 'df-surface text-df-muted hover:text-white'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fotos */}
        <div className="df-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">Imágenes del ejercicio</h2>
            <p className="text-xs text-df-muted mt-1">
              La imagen de portada es para uso futuro. Las fotos inicio y fin crean la animación del movimiento.
            </p>
          </div>

          <ImageUpload
            label="🖼️ Imagen de portada"
            value={form.imagen_url}
            onChange={url => set('imagen_url', url)}
            folder="catalogo/portadas"
          />

          <div className="border-t border-df-border pt-4">
            <p className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-3">
              Animación del movimiento
            </p>
            <div className="grid grid-cols-2 gap-4">
              <ImageUpload
                label="📷 Posición inicial"
                value={form.foto_inicio_url}
                onChange={url => set('foto_inicio_url', url)}
                folder="catalogo/inicio"
              />
              <ImageUpload
                label="📷 Posición final"
                value={form.foto_fin_url}
                onChange={url => set('foto_fin_url', url)}
                folder="catalogo/fin"
              />
            </div>
            {form.foto_inicio_url && form.foto_fin_url && (
              <div className="flex items-center gap-2 bg-df-purple/10 border border-df-purple/20 rounded-xl p-3 mt-3">
                <i className="fa-solid fa-rotate text-df-violet text-sm animate-spin" style={{ animationDuration: '3s' }} />
                <p className="text-xs text-df-muted">Las dos fotos generarán la animación del movimiento ✓</p>
              </div>
            )}
          </div>
        </div>

        {/* Tiempos por nivel */}
        <div className="df-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">Duración por repetición</h2>
            <p className="text-xs text-df-muted mt-1">
              Segundos por movimiento completo según el nivel del alumno.
            </p>
          </div>

          <div className="bg-green-900/10 border border-green-900/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="df-badge-beg px-3 py-1">Principiante</span>
              <span className="text-xl font-black text-green-400">{form.seg_principiante}s</span>
            </div>
            <input type="range" min={1} max={10} step={0.5} value={form.seg_principiante}
              onChange={e => set('seg_principiante', Number(e.target.value))}
              className="w-full accent-green-500" />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-df-muted">1s</span>
              <span className="text-[10px] text-df-muted">10s</span>
            </div>
          </div>

          <div className="bg-blue-900/10 border border-blue-900/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="df-badge-int px-3 py-1">Intermedio</span>
              <span className="text-xl font-black text-blue-400">{form.seg_intermedio}s</span>
            </div>
            <input type="range" min={1} max={10} step={0.5} value={form.seg_intermedio}
              onChange={e => set('seg_intermedio', Number(e.target.value))}
              className="w-full accent-blue-500" />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-df-muted">1s</span>
              <span className="text-[10px] text-df-muted">10s</span>
            </div>
          </div>

          <div className="bg-amber-900/10 border border-amber-900/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="df-badge-adv px-3 py-1">Avanzado</span>
              <span className="text-xl font-black text-amber-400">{form.seg_avanzado}s</span>
            </div>
            <input type="range" min={1} max={10} step={0.5} value={form.seg_avanzado}
              onChange={e => set('seg_avanzado', Number(e.target.value))}
              className="w-full accent-amber-500" />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-df-muted">1s</span>
              <span className="text-[10px] text-df-muted">10s</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/catalogo" className="df-btn-outline border border-df-border px-6 py-3 text-sm rounded-xl flex-1 text-center">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="df-btn px-6 py-3 text-sm flex-1 flex items-center justify-center gap-2">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              : <><i className="fa-solid fa-check" /> {isEdit ? 'Guardar cambios' : 'Guardar ejercicio'}</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}