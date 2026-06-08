import { useEffect, useState, FormEvent } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/index'
import { useAuth } from '@/hooks/useAuth'

interface Plan {
  id: string
  nombre: string
  tipo: 'dias' | 'meses'
  cantidad: number
  es_invitado: boolean
  slug: string | null
  activo: boolean
}

interface Alumno {
  id: string
  nombre: string
  documento: string | null
  tipo_documento: string | null
}

interface HistorialPlan {
  id: string
  fecha_inicio: string
  fecha_fin: string
  dias_plan: number
  es_invitado: boolean
  plan: { nombre: string }
}

function calcularFechaFin(fechaInicio: string, tipo: 'dias' | 'meses', cantidad: number): string {
  const fecha = new Date(fechaInicio + 'T12:00:00')
  if (tipo === 'dias') {
    fecha.setDate(fecha.getDate() + cantidad - 1)
  } else {
    fecha.setMonth(fecha.getMonth() + cantidad)
    fecha.setDate(fecha.getDate() - 1)
  }
  return fecha.toISOString().split('T')[0]
}

export default function AsignarPlanPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, tenantId } = useAuth()

  const [alumno,    setAlumno]    = useState<Alumno | null>(null)
  const [planes,    setPlanes]    = useState<Plan[]>([])
  const [historial, setHistorial] = useState<HistorialPlan[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [yaUsoInvitado, setYaUsoInvitado] = useState(false)

  const [planSeleccionado, setPlanSeleccionado] = useState<Plan | null>(null)
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => { cargar() }, [id])

  async function cargar() {
    const [
      { data: alumnoData },
      { data: planesData },
      { data: historialData },
    ] = await Promise.all([
      supabase.from('alumnos').select('id, nombre, documento, tipo_documento').eq('id', id!).single(),
      supabase.from('planes').select('*').eq('activo', true).order('es_invitado', { ascending: false }),
      supabase.from('alumno_planes').select('*, plan:planes(nombre)').eq('alumno_id', id!).order('created_at', { ascending: false }),
    ])
    setAlumno(alumnoData)
    setPlanes(planesData ?? [])
    setHistorial((historialData as any) ?? [])

    // Si tiene plan activo, la fecha inicio del nuevo plan es el día siguiente al vencimiento
    const hoy = new Date().toISOString().split('T')[0]
    const planVigente = (historialData ?? []).find((h: any) => h.fecha_fin >= hoy)
    if (planVigente) {
      const siguienteDia = new Date(planVigente.fecha_fin + 'T12:00:00')
      siguienteDia.setDate(siguienteDia.getDate() + 1)
      setFechaInicio(siguienteDia.toISOString().split('T')[0])
    }

    const usoCortesia = (historialData ?? []).some((h: any) => h.es_invitado)
    setYaUsoInvitado(usoCortesia)
    setLoading(false)
  }

  const fechaFin = planSeleccionado
    ? calcularFechaFin(fechaInicio, planSeleccionado.tipo, planSeleccionado.cantidad)
    : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!planSeleccionado) { setError('Selecciona un plan'); return }
    if (planSeleccionado.es_invitado && yaUsoInvitado) {
      setError('Este alumno ya usó su cortesía y no puede volver a usar un plan invitado')
      return
    }
    setSaving(true); setError(null)

    const dias = planSeleccionado.tipo === 'dias'
      ? planSeleccionado.cantidad
      : planSeleccionado.cantidad * 30

    const { error: err } = await supabase.from('alumno_planes').insert({
      alumno_id:    id!,
      plan_id:      planSeleccionado.id,
      tenant_id:    tenantId!,
      fecha_inicio: fechaInicio,
      fecha_fin:    fechaFin,
      dias_plan:    dias,
      precio_dia:   0,
      costo_total:  0,
      es_invitado:  planSeleccionado.es_invitado,
      activado_por: user?.id,
    })

    if (err) { setError(err.message); setSaving(false); return }
    // Fire-and-forget: marcar alumno activo mientras se navega.
    // El plan ya quedó guardado; este campo es derivado.
    supabase.from('alumnos').update({ activo: true }).eq('id', id!)
    navigate(`/alumnos/${id}`)
  }

  if (loading) return <Spinner />
  if (!alumno) return <p className="text-df-muted p-8 text-center">Alumno no encontrado</p>

  const planesDisponibles = planes.filter(p => !(p.es_invitado && yaUsoInvitado))

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/alumnos/${id}`} className="text-df-muted hover:text-white transition-colors">
          <i className="fa-solid fa-arrow-left" />
        </Link>
        <div>
          <h1 className="text-xl font-black text-white">Asignar plan</h1>
          <p className="text-xs text-df-muted">
            {alumno.nombre} · {alumno.tipo_documento} {alumno.documento}
          </p>
        </div>
      </div>

      {/* Aviso cortesía ya usada */}
      {yaUsoInvitado && (
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-400">
          <i className="fa-solid fa-triangle-exclamation" />
          Este alumno ya usó su plan de cortesía. Solo puede acceder a planes de pago.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selección de plan */}
        <div className="df-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-white">Seleccionar plan</h2>

          {planesDisponibles.length === 0 && (
            <p className="text-xs text-df-muted text-center py-4">
              No hay planes disponibles para este alumno
            </p>
          )}

          {planesDisponibles.map(plan => (
            <button key={plan.id} type="button"
              onClick={() => setPlanSeleccionado(plan)}
              className={`w-full p-4 rounded-xl border text-left transition-all
                ${planSeleccionado?.id === plan.id
                  ? 'border-df-violet bg-df-purple/10'
                  : 'border-df-border hover:border-df-violet/40 df-surface'}`}>
              <div className="flex items-center gap-3">
                {/* Radio */}
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                  ${planSeleccionado?.id === plan.id ? 'border-df-violet' : 'border-df-border'}`}>
                  {planSeleccionado?.id === plan.id && (
                    <div className="w-2 h-2 rounded-full bg-df-violet" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{plan.nombre}</p>
                  <p className="text-xs text-df-muted">
                    {plan.cantidad} {plan.tipo === 'meses' ? 'mes(es)' : 'día(s)'}
                    {' · '}
                    {plan.tipo === 'dias' ? plan.cantidad : plan.cantidad * 30} días en total
                  </p>
                </div>
                {plan.es_invitado && (
                  <span className="df-badge-beg text-xs flex-shrink-0">Cortesía</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Fecha inicio */}
        {planSeleccionado && (
          <div className="df-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-white">Fecha de inicio</h2>
            <input type="date" value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="df-input" />

            {/* Resumen */}
            <div className="bg-df-purple/10 border border-df-purple/20 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-df-muted">Plan</span>
                <span className="text-white font-semibold">{planSeleccionado.nombre}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-df-muted">Inicio</span>
                <span className="text-white font-semibold">{fechaInicio}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-df-muted">Vence</span>
                <span className="text-white font-semibold">{fechaFin}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-df-muted">Duración</span>
                <span className="text-white font-semibold">
                  {planSeleccionado.tipo === 'dias' ? planSeleccionado.cantidad : planSeleccionado.cantidad * 30} días
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Historial */}
        {historial.length > 0 && (
          <div className="df-card p-5">
            <h2 className="text-sm font-bold text-white mb-3">Historial de planes</h2>
            <div className="space-y-2">
              {historial.slice(0, 5).map(h => (
                <div key={h.id}
                  className="flex items-center justify-between py-2 border-b border-df-border last:border-0">
                  <div>
                    <p className="text-xs font-semibold text-white">{(h.plan as any).nombre}</p>
                    <p className="text-[10px] text-df-muted">{h.fecha_inicio} → {h.fecha_fin}</p>
                  </div>
                  {h.es_invitado && (
                    <span className="df-badge-beg text-[10px]">Cortesía</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
          <button type="submit" disabled={saving || !planSeleccionado}
            className="df-btn px-6 py-3 text-sm flex-1 flex items-center justify-center gap-2 disabled:opacity-40">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Activando...</>
              : <><i className="fa-solid fa-check" /> Activar plan</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}