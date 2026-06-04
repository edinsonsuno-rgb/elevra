import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Sesion } from '@/lib/supabase'
import { EstadoSesionBadge, Spinner, EmptyState } from '@/components/ui/index'

export default function AgendaPage() {
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [loading, setLoading]   = useState(true)
  const [filtro, setFiltro]     = useState<string>('Todas')

  const hoy = new Date().toISOString().split('T')[0]

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data } = await supabase
      .from('sesiones').select('*, alumno:alumnos(nombre,foto_url)')
      .gte('fecha', hoy).order('fecha').order('hora_inicio')
    setSesiones((data as any) ?? [])
    setLoading(false)
  }

  const estados = ['Todas', 'Programada', 'Completada', 'Cancelada']
  const filtradas = filtro === 'Todas' ? sesiones : sesiones.filter(s => s.estado === filtro)

  // Agrupar por fecha
  const grupos = filtradas.reduce<Record<string, Sesion[]>>((acc, s) => {
    if (!acc[s.fecha]) acc[s.fecha] = []
    acc[s.fecha].push(s)
    return acc
  }, {})

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Agenda</h1>
          <p className="text-df-muted text-sm mt-0.5">{sesiones.filter(s => s.fecha === hoy).length} sesiones hoy</p>
        </div>
        <Link to="/agenda/nueva" className="df-btn px-4 py-2.5 text-sm flex items-center gap-2">
          <i className="fa-solid fa-calendar-plus" /> Nueva sesión
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {estados.map(e => (
          <button key={e} onClick={() => setFiltro(e)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all
              ${filtro === e ? 'bg-df-purple text-white' : 'df-surface text-df-muted hover:text-white'}`}>
            {e}
          </button>
        ))}
      </div>

      {/* Timeline por día */}
      {Object.keys(grupos).length === 0
        ? <EmptyState icon="fa-solid fa-calendar-xmark" title="Sin sesiones" desc="No hay sesiones programadas próximamente" />
        : Object.entries(grupos).map(([fecha, items]) => {
          const esHoy = fecha === hoy
          const fechaObj = new Date(fecha + 'T12:00:00')
          const etiqueta = esHoy ? 'Hoy' : fechaObj.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
          return (
            <div key={fecha}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full
                  ${esHoy ? 'bg-df-purple text-white' : 'text-df-muted'}`}>
                  {etiqueta}
                </span>
                <div className="flex-1 h-px bg-df-border" />
              </div>
              <div className="space-y-2">
                {items.map(s => (
                  <div key={s.id} className="df-surface p-4 rounded-xl flex items-center gap-4 hover:border-df-violet/30 transition-all">
                    <div className="text-center flex-shrink-0 w-14">
                      <p className="text-lg font-black text-df-violet leading-none">{s.hora_inicio.slice(0,5)}</p>
                      {s.hora_fin && <p className="text-[10px] text-df-muted mt-0.5">{s.hora_fin.slice(0,5)}</p>}
                    </div>
                    <div className="w-px h-10 bg-df-border flex-shrink-0" />
                    <div className="w-10 h-10 rounded-xl bg-df-purple/20 flex items-center justify-center flex-shrink-0">
                      <i className={`fa-solid ${s.tipo === 'Online' ? 'fa-video' : 'fa-location-dot'} text-df-violet text-sm`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{s.titulo}</p>
                      <p className="text-xs text-df-muted">{(s.alumno as any)?.nombre} · {s.tipo}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <EstadoSesionBadge estado={s.estado} />
                      {s.link_videollamada && s.estado === 'Programada' && (
                        <a href={s.link_videollamada} target="_blank" rel="noreferrer"
                          className="w-8 h-8 bg-df-purple/20 rounded-lg flex items-center justify-center text-df-violet hover:bg-df-purple/40 transition-all">
                          <i className="fa-solid fa-video text-xs" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      }
    </div>
  )
}
