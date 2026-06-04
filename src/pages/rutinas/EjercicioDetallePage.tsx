import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Ejercicio } from '@/lib/supabase'
import { Spinner } from '@/components/ui/index'

function formatTiempo(segundos: number): string {
  if (segundos < 60) return `${Math.round(segundos)}s`
  const m = Math.floor(segundos / 60)
  const s = Math.round(segundos % 60)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export default function EjercicioDetallePage() {
  const { id } = useParams<{ id: string }>()
  const [ejercicio, setEjercicio] = useState<Ejercicio | null>(null)
  const [loading, setLoading]     = useState(true)
  const [fotoActual, setFotoActual] = useState<'inicio' | 'fin'>('inicio')
  const [animando, setAnimando]     = useState(true)
  const [opacity, setOpacity]       = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!id) return
    supabase.from('ejercicios').select('*').eq('id', id).single()
      .then(({ data }) => { setEjercicio(data); setLoading(false) })
  }, [id])

  // Animación loop entre foto inicio y fin
  useEffect(() => {
    if (!animando || !ejercicio?.foto_inicio_url || !ejercicio?.foto_fin_url) return

    const velocidad = ((ejercicio.seg_por_rep ?? 2) * 1000) / 2 // mitad del ciclo

    intervalRef.current = setInterval(() => {
      // fade out
      setOpacity(0)
      setTimeout(() => {
        setFotoActual(f => f === 'inicio' ? 'fin' : 'inicio')
        // fade in
        setOpacity(1)
      }, 300)
    }, velocidad)

    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [animando, ejercicio])

  if (loading) return <Spinner />
  if (!ejercicio) return <p className="text-df-muted p-8 text-center">Ejercicio no encontrado</p>

  const fotoUrl = fotoActual === 'inicio' ? ejercicio.foto_inicio_url : ejercicio.foto_fin_url
  const tieneAnimacion = ejercicio.foto_inicio_url && ejercicio.foto_fin_url

  // Cálculo de tiempo estimado
  const segPorRep   = ejercicio.seg_por_rep ?? 2
  const tiempoEj    = ejercicio.series * Number(ejercicio.repeticiones) * segPorRep
  const tiempoDesc  = ejercicio.descanso_seg * (ejercicio.series - 1)
  const tiempoTotal = tiempoEj + tiempoDesc

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => history.back()}
        className="inline-flex items-center gap-2 text-xs text-df-muted hover:text-white transition-colors">
        <i className="fa-solid fa-arrow-left" /> Volver a la rutina
      </button>

      {/* Número y nombre */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-df-purple/20 border border-df-purple/30 flex items-center justify-center text-df-violet font-black text-sm flex-shrink-0">
          {ejercicio.orden}
        </div>
        <h1 className="text-xl font-black text-white">{ejercicio.nombre}</h1>
      </div>

      {/* Animación de fotos */}
      <div className="df-card overflow-hidden">
        {tieneAnimacion ? (
          <div className="relative">
            {/* Foto animada */}
            <div className="relative h-72 bg-gradient-to-b from-df-purple/10 to-df-card flex items-center justify-center overflow-hidden">
              <img
                src={fotoUrl!}
                alt={ejercicio.nombre}
                style={{
                  opacity,
                  transition: 'opacity 0.3s ease',
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'contain',
                }}
              />
              {/* Indicador fase */}
              <div className="absolute top-3 left-3">
                <span className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                  fotoActual === 'inicio'
                    ? 'bg-df-purple/80 text-white'
                    : 'bg-df-pink/80 text-white'
                }`}>
                  {fotoActual === 'inicio' ? '↓ Bajada' : '↑ Subida'}
                </span>
              </div>
              {/* Control play/pause */}
              <button
                onClick={() => setAnimando(a => !a)}
                className="absolute top-3 right-3 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-all">
                <i className={`fa-solid ${animando ? 'fa-pause' : 'fa-play'} text-xs`} />
              </button>
            </div>

            {/* Barra de progreso de fase */}
            <div className="h-1 bg-df-border">
              <div
                className="h-full bg-gradient-to-r from-df-purple to-df-pink"
                style={{
                  width: fotoActual === 'inicio' ? '50%' : '100%',
                  transition: `width ${(segPorRep * 1000) / 2}ms linear`,
                }}
              />
            </div>

            {/* Miniaturas */}
            <div className="flex gap-3 p-4">
              <button onClick={() => { setAnimando(false); setFotoActual('inicio') }}
                className={`flex-1 h-16 rounded-xl overflow-hidden border-2 transition-all ${fotoActual === 'inicio' && !animando ? 'border-df-violet' : 'border-df-border'}`}>
                <img src={ejercicio.foto_inicio_url!} alt="Inicio" className="w-full h-full object-contain bg-df-surface" />
              </button>
              <button onClick={() => { setAnimando(false); setFotoActual('fin') }}
                className={`flex-1 h-16 rounded-xl overflow-hidden border-2 transition-all ${fotoActual === 'fin' && !animando ? 'border-df-pink' : 'border-df-border'}`}>
                <img src={ejercicio.foto_fin_url!} alt="Fin" className="w-full h-full object-contain bg-df-surface" />
              </button>
              <button onClick={() => { setAnimando(true); setFotoActual('inicio') }}
                className="w-16 h-16 rounded-xl bg-df-purple/20 border border-df-purple/30 flex items-center justify-center text-df-violet hover:bg-df-purple/40 transition-all">
                <i className="fa-solid fa-rotate text-lg" />
              </button>
            </div>
          </div>
        ) : (
          /* Sin fotos — placeholder */
          <div className="h-48 flex items-center justify-center bg-df-surface/50">
            <div className="text-center text-df-muted">
              <i className="fa-solid fa-dumbbell text-3xl mb-2 block text-df-purple/40" />
              <p className="text-xs">Sin imágenes del ejercicio</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats del ejercicio */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Series',       value: ejercicio.series,          icon: 'fa-solid fa-layer-group',    color: 'text-df-violet' },
          { label: 'Repeticiones', value: ejercicio.repeticiones,    icon: 'fa-solid fa-repeat',          color: 'text-df-pink' },
          { label: 'Descanso',     value: `${ejercicio.descanso_seg}s`, icon: 'fa-solid fa-clock',        color: 'text-amber-400' },
        ].map((s, i) => (
          <div key={i} className="df-surface p-3 rounded-xl text-center">
            <i className={`${s.icon} ${s.color} text-lg mb-1 block`} />
            <p className="text-lg font-black text-white">{s.value}</p>
            <p className="text-[10px] text-df-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tiempo estimado */}
      <div className="df-card p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-df-purple/10 to-transparent pointer-events-none" />
        <h3 className="text-xs font-bold text-df-muted uppercase tracking-wider mb-3">
          Tiempo estimado
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xl font-black text-white">{formatTiempo(tiempoEj)}</p>
            <p className="text-[10px] text-df-muted">Ejercicio</p>
          </div>
          <div>
            <p className="text-xl font-black text-amber-400">{formatTiempo(tiempoDesc)}</p>
            <p className="text-[10px] text-df-muted">Descanso</p>
          </div>
          <div>
            <p className="text-xl font-black text-df-pink">{formatTiempo(tiempoTotal)}</p>
            <p className="text-[10px] text-df-muted">Total</p>
          </div>
        </div>
        <div className="mt-3 text-[10px] text-df-muted text-center">
          {ejercicio.series} series × {ejercicio.repeticiones} reps × {segPorRep}s por rep + {ejercicio.descanso_seg}s descanso × {ejercicio.series - 1}
        </div>
      </div>

      {/* Notas */}
      {ejercicio.notas && (
        <div className="df-surface p-4 rounded-xl">
          <p className="text-xs font-bold text-df-muted uppercase tracking-wider mb-2">Notas del instructor</p>
          <p className="text-sm text-df-text leading-relaxed">{ejercicio.notas}</p>
        </div>
      )}
    </div>
  )
}