import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { useAuth } from './useAuth'

export function useProfesional() {
  const { user } = useAuth()
  const [profesional, setProfesional] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => { setProfesional(data); setLoading(false) })
  }, [user?.id])

  return { profesional, loading }
}
