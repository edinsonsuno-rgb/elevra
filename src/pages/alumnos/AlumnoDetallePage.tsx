import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Avatar, NivelBadge, EstadoSesionBadge, EstadoPagoBadge, Spinner } from '@/components/ui/index'

interface Alumno {
  id: string; nombre: string; email: string | null; telefono: string | null
  foto_url: string | null; nivel: 'Principiante' | 'Intermedio' | 'Avanzado'
  objetivo: string | null; activo: boolean; documento: string | null
  tipo_documento: string | null; notas: string | null; created_at: string
}

interface PlanHistorial {
  id: string; fecha_inicio: string; fecha_fin: string; dias_plan: number
  es_invitado: boolean; created_at: string
  plan: { nombre: string; tipo: string; cantidad: number }
}

interface Sesion {
  id: string; titulo: string; tipo: string; estado: string; fecha: string; hora_inicio: string
}

interface Pago {
  id: string; concepto: string; monto: number; estado: string; fecha_vencimiento: string
}

function horasDesde(fechaStr: string): number {
  const diff = new Date().getTime() - new Date(fechaStr).getTime()
  return diff / (1000 * 60 * 60)
}

function diasRestantes(fechaFin: string): number {
  const fin  = new Date(fechaFin + 'T23:59:59')
  const diff = Math.ceil((fin.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

function pctPlan(inicio: string, fin: string): number {
  const start = new Date(inicio).getTime()
  const end   = new Date(fin).getTime()
  const now   = new Date().getTime()
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
}

function tiempoDesde(fechaStr: string): string {
  const h = horasDesde(fechaStr)
  if (h < 1)  return 'Hace menos de 1 hora'
  if (h < 24) return `Hace ${Math.floor(h)} hora(s)`
  const d = Math.floor(h / 24)
  return `Hace ${d} día(s)`
}

export default function AlumnoDetallePage() {
  const { id }   = useParams<{ id: string }>()
  const [alumno,   setAlumno]   = useState<Alumno | null>(null)
  const [planes,   setPlanes]   = useState<PlanHistorial[]>([])
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [pagos,    setPagos]    = useState<Pago[]>([])
  const [tab,      setTab]      = useState<'info'|'sesiones'|'pagos'|'notas'|'planes'>('info')
  const [loading,  setLoading]  = useState(true)
  const [eliminando, setEliminando] = useState<string | null>(null)
  const [tieneRutina, setTieneRutina] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [tokenAlumno, setTokenAlumno] = useState<string | null>(null)
  const [invitacionUsada, setInvitacionUsada] = useState(false)
  const [refrescando, setRefrescando] = useState(false)

  useEffect(() => { if (id) cargar() }, [id])

  async function cargar() {
    const hoy = new Date().toISOString().split('T')[0]
    const [{ data: a }, { data: pl }, { data: s }, { data: p }] = await Promise.all([
      supabase.from('alumnos').select('*').eq('id', id!).single(),
      supabase.from('alumno_planes').select('*, plan:planes(nombre,tipo,cantidad)')
        .eq('alumno_id', id!).order('created_at', { ascending: false }),
      supabase.from('sesiones').select('*').eq('alumno_id', id!).order('fecha', { ascending: false }).limit(5),
      supabase.from('pagos').select('*').eq('alumno_id', id!).order('fecha_vencimiento', { ascending: false }).limit(5),
    ])
    const { data: rutina } = await supabase
      .from('alumno_rutinas')
      .select('id')
      .eq('alumno_id', id!)
      .eq('activa', true)
      .maybeSingle()
    const { data: tokenData } = await supabase
      .from('alumnos')
      .select('invitacion_token, invitacion_usada, user_id')
      .eq('id', id!)
      .single()
    setAlumno(a)
    setPlanes((pl as any) ?? [])
    setSesiones(s ?? [])
    setPagos(p ?? [])
    setTieneRutina(!!rutina)
    setTokenAlumno(tokenData?.invitacion_token ?? null)
    setInvitacionUsada(tokenData?.invitacion_usada ?? false)
    setLoading(false)
  }

  function copiarLink() {
    if (!tokenAlumno) return
    const link = `${window.location.origin}/registro-alumno?token=${tokenAlumno}`
    navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function compartirWhatsApp() {
    if (!tokenAlumno || !alumno) return
    const link = `${window.location.origin}/registro-alumno?token=${tokenAlumno}`
    const msg  = encodeURIComponent(`Hola ${alumno.nombre}, te invito a crear tu cuenta en Elevra. Usa este link para registrarte:\n${link}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  async function refrescarInvitacion() {
    if (!id) return
    setRefrescando(true)
    const nuevoToken = crypto.randomUUID()
    const { error: err } = await supabase
      .from('alumnos')
      .update({ invitacion_token: nuevoToken, invitacion_usada: false })
      .eq('id', id)
    if (!err) {
      setTokenAlumno(nuevoToken)
      setInvitacionUsada(false)
      const link = `${window.location.origin}/registro-alumno?token=${nuevoToken}`
      navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    }
    setRefrescando(false)
  }

  async function eliminarPlan(plan: PlanHistorial) {
    const horas = horasDesde(plan.created_at)
    if (horas > 24) return

    if (!confirm(`¿Cancelar el plan "${(plan.plan as any).nombre}"? Esta acción no se puede deshacer.`)) return

    setEliminando(plan.id)

    // Eliminar plan
    await supabase.from('alumno_planes').delete().eq('id', plan.id)

    // Verificar si queda algún plan activo
    const hoy = new Date().toISOString().split('T')[0]
    const { data: restantes } = await supabase.from('alumno_planes')
      .select('id').eq('alumno_id', id!).gte('fecha_fin', hoy)

    // Si no quedan planes activos, marcar alumno como inactivo
    if (!restantes || restantes.length === 0) {
      await supabase.from('alumnos').update({ activo: false }).eq('id', id!)
    }

    setEliminando(null)
    cargar()
  }

  if (loading) return <Spinner />
  if (!alumno) return <p className="text-df-muted p-8 text-center">Alumno no encontrado</p>

  const planActivo = planes.find(p => diasRestantes(p.fecha_fin) > 0)
  const dias = planActivo ? diasRestantes(planActivo.fecha_fin) : 0
  const pct  = planActivo ? pctPlan(planActivo.fecha_inicio, planActivo.fecha_fin) : 0
  const sinPlan = !planActivo

  const TABS = [
    { key: 'info',     label: 'Info',     icon: 'fa-solid fa-circle-info' },
    { key: 'sesiones', label: 'Sesiones', icon: 'fa-solid fa-calendar-check' },
    { key: 'pagos',    label: 'Pagos',    icon: 'fa-solid fa-dollar-sign' },
    { key: 'notas',    label: 'Notas',    icon: 'fa-solid fa-note-sticky' },
    { key: 'planes',   label: 'Planes',   icon: 'fa-solid fa-clipboard-list' },
  ] as const

  return (
    <div className="space-y-5">
      <Link to="/alumnos" className="inline-flex items-center gap-2 text-xs text-df-muted hover:text-white transition-colors">
        <i className="fa-solid fa-arrow-left" /> Volver a alumnos
      </Link>

      {/* Hero */}
      <div className="df-card p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-df-purple/10 to-transparent pointer-events-none" />
        <div className="flex items-center gap-4">
          <Avatar nombre={alumno.nombre} foto_url={alumno.foto_url} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-black text-white">{alumno.nombre}</h1>
              <NivelBadge nivel={alumno.nivel} />
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${alumno.activo ? 'bg-green-900/50 text-green-400' : 'bg-zinc-900/50 text-zinc-400'}`}>
                {alumno.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {alumno.tipo_documento && alumno.documento && (
              <p className="text-xs text-df-muted"><i className="fa-solid fa-id-card mr-1" />{alumno.tipo_documento} {alumno.documento}</p>
            )}
            {alumno.email && <p className="text-xs text-df-muted mt-0.5"><i className="fa-solid fa-envelope mr-1" />{alumno.email}</p>}
            {alumno.telefono && <p className="text-xs text-df-muted mt-0.5"><i className="fa-solid fa-phone mr-1" />{alumno.telefono}</p>}
            {!invitacionUsada && tokenAlumno && (
              <div className="mt-3 pt-3 border-t border-df-border">
                <p className="text-[10px] text-df-muted uppercase tracking-wider mb-2">
                  Link de acceso — sin cuenta creada
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={copiarLink}
                    className={`flex items-center justify-center gap-2 text-xs px-4 py-2 rounded-xl transition-all
                      ${copiado
                        ? 'bg-green-900/30 border border-green-500/30 text-green-400'
                        : 'df-surface text-df-muted hover:text-white hover:border-df-violet/40'
                      }`}>
                    <i className={`fa-solid ${copiado ? 'fa-check' : 'fa-copy'} text-xs`} />
                    {copiado ? '¡Copiado!' : 'Copiar link'}
                  </button>
                  <button
                    onClick={compartirWhatsApp}
                    title="Enviar por WhatsApp"
                    className="text-xs px-3 py-2 rounded-xl df-surface text-df-muted hover:text-green-400 transition-all flex items-center gap-1.5">
                    <i className="fa-brands fa-whatsapp text-sm" />
                    WhatsApp
                  </button>
                  <button
                    onClick={refrescarInvitacion}
                    disabled={refrescando}
                    title="Genera un nuevo link y lo copia al portapapeles"
                    className="text-xs px-3 py-2 rounded-xl df-surface text-df-muted hover:text-amber-400 transition-all flex items-center gap-1.5">
                    {refrescando
                      ? <div className="w-3 h-3 border-2 border-df-muted/30 border-t-df-muted rounded-full animate-spin" />
                      : <i className="fa-solid fa-rotate-right text-xs" />
                    }
                  </button>
                </div>
              </div>
            )}
            {invitacionUsada && (
              <div className="mt-3 pt-3 border-t border-df-border">
                <p className="text-[10px] text-green-400 flex items-center gap-1">
                  <i className="fa-solid fa-circle-check text-xs" />
                  Alumno registrado — cuenta activa
                </p>
              </div>
            )}
          </div>
          <Link to={`/alumnos/${alumno.id}/editar`} className="df-btn-outline border border-df-border px-4 py-2 text-xs rounded-xl flex-shrink-0">
            <i className="fa-solid fa-pen mr-1" /> Editar
          </Link>
        </div>
      </div>

      {/* Plan activo */}
      <div className={`df-card p-5 relative overflow-hidden ${sinPlan ? 'border-amber-500/30' : dias <= 3 ? 'border-red-500/30' : 'border-df-purple/20'}`}>
        <div className="absolute inset-0 pointer-events-none bg-df-purple/5" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">Plan activo</h2>
          <div className="flex gap-2">
            <Link to={tieneRutina ? `/alumnos/${id}/rutina/editar` : `/alumnos/${id}/rutina`}
              className="df-btn-outline border border-df-border px-3 py-2 text-xs rounded-xl flex items-center gap-1.5 hover:border-green-500/40 hover:text-green-400 transition-all">
              <i className="fa-solid fa-dumbbell text-xs" />
              {tieneRutina ? 'Ver rutina' : 'Asignar rutina'}
            </Link>
            <Link to={`/alumnos/${id}/plan`} className="df-btn px-4 py-2 text-xs flex items-center gap-1.5">
              <i className="fa-solid fa-clipboard-list text-xs" />
              {sinPlan ? 'Asignar plan' : 'Cambiar plan'}
            </Link>
          </div>
        </div>

        {sinPlan ? (
          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-xl bg-amber-900/20 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-triangle-exclamation text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-400">Sin plan asignado</p>
              <p className="text-xs text-df-muted">Asigna un plan para activar al alumno</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{(planActivo!.plan as any).nombre}</p>
                <p className="text-xs text-df-muted">{planActivo!.fecha_inicio} → {planActivo!.fecha_fin}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black ${dias <= 3 ? 'text-red-400' : 'text-df-violet'}`}>{dias}</p>
                <p className="text-[10px] text-df-muted">días restantes</p>
              </div>
            </div>
            <div className="h-2 bg-df-border rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${dias <= 3 ? 'bg-red-500' : 'bg-gradient-to-r from-df-purple to-df-pink'}`}
                style={{ width: `${pct}%` }} />
            </div>
            {dias <= 3 && dias > 0 && (
              <p className="text-xs text-amber-400 flex items-center gap-1">
                <i className="fa-solid fa-clock" /> Plan por vencer — considera renovar pronto
              </p>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-df-border pb-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap
              ${tab === t.key ? 'text-df-violet border-b-2 border-df-violet' : 'text-df-muted hover:text-white'}`}>
            <i className={t.icon} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: 'Nivel',            value: alumno.nivel,      icon: 'fa-solid fa-chart-line',   color: 'text-df-violet' },
            { label: 'Objetivo',         value: alumno.objetivo ?? '—', icon: 'fa-solid fa-bullseye', color: 'text-df-pink' },
            { label: 'Sesiones totales', value: sesiones.length,   icon: 'fa-solid fa-dumbbell',     color: 'text-blue-400' },
            { label: 'Pagos pendientes', value: pagos.filter(p => p.estado !== 'Pagado').length, icon: 'fa-solid fa-clock', color: 'text-amber-400' },
          ].map((item, i) => (
            <div key={i} className="df-surface p-4 rounded-2xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-df-purple/20 flex items-center justify-center flex-shrink-0">
                <i className={`${item.icon} ${item.color} text-sm`} />
              </div>
              <div>
                <p className="text-[10px] text-df-muted uppercase tracking-wider">{item.label}</p>
                <p className="text-sm font-bold text-white">{item.value}</p>
              </div>
            </div>
          ))}
          <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { to: `/agenda/nueva?alumno=${id}`, icon: 'fa-solid fa-calendar-plus',       label: 'Nueva sesión',   color: 'text-blue-400' },
              { to: `/cobros/nuevo?alumno=${id}`,  icon: 'fa-solid fa-file-invoice-dollar', label: 'Nuevo cobro',    color: 'text-amber-400' },
              { to: `/alumnos/${id}/rutina`,       icon: 'fa-solid fa-dumbbell',            label: 'Asignar rutina', color: 'text-green-400' },
              { to: `/alumnos/${id}/plan`,         icon: 'fa-solid fa-clipboard-list',      label: 'Asignar plan',   color: 'text-df-violet' },
            ].map(q => (
              <Link key={q.to} to={q.to}
                className="df-surface p-3 rounded-xl flex flex-col items-center gap-2 hover:border-df-violet/40 transition-all text-center">
                <i className={`${q.icon} text-lg ${q.color}`} />
                <span className="text-[10px] text-df-muted leading-tight">{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Sesiones */}
      {tab === 'sesiones' && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Link to={`/agenda/nueva?alumno=${id}`} className="df-btn px-4 py-2 text-xs flex items-center gap-1.5">
              <i className="fa-solid fa-plus" /> Nueva sesión
            </Link>
          </div>
          {sesiones.length === 0
            ? <p className="text-df-muted text-sm text-center py-8">Sin sesiones registradas</p>
            : sesiones.map(s => (
              <div key={s.id} className="df-surface p-3 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-df-purple/20 flex items-center justify-center flex-shrink-0">
                  <i className={`fa-solid ${s.tipo === 'Online' ? 'fa-video' : 'fa-location-dot'} text-df-violet text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{s.titulo}</p>
                  <p className="text-xs text-df-muted">{s.fecha} · {s.hora_inicio} · {s.tipo}</p>
                </div>
                <EstadoSesionBadge estado={s.estado} />
              </div>
            ))
          }
        </div>
      )}

      {/* Tab: Pagos */}
      {tab === 'pagos' && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Link to={`/cobros/nuevo?alumno=${id}`} className="df-btn px-4 py-2 text-xs flex items-center gap-1.5">
              <i className="fa-solid fa-plus" /> Nuevo cobro
            </Link>
          </div>
          {pagos.length === 0
            ? <p className="text-df-muted text-sm text-center py-8">Sin pagos registrados</p>
            : pagos.map(p => (
              <div key={p.id} className="df-surface p-3 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-df-purple/20 flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-file-invoice-dollar text-df-violet text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{p.concepto}</p>
                  <p className="text-xs text-df-muted">Vence: {p.fecha_vencimiento}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">${p.monto.toLocaleString()}</p>
                  <EstadoPagoBadge estado={p.estado} />
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Tab: Notas */}
      {tab === 'notas' && (
        <div className="df-card p-5">
          <p className="text-sm text-df-text leading-relaxed whitespace-pre-wrap">
            {alumno.notas || <span className="text-df-muted italic">Sin notas registradas</span>}
          </p>
        </div>
      )}

      {/* Tab: Planes */}
      {tab === 'planes' && (
        <div className="space-y-4">
          {/* Plan activo resumen */}
          {planActivo && (
            <div className="df-card p-4 border-df-purple/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-df-muted uppercase tracking-wider">Plan activo</p>
                <span className="df-badge-done text-xs">Activo</span>
              </div>
              <p className="text-sm font-bold text-white">{(planActivo.plan as any).nombre}</p>
              <p className="text-xs text-df-muted">{planActivo.fecha_inicio} → {planActivo.fecha_fin}</p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-df-muted">{dias} días restantes</p>
                <div className="h-1.5 w-32 bg-df-border rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-df-purple to-df-pink" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Historial */}
          <div className="df-card p-5">
            <p className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2">
              Historial de planes
            </p>

            {/* Mensaje 24h — debajo del título */}
            <div className="flex items-start gap-2 bg-df-surface p-3 rounded-xl mb-4">
              <i className="fa-solid fa-circle-info text-df-muted text-xs mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-df-muted leading-relaxed">
                Los planes solo pueden cancelarse dentro de las primeras 24 horas de ser creados.
              </p>
            </div>

            {planes.length === 0 && (
              <p className="text-xs text-df-muted text-center py-6">Sin planes registrados</p>
            )}

            <div className="space-y-2">
              {planes.map(plan => {
                const horas     = horasDesde(plan.created_at)
                const puedeCancelar = horas <= 24
                const estaActivo = diasRestantes(plan.fecha_fin) > 0

                return (
                  <div key={plan.id}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all
                      ${puedeCancelar ? 'df-surface' : 'df-surface opacity-60'}`}>
                    <div>
                      <p className="text-sm font-bold text-white">{(plan.plan as any).nombre}</p>
                      <p className="text-xs text-df-muted">
                        {plan.fecha_inicio} → {plan.fecha_fin} · {plan.dias_plan} días
                      </p>
                      <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${puedeCancelar ? 'text-green-400' : 'text-df-muted'}`}>
                        <i className={`fa-solid ${puedeCancelar ? 'fa-clock' : 'fa-lock'} text-[10px]`} />
                        {tiempoDesde(plan.created_at)}
                        {plan.es_invitado && <span className="ml-1 df-badge-beg text-[10px]">Cortesía</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full
                        ${estaActivo ? 'bg-green-900/50 text-green-400' : 'bg-zinc-900/50 text-zinc-400'}`}>
                        {estaActivo ? 'Activo' : 'Vencido'}
                      </span>
                      <button
                        onClick={() => puedeCancelar && eliminarPlan(plan)}
                        disabled={!puedeCancelar || eliminando === plan.id}
                        title={!puedeCancelar ? 'Solo se puede cancelar en las primeras 24 horas' : 'Cancelar plan'}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                          ${puedeCancelar
                            ? 'text-red-400 hover:bg-red-900/20 cursor-pointer'
                            : 'text-df-muted cursor-not-allowed opacity-30'}`}>
                        {eliminando === plan.id
                          ? <div className="w-3 h-3 border-2 border-df-muted border-t-red-400 rounded-full animate-spin" />
                          : <i className="fa-solid fa-trash text-xs" />
                        }
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}