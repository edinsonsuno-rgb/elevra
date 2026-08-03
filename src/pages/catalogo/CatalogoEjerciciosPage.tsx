import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Spinner, EmptyState } from '@/components/ui/index'
import { useAuth } from '@/hooks/useAuth'
import { getCache, setCache, invalidateCache } from '@/lib/queryCache'

const CACHE_KEY = 'catalogo_ejercicios'
const TTL_CATALOGO = 5 * 60 * 1000 // 5 minutos — cambia poco, no hace falta re-consultar en cada visita

export interface CatalogoEjercicio {
  id: string
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  foto_inicio_url: string | null
  foto_fin_url: string | null
  musculo_url: string | null
  zona: 'superior' | 'media' | 'inferior' | null
  musculo: string | null
  categoria_entrenamiento: string | null
  patron_movimiento: string | null
  seg_principiante: number
  seg_intermedio: number
  seg_avanzado: number
  creado_por: string | null
  created_at: string
}

const ZONAS = [
  { key: 'superior', label: 'Superior', icon: 'fa-solid fa-hand-fist' },
  { key: 'media',    label: 'Media',    icon: 'fa-solid fa-circle' },
  { key: 'inferior', label: 'Inferior', icon: 'fa-solid fa-shoe-prints' },
] as const

const MUSCULOS: Record<string, string[]> = {
  superior: ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Antebrazos'],
  media:    ['Abdomen', 'Oblicuos', 'Lumbar'],
  inferior: ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Pantorrillas'],
}

const COLOR_MUSCULO: Record<string, string> = {
  'Pecho':          '#F0997B',
  'Espalda':        '#D4537E',
  'Hombros':        '#EF9F27',
  'Bíceps':         '#7F77DD',
  'Tríceps':        '#378ADD',
  'Antebrazos':     '#B08D57',
  'Abdomen':        '#5DCAA5',
  'Oblicuos':       '#1D9E75',
  'Lumbar':         '#B4B2A9',
  'Cuádriceps':     '#639922',
  'Isquiotibiales': '#97C459',
  'Glúteos':        '#E24B4A',
  'Pantorrillas':   '#85B7EB',
}

const CATEGORIAS = [
  { key: 'Fuerza',         label: 'Fuerza',         icon: 'fa-solid fa-dumbbell' },
  { key: 'Movilidad',      label: 'Movilidad',      icon: 'fa-solid fa-arrows-spin' },
  { key: 'Cardio',         label: 'Cardio',         icon: 'fa-solid fa-heart-pulse' },
  { key: 'Núcleo',         label: 'Núcleo',         icon: 'fa-solid fa-circle-dot' },
  { key: 'Rehabilitación', label: 'Rehabilitación', icon: 'fa-solid fa-kit-medical' },
] as const

const PATRONES = [
  'Empuje', 'Tirar', 'Estiramiento', 'Pliométrico', 'Funcional',
  'Explosivo', 'Equilibrio', 'Calentamiento', 'Isométrico',
] as const

function EjercicioCard({ ej, isAdmin, onEliminar }: {
  ej: CatalogoEjercicio
  isAdmin: boolean
  onEliminar: (id: string) => void
}) {
  const [showFin, setShowFin] = useState(false)
  const tieneAnim = ej.foto_inicio_url && ej.foto_fin_url

  useEffect(() => {
    if (!tieneAnim) return
    const interval = setInterval(() => setShowFin(v => !v), 2500)
    return () => clearInterval(interval)
  }, [tieneAnim])

  return (
    <div className="df-card overflow-hidden group hover:border-df-violet/40 transition-all">
      <div className="h-48 bg-df-surface relative overflow-hidden flex items-center justify-center">
        {tieneAnim ? (
          <>
            <img src={ej.foto_inicio_url!} alt="inicio"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: showFin ? 0 : 1, transition: 'opacity 1.2s ease-in-out' }} />
            <img src={ej.foto_fin_url!} alt="fin"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ opacity: showFin ? 1 : 0, transition: 'opacity 1.2s ease-in-out' }} />
          </>
        ) : ej.foto_inicio_url ? (
          <img src={ej.foto_inicio_url} alt={ej.nombre} className="w-full h-full object-contain" />
        ) : (
          <i className="fa-solid fa-dumbbell text-4xl text-df-purple/20" />
        )}

        {tieneAnim && (
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[10px] font-bold bg-df-purple/70 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
              <i className="fa-solid fa-rotate text-[9px]" /> ANIM
            </span>
          </div>
        )}

        {ej.musculo && (
          <div className="absolute bottom-2 left-2 z-10 flex gap-1 flex-wrap">
            <span className="text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full">
              {ej.musculo}
            </span>
            {ej.categoria_entrenamiento && (
              <span className="text-[10px] font-bold bg-df-purple/70 text-white px-2 py-0.5 rounded-full">
                {ej.categoria_entrenamiento}
              </span>
            )}
          </div>
        )}

        {isAdmin && (
          <div className="absolute top-2 right-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
            <Link to={`/catalogo/${ej.id}/editar`}
              className="w-7 h-7 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-df-purple/80 transition-all">
              <i className="fa-solid fa-pen text-xs" />
            </Link>
            <button onClick={() => onEliminar(ej.id)}
              className="w-7 h-7 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center text-white hover:bg-red-600/80 transition-all">
              <i className="fa-solid fa-trash text-xs" />
            </button>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-black text-white truncate mb-1">{ej.nombre}</h3>
        {ej.patron_movimiento && (
          <p className="text-[10px] text-df-violet font-semibold uppercase tracking-wider mb-1">
            {ej.patron_movimiento}
          </p>
        )}
        {ej.descripcion && (
          <p className="text-xs text-df-muted line-clamp-2 mb-3">{ej.descripcion}</p>
        )}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-green-900/20 rounded-lg p-2 text-center">
            <p className="text-xs font-black text-green-400">{ej.seg_principiante}s</p>
            <p className="text-[9px] text-green-400/70 mt-0.5">Principiante</p>
          </div>
          <div className="bg-blue-900/20 rounded-lg p-2 text-center">
            <p className="text-xs font-black text-blue-400">{ej.seg_intermedio}s</p>
            <p className="text-[9px] text-blue-400/70 mt-0.5">Intermedio</p>
          </div>
          <div className="bg-amber-900/20 rounded-lg p-2 text-center">
            <p className="text-xs font-black text-amber-400">{ej.seg_avanzado}s</p>
            <p className="text-[9px] text-amber-400/70 mt-0.5">Avanzado</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function EjercicioRow({ ej, isAdmin, isOpen, onToggle, onEliminar }: {
  ej: CatalogoEjercicio
  isAdmin: boolean
  isOpen: boolean
  onToggle: () => void
  onEliminar: (id: string) => void
}) {
  const tieneFotos = !!(ej.foto_inicio_url && ej.foto_fin_url)
  const color = (ej.musculo && COLOR_MUSCULO[ej.musculo]) || '#5F5E5A'

  return (
    <div className="df-card overflow-hidden" style={{ borderLeft: `3px solid ${color}`, borderRadius: 8 }}>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 ${tieneFotos ? 'cursor-pointer hover:bg-df-surface/40' : ''}`}
        onClick={tieneFotos ? onToggle : undefined}
      >
        <i className="fa-solid fa-dumbbell text-sm flex-shrink-0" style={{ color }} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate">{ej.nombre}</p>
          <p className="text-df-muted text-[11px] mt-0.5">
            {ej.musculo}
            {ej.categoria_entrenamiento && <> · {ej.categoria_entrenamiento}</>}
            {ej.patron_movimiento && <> · {ej.patron_movimiento}</>}
            {!tieneFotos && <span className="text-df-muted/70"> · sin fotos</span>}
          </p>
        </div>
        <span className="hidden sm:inline text-green-400 text-[11px] flex-shrink-0">
          {ej.seg_principiante}s / {ej.seg_intermedio}s / {ej.seg_avanzado}s
        </span>

        {isAdmin && (
          <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
            <Link to={`/catalogo/${ej.id}/editar`}
              className="w-7 h-7 flex items-center justify-center text-df-muted hover:text-white transition-all">
              <i className="fa-solid fa-pen text-xs" />
            </Link>
            <button onClick={() => onEliminar(ej.id)}
              className="w-7 h-7 flex items-center justify-center text-df-muted hover:text-red-400 transition-all">
              <i className="fa-solid fa-trash text-xs" />
            </button>
          </div>
        )}

        {tieneFotos && (
          <i className={`fa-solid fa-chevron-down text-xs text-df-muted transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </div>

      {isOpen && tieneFotos && (
        <div className="px-3 pb-3 flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 sm:w-1/2 flex-shrink-0">
            <div className="flex-1 h-24 bg-df-surface rounded-lg overflow-hidden flex items-center justify-center">
              <img src={ej.foto_inicio_url!} alt="Posición inicial" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 h-24 bg-df-surface rounded-lg overflow-hidden flex items-center justify-center">
              <img src={ej.foto_fin_url!} alt="Posición final" className="w-full h-full object-contain" />
            </div>
          </div>
          {ej.descripcion && (
            <p className="sm:w-1/2 text-df-muted text-xs leading-relaxed line-clamp-3">{ej.descripcion}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function CatalogoEjerciciosPage() {
  const [ejercicios, setEjercicios] = useState<CatalogoEjercicio[]>([])
  const [loading,    setLoading]    = useState(true)
  const [busqueda,   setBusqueda]   = useState('')
  const [zonaFiltro,      setZonaFiltro]      = useState<string | null>(null)
  const [musculoFiltro,   setMusculoFiltro]   = useState<string | null>(null)
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null)
  const [patronFiltro,    setPatronFiltro]    = useState<string | null>(null)
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  useEffect(() => { cargar() }, [])

  async function cargar(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = getCache<CatalogoEjercicio[]>(CACHE_KEY)
      if (cached) {
        setEjercicios(cached)
        setLoading(false)
        return
      }
    }
    const { data } = await supabase.from('catalogo_ejercicios').select('*').order('nombre')
    setEjercicios(data ?? [])
    setCache(CACHE_KEY, data ?? [], TTL_CATALOGO)
    setLoading(false)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este ejercicio del catálogo?')) return
    await supabase.from('catalogo_ejercicios').delete().eq('id', id)
    invalidateCache(CACHE_KEY)
    cargar(true)
  }

  function selectZona(zona: string) {
    if (zonaFiltro === zona) {
      setZonaFiltro(null)
      setMusculoFiltro(null)
    } else {
      setZonaFiltro(zona)
      setMusculoFiltro(null)
    }
  }

  function selectMusculo(musculo: string) {
    setMusculoFiltro(musculoFiltro === musculo ? null : musculo)
  }

  function selectCategoria(categoria: string) {
    setCategoriaFiltro(categoriaFiltro === categoria ? null : categoria)
  }

  function selectPatron(patron: string) {
    setPatronFiltro(patronFiltro === patron ? null : patron)
  }

  function limpiarTodo() {
    setZonaFiltro(null)
    setMusculoFiltro(null)
    setCategoriaFiltro(null)
    setPatronFiltro(null)
  }

  const filtrados = ejercicios.filter(e => {
    const coincide = e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.descripcion ?? '').toLowerCase().includes(busqueda.toLowerCase())
    const porZona     = zonaFiltro      ? e.zona === zonaFiltro                        : true
    const porMusculo   = musculoFiltro   ? e.musculo === musculoFiltro                   : true
    const porCategoria = categoriaFiltro ? e.categoria_entrenamiento === categoriaFiltro : true
    const porPatron     = patronFiltro    ? e.patron_movimiento === patronFiltro          : true
    return coincide && porZona && porMusculo && porCategoria && porPatron
  })

  const conteoPorZona = ZONAS.reduce((acc, z) => {
    acc[z.key] = ejercicios.filter(e => e.zona === z.key).length
    return acc
  }, {} as Record<string, number>)

  const conteoPorMusculo = zonaFiltro
    ? (MUSCULOS[zonaFiltro] ?? []).reduce((acc, m) => {
        acc[m] = ejercicios.filter(e => e.zona === zonaFiltro && e.musculo === m).length
        return acc
      }, {} as Record<string, number>)
    : {}

  const conteoPorCategoria = CATEGORIAS.reduce((acc, c) => {
    acc[c.key] = ejercicios.filter(e => e.categoria_entrenamiento === c.key).length
    return acc
  }, {} as Record<string, number>)

  const conteoPorPatron = PATRONES.reduce((acc, p) => {
    acc[p] = ejercicios.filter(e => e.patron_movimiento === p).length
    return acc
  }, {} as Record<string, number>)

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Catálogo de ejercicios</h1>
          <p className="text-df-muted text-sm mt-0.5">{ejercicios.length} ejercicios disponibles</p>
        </div>
        {isAdmin && (
          <Link to="/catalogo/nuevo" className="df-btn px-4 py-2.5 text-sm flex items-center gap-2">
            <i className="fa-solid fa-plus" /> Nuevo ejercicio
          </Link>
        )}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar ejercicio..." className="df-input !pl-8 pr-6" />
      </div>

      {/* Filtro Zona — Nivel 1 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-df-muted uppercase tracking-wider">Zona corporal</p>
        <div className="flex gap-2 flex-wrap">
          {ZONAS.map(z => (
            <button key={z.key} onClick={() => selectZona(z.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all
                ${zonaFiltro === z.key
                  ? 'bg-df-purple text-white'
                  : 'df-surface text-df-muted hover:text-white'}`}>
              <i className={`${z.icon} text-xs`} />
              {z.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${zonaFiltro === z.key ? 'bg-white/20' : 'bg-df-bg'}`}>
                {conteoPorZona[z.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtro Músculo — Nivel 2 (aparece solo si hay zona seleccionada) */}
      {zonaFiltro && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-df-muted uppercase tracking-wider">
            Músculo — <span className="text-df-violet capitalize">{zonaFiltro}</span>
          </p>
          <div className="flex gap-2 flex-wrap">
            {MUSCULOS[zonaFiltro]?.map(m => (
              <button key={m} onClick={() => selectMusculo(m)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all
                  ${musculoFiltro === m
                    ? 'bg-df-pink/20 text-df-pink border border-df-pink/40'
                    : 'df-surface text-df-muted hover:text-white'}`}>
                {m}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${musculoFiltro === m ? 'bg-df-pink/20' : 'bg-df-bg'}`}>
                  {conteoPorMusculo[m] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filtro Categoría de entrenamiento */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-df-muted uppercase tracking-wider">Categoría de entrenamiento</p>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIAS.map(c => (
            <button key={c.key} onClick={() => selectCategoria(c.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all
                ${categoriaFiltro === c.key
                  ? 'bg-df-purple text-white'
                  : 'df-surface text-df-muted hover:text-white'}`}>
              <i className={`${c.icon} text-xs`} />
              {c.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${categoriaFiltro === c.key ? 'bg-white/20' : 'bg-df-bg'}`}>
                {conteoPorCategoria[c.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filtro Patrón de movimiento */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-df-muted uppercase tracking-wider">Patrón de movimiento</p>
        <div className="flex gap-2 flex-wrap">
          {PATRONES.map(p => (
            <button key={p} onClick={() => selectPatron(p)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all
                ${patronFiltro === p
                  ? 'bg-df-pink/20 text-df-pink border border-df-pink/40'
                  : 'df-surface text-df-muted hover:text-white'}`}>
              {p}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${patronFiltro === p ? 'bg-df-pink/20' : 'bg-df-bg'}`}>
                {conteoPorPatron[p] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Resumen filtros activos */}
      {(zonaFiltro || musculoFiltro || categoriaFiltro || patronFiltro || busqueda) && (
        <p className="text-xs text-df-muted flex items-center gap-2 flex-wrap">
          Mostrando <span className="text-white font-semibold">{filtrados.length}</span> ejercicio(s)
          {zonaFiltro && <> · Zona: <span className="text-df-violet capitalize">{zonaFiltro}</span></>}
          {musculoFiltro && <> · Músculo: <span className="text-df-pink">{musculoFiltro}</span></>}
          {categoriaFiltro && <> · Categoría: <span className="text-df-violet">{categoriaFiltro}</span></>}
          {patronFiltro && <> · Patrón: <span className="text-df-pink">{patronFiltro}</span></>}
          {busqueda && <> · Búsqueda: <span className="text-df-pink">"{busqueda}"</span></>}
          <button onClick={limpiarTodo} className="text-df-muted hover:text-red-400 transition-all">
            <i className="fa-solid fa-xmark" /> Limpiar todo
          </button>
        </p>
      )}

      {/* Lista / Galería */}
      {filtrados.length === 0
        ? <EmptyState icon="fa-solid fa-dumbbell" title="Sin ejercicios" desc="No hay ejercicios que coincidan con los filtros" />
        : isAdmin ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtrados.map(ej => (
              <EjercicioCard key={ej.id} ej={ej} isAdmin={isAdmin} onEliminar={eliminar} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtrados.map(ej => (
              <EjercicioRow
                key={ej.id}
                ej={ej}
                isAdmin={isAdmin}
                isOpen={expandidoId === ej.id}
                onToggle={() => setExpandidoId(expandidoId === ej.id ? null : ej.id)}
                onEliminar={eliminar}
              />
            ))}
          </div>
        )
      }
    </div>
  )
}