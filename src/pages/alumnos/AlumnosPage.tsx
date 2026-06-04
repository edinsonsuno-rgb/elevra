import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Alumno } from '@/lib/supabase'
import { Avatar, NivelBadge, Spinner, EmptyState } from '@/components/ui/index'

export default function AlumnosPage() {
  const [alumnos,  setAlumnos]  = useState<Alumno[]>([])
  const [loading,  setLoading]  = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro,   setFiltro]   = useState<'todos' | 'activos' | 'inactivos'>('todos')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data } = await supabase.from('alumnos').select('*').order('nombre')
    setAlumnos(data ?? [])
    setLoading(false)
  }

  const filtrados = alumnos.filter(a => {
    const coincide = a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (a.email ?? '').toLowerCase().includes(busqueda.toLowerCase())
    const estado = filtro === 'todos' ? true : filtro === 'activos' ? a.activo : !a.activo
    return coincide && estado
  })

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Mis Alumnos</h1>
          <p className="text-df-muted text-sm mt-0.5">
            {alumnos.filter(a => a.activo).length} activos · {alumnos.length} total
          </p>
        </div>
        <Link to="/alumnos/nuevo" className="df-btn px-4 py-2.5 text-sm flex items-center gap-2">
          <i className="fa-solid fa-user-plus" /> Nuevo alumno
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm" />
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar alumno..." className="df-input !pl-8 pr-16" />
        </div>
        <div className="flex gap-2">
          {(['todos','activos','inactivos'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all
                ${filtro === f ? 'bg-df-purple text-white' : 'df-surface text-df-muted hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0
        ? <EmptyState icon="fa-solid fa-users-slash" title="Sin resultados" desc="Prueba con otro nombre o filtro" />
        : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map(a => (
              <Link key={a.id} to={`/alumnos/${a.id}`}
                className="df-card p-4 hover:border-df-violet/40 transition-all group">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar nombre={a.nombre} foto_url={a.foto_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate group-hover:text-df-violet transition-colors">
                      {a.nombre}
                    </p>
                    <p className="text-xs text-df-muted truncate">{a.email}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.activo ? 'bg-green-400' : 'bg-zinc-600'}`} />
                </div>
                <div className="flex items-center justify-between">
                  <NivelBadge nivel={a.nivel} />
                  {a.objetivo && <p className="text-[10px] text-df-muted truncate max-w-[120px]">{a.objetivo}</p>}
                </div>
                {a.fecha_inicio && (
                  <p className="text-[10px] text-df-muted mt-2">
                    <i className="fa-solid fa-calendar-day mr-1" />
                    Desde {new Date(a.fecha_inicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )
      }
    </div>
  )
}
