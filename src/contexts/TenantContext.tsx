import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export interface TenantBrand {
  id:               string
  nombre:           string
  subdominio:       string
  logo_url:         string | null
  color_primario:   string
  color_secundario: string
}

const DEFAULT: TenantBrand = {
  id:               '',
  nombre:           'Elevra',
  subdominio:       '',
  logo_url:         null,
  color_primario:   '#9b30ff',
  color_secundario: '#7c3aed',
}

interface TenantCtx {
  tenant:  TenantBrand
  loading: boolean
  refetch: () => void
}

const Ctx = createContext<TenantCtx>({ tenant: DEFAULT, loading: true, refetch: () => {} })

function getSubdomain(): string | null {
  const hostname = window.location.hostname          // "dorita.elevra.lat" | "elevra.lat" | "localhost"
  const parts    = hostname.split('.')
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0]
  return null
}

function applyColors(primary: string, secondary: string) {
  const root = document.documentElement
  root.style.setProperty('--brand-primary',    primary)
  root.style.setProperty('--brand-secondary',  secondary)
  // Actualiza también las variables legacy para que text-df-violet etc. cambien
  root.style.setProperty('--color-primario',   primary)
  root.style.setProperty('--color-secundario', secondary)
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant,  setTenant]  = useState<TenantBrand>(DEFAULT)
  const [loading, setLoading] = useState(true)

  async function load() {
    const subdomain = getSubdomain()

    if (!subdomain) {
      applyColors(DEFAULT.color_primario, DEFAULT.color_secundario)
      setTenant(DEFAULT)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('tenants')
      .select('id, nombre, subdominio, logo_url, color_primario, color_secundario')
      .eq('subdominio', subdomain)
      .eq('activo', true)
      .maybeSingle()

    if (data) {
      const t = data as TenantBrand
      setTenant(t)
      applyColors(t.color_primario, t.color_secundario)
    } else {
      applyColors(DEFAULT.color_primario, DEFAULT.color_secundario)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return <Ctx.Provider value={{ tenant, loading, refetch: load }}>{children}</Ctx.Provider>
}

export function useTenant() { return useContext(Ctx) }
