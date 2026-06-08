import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAlumnoId } from '@/hooks/useAlumnoId'
import { Spinner } from '@/components/ui/index'

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'] as const
const DIAS_LABEL: Record<string, string> = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miércoles',
  jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo'
}
const DIAS_MAP: Record<number, string> = {
  0:'domingo', 1:'lunes', 2:'martes', 3:'miercoles', 4:'jueves', 5:'viernes', 6:'sabado'
}

interface DiaInfo {
  dia_semana: string
  es_descanso: boolean
  count: number
}

export default function AlumnoRutinaPage() {
  const { alumnoId, loading: loadingAlumno } = useAlumnoId()
  const navigate  = useNavigate()
  const [dias,    setDias]    = useState<DiaInfo[]>([])
  const [loading, setLoading] = useState(true)
  const hoy = DIAS_MAP[new Date().getDay()]

  useEffect(() => {
    if (loadingAlumno) return
    if (!alumnoId) { setLoading(false); return }
    cargar(alumnoId)
  }, [alumnoId, loadingAlumno])

  async function cargar(id: string) {
    const { data: rutina } = await supabase
      .from('alumno_rutinas')
      .select('id, alumno_rutina_dias(dia_semana, es_descanso, alumno_rutina_items(id))')
      .eq('alumno_id', id)
      .eq('activa', true)
      .maybeSingle()

    if (rutina) {
      const diasData = (rutina as any).alumno_rutina_dias?.map((d: any) => ({
        dia_semana:  d.dia_semana,
        es_descanso: d.es_descanso,
        count:       d.alumno_rutina_items?.length ?? 0,
      })) ?? []
      // Ordenar por día de la semana
      const ordered = DIAS.map(d => diasData.find((x: DiaInfo) => x.dia_semana === d)).filter(Boolean) as DiaInfo[]
      setDias(ordered)
    }
    setLoading(false)
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4 pt-2">
      <h1 className="text-lg font-black text-white">Mi rutina semanal</h1>

      {dias.length === 0 ? (
        <div className="df-card p-8 text-center">
          <i className="fa-solid fa-dumbbell text-3xl text-df-purple/30 mb-3 block" />
          <p className="text-sm text-df-muted">Tu instructor aún no ha asignado una rutina</p>
        </div>
      ) : (
        <div className="space-y-3">
          {dias.map(dia => {
            const esHoy = dia.dia_semana === hoy
            return (
              <div key={dia.dia_semana}
                className={`df-card overflow-hidden transition-all
                  ${dia.es_descanso ? 'border-amber-500/20' : esHoy ? 'border-df-violet/40' : ''}`}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full
                      ${dia.es_descanso
                        ? 'bg-amber-900/30 text-amber-400'
                        : esHoy
                        ? 'bg-df-purple text-white'
                        : 'bg-df-purple/20 text-df-violet'}`}>
                      {DIAS_LABEL[dia.dia_semana]}
                      {esHoy && <span className="ml-1 opacity-70">· hoy</span>}
                    </span>
                    {dia.es_descanso ? (
                      <span className="text-xs text-amber-400 flex items-center gap-1.5">
                        <i className="fa-solid fa-moon text-xs" /> Descanso
                      </span>
                    ) : (
                      <span className="text-xs text-df-muted">{dia.count} ejercicio(s)</span>
                    )}
                  </div>

                  {!dia.es_descanso && (
                    <button
                      onClick={() => navigate(`/alumno/entrenamiento/${dia.dia_semana}`)}
                      className="df-btn px-4 py-2 text-xs flex items-center gap-1.5">
                      <i className="fa-solid fa-play text-xs" />
                      {esHoy ? 'Entrenar' : 'Ver'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}