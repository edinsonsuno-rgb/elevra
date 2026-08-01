import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useAlumnoId } from '@/hooks/useAlumnoId'
import { useTenant } from '@/contexts/TenantContext'
import { Spinner } from '@/components/ui/index'

const DIAS_MAP: Record<number, string> = {
  0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miercoles',
  4: 'jueves',  5: 'viernes', 6: 'sabado'
}
const DIAS_LABEL: Record<string, string> = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miércoles',
  jueves:'Jueves', viernes:'Viernes', sabado:'Sábado', domingo:'Domingo'
}
const DIAS_ORDER = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']

interface PlanActivo {
  fecha_fin: string
  plan: { nombre: string }
}
interface DiaRutina {
  dia_semana: string
  es_descanso: boolean
  _count: number
}
interface Sesion {
  id: string; titulo: string; tipo: string; fecha: string; hora_inicio: string
}
interface Pago {
  id: string; concepto: string; monto: number; estado: string
}

function diasRestantes(fechaFin: string): number {
  const fin  = new Date(fechaFin + 'T23:59:59')
  const diff = Math.ceil((fin.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function pctPlan(inicio: string, fin: string): number {
  const s = new Date(inicio).getTime()
  const e = new Date(fin).getTime()
  const n = new Date().getTime()
  return Math.min(100, Math.max(0, Math.round(((n - s) / (e - s)) * 100)))
}

export default function AlumnoDashboard() {
  const { displayName } = useAuth()
  const { tenant } = useTenant()
  const navigate = useNavigate()
  const { alumnoId, loading: loadingAlumno } = useAlumnoId()

  const [planActivo,  setPlanActivo]  = useState<any | null>(null)
  const [diasRutina,  setDiasRutina]  = useState<DiaRutina[]>([])
  const [sesiones,    setSesiones]    = useState<Sesion[]>([])
  const [pagos,       setPagos]       = useState<Pago[]>([])
  const [loading,     setLoading]     = useState(true)
  const [fraseProfe,  setFraseProfe]  = useState<string | null>(null)
  const [diaSeleccionado, setDiaSeleccionado] = useState(DIAS_MAP[new Date().getDay()])

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  useEffect(() => {
    if (loadingAlumno) return
    if (!alumnoId) { setLoading(false); return }
    cargar(alumnoId)
  }, [alumnoId, loadingAlumno])

  useEffect(() => {
    if (!tenant?.id) return
    supabase.from('profiles')
      .select('motivational_phrase')
      .eq('tenant_id', tenant.id)
      .eq('role', 'instructor')
      .single()
      .then(({ data }) => setFraseProfe(data?.motivational_phrase ?? null))
  }, [tenant?.id])

  async function cargar(id: string) {
    const hoy = new Date().toISOString().split('T')[0]

    const [{ data: planes }, { data: rutina }, { data: ses }, { data: pag }] = await Promise.all([
      supabase.from('alumno_planes')
        .select('*, plan:planes(nombre)')
        .eq('alumno_id', id)
        .gte('fecha_fin', hoy)
        .order('fecha_inicio', { ascending: false })
        .limit(1),
      supabase.from('alumno_rutinas')
        .select('id, alumno_rutina_dias(dia_semana, es_descanso, alumno_rutina_items(id))')
        .eq('alumno_id', id)
        .eq('activa', true)
        .maybeSingle(),
      supabase.from('sesiones')
        .select('id, titulo, tipo, fecha, hora_inicio')
        .eq('alumno_id', id)
        .gte('fecha', hoy)
        .order('fecha').order('hora_inicio')
        .limit(3),
      supabase.from('pagos')
        .select('id, concepto, monto, estado')
        .eq('alumno_id', id)
        .neq('estado', 'Pagado')
        .limit(2),
    ])

    setPlanActivo((planes as any)?.[0] ?? null)
    setSesiones(ses ?? [])
    setPagos(pag ?? [])

    if (rutina) {
      const dias = (rutina as any).alumno_rutina_dias?.map((d: any) => ({
        dia_semana:  d.dia_semana,
        es_descanso: d.es_descanso,
        _count:      d.alumno_rutina_items?.length ?? 0,
      })) ?? []
      setDiasRutina(dias)
    }
    setLoading(false)
  }

  const diaInfo = diasRutina.find(d => d.dia_semana === diaSeleccionado)
  const dias    = planActivo ? diasRestantes(planActivo.fecha_fin) : 0

  if (loading) return <Spinner />

  return (
    <div className="space-y-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-df-muted">{saludo} 💪</p>
          <h1 className="text-lg font-black text-white">Hola, {displayName ?? 'Alumno'} 👋</h1>
        </div>
        <div className="w-9 h-9 rounded-full bg-df-purple/20 border border-df-purple/30 flex items-center justify-center font-bold text-df-violet">
          {(displayName ?? 'A').charAt(0).toUpperCase()}
        </div>
      </div>

      {/* Mensaje motivacional del instructor */}
      {fraseProfe && (
        <div className="df-card p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-df-purple/10 to-transparent pointer-events-none" />
          <p className="text-sm text-df-text italic leading-relaxed">
            <i className="fa-solid fa-quote-left text-df-violet text-xs mr-1.5" />
            {fraseProfe}
          </p>
        </div>
      )}

      {/* Plan activo */}
      {planActivo ? (
        <div className="df-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-df-muted uppercase tracking-wider">Mi plan</p>
            <span className="df-badge-done text-xs">Activo</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-white">{(planActivo.plan as any).nombre}</p>
              <p className="text-xs text-df-muted">Vence {planActivo.fecha_fin}</p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-black ${dias <= 3 ? 'text-red-400' : 'text-df-violet'}`}>{dias}</p>
              <p className="text-[10px] text-df-muted">días</p>
            </div>
          </div>
          <div className="h-1.5 bg-df-border rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-df-purple to-df-pink"
              style={{ width: `${pctPlan(planActivo.fecha_inicio, planActivo.fecha_fin)}%` }} />
          </div>
        </div>
      ) : (
        <div className="df-card p-4 border-amber-500/30">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-triangle-exclamation text-amber-400" />
            <p className="text-sm text-amber-400">Sin plan activo — contacta a tu instructor</p>
          </div>
        </div>
      )}

      {/* Rutina del día */}
      <div className="df-card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-df-muted uppercase tracking-wider">Rutina</p>
          <select value={diaSeleccionado} onChange={e => setDiaSeleccionado(e.target.value)}
            className="df-input py-1 px-3 text-xs w-36">
            {DIAS_ORDER.map(d => (
              <option key={d} value={d}>
                {DIAS_LABEL[d]}{d === DIAS_MAP[new Date().getDay()] ? ' (hoy)' : ''}
              </option>
            ))}
          </select>
        </div>

        {diasRutina.length === 0 ? (
          <div className="df-surface p-3 rounded-xl text-center">
            <p className="text-xs text-df-muted">Sin rutina asignada</p>
          </div>
        ) : !diaInfo ? (
          <div className="df-surface p-3 rounded-xl text-center">
            <p className="text-xs text-df-muted">Sin información para {DIAS_LABEL[diaSeleccionado]}</p>
          </div>
        ) : diaInfo.es_descanso ? (
          <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
            <i className="fa-solid fa-moon text-amber-400 text-lg" />
            <div>
              <p className="text-sm font-bold text-amber-400">Día de descanso</p>
              <p className="text-xs text-amber-400/70">{DIAS_LABEL[diaSeleccionado]} no tiene entrenamiento</p>
            </div>
          </div>
        ) : (
          <>
            <div className="df-surface p-3 rounded-xl flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-df-purple/20 flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-dumbbell text-df-violet text-sm" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Día de entrenamiento</p>
                <p className="text-xs text-df-muted">{diaInfo._count} ejercicio(s)</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/alumno/entrenamiento/${diaSeleccionado}`)}
              className="df-btn w-full py-2.5 text-sm flex items-center justify-center gap-2">
              <i className="fa-solid fa-play text-xs" /> Ver rutina de hoy
            </button>
          </>
        )}
      </div>

      {/* Próximas sesiones */}
      {sesiones.length > 0 && (
        <div className="df-card p-4">
          <p className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-3">Próximas sesiones</p>
          <div className="space-y-2">
            {sesiones.map(s => (
              <div key={s.id} className="flex items-center gap-3 df-surface p-3 rounded-xl">
                <div className="bg-df-purple/20 rounded-lg px-2 py-1.5 text-center flex-shrink-0">
                  <p className="text-sm font-black text-df-violet leading-none">{s.hora_inicio.slice(0,5)}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{s.titulo}</p>
                  <p className="text-xs text-df-muted">{s.fecha} · {s.tipo}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagos pendientes */}
      {pagos.length > 0 && (
        <div className="bg-amber-900/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <i className="fa-solid fa-triangle-exclamation text-amber-400 text-sm" />
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pago pendiente</p>
          </div>
          {pagos.map(p => (
            <div key={p.id} className="flex items-center justify-between">
              <p className="text-xs text-amber-400/80">{p.concepto}</p>
              <p className="text-xs font-bold text-amber-400">${p.monto.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}