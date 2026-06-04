import { useEffect, useState, useRef } from 'react'
import { supabase, Alumno } from '@/lib/supabase'
import { Avatar, Spinner } from '@/components/ui/index'
import { useAuth } from '@/hooks/useAuth'

interface Msg { id: string; remitente_id: string; contenido: string; created_at: string; leido: boolean }

export default function MensajesPage() {
  const [alumnos, setAlumnos]           = useState<Alumno[]>([])
  const [seleccionada, setSeleccionada] = useState<Alumno | null>(null)
  const [mensajes, setMensajes]       = useState<Msg[]>([])
  const [texto, setTexto]             = useState('')
  const [loading, setLoading]         = useState(true)
  const [busqueda, setBusqueda]       = useState('')
  const { user } = useAuth()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('alumnos').select('*').eq('activo', true).order('nombre')
      .then(({ data }) => { setAlumnos(data ?? []); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!seleccionada) return
    cargarMensajes(seleccionada)
  }, [seleccionada?.id])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes])

  async function cargarMensajes(a: Alumno) {
    const { data } = await supabase.from('mensajes')
      .select('*')
      .or(`remitente_id.eq.${user?.id},destinatario_id.eq.${user?.id}`)
      .or(`remitente_id.eq.${a.user_id},destinatario_id.eq.${a.user_id}`)
      .order('created_at')
    setMensajes((data as any) ?? [])
  }

  async function enviar() {
    if (!texto.trim() || !seleccionada?.user_id) return
    await supabase.from('mensajes').insert({
      remitente_id: user?.id,
      destinatario_id: seleccionada.user_id,
      contenido: texto.trim(),
      leido: false,
    })
    setTexto('')
    cargarMensajes(seleccionada)
  }

  const filtradas = alumnos.filter(a => a.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  if (loading) return <Spinner />

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Lista de alumnos */}
      <div className="w-72 flex-shrink-0 df-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-df-border">
          <h2 className="text-sm font-black text-white mb-3">Mensajes</h2>
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-df-muted text-xs" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar alumno..." className="df-input !pl-8 pr-16 text-xs py-2" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtradas.map(a => (
            <button key={a.id} onClick={() => setSeleccionada(a)}
              className={`w-full flex items-center gap-3 p-3 transition-all hover:bg-df-surface text-left
                ${seleccionada?.id === a.id ? 'bg-df-purple/10 border-l-2 border-df-violet' : 'border-l-2 border-transparent'}`}>
              <Avatar nombre={a.nombre} foto_url={a.foto_url} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{a.nombre}</p>
                <p className="text-xs text-df-muted">{a.nivel}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 df-card flex flex-col overflow-hidden">
        {!seleccionada ? (
          <div className="flex-1 flex items-center justify-center text-df-muted text-sm flex-col gap-3">
            <i className="fa-solid fa-comments text-3xl" />
            <p>Selecciona un alumno para chatear</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-df-border">
              <Avatar nombre={seleccionada.nombre} foto_url={seleccionada.foto_url} size="sm" />
              <div>
                <p className="text-sm font-bold text-white">{seleccionada.nombre}</p>
                <p className="text-xs text-green-400">Activo</p>
              </div>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {mensajes.length === 0 && (
                <p className="text-df-muted text-xs text-center py-8">Sin mensajes aún. ¡Di hola! 👋</p>
              )}
              {mensajes.map(m => {
                const esMio = m.remitente_id === user?.id
                return (
                  <div key={m.id} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                      ${esMio
                        ? 'bg-df-purple text-white rounded-br-sm'
                        : 'bg-df-surface text-df-text rounded-bl-sm border border-df-border'}`}>
                      {m.contenido}
                      <p className={`text-[10px] mt-1 ${esMio ? 'text-white/60' : 'text-df-muted'}`}>
                        {new Date(m.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-df-border flex gap-2">
              <input value={texto} onChange={e => setTexto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
                placeholder="Escribe un mensaje..." className="df-input flex-1" />
              <button onClick={enviar} disabled={!texto.trim()}
                className="df-btn px-4 py-2 text-sm disabled:opacity-40">
                <i className="fa-solid fa-paper-plane" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
