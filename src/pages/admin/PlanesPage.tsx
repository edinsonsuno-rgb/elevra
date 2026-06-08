import { useEffect, useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Spinner, EmptyState, Modal } from '@/components/ui/index'
import { useAuth } from '@/hooks/useAuth'

interface Plan {
  id: string
  nombre: string
  tipo: 'dias' | 'meses'
  cantidad: number
  activo: boolean
  es_invitado: boolean
  slug: string | null
  created_at: string
}

const FORM_INICIAL = { nombre: '', tipo: 'meses' as 'dias' | 'meses', cantidad: 1 }

function calcularVencimiento(tipo: 'dias' | 'meses', cantidad: number): string {
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const hoy = new Date()
  const inicio = `${hoy.getDate()} ${meses[hoy.getMonth()]}`
  if (tipo === 'meses') {
    const fin = new Date(hoy)
    fin.setMonth(fin.getMonth() + cantidad)
    fin.setDate(fin.getDate() - 1)
    return `${inicio} → ${fin.getDate()} ${meses[fin.getMonth()]}`
  } else {
    const fin = new Date(hoy)
    fin.setDate(fin.getDate() + cantidad - 1)
    return `${inicio} → ${fin.getDate()} ${meses[fin.getMonth()]}`
  }
}

export default function PlanesPage() {
  const { role, user } = useAuth()
  const navigate = useNavigate()

  const [planes,      setPlanes]      = useState<Plan[]>([])
  const [loading,     setLoading]     = useState(true)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editando,    setEditando]    = useState<Plan | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [form,        setForm]        = useState(FORM_INICIAL)

  useEffect(() => {
    if (role && role !== 'admin') navigate('/dashboard')
  }, [role])

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data } = await supabase.from('planes').select('*').order('created_at')
    setPlanes(data ?? [])
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm(FORM_INICIAL)
    setError(null)
    setModalOpen(true)
  }

  function abrirEditar(plan: Plan) {
    setEditando(plan)
    setForm({ nombre: plan.nombre, tipo: plan.tipo, cantidad: plan.cantidad })
    setError(null)
    setModalOpen(true)
  }

  function set(key: string, val: any) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError(null)

    if (editando) {
      const payload = editando.es_invitado
        ? { cantidad: form.cantidad }
        : { nombre: form.nombre, tipo: form.tipo, cantidad: form.cantidad }
      const { error: err } = await supabase.from('planes').update(payload).eq('id', editando.id)
      if (err) { setError(err.message); setSaving(false); return }
      // Update optimista: reflejar cambio en local sin refetch
      setPlanes(prev => prev.map(p => p.id === editando.id ? { ...p, ...payload } : p))
    } else {
      const { data: nuevo, error: err } = await supabase.from('planes').insert({
        nombre:     form.nombre,
        tipo:       form.tipo,
        cantidad:   form.cantidad,
        creado_por: user?.id,
      }).select().single()
      if (err) { setError(err.message); setSaving(false); return }
      if (nuevo) setPlanes(prev => [...prev, nuevo])
    }

    setSaving(false)
    setModalOpen(false)
  }

  function toggleActivo(plan: Plan) {
    if (plan.es_invitado) return
    const nuevoActivo = !plan.activo
    // Update optimista: toggle inmediato en UI
    setPlanes(prev => prev.map(p => p.id === plan.id ? { ...p, activo: nuevoActivo } : p))
    supabase.from('planes').update({ activo: nuevoActivo }).eq('id', plan.id)
  }

  function eliminar(plan: Plan) {
    if (plan.es_invitado) return
    if (!confirm('¿Eliminar este plan?')) return
    // Update optimista: quitar de la lista inmediatamente
    setPlanes(prev => prev.filter(p => p.id !== plan.id))
    supabase.from('planes').delete().eq('id', plan.id)
  }

  const planesInvitado = planes.filter(p => p.es_invitado)
  const planesNormales = planes.filter(p => !p.es_invitado)

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Planes de entrenamiento</h1>
          <p className="text-df-muted text-sm mt-0.5">
            {planesNormales.filter(p => p.activo).length} planes activos · {planesInvitado.length} planes invitado
          </p>
        </div>
        <button onClick={abrirNuevo} className="df-btn px-4 py-2.5 text-sm flex items-center gap-2">
          <i className="fa-solid fa-plus" /> Nuevo plan
        </button>
      </div>

      {/* Planes invitado — fijos del sistema */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-bold text-white">Planes invitado</h2>
          <span className="text-[10px] bg-df-purple/20 text-df-violet px-2 py-0.5 rounded-full font-semibold">
            Sistema
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {planesInvitado.map(plan => (
            <div key={plan.id} className="df-card p-4 border-df-purple/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-gift text-df-violet text-sm" />
                  <span className="text-xs font-bold text-df-violet uppercase tracking-wider">
                    {plan.slug?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="df-badge-done">Siempre activo</span>
                  <button onClick={() => abrirEditar(plan)}
                    className="w-7 h-7 rounded-lg df-surface flex items-center justify-center text-df-muted hover:text-white transition-all">
                    <i className="fa-solid fa-pen text-xs" />
                  </button>
                </div>
              </div>
              <p className="text-base font-black text-white mb-1">{plan.nombre}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-df-surface text-df-muted px-2 py-0.5 rounded-full">
                  Por días
                </span>
                <span className="text-sm font-bold text-white">{plan.cantidad} días</span>
              </div>
              <p className="text-[10px] text-df-muted mt-2">
                <i className="fa-solid fa-circle-info mr-1" />
                Solo puedes editar los días de este plan
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Planes normales */}
      <div>
        <h2 className="text-sm font-bold text-white mb-3">Planes creados</h2>
        {planesNormales.length === 0 ? (
          <EmptyState
            icon="fa-solid fa-clipboard-list"
            title="Sin planes aún"
            desc="Crea el primer plan para asignarlo a los alumnos"
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {planesNormales.map(plan => (
              <div key={plan.id}
                className={`df-card p-4 transition-all ${!plan.activo ? 'opacity-50' : 'hover:border-df-violet/40'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    plan.activo ? 'bg-green-900/50 text-green-400' : 'bg-zinc-900/50 text-zinc-400'
                  }`}>
                    {plan.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => abrirEditar(plan)}
                      className="w-7 h-7 rounded-lg df-surface flex items-center justify-center text-df-muted hover:text-white transition-all">
                      <i className="fa-solid fa-pen text-xs" />
                    </button>
                    <button onClick={() => toggleActivo(plan)}
                      className="w-7 h-7 rounded-lg df-surface flex items-center justify-center text-df-muted hover:text-amber-400 transition-all">
                      <i className={`fa-solid ${plan.activo ? 'fa-pause' : 'fa-play'} text-xs`} />
                    </button>
                    <button onClick={() => eliminar(plan)}
                      className="w-7 h-7 rounded-lg df-surface flex items-center justify-center text-df-muted hover:text-red-400 transition-all">
                      <i className="fa-solid fa-trash text-xs" />
                    </button>
                  </div>
                </div>
                <p className="text-base font-black text-white mb-2">{plan.nombre}</p>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-df-surface text-df-muted px-2 py-0.5 rounded-full capitalize">
                    Por {plan.tipo}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {plan.cantidad} {plan.tipo === 'meses' ? 'mes(es)' : 'día(s)'}
                  </span>
                </div>
                <p className="text-[10px] text-df-muted">
                  <i className="fa-solid fa-calendar mr-1 text-df-violet" />
                  {calcularVencimiento(plan.tipo, plan.cantidad)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear / editar */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setError(null) }}
        title={editando ? (editando.es_invitado ? `Editar ${editando.nombre}` : 'Editar plan') : 'Nuevo plan'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Si es plan invitado solo muestra cantidad */}
          {editando?.es_invitado ? (
            <div>
              <p className="text-xs text-df-muted mb-4">
                <i className="fa-solid fa-circle-info mr-1 text-df-violet" />
                Solo puedes modificar los días del plan invitado.
              </p>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">
                Cantidad de días
              </label>
              <div className="flex items-center gap-4">
                <button type="button"
                  onClick={() => set('cantidad', Math.max(1, form.cantidad - 1))}
                  className="df-surface w-10 h-10 rounded-xl flex items-center justify-center text-df-muted hover:text-white transition-colors">
                  <i className="fa-solid fa-minus text-sm" />
                </button>
                <span className="text-3xl font-black text-white w-12 text-center">{form.cantidad}</span>
                <button type="button"
                  onClick={() => set('cantidad', form.cantidad + 1)}
                  className="df-surface w-10 h-10 rounded-xl flex items-center justify-center text-df-muted hover:text-white transition-colors">
                  <i className="fa-solid fa-plus text-sm" />
                </button>
                <span className="text-sm text-df-muted">días</span>
              </div>
            </div>
          ) : (
            <>
              {/* Nombre */}
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">
                  Nombre del plan *
                </label>
                <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                  placeholder="Ej: Plan Premium" className="df-input" required />
              </div>

              {/* Tipo */}
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">
                  Tipo de duración *
                </label>
                <div className="flex gap-2">
                  {(['dias', 'meses'] as const).map(t => (
                    <button key={t} type="button" onClick={() => set('tipo', t)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all
                        ${form.tipo === t ? 'bg-df-purple text-white' : 'df-surface text-df-muted hover:text-white'}`}>
                      <i className={`fa-solid ${t === 'dias' ? 'fa-calendar-day' : 'fa-calendar-month'} text-xs`} />
                      Por {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">
                  Cantidad de {form.tipo === 'meses' ? 'meses' : 'días'} *
                </label>
                <div className="flex items-center gap-4">
                  <button type="button"
                    onClick={() => set('cantidad', Math.max(1, form.cantidad - 1))}
                    className="df-surface w-10 h-10 rounded-xl flex items-center justify-center text-df-muted hover:text-white transition-colors">
                    <i className="fa-solid fa-minus text-sm" />
                  </button>
                  <span className="text-3xl font-black text-white w-12 text-center">{form.cantidad}</span>
                  <button type="button"
                    onClick={() => set('cantidad', form.cantidad + 1)}
                    className="df-surface w-10 h-10 rounded-xl flex items-center justify-center text-df-muted hover:text-white transition-colors">
                    <i className="fa-solid fa-plus text-sm" />
                  </button>
                  <span className="text-sm text-df-muted">{form.tipo === 'meses' ? 'mes(es)' : 'día(s)'}</span>
                </div>
                {/* Preview fecha */}
                <p className="text-[10px] text-df-muted mt-2">
                  <i className="fa-solid fa-calendar mr-1 text-df-violet" />
                  {calcularVencimiento(form.tipo, form.cantidad)}
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button"
              onClick={() => { setModalOpen(false); setError(null) }}
              className="df-btn-outline border border-df-border px-5 py-2.5 text-sm rounded-xl flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="df-btn px-5 py-2.5 text-sm flex-1 flex items-center justify-center gap-2">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><i className="fa-solid fa-check" /> Guardar</>
              }
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}