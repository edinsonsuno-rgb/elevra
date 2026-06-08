import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getCache, setCache } from '@/lib/queryCache'

interface AlumnoBase { id: string; nivel: string | null }

const TTL = 30 * 60 * 1000 // 30 min — el alumno_id no cambia en una sesión

export function useAlumnoId() {
  const { user } = useAuth()
  const [alumno,  setAlumno]  = useState<AlumnoBase | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const key = `alumno-base-${user.id}`
    const cached = getCache<AlumnoBase>(key)
    if (cached) { setAlumno(cached); setLoading(false); return }

    supabase.from('alumnos').select('id, nivel').eq('user_id', user.id).single()
      .then(({ data }) => {
        if (data) setCache(key, data as AlumnoBase, TTL)
        setAlumno((data as AlumnoBase | null) ?? null)
        setLoading(false)
      })
  }, [user?.id])

  return { alumno, alumnoId: alumno?.id ?? null, loading }
}
