import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface EjercicioItem {
  id: string
  tipo: 'ejercicio' | 'descanso'
  orden: number
  nombre?: string
  foto_inicio_url?: string | null
  foto_fin_url?: string | null
  musculo?: string | null
  zona?: string | null
  series?: number
  repeticiones?: string
  descanso_seg?: number
  descanso_minutos?: number
  seg_nivel?: number
  notas?: string | null
}

type EstadoTimer = 'idle' | 'serie' | 'descanso_serie' | 'descanso_bloque' | 'completado'

const DIAS_LABEL: Record<string, string> = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miércoles',
  jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo'
}

export default function AlumnoEntrenamientoPage() {
  const { dia }  = useParams<{ dia: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [items,       setItems]       = useState<EjercicioItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [itemActual,  setItemActual]  = useState(0)
  const [serieActual, setSerieActual] = useState(1)
  const [estado,      setEstado]      = useState<EstadoTimer>('idle' as EstadoTimer)
  const [timerSeg,    setTimerSeg]    = useState(0)
  const [timerMax,    setTimerMax]    = useState(0)
  const [showFin,     setShowFin]     = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const animRef     = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { if (user && dia) cargar() }, [user, dia])

  async function cargar() {
    const { data: alumno } = await supabase
      .from('alumnos').select('id, nivel').eq('user_id', user!.id).single()
    if (!alumno) { setLoading(false); return }

    const { data: rutina } = await supabase
      .from('alumno_rutinas').select('id')
      .eq('alumno_id', alumno.id).eq('activa', true).maybeSingle()
    if (!rutina) { setLoading(false); return }

    const { data: diaData } = await supabase
      .from('alumno_rutina_dias').select('id, es_descanso')
      .eq('rutina_id', rutina.id).eq('dia_semana', dia!).maybeSingle()
    if (!diaData || diaData.es_descanso) { setLoading(false); return }

    const { data: itemsData } = await supabase
      .from('alumno_rutina_items')
      .select('*, ejercicio:catalogo_ejercicios(nombre, foto_inicio_url, foto_fin_url, musculo, zona, seg_principiante, seg_intermedio, seg_avanzado)')
      .eq('dia_id', diaData.id)
      .order('orden')

    const nivel = alumno.nivel?.toLowerCase() ?? 'principiante'
    const mapped: EjercicioItem[] = (itemsData ?? []).map((it: any) => {
      const seg = it.ejercicio
        ? nivel === 'avanzado'   ? it.ejercicio.seg_avanzado
        : nivel === 'intermedio' ? it.ejercicio.seg_intermedio
        : it.ejercicio.seg_principiante
        : 3
      return {
        id:              it.id,
        tipo:            it.tipo,
        orden:           it.orden,
        nombre:          it.ejercicio?.nombre ?? 'Descanso',
        foto_inicio_url: it.ejercicio?.foto_inicio_url,
        foto_fin_url:    it.ejercicio?.foto_fin_url,
        musculo:         it.ejercicio?.musculo,
        zona:            it.ejercicio?.zona,
        series:          it.series ?? 1,
        repeticiones:    it.repeticiones ?? '10',
        descanso_seg:    it.descanso_seg ?? 60,
        descanso_minutos:it.descanso_minutos ?? 2,
        seg_nivel:       seg ?? 3,
        notas:           it.notas,
      }
    })
    setItems(mapped)
    setLoading(false)
  }

  // Crossfade foto
  useEffect(() => {
    if (animRef.current) clearInterval(animRef.current)
    const item = items[itemActual]
    if (!item?.foto_inicio_url || !item?.foto_fin_url) return
    animRef.current = setInterval(() => setShowFin(v => !v), 2500)
    return () => { if (animRef.current) clearInterval(animRef.current) }
  }, [itemActual, items])

  // Timer
  const tick = useCallback(() => {
    setTimerSeg(prev => {
      if (prev <= 1) {
        clearInterval(intervalRef.current!)
        return 0
      }
      return prev - 1
    })
  }, [])

  function iniciarTimer(segundos: number) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimerSeg(segundos)
    setTimerMax(segundos)
    intervalRef.current = setInterval(tick, 1000)
  }

  // Al llegar a 0
  useEffect(() => {
    if (timerSeg !== 0) return
    if (estado === 'idle') return
    clearInterval(intervalRef.current!)

    const item = items[itemActual]
    if (!item) return

    if (estado === 'serie') {
      // Fin de serie — ¿hay más series?
      if (serieActual < (item.series ?? 1)) {
        setEstado('descanso_serie')
        iniciarTimer(item.descanso_seg ?? 60)
      } else {
        // Fin de todas las series — siguiente item
        const nextIdx = itemActual + 1
        if (nextIdx >= items.length) {
          setEstado('completado')
        } else {
          setItemActual(nextIdx)
          setSerieActual(1)
          const nextItem = items[nextIdx]
          if (nextItem.tipo === 'descanso') {
            setEstado('descanso_bloque')
            iniciarTimer((nextItem.descanso_minutos ?? 2) * 60)
          } else {
            setEstado('idle')
          }
        }
      }
    } else if (estado === 'descanso_serie') {
      setSerieActual(s => s + 1)
      setEstado('idle')
    } else if (estado === 'descanso_bloque') {
      const nextIdx = itemActual + 1
      if (nextIdx >= items.length) {
        setEstado('completado')
      } else {
        setItemActual(nextIdx)
        setSerieActual(1)
        setEstado('idle')
      }
    }
  }, [timerSeg])

  function handlePlay() {
    const item = items[itemActual]
    if (!item) return

    if (estado === 'idle') {
      if (item.tipo === 'descanso') {
        setEstado('descanso_bloque')
        iniciarTimer((item.descanso_minutos ?? 2) * 60)
      } else {
        const reps = parseInt(item.repeticiones ?? '10') || 10
        setEstado('serie')
        iniciarTimer(reps * (item.seg_nivel ?? 3))
      }
    } else if (estado === 'serie' || estado === 'descanso_serie' || estado === 'descanso_bloque') {
      // Pause
      clearInterval(intervalRef.current!)
      setEstado('idle')
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (animRef.current) clearInterval(animRef.current)
    }
  }, [])

  if (loading) return (
    <div className="fixed inset-0 bg-df-bg flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-df-border border-t-df-violet rounded-full animate-spin" />
    </div>
  )

  if (items.length === 0) return (
    <div className="fixed inset-0 bg-df-bg flex items-center justify-center flex-col gap-4">
      <i className="fa-solid fa-dumbbell text-4xl text-df-purple/30" />
      <p className="text-df-muted">No hay ejercicios para este día</p>
      <button onClick={() => navigate('/alumno')} className="df-btn px-6 py-2 text-sm">Volver</button>
    </div>
  )

  if (estado === 'completado') return (
    <div className="fixed inset-0 bg-df-bg circuit-bg flex items-center justify-center p-6">
      <div className="text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-green-900/30 border-2 border-green-500/40 flex items-center justify-center mx-auto animate-pulse">
          <i className="fa-solid fa-trophy text-4xl text-green-400" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white mb-2">¡Rutina completada!</h1>
          <p className="text-df-muted text-sm">{items.filter(i => i.tipo === 'ejercicio').length} ejercicios · {DIAS_LABEL[dia ?? '']}</p>
        </div>
        <button onClick={() => navigate('/alumno')} className="df-btn px-8 py-3 text-base flex items-center gap-2 mx-auto">
          <i className="fa-solid fa-house" /> Volver al inicio
        </button>
      </div>
    </div>
  )

  const item    = items[itemActual]
  const pct     = timerMax > 0 ? ((timerMax - timerSeg) / timerMax) * 100 : 0
  const circum  = 2 * Math.PI * 54
  const offset  = circum - (pct / 100) * circum
  const isPlaying = estado === 'serie' || estado === 'descanso_serie' || estado === 'descanso_bloque'

  const estadoLabel = estado === 'idle'            ? 'Presiona Play para comenzar'
    : estado === 'serie'          ? `Serie ${serieActual} de ${item?.series ?? 1} — En progreso`
    : estado === 'descanso_serie' ? `Descansa — Serie ${serieActual + 1} viene pronto`
    : estado === 'descanso_bloque'? 'Descanso entre bloques'
    : ''

  const estadoColor = estado === 'descanso_serie' || estado === 'descanso_bloque'
    ? 'text-amber-400 bg-amber-900/20 border-amber-500/20'
    : estado === 'serie'
    ? 'text-df-violet bg-df-purple/10 border-df-purple/20'
    : 'text-df-muted bg-df-surface border-df-border'

  return (
    <div className="fixed inset-0 bg-df-bg flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-df-card border-b border-df-border flex-shrink-0">
        <button onClick={() => navigate('/alumno/rutina')} className="text-df-muted hover:text-white transition-colors">
          <i className="fa-solid fa-arrow-left text-lg" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold text-white">{DIAS_LABEL[dia ?? '']}</p>
          <p className="text-[10px] text-df-muted">
            {items.filter((_, i) => i < itemActual && items[i].tipo === 'ejercicio').length + (item?.tipo === 'ejercicio' ? 1 : 0)} / {items.filter(i => i.tipo === 'ejercicio').length} ejercicios
          </p>
        </div>
        <div className="w-8" />
      </div>

      {/* Banda carrusel 3D */}
      <div className="flex-shrink-0 py-4 bg-df-card border-b border-df-border overflow-hidden"
        style={{ height: '130px', perspective: '600px' }}>
        <div className="flex items-center justify-center h-full gap-0 relative"
          style={{ transformStyle: 'preserve-3d' }}>
          {items.map((it, idx) => {
            const diff    = idx - itemActual
            const absDiff = Math.abs(diff)
            if (absDiff > 2) return null

            const scale   = diff === 0 ? 1 : diff === -1 || diff === 1 ? 0.72 : 0.52
            const rotateY = diff * 42
            const tx      = diff * 78
            const opacity = diff === 0 ? 1 : absDiff === 1 ? 0.65 : 0.35
            const zIndex  = diff === 0 ? 10 : absDiff === 1 ? 5 : 1
            const isActive = diff === 0

            return (
              <div key={it.id} style={{
                position: 'absolute',
                transform: `translateX(${tx}px) rotateY(${rotateY}deg) scale(${scale})`,
                transition: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
                opacity,
                zIndex,
                transformStyle: 'preserve-3d',
              }}>
                <div style={{
                  width: '80px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: isActive ? '2px solid #8B5CF6' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: isActive ? '0 0 20px rgba(139,92,246,0.5)' : 'none',
                  background: 'var(--color-background-secondary)',
                }}>
                  {/* Imagen */}
                  <div style={{ height: '70px', position: 'relative', overflow: 'hidden', background: '#0f0a1e' }}>
                    {it.foto_inicio_url ? (
                      <img src={it.foto_inicio_url} alt={it.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {it.tipo === 'descanso'
                          ? <i className="fa-solid fa-moon" style={{ fontSize: '24px', color: '#f59e0b' }} />
                          : <i className="fa-solid fa-dumbbell" style={{ fontSize: '24px', color: '#6b7280' }} />
                        }
                      </div>
                    )}
                    {isActive && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to bottom, rgba(139,92,246,0.15), transparent)',
                      }} />
                    )}
                  </div>
                  {/* Nombre */}
                  <div style={{ padding: '4px 6px', background: isActive ? 'rgba(139,92,246,0.15)' : 'transparent' }}>
                    <p style={{
                      fontSize: '9px', fontWeight: isActive ? 700 : 400,
                      color: isActive ? '#a78bfa' : '#6b7280',
                      margin: 0, textAlign: 'center',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {it.tipo === 'descanso' ? `${it.descanso_minutos}min` : (it.nombre ?? '').split(' ')[0]}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Foto ejercicio — crossfade */}
      <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center" style={{ minHeight: 0 }}>
        {item?.foto_inicio_url ? (
          <>
            <img src={item.foto_inicio_url} alt="inicio"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: showFin ? 0 : 1, transition: 'opacity 1.2s ease-in-out' }} />
            {item.foto_fin_url && (
              <img src={item.foto_fin_url} alt="fin"
                className="absolute inset-0 w-full h-full object-contain"
                style={{ opacity: showFin ? 1 : 0, transition: 'opacity 1.2s ease-in-out' }} />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 opacity-20">
            {item?.tipo === 'descanso'
              ? <i className="fa-solid fa-moon text-6xl text-amber-400" />
              : <i className="fa-solid fa-dumbbell text-6xl text-white" />
            }
          </div>
        )}

        {/* Badge músculo */}
        {item?.musculo && (
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1 flex items-center gap-1.5">
            <i className="fa-solid fa-crosshairs text-df-violet text-xs" />
            <span className="text-xs text-white font-medium">{item.musculo}</span>
          </div>
        )}

        {/* Overlay degradado abajo */}
        <div className="absolute bottom-0 left-0 right-0 h-16"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
      </div>

      {/* Panel inferior */}
      <div className="flex-shrink-0 bg-df-card border-t border-df-border px-4 pt-4 pb-5 space-y-3">

        {/* Nombre y detalles */}
        <div>
          <h2 className="text-lg font-black text-white truncate">{item?.nombre}</h2>
          {item?.tipo === 'ejercicio' && (
            <div className="flex gap-2 mt-1 flex-wrap">
              <span className="text-xs bg-df-surface text-df-muted px-2.5 py-1 rounded-full">
                {serieActual}/{item.series} series
              </span>
              <span className="text-xs bg-df-surface text-df-muted px-2.5 py-1 rounded-full">
                {item.repeticiones} reps
              </span>
              <span className="text-xs bg-df-surface text-df-muted px-2.5 py-1 rounded-full">
                {item.descanso_seg}s desc
              </span>
            </div>
          )}
          {item?.tipo === 'descanso' && (
            <p className="text-sm text-amber-400 mt-1">{item.descanso_minutos} minutos de descanso</p>
          )}
        </div>

        {/* Timer + Play */}
        <div className="flex items-center gap-4">
          {/* Timer circular */}
          <div className="relative flex-shrink-0" style={{ width: 80, height: 80 }}>
            <svg width="80" height="80" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none"
                stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <circle cx="60" cy="60" r="54" fill="none"
                stroke={estado === 'descanso_serie' || estado === 'descanso_bloque' ? '#f59e0b' : '#8B5CF6'}
                strokeWidth="8"
                strokeDasharray={circum}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%',
                  transition: 'stroke-dashoffset 0.8s ease-in-out',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-white leading-none">
                {timerMax > 0 ? timerSeg : item?.tipo === 'ejercicio'
                  ? (parseInt(item.repeticiones ?? '10') || 10) * (item.seg_nivel ?? 3)
                  : (item?.descanso_minutos ?? 2) * 60
                }
              </span>
              <span className="text-[9px] text-df-muted">seg</span>
            </div>
          </div>

          {/* Estado + Botón */}
          <div className="flex-1 space-y-2">
            <div className={`text-xs font-semibold px-3 py-2 rounded-xl border text-center ${estadoColor}`}>
              {estadoLabel}
            </div>
            <button onClick={handlePlay}
              className={`w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all
                ${isPlaying
                  ? 'bg-df-surface border border-df-border text-white hover:bg-df-border'
                  : 'bg-df-purple text-white hover:bg-df-violet'
                }`}
              style={!isPlaying ? { boxShadow: '0 4px 20px rgba(139,92,246,0.4)' } : {}}>
              <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm`} />
              {isPlaying ? 'Pausar' : (estado as string) === 'descanso_serie' ? 'Continuar descanso' : 'Play'}
            </button>
          </div>
        </div>

        {/* Notas */}
        {item?.notas && (
          <p className="text-xs text-df-muted italic border-t border-df-border pt-2">
            <i className="fa-solid fa-note-sticky mr-1 text-df-violet" />
            {item.notas}
          </p>
        )}
      </div>
    </div>
  )
}