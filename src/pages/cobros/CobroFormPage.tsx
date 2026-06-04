import { useEffect, useState, FormEvent } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase, Alumno } from '@/lib/supabase'
import { Spinner } from '@/components/ui/index'
import { useProfesional } from '@/hooks/useProfesional'

const CONCEPTOS = ['Mensualidad', 'Plan trimestral', 'Plan semestral', 'Sesión individual', 'Rutina personalizada', 'Otro']
const METODOS   = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta', 'Otro']

export default function CobroFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { profesional } = useProfesional()

  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const [form, setForm] = useState({
    alumno_id:        '',
    concepto:         'Mensualidad',
    monto:            0,
    moneda:           'COP',
    estado:           'Pendiente' as 'Pendiente' | 'Pagado' | 'Vencido',
    fecha_vencimiento: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    fecha_pago:       '',
    metodo:           '',
    notas:            '',
  })

  useEffect(() => {
    supabase.from('alumnos').select('id,nombre').eq('activo', true).order('nombre')
      .then(({ data }) => setAlumnos((data ?? []) as any))
    if (isEdit) {
      supabase.from('pagos').select('*').eq('id', id!).single().then(({ data }) => {
        if (data) setForm({
          alumno_id:         data.alumno_id,
          concepto:          data.concepto,
          monto:             data.monto,
          moneda:            data.moneda,
          estado:            data.estado,
          fecha_vencimiento: data.fecha_vencimiento,
          fecha_pago:        data.fecha_pago ?? '',
          metodo:            data.metodo ?? '',
          notas:             data.notas ?? '',
        })
        setLoading(false)
      })
    } else { setLoading(false) }
  }, [id])

  function set(key: string, val: any) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.alumno_id) { setError('Selecciona un alumno'); return }
    if (!form.monto || form.monto <= 0) { setError('Ingresa un monto válido'); return }
    setSaving(true); setError(null)
    const payload = {
      ...form,
      fecha_pago: form.fecha_pago || null,
      metodo: form.metodo || null,
      tenant_id: profesional?.tenant_id,
    }
    const { error: err } = isEdit
      ? await supabase.from('pagos').update(payload).eq('id', id!)
      : await supabase.from('pagos').insert(payload)
    if (err) { setError(err.message); setSaving(false); return }
    navigate('/cobros')
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/cobros" className="text-df-muted hover:text-white transition-colors">
          <i className="fa-solid fa-arrow-left" />
        </Link>
        <h1 className="text-xl font-black text-white">{isEdit ? 'Editar cobro' : 'Nuevo cobro'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="df-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Información del cobro</h2>

          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Alumno *</label>
            <select value={form.alumno_id} onChange={e => set('alumno_id', e.target.value)} className="df-input">
              <option value="">Seleccionar alumno...</option>
              {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Concepto</label>
            <div className="flex flex-wrap gap-2">
              {CONCEPTOS.map(c => (
                <button type="button" key={c} onClick={() => set('concepto', c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${form.concepto === c ? 'bg-df-purple text-white' : 'df-surface text-df-muted hover:text-white'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Monto *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm">$</span>
                <input type="number" min={0} value={form.monto || ''}
                  onChange={e => set('monto', Number(e.target.value))}
                  placeholder="0" className="df-input pl-8" required />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Moneda</label>
              <select value={form.moneda} onChange={e => set('moneda', e.target.value)} className="df-input">
                <option value="COP">COP — Peso colombiano</option>
                <option value="USD">USD — Dólar</option>
                <option value="MXN">MXN — Peso mexicano</option>
              </select>
            </div>
          </div>
        </div>

        <div className="df-card p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">Fechas y estado</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Fecha de vencimiento</label>
              <input type="date" value={form.fecha_vencimiento}
                onChange={e => set('fecha_vencimiento', e.target.value)} className="df-input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Fecha de pago</label>
              <input type="date" value={form.fecha_pago}
                onChange={e => set('fecha_pago', e.target.value)} className="df-input" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Estado</label>
            <div className="flex gap-2">
              {(['Pendiente', 'Pagado', 'Vencido'] as const).map(s => (
                <button type="button" key={s} onClick={() => set('estado', s)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all
                    ${form.estado === s ? 'bg-df-purple text-white' : 'df-surface text-df-muted hover:text-white'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-2 block">Método de pago</label>
            <div className="flex flex-wrap gap-2">
              {METODOS.map(m => (
                <button type="button" key={m} onClick={() => set('metodo', form.metodo === m ? '' : m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                    ${form.metodo === m ? 'bg-df-pink/20 text-df-pink border border-df-pink/40' : 'df-surface text-df-muted hover:text-white'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="df-card p-5">
          <label className="text-xs font-semibold text-df-muted uppercase tracking-wider mb-1.5 block">Notas</label>
          <textarea value={form.notas} onChange={e => set('notas', e.target.value)}
            placeholder="Observaciones adicionales..." rows={3} className="df-input resize-none" />
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-xs text-red-400 flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation" /> {error}
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/cobros" className="df-btn-outline border border-df-border px-6 py-3 text-sm rounded-xl flex-1 text-center">
            Cancelar
          </Link>
          <button type="submit" disabled={saving}
            className="df-btn px-6 py-3 text-sm flex-1 flex items-center justify-center gap-2">
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</>
              : <><i className="fa-solid fa-check" /> {isEdit ? 'Guardar cambios' : 'Crear cobro'}</>
            }
          </button>
        </div>
      </form>
    </div>
  )
}
