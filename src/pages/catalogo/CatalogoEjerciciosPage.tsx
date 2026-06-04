import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Spinner, EmptyState } from '@/components/ui/index'
import { useAuth } from '@/hooks/useAuth'

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
  superior: ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps'],
  media:    ['Abdomen', 'Oblicuos', 'Lumbar'],
  inferior: ['Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Pantorrillas'],
}

function EjercicioCard({ ej, isAdmin, onEliminar }: {
  ej: CatalogoEjercicio
  isAdmin: boolean
  onEliminar: (id: string) => void
}) {
  const [showFin, setShowFin] = useState(false)
  const tieneAnim = ej.foto_inicio_url && ej.foto_fin_url
  const fotoUrl   = showFin ? ej.foto_fin_url : ej.foto_inicio_url

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

        {/* Zona + músculo badge */}
        {ej.musculo && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="text-[10px] font-bold bg-black/60 text-white px-2 py-0.5 rounded-full">
              {ej.musculo}
            </span>
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

export default function CatalogoEjerciciosPage() {
  const [ejercicios, setEjercicios] = useState<CatalogoEjercicio[]>([])
  const [loading,    setLoading]    = useState(true)
  const [busqueda,   setBusqueda]   = useState('')
  const [zonaFiltro,   setZonaFiltro]   = useState<string | null>(null)
  const [musculoFiltro, setMusculoFiltro] = useState<string | null>(null)
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data } = await supabase.from('catalogo_ejercicios').select('*').order('nombre')
    setEjercicios(data ?? [])
    setLoading(false)
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este ejercicio del catálogo?')) return
    await supabase.from('catalogo_ejercicios').delete().eq('id', id)
    cargar()
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

  const filtrados = ejercicios.filter(e => {
    const coincide = e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.descripcion ?? '').toLowerCase().includes(busqueda.toLowerCase())
    const porZona    = zonaFiltro    ? e.zona === zonaFiltro       : true
    const porMusculo = musculoFiltro ? e.musculo === musculoFiltro  : true
    return coincide && porZona && porMusculo
  })

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
            </button>
          ))}
          {zonaFiltro && (
            <button onClick={() => { setZonaFiltro(null); setMusculoFiltro(null) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-df-muted hover:text-red-400 df-surface transition-all">
              <i className="fa-solid fa-xmark text-xs" /> Limpiar
            </button>
          )}
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
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all
                  ${musculoFiltro === m
                    ? 'bg-df-pink/20 text-df-pink border border-df-pink/40'
                    : 'df-surface text-df-muted hover:text-white'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resumen filtros activos */}
      {(zonaFiltro || musculoFiltro || busqueda) && (
        <p className="text-xs text-df-muted">
          Mostrando <span className="text-white font-semibold">{filtrados.length}</span> ejercicio(s)
          {zonaFiltro && <> · Zona: <span className="text-df-violet capitalize">{zonaFiltro}</span></>}
          {musculoFiltro && <> · Músculo: <span className="text-df-pink">{musculoFiltro}</span></>}
          {busqueda && <> · Búsqueda: <span className="text-df-pink">"{busqueda}"</span></>}
        </p>
      )}

      {/* Grid */}
      {filtrados.length === 0
        ? <EmptyState icon="fa-solid fa-dumbbell" title="Sin ejercicios" desc="No hay ejercicios que coincidan con los filtros" />
        : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtrados.map(ej => (
              <EjercicioCard key={ej.id} ej={ej} isAdmin={isAdmin} onEliminar={eliminar} />
            ))}
          </div>
        )
      }
    </div>
  )
}