import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Rutina } from '@/lib/supabase'
import { NivelBadge, Spinner, EmptyState } from '@/components/ui/index'

const NIVEL_ICON: Record<string, string> = {
  Principiante: 'fa-solid fa-seedling',
  Intermedio:   'fa-solid fa-bolt',
  Avanzado:     'fa-solid fa-fire',
}

export default function RutinasPage() {
  const [rutinas, setRutinas]   = useState<Rutina[]>([])
  const [loading, setLoading]   = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro]     = useState<string>('Todas')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data } = await supabase.from('rutinas').select('*').order('created_at', { ascending: false })
    setRutinas(data ?? [])
    setLoading(false)
  }

  const niveles = ['Todas', 'Principiante', 'Intermedio', 'Avanzado']
  const filtradas = rutinas.filter(r => {
    const coincide = r.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const nivel = filtro === 'Todas' ? true : r.nivel === filtro
    return coincide && nivel
  })

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Mis Rutinas</h1>
          <p className="text-df-muted text-sm mt-0.5">{rutinas.length} rutinas creadas</p>
        </div>
        <Link to="/rutinas/nueva" className="df-btn px-4 py-2.5 text-sm flex items-center gap-2">
          <i className="fa-solid fa-plus" /> Nueva rutina
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar rutina..." className="df-input !pl-8 pr-16" />
        </div>
        <div className="flex gap-2">
          {niveles.map(n => (
            <button key={n} onClick={() => setFiltro(n)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all
                ${filtro === n ? 'bg-df-purple text-white' : 'df-surface text-df-muted hover:text-white'}`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtradas.length === 0
        ? <EmptyState icon="fa-solid fa-dumbbell" title="Sin rutinas" desc="Crea tu primera rutina para asignarla a tus alumnos" />
        : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtradas.map(r => (
              <Link key={r.id} to={`/rutinas/${r.id}`}
                className="df-card overflow-hidden hover:border-df-violet/40 transition-all group">
                {/* Imagen / placeholder */}
                <div className="h-36 bg-gradient-to-br from-df-purple/20 to-df-card flex items-center justify-center relative overflow-hidden">
                  {r.imagen_url
                    ? <img src={r.imagen_url} alt={r.nombre} className="w-full h-full object-cover" />
                    : <i className={`${NIVEL_ICON[r.nivel] ?? 'fa-solid fa-dumbbell'} text-4xl text-df-purple/40`} />
                  }
                  <div className="absolute inset-0 bg-gradient-to-t from-df-card to-transparent" />
                  <div className="absolute bottom-3 left-3">
                    <NivelBadge nivel={r.nivel} />
                  </div>
                  {r.publica && (
                    <div className="absolute top-3 right-3 bg-df-purple/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Pública
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-black text-white group-hover:text-df-violet transition-colors truncate">{r.nombre}</h3>
                  {r.descripcion && <p className="text-xs text-df-muted mt-1 line-clamp-2">{r.descripcion}</p>}
                  <div className="flex items-center gap-3 mt-3 text-[10px] text-df-muted">
                    <span><i className="fa-solid fa-calendar-week mr-1" />{r.semanas} semanas</span>
                    <span><i className="fa-solid fa-repeat mr-1" />{r.dias_semana} días/sem</span>
                    {r.categoria && <span><i className="fa-solid fa-tag mr-1" />{r.categoria}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      }
    </div>
  )
}
