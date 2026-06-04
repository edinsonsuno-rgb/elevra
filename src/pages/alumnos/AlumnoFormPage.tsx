import { useEffect, useState, FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase, Alumno } from '@/lib/supabase'
import { Spinner } from '@/components/ui/index'
import { useProfesional } from '@/hooks/useProfesional'

const NIVELES        = ['Principiante', 'Intermedio', 'Avanzado'] as const
const OBJETIVOS      = ['Pérdida de peso', 'Ganancia muscular', 'Resistencia', 'Flexibilidad', 'Tonificación', 'Salud general']
const TIPO_DOCUMENTO = ['CC', 'CE', 'TI', 'PA'] as const

export default function AlumnoFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { profesional } = useProfesional()

  const [loading,  setLoading]  = useState(isEdit)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [docError, setDocError] = useState<string | null>(null)

  const [form, setForm] = useState({
    nombre:          '',
    tipo_documento:  'CC' as typeof TIPO_DOCUMENTO[number],
    documento:       '',
    email:           '',
    telefono:        '',
    nivel:           'Principiante' as Alumno['nivel'],
    objetivo:        '',
    notas:           '',
    activo:          true,
  })

  useEffect(() => {
    if (!isEdit) return
    supabase.from('alumnos').select('*').eq('id', id!).single().then(({ data }) => {
      if (data) setForm({
        nombre:         data.nombre,
        tipo_documento: data.tipo_documento ?? 'CC',
        documento:      data.documento ?? '',
        email:          data.email ?? '',
        telefono:       data.telefono ?? '',
        nivel:          data.nivel,
        objetivo:       data.objetivo ?? '',
        notas:          data.notas ?? '',
        activo:         data.activo,
      })
      setLoading(false)
    })
  }, [id])

  function set(key: string, val: any) {
    setForm(f => ({ ...f, [key]: val }))
    if (key === 'documento') setDocError(null)
  }

  async function verificarDocumento(doc: string) {
    if (!doc.trim() || isEdit) return
    const { data } = await supabase
      .from('alumnos').select('id, nombre').eq('documento', doc).maybeSingle()
    if (data) {
      setDocError(`Este documento ya está registrado para ${data.nombre}`)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim())    { setError('El nombre es obligatorio'); return }
    if (!form.documento.trim()) { setError('El documento es obligatorio'); return }
    if (docError)               { setError('Corrige el documento antes de continuar'); return }
    setSaving(true); setError(null)

    const payload = { ...form, tenant_id: profesional?.tenant_id }
    const { error: err } = isEdit
      ? await supabase.from('alumnos').update(payload).eq('id', id!)
      : await supabase.from('alumnos').insert(payload)

    if (err) {
      if (err.code === '23505') setError('Este documento ya está registrado en el sistema')
      else setError(err.message)
      setSaving(false); return
    }
    navigate('/alumnos')
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/alumnos" className="text-df-muted hover:text-white transition-colors">
          <i className="fa-solid fa-arrow-left" />
        </Link>
        <h1 className="text-xl font-black text-white">{isEdit ? 'Editar alumno' : 'Nuevo alumno'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Información personal */}
        <div className="df-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Información personal</h2>

          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
              Nombre completo *
            </label>
            <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
              placeholder="Nombre completo" className="df-input" required />
          </div>

          {/* Documento */}
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
              Documento de identidad *
            </label>
            <div className="flex gap-2">
              <select value={form.tipo_documento} onChange={e => set('tipo_documento', e.target.value)}
                style={{ width: '70px', flexShrink: 0 }}
                className="df-input px-2 text-sm">
                {TIPO_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input value={form.documento} onChange={e => set('documento', e.target.value)}
                onBlur={e => verificarDocumento(e.target.value)}
                placeholder="Número de documento"
                className={`df-input flex-1 min-w-0 ${docError ? 'border-red-500/50' : ''}`}
                required
              />
            </div>
            {docError && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <i className="fa-solid fa-triangle-exclamation text-xs" /> {docError}
              </p>
            )}
            <p className="text-[10px] text-df-muted mt-1">
              <i className="fa-solid fa-shield-halved mr-1 text-df-violet" />
              El documento identifica al alumno de forma única en el sistema
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Correo</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="correo@ejemplo.com" className="df-input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)}
                placeholder="+57 300 000 0000" className="df-input" />
            </div>
          </div>
        </div>

        {/* Entrenamiento */}
        <div className="df-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Entrenamiento</h2>
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Nivel</label>
            <div className="flex gap-2">
              {NIVELES.map(n => (
                <button type="button" key={n} onClick={() => set('nivel', n)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all
                    ${form.nivel === n ? 'bg-df-purple text-white' : 'df-surface text-df-muted hover:text-white'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Objetivo</label>
            <div className="flex flex-wrap gap-2">
              {OBJETIVOS.map(o => (
                <button type="button" key={o} onClick={() => set('objetivo', form.objetivo === o ? '' : o)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${form.objetivo === o ? 'bg-df-pink/20 text-df-pink border border-df-pink/40' : 'df-surface text-df-muted hover:text-white'}`}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notas */}
        <div className="df-card p-5">
          <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Notas</label>
          <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
            placeholder="Lesiones, preferencias, observaciones..." rows={3}
            className="df-input resize-none" />
        </div>

        {/* Toggle activo (solo edición) */}
        {isEdit && (
          <div className="df-surface p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Estado del alumno</p>
              <p className="text-xs text-df-muted">Desactiva para archivar sin eliminar</p>
            </div>
            <button type="button" onClick={() => set('activo', !form.activo)}
              className={`relative w-12 h-6 rounded-full transition-all ${form.activo ? 'bg-df-purple' : 'bg-df-border'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow ${form.activo ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/alumnos" className="df-btn-outline border border-df-border px-6 py-3 text-sm rounded-xl flex-1 text-center">
            Cancelar
          </Link>
          <button type="submit" disabled={saving || !!docError}
            className="df-btn px-6 py-3 text-sm flex-1 flex items-center justify-center gap-2 disabled:opacity-40">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              : <><i className="fa-solid fa-check" /> {isEdit ? 'Guardar cambios' : 'Crear alumno'}</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}