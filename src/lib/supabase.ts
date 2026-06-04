import { createClient } from '@supabase/supabase-js'

const URL  = import.meta.env.VITE_SUPABASE_URL as string
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(URL, ANON)

/* ── Tipos ── */

export interface Profile {
  id: string
  display_name: string | null
  role: 'instructor' | 'alumno' | 'admin'
  tenant_id: string | null
  avatar_url: string | null
  motivational_phrase: string | null
  created_at: string
}

export interface Alumno {
  id: string
  tenant_id: string
  nombre: string
  email: string | null
  telefono: string | null
  foto_url: string | null
  nivel: 'Principiante' | 'Intermedio' | 'Avanzado'
  objetivo: string | null
  activo: boolean
  user_id: string | null
  notas: string | null
  fecha_inicio: string | null
  created_at: string
}

export type Estudiante = Alumno

export interface Rutina {
  id: string
  tenant_id: string
  nombre: string
  descripcion: string | null
  nivel: 'Principiante' | 'Intermedio' | 'Avanzado'
  semanas: number
  dias_semana: number
  categoria: string | null
  imagen_url: string | null
  publica: boolean
  created_at: string
}

export interface Ejercicio {
  id: string
  rutina_id: string
  nombre: string
  series: number
  repeticiones: string
  descanso_seg: number
  video_url: string | null
  orden: number
  notas: string | null
  // Campos nuevos
  foto_inicio_url: string | null
  foto_fin_url: string | null
  seg_por_rep: number
  musculo_url: string | null
}

export interface Sesion {
  id: string
  tenant_id: string
  alumno_id: string
  titulo: string
  tipo: 'Presencial' | 'Online'
  estado: 'Programada' | 'Completada' | 'Cancelada'
  fecha: string
  hora_inicio: string
  hora_fin: string | null
  link_videollamada: string | null
  notas: string | null
  alumno?: Pick<Alumno, 'nombre' | 'foto_url'>
  estudiante?: Pick<Alumno, 'nombre' | 'foto_url'>
  created_at: string
}

export interface Pago {
  id: string
  tenant_id: string
  alumno_id: string
  concepto: string
  monto: number
  moneda: string
  estado: 'Pendiente' | 'Pagado' | 'Vencido'
  fecha_vencimiento: string
  fecha_pago: string | null
  metodo: string | null
  notas: string | null
  alumno?: Pick<Alumno, 'nombre'>
  estudiante?: Pick<Alumno, 'nombre'>
  created_at: string
}

export interface Video {
  id: string
  tenant_id: string
  titulo: string
  descripcion: string | null
  url: string
  miniatura_url: string | null
  categoria: string | null
  publica: boolean
  created_at: string
}

export interface Mensaje {
  id: string
  tenant_id: string
  remitente_id: string
  destinatario_id: string
  contenido: string
  leido: boolean
  created_at: string
  remitente?: Pick<Profile, 'display_name' | 'avatar_url'>
}
