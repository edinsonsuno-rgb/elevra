import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Pago } from '@/lib/supabase'
import { EstadoPagoBadge, Spinner, EmptyState } from '@/components/ui/index'

export default function CobrosPage() {
  const [pagos, setPagos]       = useState<Pago[]>([])
  const [loading, setLoading]   = useState(true)
  const [filtro, setFiltro]     = useState<string>('Todos')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data } = await supabase
      .from('pagos').select('*, alumno:alumnos(nombre)')
      .order('fecha_vencimiento', { ascending: false })
    setPagos((data as any) ?? [])
    setLoading(false)
  }

  function marcarPagado(id: string) {
    const fechaPago = new Date().toISOString().split('T')[0]
    // Update optimista: el usuario ve el cambio instantáneamente
    setPagos(prev => prev.map(p =>
      p.id === id ? { ...p, estado: 'Pagado' as const, fecha_pago: fechaPago } : p
    ))
    // Persistir en background sin bloquear la UI
    supabase.from('pagos').update({ estado: 'Pagado', fecha_pago: fechaPago }).eq('id', id)
  }

  const estados = ['Todos', 'Pendiente', 'Vencido', 'Pagado']
  const filtrados = pagos.filter(p => {
    const coincide = (p.alumno as any)?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.concepto.toLowerCase().includes(busqueda.toLowerCase())
    const estado = filtro === 'Todos' ? true : p.estado === filtro
    return coincide && estado
  })

  const totalPendiente = pagos.filter(p => p.estado !== 'Pagado').reduce((a, p) => a + p.monto, 0)
  const totalMes = (() => {
    const mes = new Date().toISOString().slice(0, 7)
    return pagos.filter(p => p.estado === 'Pagado' && p.fecha_pago?.startsWith(mes)).reduce((a, p) => a + p.monto, 0)
  })()

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Cobros</h1>
          <p className="text-df-muted text-sm mt-0.5">{pagos.filter(p => p.estado !== 'Pagado').length} pendientes</p>
        </div>
        <Link to="/cobros/nuevo" className="df-btn px-4 py-2.5 text-sm flex items-center gap-2">
          <i className="fa-solid fa-plus" /> Nuevo cobro
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="df-surface p-4 rounded-2xl">
          <p className="text-xs text-df-muted uppercase tracking-wider mb-1">Por cobrar</p>
          <p className="text-2xl font-black text-amber-400">${totalPendiente.toLocaleString()}</p>
        </div>
        <div className="df-surface p-4 rounded-2xl">
          <p className="text-xs text-df-muted uppercase tracking-wider mb-1">Cobrado este mes</p>
          <p className="text-2xl font-black text-green-400">${totalMes.toLocaleString()}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar alumno o concepto..." className="df-input !pl-8 pr-16" />
        </div>
        <div className="flex gap-2">
          {estados.map(e => (
            <button key={e} onClick={() => setFiltro(e)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all
                ${filtro === e ? 'bg-df-purple text-white' : 'df-surface text-df-muted hover:text-white'}`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtrados.length === 0
        ? <EmptyState icon="fa-solid fa-file-invoice-dollar" title="Sin cobros" desc="No hay cobros que coincidan con el filtro" />
        : (
          <div className="space-y-2">
            {filtrados.map(p => (
              <div key={p.id} className="df-surface p-4 rounded-xl flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  ${p.estado === 'Pagado' ? 'bg-green-900/30' : p.estado === 'Vencido' ? 'bg-red-900/30' : 'bg-amber-900/30'}`}>
                  <i className={`fa-solid fa-dollar-sign text-sm
                    ${p.estado === 'Pagado' ? 'text-green-400' : p.estado === 'Vencido' ? 'text-red-400' : 'text-amber-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{(p.alumno as any)?.nombre}</p>
                  <p className="text-xs text-df-muted">{p.concepto} · Vence: {p.fecha_vencimiento}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-black text-white">${p.monto.toLocaleString()}</span>
                  <EstadoPagoBadge estado={p.estado} />
                  {p.estado !== 'Pagado' && (
                    <button onClick={() => marcarPagado(p.id)}
                      className="w-8 h-8 bg-green-900/30 hover:bg-green-900/60 rounded-lg flex items-center justify-center text-green-400 transition-all"
                      title="Marcar como pagado">
                      <i className="fa-solid fa-check text-xs" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
