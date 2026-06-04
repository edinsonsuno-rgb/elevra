/* ── Avatar ── */
interface AvatarProps {
  nombre: string
  foto_url?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const sizes = { xs: 'w-7 h-7 text-[10px]', sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base' }

export function Avatar({ nombre, foto_url, size = 'md' }: AvatarProps) {
  const initials = nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  if (foto_url) return (
    <img src={foto_url} alt={nombre}
      className={`${sizes[size]} rounded-full object-cover flex-shrink-0 border border-df-border`} />
  )
  return (
    <div className={`${sizes[size]} rounded-full bg-df-purple/20 border border-df-purple/30 flex items-center justify-center flex-shrink-0 font-bold text-df-violet`}>
      {initials}
    </div>
  )
}

/* ── Progress Bar ── */
export function ProgresBar({ pct, className = '' }: { pct: number; className?: string }) {
  return (
    <div className={`w-full h-1.5 bg-df-border rounded-full overflow-hidden ${className}`}>
      <div className="h-full rounded-full bg-gradient-to-r from-df-purple to-df-pink transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  )
}

/* ── Estado Sesion Badge ── */
export function EstadoSesionBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    Programada: 'df-badge-pending',
    Completada: 'df-badge-done',
    Cancelada:  'df-badge-cancel',
  }
  return <span className={map[estado] ?? 'df-badge-int'}>{estado}</span>
}

/* ── Estado Pago Badge ── */
export function EstadoPagoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    Pagado:   'df-badge-paid',
    Pendiente:'df-badge-pending',
    Vencido:  'df-badge-overdue',
  }
  return <span className={map[estado] ?? 'df-badge-int'}>{estado}</span>
}

/* ── Nivel Badge ── */
export function NivelBadge({ nivel }: { nivel: string }) {
  const map: Record<string, string> = {
    Principiante: 'df-badge-beg',
    Intermedio:   'df-badge-int',
    Avanzado:     'df-badge-adv',
  }
  return <span className={map[nivel] ?? 'df-badge-int'}>{nivel}</span>
}

/* ── Spinner ── */
export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center h-64 ${className}`}>
      <div className="w-8 h-8 border-4 border-df-border border-t-df-violet rounded-full animate-spin" />
    </div>
  )
}

/* ── Empty State ── */
export function EmptyState({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
  return (
    <div className="df-surface p-10 rounded-2xl text-center flex flex-col items-center gap-3">
      <i className={`${icon} text-3xl text-df-muted`} />
      <p className="text-sm font-bold text-white">{title}</p>
      {desc && <p className="text-xs text-df-muted">{desc}</p>}
    </div>
  )
}

/* ── Modal ── */
export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}>
      <div className="df-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-white">{title}</h2>
          <button onClick={onClose} className="df-btn-ghost w-8 h-8 flex items-center justify-center rounded-lg hover:bg-df-surface">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
