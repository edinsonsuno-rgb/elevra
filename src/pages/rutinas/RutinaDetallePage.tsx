import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase, Rutina, Ejercicio } from '@/lib/supabase'
import { NivelBadge, Spinner } from '@/components/ui/index'
import ImageUpload from '@/components/ui/ImageUpload'

function formatTiempo(seg: number) {
  if (seg < 60) return `${Math.round(seg)}s`
  const m = Math.floor(seg / 60)
  const s = Math.round(seg % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

interface EjercicioForm {
  nombre: string
  series: number
  repeticiones: string
  descanso_seg: number
  seg_por_rep: number
  foto_inicio_url: string
  foto_fin_url: string
  notas: string
}

const FORM_INICIAL: EjercicioForm = {
  nombre: '', series: 3, repeticiones: '10',
  descanso_seg: 60, seg_por_rep: 2,
  foto_inicio_url: '', foto_fin_url: '', notas: ''
}

export default function RutinaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const [rutina,     setRutina]     = useState<Rutina | null>(null)
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([])
  const [loading,    setLoading]    = useState(true)
  const [addingEj,   setAddingEj]   = useState(false)
  const [savingEj,   setSavingEj]   = useState(false)
  const [form, setForm]             = useState<EjercicioForm>(FORM_INICIAL)

  useEffect(() => { if (id) cargar() }, [id])

  async function cargar() {
    const [{ data: r }, { data: e }] = await Promise.all([
      supabase.from('rutinas').select('*').eq('id', id!).single(),
      supabase.from('ejercicios').select('*').eq('rutina_id', id!).order('orden'),
    ])
    setRutina(r); setEjercicios((e as any) ?? [])
    setLoading(false)
  }

  function setF(key: keyof EjercicioForm, val: any) {
    setForm(f => ({ ...f, [key]: val }))
  }

  async function agregarEjercicio() {
    if (!form.nombre.trim()) return
    setSavingEj(true)
    await supabase.from('ejercicios').insert({
      nombre:          form.nombre,
      series:          form.series,
      repeticiones:    form.repeticiones,
      descanso_seg:    form.descanso_seg,
      seg_por_rep:     form.seg_por_rep,
      foto_inicio_url: form.foto_inicio_url || null,
      foto_fin_url:    form.foto_fin_url || null,
      notas:           form.notas || null,
      rutina_id:       id!,
      orden:           ejercicios.length + 1,
    })
    setForm(FORM_INICIAL)
    setAddingEj(false)
    setSavingEj(false)
    cargar()
  }

  async function eliminarEjercicio(ejId: string) {
    if (!confirm('¿Eliminar este ejercicio?')) return
    await supabase.from('ejercicios').delete().eq('id', ejId)
    cargar()
  }

  async function eliminarRutina() {
    if (!confirm('¿Eliminar esta rutina? Esta acción no se puede deshacer.')) return
    await supabase.from('ejercicios').delete().eq('rutina_id', id!)
    await supabase.from('rutinas').delete().eq('id', id!)
    navigate('/rutinas')
  }

  const tiempoTotalRutina = ejercicios.reduce((acc, ej) => {
    const segRep = Number(ej.seg_por_rep ?? 2)
    const reps   = Number(ej.repeticiones) || 10
    return acc + (ej.series * reps * segRep) + (ej.descanso_seg * (ej.series - 1))
  }, 0)

  if (loading) return <Spinner />
  if (!rutina) return <p className="text-df-muted p-8 text-center">Rutina no encontrada</p>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/rutinas" className="text-df-muted hover:text-white transition-colors">
            <i className="fa-solid fa-arrow-left" />
          </Link>
          <h1 className="text-xl font-black text-white">{rutina.nombre}</h1>
        </div>
        <div className="flex gap-2">
          <Link to={`/rutinas/${id}/editar`}
            className="df-surface px-4 py-2 text-sm rounded-xl text-df-muted hover:text-white transition-colors flex items-center gap-2">
            <i className="fa-solid fa-pen" /> Editar
          </Link>
          <button onClick={eliminarRutina}
            className="df-surface px-3 py-2 text-sm rounded-xl text-red-400 hover:bg-red-900/20 transition-colors">
            <i className="fa-solid fa-trash" />
          </button>
        </div>
      </div>

      {/* Info rutina */}
      <div className="df-card p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-df-purple/10 to-transparent pointer-events-none" />
        {rutina.imagen_url && (
          <div className="h-40 rounded-xl overflow-hidden mb-4">
            <img src={rutina.imagen_url} alt={rutina.nombre} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <NivelBadge nivel={rutina.nivel} />
          {rutina.categoria && (
            <span className="text-xs font-semibold bg-df-purple/20 text-df-violet px-2 py-0.5 rounded-full">
              {rutina.categoria}
            </span>
          )}
          {rutina.publica && (
            <span className="text-xs font-semibold bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full">Pública</span>
          )}
        </div>
        {rutina.descripcion && <p className="text-sm text-df-muted mb-3">{rutina.descripcion}</p>}
        <div className="flex flex-wrap gap-4 text-xs text-df-muted">
          <span><i className="fa-solid fa-calendar-week mr-1 text-df-violet" />{rutina.semanas} semanas</span>
          <span><i className="fa-solid fa-repeat mr-1 text-df-violet" />{rutina.dias_semana} días/semana</span>
          <span><i className="fa-solid fa-dumbbell mr-1 text-df-violet" />{ejercicios.length} ejercicios</span>
          {tiempoTotalRutina > 0 && (
            <span><i className="fa-solid fa-clock mr-1 text-df-pink" />~{formatTiempo(tiempoTotalRutina)} estimado</span>
          )}
        </div>
      </div>

      {/* Ejercicios */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white">
            Ejercicios
            {tiempoTotalRutina > 0 && (
              <span className="ml-2 text-xs font-normal text-df-muted">· {formatTiempo(tiempoTotalRutina)} totales</span>
            )}
          </h2>
          <button onClick={() => setAddingEj(true)}
            className="df-btn px-4 py-2 text-xs flex items-center gap-1.5">
            <i className="fa-solid fa-plus" /> Agregar
          </button>
        </div>

        {/* Formulario nuevo ejercicio */}
        {addingEj && (
          <div className="df-card p-5 mb-4 space-y-4">
            <h3 className="text-sm font-bold text-white">Nuevo ejercicio</h3>

            <div>
              <label className="text-[10px] text-df-muted uppercase tracking-wider block mb-1">Nombre *</label>
              <input value={form.nombre} onChange={e => setF('nombre', e.target.value)}
                placeholder="Ej: Sentadilla con barra" className="df-input" autoFocus />
            </div>

            {/* Series, Reps, Descanso */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-df-muted uppercase tracking-wider block mb-1">Series</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setF('series', Math.max(1, form.series - 1))}
                    className="df-surface w-8 h-8 rounded-lg flex items-center justify-center text-df-muted hover:text-white text-xs">
                    <i className="fa-solid fa-minus" />
                  </button>
                  <span className="text-white font-black text-lg w-6 text-center">{form.series}</span>
                  <button type="button" onClick={() => setF('series', form.series + 1)}
                    className="df-surface w-8 h-8 rounded-lg flex items-center justify-center text-df-muted hover:text-white text-xs">
                    <i className="fa-solid fa-plus" />
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-df-muted uppercase tracking-wider block mb-1">Reps</label>
                <input value={form.repeticiones} onChange={e => setF('repeticiones', e.target.value)}
                  placeholder="10 ó 8-12" className="df-input text-sm py-2" />
              </div>
              <div>
                <label className="text-[10px] text-df-muted uppercase tracking-wider block mb-1">Descanso (s)</label>
                <input type="number" min={0} value={form.descanso_seg}
                  onChange={e => setF('descanso_seg', Number(e.target.value))}
                  className="df-input text-sm py-2" />
              </div>
            </div>

            {/* Segundos por repetición */}
            <div className="df-surface p-3 rounded-xl">
              <label className="text-[10px] text-df-muted uppercase tracking-wider block mb-2">
                ⏱ Duración por repetición
              </label>
              <div className="flex items-center gap-3">
                <input type="range" min={0.5} max={10} step={0.5} value={form.seg_por_rep}
                  onChange={e => setF('seg_por_rep', Number(e.target.value))}
                  className="flex-1 accent-purple-500" />
                <span className="text-df-violet font-black text-lg w-12 text-center">{form.seg_por_rep}s</span>
              </div>
              {form.repeticiones && Number(form.repeticiones) > 0 && (
                <p className="text-[10px] text-df-muted mt-2 text-center">
                  {form.series} series × {form.repeticiones} reps × {form.seg_por_rep}s ={' '}
                  <span className="text-df-pink font-bold">
                    {formatTiempo(form.series * Number(form.repeticiones) * form.seg_por_rep + form.descanso_seg * (form.series - 1))}
                  </span>{' '}estimado
                </p>
              )}
            </div>

            {/* Subida de fotos */}
            <div className="grid grid-cols-2 gap-3">
              <ImageUpload
                label="📷 Foto posición inicial"
                value={form.foto_inicio_url}
                onChange={url => setF('foto_inicio_url', url)}
              />
              <ImageUpload
                label="📷 Foto posición final"
                value={form.foto_fin_url}
                onChange={url => setF('foto_fin_url', url)}
              />
            </div>

            <div>
              <label className="text-[10px] text-df-muted uppercase tracking-wider block mb-1">Notas</label>
              <input value={form.notas} onChange={e => setF('notas', e.target.value)}
                placeholder="Indicaciones técnicas..." className="df-input" />
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => { setAddingEj(false); setForm(FORM_INICIAL) }}
                className="df-btn-outline border border-df-border px-4 py-2.5 text-sm rounded-xl flex-1">
                Cancelar
              </button>
              <button onClick={agregarEjercicio} disabled={savingEj || !form.nombre.trim()}
                className="df-btn px-4 py-2.5 text-sm flex-1 flex items-center justify-center gap-2 disabled:opacity-40">
                {savingEj
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><i className="fa-solid fa-check" /> Agregar ejercicio</>
                }
              </button>
            </div>
          </div>
        )}

        {ejercicios.length === 0 && !addingEj && (
          <div className="df-surface p-8 rounded-2xl text-center">
            <i className="fa-solid fa-dumbbell text-3xl text-df-purple/30 mb-2 block" />
            <p className="text-sm text-df-muted">Sin ejercicios aún. Agrega el primero.</p>
          </div>
        )}

        <div className="space-y-2">
          {ejercicios.map((ej, i) => {
            const segRep     = Number(ej.seg_por_rep ?? 2)
            const reps       = Number(ej.repeticiones) || 10
            const tiempoEj   = ej.series * reps * segRep
            const tiempoDesc = ej.descanso_seg * (ej.series - 1)
            const tieneAnim  = ej.foto_inicio_url && ej.foto_fin_url

            return (
              <div key={ej.id} className="df-surface p-4 rounded-xl group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-df-purple/20 flex items-center justify-center flex-shrink-0 text-df-violet text-xs font-black">
                    {i + 1}
                  </div>
                  {ej.foto_inicio_url && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-df-card border border-df-border">
                      <img src={ej.foto_inicio_url} alt={ej.nombre} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">{ej.nombre}</p>
                      {tieneAnim && (
                        <span className="text-[9px] bg-df-purple/20 text-df-violet px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">
                          ANIM
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-df-muted">
                      {ej.series} series · {ej.repeticiones} reps · {ej.descanso_seg}s descanso · {segRep}s/rep
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    <p className="text-xs font-bold text-df-pink">{formatTiempo(tiempoEj + tiempoDesc)}</p>
                    <p className="text-[10px] text-df-muted">estimado</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <Link to={`/ejercicios/${ej.id}`}
                      className="w-8 h-8 rounded-lg bg-df-purple/20 flex items-center justify-center text-df-violet hover:bg-df-purple/40 transition-all">
                      <i className="fa-solid fa-eye text-xs" />
                    </Link>
                    <button onClick={() => eliminarEjercicio(ej.id)}
                      className="w-8 h-8 rounded-lg text-red-400 hover:bg-red-900/20 flex items-center justify-center transition-all">
                      <i className="fa-solid fa-trash text-xs" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {ejercicios.length > 0 && (
          <div className="mt-4 df-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-df-muted text-sm">
              <i className="fa-solid fa-clock text-df-violet" />
              Tiempo total de la rutina
            </div>
            <span className="text-lg font-black text-df-pink">{formatTiempo(tiempoTotalRutina)}</span>
          </div>
        )}
      </div>
    </div>
  )
}