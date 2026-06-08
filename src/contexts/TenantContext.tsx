import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { getCache, setCache } from '@/lib/queryCache'

const TTL_TENANT = 60 * 60 * 1000 // 1 hora

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
  color_primario:   '#39D353',
  color_secundario: '#2ECC71',
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
  root.style.setProperty('--color-primario',   primary)
  root.style.setProperty('--color-secundario', secondary)
  // Actualiza theme-color para PWA instalada
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', primary)
}

function applyTitle(nombre: string) {
  document.title = nombre
  const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  if (appleTitle) appleTitle.setAttribute('content', nombre)
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant,  setTenant]  = useState<TenantBrand>(DEFAULT)
  const [loading, setLoading] = useState(true)

  async function load(forceRefresh = false) {
    const subdomain = getSubdomain()

    if (!subdomain) {
      applyColors(DEFAULT.color_primario, DEFAULT.color_secundario)
      setTenant(DEFAULT)
      setLoading(false)
      return
    }

    const cacheKey = `tenant:${subdomain}`

    if (!forceRefresh) {
      const cached = getCache<TenantBrand>(cacheKey)
      if (cached) {
        setTenant(cached)
        applyColors(cached.color_primario, cached.color_secundario)
        applyTitle(cached.nombre)
        setLoading(false)
        return
      }
    }

    const { data } = await supabase
      .from('tenants')
      .select('id, nombre, subdominio, logo_url, color_primario, color_secundario')
      .eq('subdominio', subdomain)
      .eq('activo', true)
      .maybeSingle()

    if (data) {
      const t = data as TenantBrand
      const merged: TenantBrand = {
        ...t,
        logo_url:         t.logo_url         || DEFAULT.logo_url,
        color_primario:   t.color_primario   || DEFAULT.color_primario,
        color_secundario: t.color_secundario || DEFAULT.color_secundario,
      }
      setCache(cacheKey, merged, TTL_TENANT)
      setTenant(merged)
      applyColors(merged.color_primario, merged.color_secundario)
      applyTitle(t.nombre)
    } else {
      applyColors(DEFAULT.color_primario, DEFAULT.color_secundario)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return <Ctx.Provider value={{ tenant, loading, refetch: () => load(true) }}>{children}</Ctx.Provider>
}

export function useTenant() { return useContext(Ctx) }
