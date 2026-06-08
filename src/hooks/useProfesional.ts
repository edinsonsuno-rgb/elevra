import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { getCache, setCache } from '@/lib/queryCache'

const TTL = 5 * 60 * 1000 // 5 min

export function useProfesional() {
  const { user } = useAuth()
  const [profesional, setProfesional] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    const key = `profile-${user.id}`
    const cached = getCache<Profile>(key)
    if (cached) { setProfesional(cached); setLoading(false); return }

    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setCache(key, data, TTL)
        setProfesional(data)
        setLoading(false)
      })
  }, [user?.id])

  return { profesional, loading }
}
