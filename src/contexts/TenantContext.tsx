import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { getCache, setCache } from '@/lib/queryCache'
import { buildBrand, applyBrand, DEFAULT_BRAND } from '@/lib/branding'

const TTL_TENANT = 60 * 60 * 1000 // 1 hora

export interface TenantBrand {
  id:                 string
  nombre:             string
  subdominio:         string
  logo_url:           string | null
  color_primario:     string
  color_secundario:   string
  usar_marca_elevra:  boolean
}

const DEFAULT = DEFAULT_BRAND

interface TenantCtx {
  tenant:  TenantBrand
  loading: boolean
  refetch: () => void
  loadByTenantId: (tenantId: string) => Promise<void>
}

const Ctx = createContext<TenantCtx>({ tenant: DEFAULT, loading: true, refetch: () => {}, loadByTenantId: async () => {} })

function getSubdomain(): string | null {
  const hostname = window.location.hostname          // "dorita.elevra.lat" | "elevra.lat" | "localhost"
  const parts    = hostname.split('.')
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0]
  return null
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant,  setTenant]  = useState<TenantBrand>(DEFAULT)
  const [loading, setLoading] = useState(true)

  async function load(forceRefresh = false) {
    const subdomain = getSubdomain()

    if (!subdomain) {
      setTenant(DEFAULT)
      applyBrand(DEFAULT)
      setLoading(false)
      return
    }

    const cacheKey = `tenant:${subdomain}`

    if (!forceRefresh) {
      const cached = getCache<TenantBrand>(cacheKey)
      if (cached) {
        setTenant(cached)
        applyBrand(cached)
        setLoading(false)
        return
      }
    }

    const { data } = await supabase
      .from('tenants')
      .select(`
        id,
        nombre,
        subdominio,
        logo_url,
        color_primario,
        color_secundario,
        usar_marca_elevra
      `)
      .eq('subdominio', subdomain)
      .eq('activo', true)
      .maybeSingle()

    if (data) {
      const brand = buildBrand(data as TenantBrand)

      setCache(cacheKey, brand, TTL_TENANT)
      setTenant(brand)
      applyBrand(brand)
    } else {
      setTenant(DEFAULT)
      applyBrand(DEFAULT)
    }
    setLoading(false)
  }

  async function loadByTenantId(tenantId: string, forceRefresh = false) {
    const cacheKey = `tenant:id:${tenantId}`

    if (!forceRefresh) {
      const cached = getCache<TenantBrand>(cacheKey)
      if (cached) {
        setTenant(cached)
        applyBrand(cached)
        return
      }
    }

    const { data } = await supabase
      .from('tenants')
      .select(`
        id,
        nombre,
        subdominio,
        logo_url,
        color_primario,
        color_secundario,
        usar_marca_elevra
      `)
      .eq('id', tenantId)
      .eq('activo', true)
      .maybeSingle()

    if (data) {
      const brand = buildBrand(data as TenantBrand)
      setCache(cacheKey, brand, TTL_TENANT)
      setTenant(brand)
      applyBrand(brand)
    }
  }

  useEffect(() => { load() }, [])

  return <Ctx.Provider value={{ tenant, loading, refetch: () => load(true), loadByTenantId }}>{children}</Ctx.Provider>
}

export function useTenant() { return useContext(Ctx) }