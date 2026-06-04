import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  mostrarProfe?: boolean
}

export default function WhatsAppFloat({ mostrarProfe = false }: Props) {
  const { user, role } = useAuth()
  const [abierto,        setAbierto]        = useState(false)
  const [whatsappProfe,  setWhatsappProfe]  = useState<string | null>(null)
  const [nombreProfe,    setNombreProfe]    = useState<string | null>(null)
  const [whatsappSoporte, setWhatsappSoporte] = useState<string | null>(null)

  useEffect(() => { cargar() }, [user])

  async function cargar() {
    // Número de soporte
    const { data: config } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'whatsapp_soporte')
      .single()
    setWhatsappSoporte(config?.valor ?? null)

    // WhatsApp del profe (solo para alumnos)
    if (mostrarProfe && user) {
      const { data: alumno } = await supabase
        .from('alumnos')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single()

      if (alumno?.tenant_id) {
        const { data: profe } = await supabase
          .from('profiles')
          .select('display_name, whatsapp')
          .eq('tenant_id', alumno.tenant_id)
          .eq('role', 'instructor')
          .single()
        setWhatsappProfe(profe?.whatsapp ?? null)
        setNombreProfe(profe?.display_name ?? null)
      }
    }
  }

  function abrirWhatsApp(numero: string, mensaje: string) {
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
    window.open(url, '_blank')
    setAbierto(false)
  }

  const tieneOpciones = whatsappSoporte || (mostrarProfe && whatsappProfe)
  if (!tieneOpciones) return null

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">

      {/* Opciones desplegables */}
      {abierto && (
        <div className="flex flex-col gap-2 mb-1">
          {/* Botón profe */}
          {mostrarProfe && whatsappProfe && (
            <button
              onClick={() => abrirWhatsApp(whatsappProfe, `Hola ${nombreProfe}, tengo una consulta sobre mi entrenamiento.`)}
              className="flex items-center gap-3 bg-df-card border border-df-border rounded-2xl px-4 py-3 shadow-lg hover:border-green-500/40 transition-all group">
              <div className="w-9 h-9 rounded-full bg-green-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-green-900/50 transition-all">
                <i className="fa-brands fa-whatsapp text-green-400 text-lg" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">{nombreProfe ?? 'Mi instructor'}</p>
                <p className="text-[10px] text-df-muted">Hablar con mi profe</p>
              </div>
            </button>
          )}

          {/* Botón soporte */}
          {whatsappSoporte && (
            <button
              onClick={() => abrirWhatsApp(whatsappSoporte, `Hola, necesito ayuda con la app Elevra.`)}
              className="flex items-center gap-3 bg-df-card border border-df-border rounded-2xl px-4 py-3 shadow-lg hover:border-df-violet/40 transition-all group">
              <div className="w-9 h-9 rounded-full bg-df-purple/20 flex items-center justify-center flex-shrink-0 group-hover:bg-df-purple/40 transition-all">
                <i className="fa-brands fa-whatsapp text-df-violet text-lg" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">Soporte técnico</p>
                <p className="text-[10px] text-df-muted">Ayuda con la plataforma</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Botón principal flotante */}
      <button
        onClick={() => setAbierto(v => !v)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all
          ${abierto
            ? 'bg-df-surface border border-df-border rotate-45'
            : 'bg-green-500 hover:bg-green-400 glow-pink'
          }`}
        style={!abierto ? { boxShadow: '0 4px 20px rgba(37,211,102,0.4)' } : {}}>
        <i className={`text-white text-xl transition-all ${abierto ? 'fa-solid fa-xmark' : 'fa-brands fa-whatsapp'}`} />
      </button>
    </div>
  )
}