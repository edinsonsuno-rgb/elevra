import { useEffect, useState, FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase, Alumno, Sesion } from '@/lib/supabase'
import { Spinner } from '@/components/ui/index'
import { useProfesional } from '@/hooks/useProfesional'

export default function SesionFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { profesional } = useProfesional()

  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const [form, setForm] = useState({
    alumno_id:        '',
    titulo:           '',
    tipo:             'Presencial' as Sesion['tipo'],
    estado:           'Programada' as Sesion['estado'],
    fecha:            new Date().toISOString().split('T')[0],
    hora_inicio:      '08:00',
    hora_fin:         '09:00',
    link_videollamada:'',
    notas:            '',
  })

  useEffect(() => {
    supabase.from('alumnos').select('id,nombre').eq('activo', true).order('nombre')
      .then(({ data }) => setAlumnos(data ?? []))
    if (isEdit) {
      supabase.from('sesiones').select('*').eq('id', id!).single().then(({ data }) => {
        if (data) setForm({
          alumno_id:         data.alumno_id,
          titulo:            data.titulo,
          tipo:              data.tipo,
          estado:            data.estado,
          fecha:             data.fecha,
          hora_inicio:       data.hora_inicio,
          hora_fin:          data.hora_fin ?? '',
          link_videollamada: data.link_videollamada ?? '',
          notas:             data.notas ?? '',
        })
        setLoading(false)
      })
    } else { setLoading(false) }
  }, [id])

  function set(key: string, val: any) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.alumno_id) { setError('Selecciona un alumno'); return }
    if (!form.titulo.trim()) { setError('El título es obligatorio'); return }
    setSaving(true); setError(null)
    const payload = { ...form, tenant_id: profesional?.tenant_id }
    const { error: err } = isEdit
      ? await supabase.from('sesiones').update(payload).eq('id', id!)
      : await supabase.from('sesiones').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    navigate('/agenda')
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/agenda" className="text-df-muted hover:text-white transition-colors">
          <i className="fa-solid fa-arrow-left" />
        </Link>
        <h1 className="text-xl font-black text-white">{isEdit ? 'Editar sesión' : 'Nueva sesión'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="df-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Detalles de la sesión</h2>

          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Alumno *</label>
            <select value={form.alumno_id} onChange={e => set('alumno_id', e.target.value)} className="df-input">
              <option value="">Seleccionar alumno...</option>
              {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Título *</label>
            <input value={form.titulo} onChange={e => set('titulo', e.target.value)}
              placeholder="Ej: Entrenamiento de fuerza - Piernas" className="df-input" required />
          </div>

          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Tipo</label>
            <div className="flex gap-2">
              {(['Presencial', 'Online'] as const).map(t => (
                <button type="button" key={t} onClick={() => set('tipo', t)}
                  className={`px-5 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all
                    ${form.tipo === t ? 'bg-df-purple text-white' : 'df-surface text-df-muted hover:text-white'}`}>
                  <i className={`fa-solid ${t === 'Online' ? 'fa-video' : 'fa-location-dot'}`} /> {t}
                </button>
              ))}
            </div>
          </div>

          {form.tipo === 'Online' && (
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Link videollamada</label>
              <input value={form.link_videollamada} onChange={e => set('link_videollamada', e.target.value)}
                placeholder="https://meet.google.com/..." className="df-input" />
            </div>
          )}
        </div>

        <div className="df-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Fecha y hora</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className="df-input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Inicio</label>
              <input type="time" value={form.hora_inicio} onChange={e => set('hora_inicio', e.target.value)} className="df-input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Fin</label>
              <input type="time" value={form.hora_fin} onChange={e => set('hora_fin', e.target.value)} className="df-input" />
            </div>
          </div>
        </div>

        {isEdit && (
          <div className="df-card p-5">
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Estado</label>
            <div className="flex gap-2">
              {(['Programada', 'Completada', 'Cancelada'] as const).map(s => (
                <button type="button" key={s} onClick={() => set('estado', s)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all
                    ${form.estado === s ? 'bg-df-purple text-white' : 'df-surface text-df-muted hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="df-card p-5">
          <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Notas</label>
          <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
            placeholder="Observaciones, ejercicios planificados..." rows={3} className="df-input resize-none" />
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/agenda" className="df-btn-outline border border-df-border px-6 py-3 text-sm rounded-xl flex-1 text-center">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="df-btn px-6 py-3 text-sm flex-1 flex items-center justify-center gap-2">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              : <><i className="fa-solid fa-check" /> {isEdit ? 'Guardar cambios' : 'Crear sesión'}</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
