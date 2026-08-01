import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useAlumnoId } from '@/hooks/useAlumnoId'
import { Spinner } from '@/components/ui/index'

interface Registro {
  id: string
  peso_kg: number
  semana_inicio: string
  notas: string | null
  created_at: string
}

interface AlumnoData {
  id: string
  peso_inicial: number | null
  peso_objetivo: number | null
}

// Convierte un Date a 'YYYY-MM-DD' usando la fecha LOCAL del navegador (nunca UTC).
// toISOString() convierte a UTC y en timezones negativos (ej. Colombia UTC-5) puede
// "brincar" al día siguiente si son más de las 7pm hora local — por eso NO se usa aquí.
function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getLunesDe(fecha: Date): string {
  const d = new Date(fecha)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return toLocalISO(d)
}

// Domingo (11:59pm) de la semana que inicia en `semanaInicio` (YYYY-MM-DD) = plazo límite para registrar
function getDomingoDe(semanaInicio: string): string {
  const d = new Date(semanaInicio + 'T12:00:00')
  d.setDate(d.getDate() + 6)
  return toLocalISO(d)
}

function formatFechaLarga(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00')
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })
}

// Mes (YYYY-MM) al que pertenece un registro, según el lunes de esa semana
function mesDeSemana(semanaInicio: string): string {
  return semanaInicio.slice(0, 7) // 'YYYY-MM'
}

function formatMesLabel(mesYYYYMM: string): string {
  const d = new Date(mesYYYYMM + '-15T12:00:00')
  const label = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function getSemanasPendientes(registros: Registro[], fechaInicio: string): string[] {
  const hoy = new Date()
  const lunesHoy = getLunesDe(hoy)
  const pendientes: string[] = []
  
  const registradas = new Set(registros.map(r => r.semana_inicio))
  let semana = new Date(fechaInicio + 'T12:00:00')
  
  while (toLocalISO(semana) <= lunesHoy) {
    const key = toLocalISO(semana)
    if (!registradas.has(key)) pendientes.push(key)
    semana.setDate(semana.getDate() + 7)
  }
  return pendientes
}

function formatSemana(fecha: string): string {
  const d = new Date(fecha + 'T12:00:00')
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
}

export default function AlumnoProgresoPage() {
  const { alumnoId, loading: loadingAlumno } = useAlumnoId()
  const [alumno,    setAlumno]    = useState<AlumnoData | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading,   setLoading]   = useState(true)
  const [step,      setStep]      = useState<'datos' | 'tracker'>('tracker')

  // Modal registro
  const [modalReg,    setModalReg]    = useState(false)
  const [semanaReg,   setSemanaReg]   = useState('')
  const [pesoInput,   setPesoInput]   = useState('')
  const [notasInput,  setNotasInput]  = useState('')
  const [savingReg,   setSavingReg]   = useState(false)

  // Modal meta inicial
  const [pesoInicial,  setPesoInicial]  = useState('')
  const [pesoObjetivo, setPesoObjetivo] = useState('')
  const [savingMeta,   setSavingMeta]   = useState(false)

  // Modal nueva meta
  const [modalMeta,    setModalMeta]    = useState(false)
  const [nuevaMeta,    setNuevaMeta]    = useState('')
  const [resetear,     setResetear]     = useState(false)

  // Filtro de rango del historial / gráfica: 'todo' | '1m' | '3m' | 'YYYY-MM'
  const [rangoChart, setRangoChart] = useState<string>('3m')

  // Modo comparación: superpone dos meses en la misma gráfica, alineados por "semana N del mes"
  const [modoComparar, setModoComparar] = useState(false)
  const [mesA, setMesA] = useState('')
  const [mesB, setMesB] = useState('')

  useEffect(() => {
    if (loadingAlumno) return
    if (!alumnoId) { setLoading(false); return }
    cargar(alumnoId)
  }, [alumnoId, loadingAlumno])

  // Cargar Chart.js al montar
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
    script.async = true
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  // Registros que caen dentro del rango elegido para la gráfica / lista
  function filtrarPorRango(regs: Registro[], rango: string): Registro[] {
    if (rango === 'todo') return regs
    if (rango === '1m' || rango === '3m') {
      const meses = rango === '1m' ? 1 : 3
      const limite = new Date()
      limite.setMonth(limite.getMonth() - meses)
      const limiteStr = toLocalISO(limite)
      return regs.filter(r => r.semana_inicio >= limiteStr)
    }
    // rango es un mes específico 'YYYY-MM'
    return regs.filter(r => mesDeSemana(r.semana_inicio) === rango)
  }

  const registrosChart = filtrarPorRango(registros, rangoChart)

  // Meses disponibles (con al menos un registro), para el selector de mes específico y comparación
  const mesesDisponibles = Array.from(new Set(registros.map(r => mesDeSemana(r.semana_inicio)))).sort()
  const mesASel = mesA || mesesDisponibles[mesesDisponibles.length - 2] || mesesDisponibles[0] || ''
  const mesBSel = mesB || mesesDisponibles[mesesDisponibles.length - 1] || ''

  // Registros de un mes, ordenados y numerados como "semana 1, 2, 3..." dentro de ese mes
  function serieDelMes(mes: string): { semana: number; peso: number }[] {
    return registros
      .filter(r => mesDeSemana(r.semana_inicio) === mes)
      .sort((a, b) => a.semana_inicio.localeCompare(b.semana_inicio))
      .map((r, i) => ({ semana: i + 1, peso: r.peso_kg }))
  }

  const serieA = modoComparar ? serieDelMes(mesASel) : []
  const serieB = modoComparar ? serieDelMes(mesBSel) : []
  const diffA = serieA.length > 1 ? (serieA[serieA.length - 1].peso - serieA[0].peso) : 0
  const diffB = serieB.length > 1 ? (serieB[serieB.length - 1].peso - serieB[0].peso) : 0

  // Animación "tipo montaña": toda el área/línea crece desde la base en vez de dibujarse
  // punto por punto de izquierda a derecha (esa versión se sentía forzada).
  function buildRiseAnimation() {
    return {
      y: {
        easing: 'easeOutQuart',
        duration: 850,
        from: (ctx: any) => {
          if (ctx.type !== 'data') return undefined
          return ctx.chart.scales.y.getPixelForValue(ctx.chart.scales.y.min)
        }
      }
    }
  }

  // Inicializar la gráfica: modo normal (1 línea de peso + meta) o modo comparación (2 líneas, sin meta)
  useEffect(() => {
    const puntos = modoComparar
      ? Math.max(serieA.length, serieB.length)
      : registrosChart.length
    if (puntos <= 1) return

    const timer = setTimeout(() => {
      const canvas = document.getElementById('pesoChart') as HTMLCanvasElement
      if (!canvas) return

      const existing = (window as any).__pesoChart
      if (existing) existing.destroy()

      let chartConfig: any

      if (modoComparar) {
        const maxSemanas = Math.max(serieA.length, serieB.length, 1)
        const labels = Array.from({ length: maxSemanas }, (_, i) => `Semana ${i + 1}`)
        const dataA = labels.map((_, i) => serieA[i]?.peso ?? null)
        const dataB = labels.map((_, i) => serieB[i]?.peso ?? null)

        chartConfig = {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: formatMesLabel(mesASel),
                data: dataA,
                borderColor: '#8B5CF6',
                backgroundColor: 'rgba(139,92,246,0.1)',
                borderWidth: 2.5, fill: false, tension: 0.4, spanGaps: true,
                pointBackgroundColor: '#8B5CF6', pointRadius: 4, pointHoverRadius: 6,
              },
              {
                label: formatMesLabel(mesBSel),
                data: dataB,
                borderColor: '#F472B6',
                backgroundColor: 'rgba(244,114,182,0.1)',
                borderWidth: 2.5, fill: false, tension: 0.4, spanGaps: true,
                pointBackgroundColor: '#F472B6', pointRadius: 4, pointHoverRadius: 6,
              },
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            animation: buildRiseAnimation(),
            plugins: { legend: { display: false } },
            scales: {
              y: { ticks: { font: { size: 11 }, color: '#888', callback: (v: number) => v + 'kg' }, grid: { color: 'rgba(128,128,128,0.1)' } },
              x: { ticks: { font: { size: 10 }, color: '#888', autoSkip: true, maxTicksLimit: 6, maxRotation: 0, minRotation: 0 }, grid: { display: false } }
            }
          }
        }
      } else {
        const labels  = registrosChart.map(r => formatSemana(r.semana_inicio))
        const pesos   = registrosChart.map(r => r.peso_kg)
        const metaArr = registrosChart.map(() => alumno!.peso_objetivo!)

        chartConfig = {
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Peso (kg)',
                data: pesos,
                borderColor: '#8B5CF6',
                backgroundColor: (ctx: any) => {
                  const { chart } = ctx
                  const { ctx: canvasCtx, chartArea } = chart
                  if (!chartArea) return 'rgba(139,92,246,0.15)'
                  const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
                  gradient.addColorStop(0, 'rgba(139,92,246,0.45)')
                  gradient.addColorStop(1, 'rgba(139,92,246,0)')
                  return gradient
                },
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#8B5CF6',
                pointRadius: 4,
                pointHoverRadius: 6,
              },
              {
                label: 'Meta',
                data: metaArr,
                borderColor: '#22c55e',
                borderWidth: 1.5,
                borderDash: [6, 4],
                fill: false,
                tension: 0,
                pointRadius: 0,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: buildRiseAnimation(),
            plugins: { legend: { display: false } },
            scales: {
              y: {
                ticks: { font: { size: 11 }, color: '#888', callback: (v: number) => v + 'kg' },
                grid: { color: 'rgba(128,128,128,0.1)' }
              },
              x: {
                ticks: { font: { size: 10 }, color: '#888', autoSkip: true, maxTicksLimit: 6, maxRotation: 0, minRotation: 0 },
                grid: { display: false }
              }
            }
          }
        }
      }

      const chart = new (window as any).Chart(canvas, chartConfig)
      ;(window as any).__pesoChart = chart
    }, 300)

    return () => clearTimeout(timer)
  }, [registrosChart, alumno, modoComparar, mesASel, mesBSel])

  async function cargar(id: string) {
    const { data: a } = await supabase
      .from('alumnos').select('id, peso_inicial, peso_objetivo, created_at')
      .eq('id', id).single()
    if (!a) { setLoading(false); return }
    setAlumno(a)

    if (!a.peso_inicial || !a.peso_objetivo) {
      setStep('datos')
      setLoading(false)
      return
    }

    const { data: regs } = await supabase
      .from('peso_registros').select('*')
      .eq('alumno_id', a.id)
      .order('semana_inicio')
    setRegistros(regs ?? [])
    setStep('tracker')
    setLoading(false)
  }

  async function guardarMeta(e: FormEvent) {
    e.preventDefault()
    if (!alumno) return
    setSavingMeta(true)
    await supabase.from('alumnos').update({
      peso_inicial:  parseFloat(pesoInicial),
      peso_objetivo: parseFloat(pesoObjetivo),
    }).eq('id', alumno.id)
    setSavingMeta(false)
    if (alumnoId) cargar(alumnoId)
  }

  async function guardarRegistro(e: FormEvent) {
    e.preventDefault()
    if (!alumno) return
    setSavingReg(true)
    await supabase.from('peso_registros').upsert({
      alumno_id:     alumno.id,
      peso_kg:       parseFloat(pesoInput),
      semana_inicio: semanaReg,
      notas:         notasInput || null,
    }, { onConflict: 'alumno_id,semana_inicio' })
    setSavingReg(false)
    setModalReg(false)
    setPesoInput(''); setNotasInput('')
    if (alumnoId) cargar(alumnoId)
  }

  async function guardarNuevaMeta(e: FormEvent) {
    e.preventDefault()
    if (!alumno) return
    setSavingMeta(true)
    if (resetear) {
      await supabase.from('peso_registros').delete().eq('alumno_id', alumno.id)
    }
    await supabase.from('alumnos').update({
      peso_objetivo: parseFloat(nuevaMeta),
      ...(resetear ? { peso_inicial: registros[registros.length - 1]?.peso_kg ?? alumno.peso_inicial } : {})
    }).eq('id', alumno.id)
    setSavingMeta(false)
    setModalMeta(false)
    if (alumnoId) cargar(alumnoId)
  }

  function abrirRegistro(semana: string) {
    // Candado: solo se puede crear/editar el registro de la semana en curso.
    // Las semanas pasadas quedan congeladas (corrección de errores viejos = herramienta aparte para el instructor/admin).
    if (semana !== getLunesDe(new Date())) return
    const reg = registros.find(r => r.semana_inicio === semana)
    setSemanaReg(semana)
    setPesoInput(reg ? String(reg.peso_kg) : '')
    setNotasInput(reg?.notas ?? '')
    setModalReg(true)
  }

  if (loading) return <Spinner />

  // ── Paso 1: ingresar datos iniciales ──
  if (step === 'datos') return (
    <div className="space-y-5 pt-2">
      <div>
        <h1 className="text-lg font-black text-white">Mi progreso</h1>
        <p className="text-xs text-df-muted mt-1">Ingresa tu peso actual y tu meta para comenzar a trackear tu progreso</p>
      </div>
      <form onSubmit={guardarMeta} className="space-y-4">
        <div className="df-card p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
              Peso actual (kg) *
            </label>
            <input type="number" step="0.1" min="30" max="300"
              value={pesoInicial} onChange={e => setPesoInicial(e.target.value)}
              placeholder="Ej: 84.5" className="df-input" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
              Peso objetivo (kg) *
            </label>
            <input type="number" step="0.1" min="30" max="300"
              value={pesoObjetivo} onChange={e => setPesoObjetivo(e.target.value)}
              placeholder="Ej: 70.0" className="df-input" required />
          </div>
          <p className="text-[10px] text-df-muted">
            <i className="fa-solid fa-circle-info mr-1 text-df-violet" />
            Solo tú puedes ver estos datos. El profe no tiene acceso a tu peso.
          </p>
        </div>
        <button type="submit" disabled={savingMeta}
          className="df-btn w-full py-3 text-sm flex items-center justify-center gap-2">
          {savingMeta
            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><i className="fa-solid fa-check" /> Comenzar a trackear</>
          }
        </button>
      </form>
    </div>
  )

  if (!alumno?.peso_inicial || !alumno?.peso_objetivo) return null

  const pesoActual  = registros[registros.length - 1]?.peso_kg ?? alumno.peso_inicial
  const pesoInicio  = alumno.peso_inicial
  const pesoMeta    = alumno.peso_objetivo
  const totalCambio = Math.abs(pesoInicio - pesoMeta)
  const cambioActual = Math.abs(pesoInicio - pesoActual)
  const pct = totalCambio > 0 ? Math.min(100, Math.round((cambioActual / totalCambio) * 100)) : 0
  const faltan = Math.abs(pesoActual - pesoMeta).toFixed(1)
  const cumplioMeta = pesoMeta < pesoInicio ? pesoActual <= pesoMeta : pesoActual >= pesoMeta

  // Semanas pendientes
  const { data: alumnoCreado } = { data: alumno }
  const lunesHoy = getLunesDe(new Date())
  const primerLunes = registros.length > 0
    ? registros[0].semana_inicio
    : getLunesDe(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 * 4))
  const pendientes = getSemanasPendientes(registros, primerLunes).filter(s => s !== lunesHoy)
  const puedeRegistrarHoy = !registros.find(r => r.semana_inicio === lunesHoy)
  const plazoActual = getDomingoDe(lunesHoy)

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black text-white">Mi progreso</h1>
        <button onClick={() => { setNuevaMeta(String(pesoMeta)); setResetear(false); setModalMeta(true) }}
          className="text-xs text-df-muted hover:text-white transition-colors flex items-center gap-1">
          <i className="fa-solid fa-pen text-xs" /> Ajustar meta
        </button>
      </div>

      {/* Meta cumplida */}
      {cumplioMeta && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-4 flex items-center gap-3">
          <i className="fa-solid fa-trophy text-2xl text-green-400" />
          <div>
            <p className="text-sm font-bold text-green-400">¡Alcanzaste tu meta! 🎉</p>
            <p className="text-xs text-green-400/70">¿Quieres plantear una nueva meta?</p>
          </div>
          <button onClick={() => { setNuevaMeta(''); setResetear(false); setModalMeta(true) }}
            className="df-btn px-3 py-1.5 text-xs ml-auto flex-shrink-0">
            Nueva meta
          </button>
        </div>
      )}

      {/* Cards resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-df-surface rounded-xl p-4">
          <p className="text-xs text-df-muted mb-1">Peso actual</p>
          <p className="text-2xl font-black text-white">{pesoActual} <span className="text-sm font-normal">kg</span></p>
        </div>
        <div className="bg-df-surface rounded-xl p-4">
          <p className="text-xs text-df-muted mb-1">Meta</p>
          <p className="text-2xl font-black text-df-violet">{pesoMeta} <span className="text-sm font-normal">kg</span></p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="df-card p-4 space-y-2">
        <div className="flex justify-between items-center">
          <p className="text-xs text-df-muted">Progreso hacia la meta</p>
          <p className="text-xs font-bold text-white">Faltan {faltan} kg</p>
        </div>
        <div className="h-2.5 bg-df-border rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-df-purple to-df-pink transition-all duration-700"
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between">
          <p className="text-[10px] text-df-muted">Inicio: {pesoInicio} kg</p>
          <p className="text-[10px] text-df-violet font-semibold">{pct}% completado</p>
          <p className="text-[10px] text-df-muted">Meta: {pesoMeta} kg</p>
        </div>
      </div>

      {/* Gráfica */}
      {registros.length > 1 && (
        <div className="df-card p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-bold text-white">Historial de peso</p>
            <div className="flex gap-3">
              {modoComparar ? (
                <>
                  <span className="flex items-center gap-1.5 text-[10px] text-df-muted">
                    <span className="w-3 h-0.5 bg-df-violet inline-block rounded" />{formatMesLabel(mesASel)}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-df-muted">
                    <span className="w-3 h-0.5 bg-pink-400 inline-block rounded" />{formatMesLabel(mesBSel)}
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1.5 text-[10px] text-df-muted">
                    <span className="w-3 h-0.5 bg-df-violet inline-block rounded" />Peso
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] text-df-muted">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-green-400 inline-block" />Meta
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Selector de rango (modo normal) / selector de meses (modo comparar) */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {!modoComparar && (
              <>
                {[
                  { key: '1m',   label: '1 mes' },
                  { key: '3m',   label: '3 meses' },
                  { key: 'todo', label: 'Todo' },
                ].map(op => (
                  <button key={op.key} onClick={() => setRangoChart(op.key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all
                      ${rangoChart === op.key ? 'bg-df-purple text-white' : 'bg-df-surface text-df-muted hover:text-white'}`}>
                    {op.label}
                  </button>
                ))}
                {mesesDisponibles.length > 0 && (
                  <select value={mesesDisponibles.includes(rangoChart) ? rangoChart : ''}
                    onChange={e => e.target.value && setRangoChart(e.target.value)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-df-surface text-df-muted border-0 outline-none">
                    <option value="" disabled>Mes específico</option>
                    {mesesDisponibles.map(m => (
                      <option key={m} value={m}>{formatMesLabel(m)}</option>
                    ))}
                  </select>
                )}
              </>
            )}

            {modoComparar && mesesDisponibles.length > 0 && (
              <>
                <select value={mesASel} onChange={e => setMesA(e.target.value)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-df-surface text-df-violet border-0 outline-none">
                  {mesesDisponibles.map(m => (
                    <option key={m} value={m}>{formatMesLabel(m)}</option>
                  ))}
                </select>
                <span className="text-[10px] text-df-muted">vs</span>
                <select value={mesBSel} onChange={e => setMesB(e.target.value)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-df-surface text-pink-400 border-0 outline-none">
                  {mesesDisponibles.map(m => (
                    <option key={m} value={m}>{formatMesLabel(m)}</option>
                  ))}
                </select>
              </>
            )}

            {mesesDisponibles.length > 1 && (
              <button onClick={() => setModoComparar(v => !v)}
                className={`ml-auto px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all flex items-center gap-1
                  ${modoComparar ? 'bg-df-purple text-white' : 'bg-df-surface text-df-muted hover:text-white'}`}>
                <i className="fa-solid fa-code-compare text-[9px]" /> Comparar meses
              </button>
            )}
          </div>

          {/* Resumen de diferencia por mes, solo en modo comparación */}
          {modoComparar && (serieA.length > 1 || serieB.length > 1) && (
            <div className="flex gap-4 mb-2 text-[10px]">
              {serieA.length > 1 && (
                <span className="text-df-violet font-semibold">
                  {formatMesLabel(mesASel)}: {diffA > 0 ? '+' : ''}{diffA.toFixed(1)} kg
                </span>
              )}
              {serieB.length > 1 && (
                <span className="text-pink-400 font-semibold">
                  {formatMesLabel(mesBSel)}: {diffB > 0 ? '+' : ''}{diffB.toFixed(1)} kg
                </span>
              )}
            </div>
          )}

          {(modoComparar ? Math.max(serieA.length, serieB.length) : registrosChart.length) > 1 ? (
            <div style={{ position: 'relative', height: '180px' }}>
              <canvas id="pesoChart"
                role="img"
                aria-label="Gráfica de progreso de peso">
              </canvas>
            </div>
          ) : (
            <p className="text-xs text-df-muted text-center py-8">No hay suficientes registros en este rango</p>
          )}
        </div>
      )}

      {/* Semanas pasadas sin registrar: quedan congeladas, solo informativas */}
      {pendientes.length > 0 && (
        <div className="bg-amber-900/10 border border-amber-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fa-solid fa-clock text-amber-400 text-sm" />
            <p className="text-xs font-bold text-amber-400">
              {pendientes.length} semana(s) sin registrar
            </p>
          </div>
          <div className="space-y-2">
            {pendientes.slice(-3).map(s => (
              <div key={s}
                className="w-full flex items-center justify-between bg-amber-900/5 border border-amber-500/10 rounded-xl px-3 py-2">
                <span className="text-xs text-amber-400/70">Semana del {formatSemana(s)}</span>
                <span className="text-[10px] text-amber-400/50 flex items-center gap-1">
                  <i className="fa-solid fa-lock text-[9px]" /> No registrada
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-amber-400/50 mt-2">
            <i className="fa-solid fa-circle-info mr-1" />
            Las semanas pasadas ya no se pueden registrar ni modificar.
          </p>
        </div>
      )}

      {/* Botón registrar esta semana + plazo */}
      {puedeRegistrarHoy && (
        <div className="space-y-2">
          <p className="text-[11px] text-df-muted text-center">
            <i className="fa-solid fa-hourglass-half text-df-violet mr-1" />
            Tienes hasta el <span className="text-white font-semibold">{formatFechaLarga(plazoActual)}</span> para ingresar el registro de esta semana
          </p>
          <button onClick={() => abrirRegistro(lunesHoy)}
            className="df-btn w-full py-3 text-sm flex items-center justify-center gap-2">
            <i className="fa-solid fa-plus text-xs" /> Registrar peso de esta semana
          </button>
        </div>
      )}

      {/* Historial lista (respeta el mismo rango elegido arriba) */}
      {registros.length > 0 && (
        <div className="df-card p-4 space-y-2">
          <p className="text-xs font-semibold text-df-muted uppercase tracking-wider">Historial</p>
          {[...registrosChart].reverse().map((r, i) => {
            const prev = [...registrosChart].reverse()[i + 1]
            const diff = prev ? (r.peso_kg - prev.peso_kg) : 0
            return (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-df-border last:border-0">
                <div>
                  <p className="text-xs font-semibold text-white">Semana del {formatSemana(r.semana_inicio)}</p>
                  {r.notas && <p className="text-[10px] text-df-muted italic">{r.notas}</p>}
                </div>
                <div className="text-right flex items-center gap-2">
                  <p className="text-sm font-black text-white">{r.peso_kg} kg</p>
                  {diff !== 0 && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                      ${diff < 0 ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal registrar peso */}
      {modalReg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="df-card w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Registrar peso</h2>
              <button onClick={() => setModalReg(false)} className="text-df-muted hover:text-white transition-colors">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p className="text-xs text-df-muted">Semana del {formatSemana(semanaReg)}</p>
            <form onSubmit={guardarRegistro} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                  Peso (kg) *
                </label>
                <input type="number" step="0.1" min="30" max="300"
                  value={pesoInput} onChange={e => setPesoInput(e.target.value)}
                  placeholder="Ej: 77.5" className="df-input" required autoFocus />
              </div>
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                  Notas (opcional)
                </label>
                <input value={notasInput} onChange={e => setNotasInput(e.target.value)}
                  placeholder="Ej: Mucho músculo esta semana" className="df-input" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalReg(false)}
                  className="df-btn-outline border border-df-border px-4 py-2.5 text-sm rounded-xl flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={savingReg}
                  className="df-btn px-4 py-2.5 text-sm flex-1 flex items-center justify-center gap-2">
                  {savingReg
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><i className="fa-solid fa-check" /> Guardar</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nueva meta */}
      {modalMeta && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="df-card w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Ajustar meta</h2>
              <button onClick={() => setModalMeta(false)} className="text-df-muted hover:text-white transition-colors">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <form onSubmit={guardarNuevaMeta} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                  Nueva meta (kg) *
                </label>
                <input type="number" step="0.1" min="30" max="300"
                  value={nuevaMeta} onChange={e => setNuevaMeta(e.target.value)}
                  placeholder="Ej: 65.0" className="df-input" required />
              </div>

              <div className="df-surface p-3 rounded-xl">
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => setResetear(v => !v)}
                    className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 mt-0.5
                      ${resetear ? 'bg-df-purple' : 'bg-df-border'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow
                      ${resetear ? 'left-5' : 'left-0.5'}`} />
                  </button>
                  <div>
                    <p className="text-xs font-semibold text-white">Empezar nuevo ciclo</p>
                    <p className="text-[10px] text-df-muted mt-0.5">
                      Archiva el historial actual y empieza desde tu peso de hoy. El historial anterior se borra.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setModalMeta(false)}
                  className="df-btn-outline border border-df-border px-4 py-2.5 text-sm rounded-xl flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={savingMeta}
                  className="df-btn px-4 py-2.5 text-sm flex-1 flex items-center justify-center gap-2">
                  {savingMeta
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><i className="fa-solid fa-check" /> Guardar</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
    </div>
  )
}