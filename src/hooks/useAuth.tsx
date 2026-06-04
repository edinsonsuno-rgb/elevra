import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthCtx {
  user: User | null
  loading: boolean
  role: string | null
  activa: boolean | null
  displayName: string | null
  tenantId: string | null
  updateDisplayName: (name: string) => Promise<void>
  signIn: (email: string, pass: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

async function fetchProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('display_name, role, tenant_id')
    .eq('id', userId)
    .maybeSingle()
  return data
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null)
  const [loading, setLoading]         = useState(true)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [role, setRole]               = useState<string | null>(null)
  const [activo, setActivo]           = useState<boolean | null>(null)
  const [tenantId, setTenantId]       = useState<string | null>(null)
  const initialLoadDone               = useRef(false)

  async function applySession(u: User) {
    const data = await fetchProfile(u.id)
    setDisplayName(data?.display_name ?? null)
    setRole(data?.role ?? null)
    setTenantId(data?.tenant_id ?? null)
    if (data?.role === 'alumno') {
      const { data: a } = await supabase
        .from('alumnos').select('activo').eq('user_id', u.id).single()
      setActivo(a?.activo ?? null)
    } else {
      setActivo(true)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) await applySession(session.user)
      setLoading(false)
      initialLoadDone.current = true
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!initialLoadDone.current) return
      if (event === 'SIGNED_IN' && s?.user) {
        setUser(s.user)
        await applySession(s.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null); setDisplayName(null); setRole(null)
        setTenantId(null); setActivo(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, pass: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass })
    if (error) throw new Error(error.message)
  }

  async function updateDisplayName(name: string) {
    if (!user) return
    await supabase.from('profiles').upsert({ id: user.id, display_name: name })
    setDisplayName(name)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider value={{ user, loading, role, activa: activo, displayName, tenantId, signIn, signOut, updateDisplayName }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be inside AuthProvider')
  return c
}
