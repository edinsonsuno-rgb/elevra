import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Avatar, Spinner, EmptyState } from '@/components/ui/index'

interface InstructorItem {
  tenant_id:     string
  tenant_nombre: string
  subdominio:    string
  al_dia:        boolean
  display_name:  string | null
  avatar_url:    string | null
  alumnos_count: number
}

export default function InstructoresPage() {
  const [instructores, setInstructores] = useState<InstructorItem[]>([])
  const [loading,      setLoading]      = useState(true)

  const [precioMensual, setPrecioMensual] = useState(10000)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const [{ data: tenants }, { data: admins }, { data: alumnos }, { data: config }] = await Promise.all([
      supabase.from('tenants')
        .select('id, nombre, subdominio, al_dia')
        .eq('activo', true)
        .order('nombre'),
      supabase.from('profiles')
        .select('id, display_name, avatar_url, tenant_id')
        .eq('role', 'instructor'),
      supabase.from('alumnos')
        .select('tenant_id')
        .eq('activo', true),
      supabase.from('configuracion')
        .select('valor')
        .eq('clave', 'precio_por_alumno')
        .maybeSingle(),
    ])

    if (config) setPrecioMensual(Number(config.valor ?? 10000))

    const conteo: Record<string, number> = {}
    for (const a of (alumnos ?? [])) {
      conteo[a.tenant_id] = (conteo[a.tenant_id] ?? 0) + 1
    }

    setInstructores(
      (tenants ?? []).map(t => {
        const admin = (admins ?? []).find(a => a.tenant_id === t.id)
        return {
          tenant_id:     t.id,
          tenant_nombre: t.nombre,
          subdominio:    t.subdominio,
          al_dia:        (t as any).al_dia ?? true,
          display_name:  admin?.display_name ?? null,
          avatar_url:    admin?.avatar_url ?? null,
          alumnos_count: conteo[t.id] ?? 0,
        }
      })
    )
    setLoading(false)
  }

  if (loading) return <Spinner />

  const totalAlumnos = instructores.reduce((s, i) => s + i.alumnos_count, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Instructores</h1>
          <p className="text-df-muted text-sm mt-0.5">
            {instructores.length} activos · {totalAlumnos} alumnos en total
          </p>
        </div>
      </div>

      {instructores.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-chalkboard-user"
          title="Sin instructores"
          desc="No hay instructores registrados aún"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {instructores.map(ins => {
            const mensual = ins.alumnos_count * precioMensual
            return (
              <Link
                key={ins.tenant_id}
                to={`/instructores/${ins.tenant_id}`}
                className="df-card p-4 hover:border-df-violet/40 transition-all group flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar nombre={ins.display_name ?? ins.tenant_nombre} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate group-hover:text-df-violet transition-colors">
                      {ins.display_name ?? ins.tenant_nombre}
                    </p>
                    <p className="text-xs text-df-muted">{ins.subdominio}.elevra.lat</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ins.al_dia ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="df-surface rounded-xl p-2 text-center">
                    <p className="text-base font-black text-white">{ins.alumnos_count}</p>
                    <p className="text-[10px] text-df-muted uppercase tracking-wide">Alumnos</p>
                  </div>
                  <div className="df-surface rounded-xl p-2 text-center">
                    <p className="text-base font-black text-white">
                      {mensual > 0 ? `$${mensual.toLocaleString('es-CO')}` : '—'}
                    </p>
                    <p className="text-[10px] text-df-muted uppercase tracking-wide">Este mes</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    ins.al_dia
                      ? 'bg-green-900/40 text-green-400'
                      : 'bg-red-900/40 text-red-400'
                  }`}>
                    {ins.al_dia ? '✓ Al día' : '⚠ Pendiente'}
                  </span>
                  <span className="text-[10px] text-df-muted group-hover:text-df-violet transition-colors">
                    Ver perfil →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
