import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Spinner, Modal } from '@/components/ui/index'
import { useAuth } from '@/hooks/useAuth'

interface Alumno { id: string; nombre: string; documento: string | null; tipo_documento: string | null; nivel: string }
interface CatalogoEj { id: string; nombre: string; foto_inicio_url: string | null; zona: string | null; musculo: string | null }
interface Item {
  id?:       string
  tempId:    string
  tipo:      'ejercicio' | 'descanso'
  ejercicio?: CatalogoEj
  ejercicio_id?: string
  series?:    number
  repeticiones?: string
  descanso_seg?: number
  descanso_minutos?: number
  notas?:    string
  esNuevo?:  boolean
}

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'] as const
const DIAS_LABEL: Record<string, string> = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miércoles',
  jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo'
}
const MUSCULOS: Record<string, string[]> = {
  superior: ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps'],
  media:    ['Abdomen', 'Oblicuos', 'Lumbar'],
  inferior: ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Pantorrillas'],
}

type DiaKey = typeof DIAS[number]
type DiaData = { id?: string; esDescanso: boolean; items: Item[] }
type Semana  = Record<DiaKey, DiaData>

function initSemana(): Semana {
  const entries = DIAS.map(d => [d, { esDescanso: false, items: [] as Item[] }])
  return Object.fromEntries(entries) as Semana
}

function uid() { return Math.random().toString(36).slice(2) }

export default function EditarRutinaPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, tenantId } = useAuth()

  const [alumno,     setAlumno]     = useState<Alumno | null>(null)
  const [rutinaId,   setRutinaId]   = useState<string | null>(null)
  const [semana,     setSemana]     = useState<Semana>(initSemana())
  const [diaAbierto, setDiaAbierto] = useState<DiaKey | null>('lunes')
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // Modal ejercicio
  const [modalEj,      setModalEj]      = useState(false)
  const [diaTarget,    setDiaTarget]    = useState<DiaKey | null>(null)
  const [catalogo,     setCatalogo]     = useState<CatalogoEj[]>([])
  const [busqueda,     setBusqueda]     = useState('')
  const [zonaFiltro,   setZonaFiltro]   = useState<string | null>(null)
  const [musculoFiltro,setMusculoFiltro]= useState<string | null>(null)

  // Modal descanso
  const [modalDesc, setModalDesc] = useState(false)
  const [descMins,  setDescMins]  = useState(2)

  // Modal editar ejercicio
  const [modalEditEj, setModalEditEj] = useState(false)
  const [editTarget,  setEditTarget]  = useState<{ dia: DiaKey; tempId: string } | null>(null)
  const [editForm,    setEditForm]    = useState({ series: 3, repeticiones: '10', descanso_seg: 60, notas: '' })

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    const [{ data: a }, { data: c }] = await Promise.all([
      supabase.from('alumnos').select('id,nombre,documento,tipo_documento,nivel').eq('id', id!).single(),
      supabase.from('catalogo_ejercicios').select('id,nombre,foto_inicio_url,zona,musculo').order('nombre'),
    ])
    setAlumno(a)
    setCatalogo(c ?? [])

    // Cargar rutina activa
    const { data: rutina } = await supabase.from('alumno_rutinas')
      .select('id').eq('alumno_id', id!).eq('activa', true).maybeSingle()

    if (rutina) {
      setRutinaId(rutina.id)

      // Cargar días e items
      const { data: dias } = await supabase.from('alumno_rutina_dias')
        .select('*, items:alumno_rutina_items(*, ejercicio:catalogo_ejercicios(id,nombre,foto_inicio_url,zona,musculo))')
        .eq('rutina_id', rutina.id)

      if (dias) {
        const nuevaSemana = initSemana()
        for (const dia of dias) {
          const key = dia.dia_semana as DiaKey
          nuevaSemana[key] = {
            id: dia.id,
            esDescanso: dia.es_descanso,
            items: (dia.items ?? [])
              .sort((a: any, b: any) => a.orden - b.orden)
              .map((item: any) => ({
                id:                item.id,
                tempId:            uid(),
                tipo:              item.tipo,
                ejercicio:         item.ejercicio,
                ejercicio_id:      item.ejercicio_id,
                series:            item.series,
                repeticiones:      item.repeticiones,
                descanso_seg:      item.descanso_seg,
                descanso_minutos:  item.descanso_minutos,
                notas:             item.notas,
                esNuevo:           false,
              }))
          }
        }
        setSemana(nuevaSemana)
      }
    }
    setLoading(false)
  }

  function toggleDescanso(dia: DiaKey) {
    setSemana(s => ({ ...s, [dia]: { ...s[dia], esDescanso: !s[dia].esDescanso, items: [] } }))
  }

  function abrirModalEj(dia: DiaKey) {
    setDiaTarget(dia); setBusqueda(''); setZonaFiltro(null); setMusculoFiltro(null); setModalEj(true)
  }

  function agregarEjercicio(ej: CatalogoEj) {
    if (!diaTarget) return
    const item: Item = { tempId: uid(), tipo: 'ejercicio', ejercicio: ej, series: 3, repeticiones: '10', descanso_seg: 60, esNuevo: true }
    setSemana(s => ({ ...s, [diaTarget]: { ...s[diaTarget], items: [...s[diaTarget].items, item] } }))
    setModalEj(false)
  }

  function abrirModalDesc(dia: DiaKey) { setDiaTarget(dia); setDescMins(2); setModalDesc(true) }

  function agregarDescanso() {
    if (!diaTarget) return
    const item: Item = { tempId: uid(), tipo: 'descanso', descanso_minutos: descMins, esNuevo: true }
    setSemana(s => ({ ...s, [diaTarget]: { ...s[diaTarget], items: [...s[diaTarget].items, item] } }))
    setModalDesc(false)
  }

  function eliminarItem(dia: DiaKey, tempId: string) {
    setSemana(s => ({ ...s, [dia]: { ...s[dia], items: s[dia].items.filter(i => i.tempId !== tempId) } }))
  }

  function abrirEditEj(dia: DiaKey, item: Item) {
    setEditTarget({ dia, tempId: item.tempId })
    setEditForm({ series: item.series ?? 3, repeticiones: item.repeticiones ?? '10', descanso_seg: item.descanso_seg ?? 60, notas: item.notas ?? '' })
    setModalEditEj(true)
  }

  function guardarEditEj() {
    if (!editTarget) return
    setSemana(s => ({
      ...s,
      [editTarget.dia]: {
        ...s[editTarget.dia],
        items: s[editTarget.dia].items.map(i => i.tempId === editTarget.tempId ? { ...i, ...editForm } : i)
      }
    }))
    setModalEditEj(false)
  }

  function moverItem(dia: DiaKey, tempId: string, dir: -1 | 1) {
    setSemana(s => {
      const items  = [...s[dia].items]
      const idx    = items.findIndex(i => i.tempId === tempId)
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= items.length) return s
      ;[items[idx], items[newIdx]] = [items[newIdx], items[idx]]
      return { ...s, [dia]: { ...s[dia], items } }
    })
  }

  async function guardar() {
    setSaving(true); setError(null)

    // Si no hay rutina activa, crear una nueva
    let rId = rutinaId
    if (!rId) {
      const { data: nueva } = await supabase.from('alumno_rutinas').insert({
        alumno_id: id!, tenant_id: tenantId!, creado_por: user?.id, activa: true
      }).select().single()
      rId = nueva?.id ?? null
    }
    if (!rId) { setError('Error al guardar'); setSaving(false); return }

    // Actualizar cada día
    for (const dia of DIAS) {
      const diaData = semana[dia]

      // Upsert día
      let diaId = diaData.id
      if (diaId) {
        await supabase.from('alumno_rutina_dias').update({ es_descanso: diaData.esDescanso }).eq('id', diaId)
        // Eliminar items existentes y reinsertar en nuevo orden
        await supabase.from('alumno_rutina_items').delete().eq('dia_id', diaId)
      } else {
        const { data: nuevoDia } = await supabase.from('alumno_rutina_dias').insert({
          rutina_id: rId, dia_semana: dia, es_descanso: diaData.esDescanso
        }).select().single()
        diaId = nuevoDia?.id
      }

      if (!diaId) continue

      // Insertar items en orden actual
      for (let i = 0; i < diaData.items.length; i++) {
        const item = diaData.items[i]
        await supabase.from('alumno_rutina_items').insert({
          dia_id:           diaId,
          tipo:             item.tipo,
          orden:            i + 1,
          ejercicio_id:     item.tipo === 'ejercicio' ? (item.ejercicio?.id ?? item.ejercicio_id) : null,
          series:           item.series ?? null,
          repeticiones:     item.repeticiones ?? null,
          descanso_seg:     item.descanso_seg ?? null,
          descanso_minutos: item.descanso_minutos ?? null,
          notas:            item.notas ?? null,
        })
      }
    }

    setSaving(false)
    navigate(`/alumnos/${id}`)
  }

  const filtrados = catalogo.filter(e =>
    (e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (e.musculo ?? '').toLowerCase().includes(busqueda.toLowerCase())) &&
    (zonaFiltro    ? e.zona    === zonaFiltro    : true) &&
    (musculoFiltro ? e.musculo === musculoFiltro : true)
  )

  if (loading) return <Spinner />
  if (!alumno) return <p className="text-df-muted p-8 text-center">Alumno no encontrado</p>

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link to={`/alumnos/${id}`} className="text-df-muted hover:text-white transition-colors">
          <i className="fa-solid fa-arrow-left" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white">
            {rutinaId ? 'Editar rutina' : 'Asignar rutina'}
          </h1>
          <p className="text-xs text-df-muted">
            {alumno.nombre} · {alumno.tipo_documento} {alumno.documento} · {alumno.nivel}
          </p>
        </div>
      </div>

      {/* 7 días */}
      <div className="space-y-3">
        {DIAS.map(dia => {
          const data    = semana[dia]
          const abierto = diaAbierto === dia
          const label   = DIAS_LABEL[dia]

          return (
            <div key={dia} className={`df-card overflow-hidden transition-all ${data.esDescanso ? 'border-amber-500/30' : ''}`}>
              <div onClick={() => setDiaAbierto(abierto ? null : dia)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-df-surface/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full
                    ${data.esDescanso ? 'bg-amber-900/30 text-amber-400' : 'bg-df-purple/20 text-df-violet'}`}>
                    {label}
                  </span>
                  {data.esDescanso
                    ? <span className="text-xs text-amber-400 flex items-center gap-1.5">
                        <i className="fa-solid fa-moon text-xs" /> Día de descanso
                      </span>
                    : <span className="text-xs text-df-muted">
                        {data.items.length === 0
                          ? 'Sin ejercicios'
                          : `${data.items.filter(i => i.tipo === 'ejercicio').length} ejercicio(s) · ${data.items.filter(i => i.tipo === 'descanso').length} descanso(s)`
                        }
                      </span>
                  }
                </div>
                <i className={`fa-solid ${abierto ? 'fa-chevron-down' : 'fa-chevron-right'} text-df-muted text-xs`} />
              </div>

              {abierto && (
                <div className="border-t border-df-border p-4 space-y-3">
                  <div className="flex items-center justify-between df-surface p-3 rounded-xl">
                    <p className="text-xs text-df-muted">Marcar como día de descanso</p>
                    <button onClick={() => toggleDescanso(dia)}
                      className={`relative w-10 h-5 rounded-full transition-all ${data.esDescanso ? 'bg-amber-500' : 'bg-df-border'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow ${data.esDescanso ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {!data.esDescanso && (
                    <>
                      {data.items.length > 0 && (
                        <div className="space-y-2">
                          {data.items.map((item, idx) => (
                            <div key={item.tempId}
                              className={`flex items-center gap-3 p-3 rounded-xl
                                ${item.tipo === 'descanso' ? 'bg-amber-900/10 border border-amber-500/20' : 'df-surface'}`}>
                              <span className="text-xs text-df-muted w-5 text-center flex-shrink-0">{idx + 1}</span>

                              {item.tipo === 'ejercicio' ? (
                                <>
                                  {item.ejercicio?.foto_inicio_url
                                    ? <img src={item.ejercicio.foto_inicio_url} alt=""
                                        className="w-9 h-9 rounded-lg object-contain bg-df-card border border-df-border flex-shrink-0" />
                                    : <div className="w-9 h-9 rounded-lg bg-df-purple/20 flex items-center justify-center flex-shrink-0">
                                        <i className="fa-solid fa-dumbbell text-df-violet text-xs" />
                                      </div>
                                  }
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{item.ejercicio?.nombre}</p>
                                    <p className="text-[10px] text-df-muted">
                                      {item.series} series · {item.repeticiones} reps · {item.descanso_seg}s desc
                                    </p>
                                  </div>
                                  <button onClick={() => abrirEditEj(dia, item)}
                                    className="w-7 h-7 rounded-lg df-surface flex items-center justify-center text-df-muted hover:text-white transition-all flex-shrink-0">
                                    <i className="fa-solid fa-pen text-xs" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <i className="fa-solid fa-moon text-amber-400 text-sm flex-shrink-0" />
                                  <div className="flex-1">
                                    <p className="text-xs font-bold text-amber-400">Descanso</p>
                                    <p className="text-[10px] text-amber-400/70">{item.descanso_minutos} minuto(s)</p>
                                  </div>
                                </>
                              )}

                              <div className="flex flex-col gap-0.5 flex-shrink-0">
                                <button onClick={() => moverItem(dia, item.tempId, -1)} disabled={idx === 0}
                                  className="w-5 h-5 flex items-center justify-center text-df-muted hover:text-white disabled:opacity-20 transition-all">
                                  <i className="fa-solid fa-chevron-up text-[10px]" />
                                </button>
                                <button onClick={() => moverItem(dia, item.tempId, 1)} disabled={idx === data.items.length - 1}
                                  className="w-5 h-5 flex items-center justify-center text-df-muted hover:text-white disabled:opacity-20 transition-all">
                                  <i className="fa-solid fa-chevron-down text-[10px]" />
                                </button>
                              </div>

                              <button onClick={() => eliminarItem(dia, item.tempId)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-df-muted hover:text-red-400 transition-all flex-shrink-0">
                                <i className="fa-solid fa-trash text-xs" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => abrirModalEj(dia)}
                          className="df-btn flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5">
                          <i className="fa-solid fa-plus text-xs" /> Agregar ejercicio
                        </button>
                        <button onClick={() => abrirModalDesc(dia)}
                          className="df-btn-outline border border-amber-500/30 text-amber-400 hover:bg-amber-900/20 flex-1 py-2.5 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all">
                          <i className="fa-solid fa-moon text-xs" /> Agregar descanso
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </div>
      )}

      <div className="flex gap-3">
        <Link to={`/alumnos/${id}`}
          className="df-btn-outline border border-df-border px-6 py-3 text-sm rounded-xl flex-1 text-center">
          Cancelar
        </Link>
        <button onClick={guardar} disabled={saving}
          className="df-btn px-6 py-3 text-sm flex-1 flex items-center justify-center gap-2">
          {saving
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
            : <><i className="fa-solid fa-check" /> Guardar cambios</>
          }
        </button>
      </div>

      {/* Modal ejercicio */}
      <Modal open={modalEj} onClose={() => { setModalEj(false); setZonaFiltro(null); setMusculoFiltro(null) }} title="Seleccionar ejercicio">
        <div className="space-y-3">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-df-muted text-xs" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar ejercicio o músculo..." className="df-input pl-9 text-sm py-2" autoFocus />
          </div>
          <div className="flex gap-2 flex-wrap">
            {['superior','media','inferior'].map(z => (
              <button key={z} type="button"
                onClick={() => { setZonaFiltro(zonaFiltro === z ? null : z); setMusculoFiltro(null) }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all
                  ${zonaFiltro === z ? 'bg-df-purple text-white' : 'df-surface text-df-muted hover:text-white'}`}>
                {z}
              </button>
            ))}
          </div>
          {zonaFiltro && (
            <div className="flex gap-2 flex-wrap">
              {MUSCULOS[zonaFiltro]?.map(m => (
                <button key={m} type="button"
                  onClick={() => setMusculoFiltro(musculoFiltro === m ? null : m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${musculoFiltro === m ? 'bg-df-pink/20 text-df-pink border border-df-pink/40' : 'df-surface text-df-muted hover:text-white'}`}>
                  {m}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filtrados.length === 0 && <p className="text-xs text-df-muted text-center py-4">Sin resultados</p>}
            {filtrados.map(ej => (
              <button key={ej.id} onClick={() => agregarEjercicio(ej)}
                className="w-full flex items-center gap-3 p-3 df-surface rounded-xl hover:border-df-violet/40 transition-all text-left">
                {ej.foto_inicio_url
                  ? <img src={ej.foto_inicio_url} alt="" className="w-10 h-10 rounded-lg object-contain bg-df-card border border-df-border flex-shrink-0" />
                  : <div className="w-10 h-10 rounded-lg bg-df-purple/20 flex items-center justify-center flex-shrink-0">
                      <i className="fa-solid fa-dumbbell text-df-violet text-sm" />
                    </div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{ej.nombre}</p>
                  {ej.musculo && <p className="text-xs text-df-muted capitalize">{ej.zona} · {ej.musculo}</p>}
                </div>
                <i className="fa-solid fa-plus text-df-violet text-sm flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Modal descanso */}
      <Modal open={modalDesc} onClose={() => setModalDesc(false)} title="Agregar descanso">
        <div className="space-y-4">
          <p className="text-xs text-df-muted">Define cuántos minutos de descanso.</p>
          <div className="flex items-center gap-4 justify-center py-2">
            <button onClick={() => setDescMins(m => Math.max(1, m - 1))}
              className="df-surface w-10 h-10 rounded-xl flex items-center justify-center text-df-muted hover:text-white transition-colors">
              <i className="fa-solid fa-minus text-sm" />
            </button>
            <div className="text-center">
              <span className="text-4xl font-black text-white">{descMins}</span>
              <p className="text-xs text-df-muted mt-1">minuto(s)</p>
            </div>
            <button onClick={() => setDescMins(m => m + 1)}
              className="df-surface w-10 h-10 rounded-xl flex items-center justify-center text-df-muted hover:text-white transition-colors">
              <i className="fa-solid fa-plus text-sm" />
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalDesc(false)}
              className="df-btn-outline border border-df-border px-5 py-2.5 text-sm rounded-xl flex-1">Cancelar</button>
            <button onClick={agregarDescanso}
              className="df-btn px-5 py-2.5 text-sm flex-1 flex items-center justify-center gap-2">
              <i className="fa-solid fa-check" /> Agregar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal editar ejercicio */}
      <Modal open={modalEditEj} onClose={() => setModalEditEj(false)} title="Editar ejercicio">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-df-muted uppercase tracking-wider block mb-1">Series</label>
              <div className="flex items-center gap-1">
                <button onClick={() => setEditForm(f => ({ ...f, series: Math.max(1, f.series - 1) }))}
                  className="df-surface w-8 h-8 rounded-lg flex items-center justify-center text-df-muted hover:text-white text-xs">
                  <i className="fa-solid fa-minus" />
                </button>
                <span className="text-white font-black text-lg flex-1 text-center">{editForm.series}</span>
                <button onClick={() => setEditForm(f => ({ ...f, series: f.series + 1 }))}
                  className="df-surface w-8 h-8 rounded-lg flex items-center justify-center text-df-muted hover:text-white text-xs">
                  <i className="fa-solid fa-plus" />
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-df-muted uppercase tracking-wider block mb-1">Reps</label>
              <input value={editForm.repeticiones}
                onChange={e => setEditForm(f => ({ ...f, repeticiones: e.target.value }))}
                placeholder="10 ó 8-12" className="df-input text-sm py-2" />
            </div>
            <div>
              <label className="text-[10px] text-df-muted uppercase tracking-wider block mb-1">Descanso (s)</label>
              <input type="number" min={0} value={editForm.descanso_seg}
                onChange={e => setEditForm(f => ({ ...f, descanso_seg: Number(e.target.value) }))}
                className="df-input text-sm py-2" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-df-muted uppercase tracking-wider block mb-1">Notas</label>
            <input value={editForm.notas}
              onChange={e => setEditForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Indicaciones técnicas..." className="df-input" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setModalEditEj(false)}
              className="df-btn-outline border border-df-border px-5 py-2.5 text-sm rounded-xl flex-1">Cancelar</button>
            <button onClick={guardarEditEj}
              className="df-btn px-5 py-2.5 text-sm flex-1 flex items-center justify-center gap-2">
              <i className="fa-solid fa-check" /> Guardar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}