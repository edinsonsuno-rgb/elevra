import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAlumnoId } from '@/hooks/useAlumnoId'
import { EstadoSesionBadge, Spinner } from '@/components/ui/index'

interface Sesion {
  id: string; titulo: string; tipo: string; estado: string
  fecha: string; hora_inicio: string; hora_fin: string | null
  link_videollamada: string | null; notas: string | null
}

export default function AlumnoSesionesPage() {
  const { alumnoId, loading: loadingAlumno } = useAlumnoId()
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [loading,  setLoading]  = useState(true)
  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (loadingAlumno) return
    if (!alumnoId) { setLoading(false); return }
    cargar(alumnoId)
  }, [alumnoId, loadingAlumno])

  async function cargar(id: string) {
    const { data } = await supabase
      .from('sesiones').select('*')
      .eq('alumno_id', id)
      .gte('fecha', hoy)
      .order('fecha').order('hora_inicio')
    setSesiones(data ?? [])
    setLoading(false)
  }

  // Agrupar por fecha
  const grupos = sesiones.reduce<Record<string, Sesion[]>>((acc, s) => {
    if (!acc[s.fecha]) acc[s.fecha] = []
    acc[s.fecha].push(s)
    return acc
  }, {})

  if (loading) return <Spinner />

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-lg font-black text-white">Mis sesiones</h1>

      {Object.keys(grupos).length === 0 ? (
        <div className="df-card p-8 text-center">
          <i className="fa-solid fa-calendar-xmark text-3xl text-df-purple/30 mb-3 block" />
          <p className="text-sm text-df-muted">No tienes sesiones programadas</p>
        </div>
      ) : (
        Object.entries(grupos).map(([fecha, items]) => {
          const esHoy = fecha === hoy
          const fechaObj = new Date(fecha + 'T12:00:00')
          const etiqueta = esHoy ? 'Hoy' : fechaObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
          return (
            <div key={fecha}>
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full
                  ${esHoy ? 'bg-df-purple text-white' : 'text-df-muted'}`}>
                  {etiqueta}
                </span>
                <div className="flex-1 h-px bg-df-border" />
              </div>
              <div className="space-y-2">
                {items.map(s => (
                  <div key={s.id} className="df-card p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 text-center flex-shrink-0">
                        <p className="text-base font-black text-df-violet leading-none">{s.hora_inicio.slice(0,5)}</p>
                        {s.hora_fin && <p className="text-[10px] text-df-muted">{s.hora_fin.slice(0,5)}</p>}
                      </div>
                      <div className="w-px h-10 bg-df-border flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{s.titulo}</p>
                        <p className="text-xs text-df-muted">{s.tipo}</p>
                      </div>
                      <EstadoSesionBadge estado={s.estado} />
                    </div>
                    {s.link_videollamada && s.estado === 'Programada' && (
                      <a href={s.link_videollamada} target="_blank" rel="noreferrer"
                        className="df-btn mt-3 w-full py-2 text-xs flex items-center justify-center gap-2">
                        <i className="fa-solid fa-video text-xs" /> Unirse a la videollamada
                      </a>
                    )}
                    {s.notas && (
                      <p className="text-xs text-df-muted mt-2 italic">{s.notas}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}