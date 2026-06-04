import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui/index'
import { useAuth } from '@/hooks/useAuth'

interface Config {
  clave: string
  valor: string
  descripcion: string | null
}

export default function ConfiguracionPage() {
  const { role } = useAuth()
  const navigate  = useNavigate()
  const [configs,  setConfigs]  = useState<Config[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [saved,    setSaved]    = useState<string | null>(null)
  const [precio,   setPrecio]   = useState(10000)

  useEffect(() => {
    if (role && role !== 'admin') navigate('/dashboard')
  }, [role])

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data } = await supabase.from('configuracion').select('*').order('clave')
    setConfigs(data ?? [])
    const p = data?.find(c => c.clave === 'precio_por_alumno')
    if (p) setPrecio(Number(p.valor))
    setLoading(false)
  }

  async function guardarPrecio() {
    setSaving('precio')
    const precioDia = Math.round(precio / 30)
    await Promise.all([
      supabase.from('configuracion').update({ valor: String(precio) }).eq('clave', 'precio_por_alumno'),
      supabase.from('configuracion').update({ valor: String(precioDia) }).eq('clave', 'precio_diario'),
    ])
    setSaving(null)
    setSaved('precio')
    setTimeout(() => setSaved(null), 3000)
    cargar()
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">Configuración del sistema</h1>
        <p className="text-df-muted text-sm mt-0.5">Solo visible para administrador</p>
      </div>

      {/* Precio por alumno */}
      <div className="df-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white">Precio por alumno activo</h2>
          <p className="text-xs text-df-muted mt-1">
            Se cobra al profe cuando activa o renueva el plan de un alumno. Aplica a todos los planes de pago.
            Los planes invitado siempre son $0.
          </p>
        </div>

        <div className="df-surface p-4 rounded-xl space-y-3">
          <label className="text-xs font-semibold text-df-muted uppercase tracking-wider block">
            Precio mensual (COP)
          </label>
          <div className="flex items-center gap-4">
            <button onClick={() => setPrecio(p => Math.max(1000, p - 1000))}
              className="df-surface w-10 h-10 rounded-xl flex items-center justify-center text-df-muted hover:text-white transition-colors flex-shrink-0">
              <i className="fa-solid fa-minus text-sm" />
            </button>
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm">$</span>
              <input
                type="number" min={1000} step={1000} value={precio}
                onChange={e => setPrecio(Number(e.target.value))}
                className="df-input pl-8 text-xl font-black text-center"
              />
            </div>
            <button onClick={() => setPrecio(p => p + 1000)}
              className="df-surface w-10 h-10 rounded-xl flex items-center justify-center text-df-muted hover:text-white transition-colors flex-shrink-0">
              <i className="fa-solid fa-plus text-sm" />
            </button>
          </div>

          {/* Desglose */}
          <div className="grid grid-cols-3 gap-3 mt-2">
            <div className="bg-df-card rounded-xl p-3 text-center">
              <p className="text-xs text-df-muted mb-1">Por día</p>
              <p className="text-sm font-black text-white">${Math.round(precio / 30).toLocaleString()}</p>
            </div>
            <div className="bg-df-card rounded-xl p-3 text-center">
              <p className="text-xs text-df-muted mb-1">Plan 7 días</p>
              <p className="text-sm font-black text-df-pink">${Math.round((precio / 30) * 7).toLocaleString()}</p>
            </div>
            <div className="bg-df-card rounded-xl p-3 text-center">
              <p className="text-xs text-df-muted mb-1">Plan 15 días</p>
              <p className="text-sm font-black text-df-pink">${Math.round((precio / 30) * 15).toLocaleString()}</p>
            </div>
          </div>

          <p className="text-[10px] text-df-muted">
            <i className="fa-solid fa-circle-info mr-1 text-df-violet" />
            Cambiar el precio aplica a todos los planes que se activen o renueven desde ahora.
            Los planes ya activos no se ven afectados hasta que renueven.
          </p>
        </div>

        <button onClick={guardarPrecio} disabled={saving === 'precio'}
          className="df-btn px-6 py-3 text-sm flex items-center gap-2">
          {saving === 'precio'
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
            : saved === 'precio'
            ? <><i className="fa-solid fa-check text-green-400" /> Guardado</>
            : <><i className="fa-solid fa-floppy-disk" /> Guardar precio</>
          }
        </button>
      </div>

      {/* Días hábiles para pago */}
      <div className="df-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white">Días hábiles para pago</h2>
          <p className="text-xs text-df-muted mt-1">
            Días que tiene el profe para pagar la factura mensual antes de suspender su acceso.
          </p>
        </div>
        <div className="df-surface p-4 rounded-xl flex items-center justify-between">
          <p className="text-sm text-df-muted">Días hábiles actuales</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-white">
              {configs.find(c => c.clave === 'dias_pago_habiles')?.valor ?? '5'}
            </span>
            <span className="text-xs text-df-muted">días</span>
          </div>
        </div>
        <p className="text-[10px] text-df-muted">
          <i className="fa-solid fa-circle-info mr-1 text-df-violet" />
          Configurado en 5 días hábiles. Para cambiar este valor contáctanos.
        </p>
      </div>

      {/* WhatsApp soporte */}
      <div className="df-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white">WhatsApp soporte</h2>
          <p className="text-xs text-df-muted mt-1">
            Número que los profesores ven en la ayuda del sistema para contactar al equipo de soporte.
          </p>
        </div>
        <div className="df-surface p-4 rounded-xl space-y-2">
          <p className="text-xs text-df-muted uppercase tracking-widest">Número de soporte</p>
          <p className="text-lg font-black text-white">
            {configs.find(c => c.clave === 'whatsapp_soporte')?.valor ?? 'No configurado'}
          </p>
          <p className="text-[10px] text-df-muted">
            Este valor se utiliza en el widget de WhatsApp para que los profesores puedan pedir ayuda directamente.
          </p>
        </div>
      </div>
    </div>
  )
}