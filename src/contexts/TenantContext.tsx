import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
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
  color_terciario:    string
  color_texto1:       string
  color_texto2:       string
  usar_marca_elevra:  boolean
}

const DEFAULT = DEFAULT_BRAND

interface TenantCtx {
  tenant:  TenantBrand
  loading: boolean
  refetch: () => void
  // El perfil autenticado trae su propio tenant embebido (join) — esto
  // solo aplica ese dato ya obtenido, sin hacer una llamada extra a la red.
  // Tiene prioridad sobre el subdominio mientras haya un usuario logueado.
  setTenantFromProfile: (raw: Partial<TenantBrand> | null) => void
  // Al cerrar sesión, se vuelve a confiar en el subdominio (para el login).
  clearUserTenant: () => void
}

const Ctx = createContext<TenantCtx>({
  tenant: DEFAULT,
  loading: true,
  refetch: () => {},
  setTenantFromProfile: () => {},
  clearUserTenant: () => {},
})

function getSubdomain(): string | null {
  const hostname = window.location.hostname          // "dorita.elevra.lat" | "elevra.lat" | "localhost"
  const parts    = hostname.split('.')
  if (parts.length >= 3 && parts[0] !== 'www') return parts[0]
  return null
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant,  setTenant]  = useState<TenantBrand>(DEFAULT)
  const [loading, setLoading] = useState(true)
  // true mientras un usuario autenticado ya tiene su tenant real aplicado;
  // evita que la carga por subdominio lo pise con el valor equivocado.
  const userTenantActive = useRef(false)

  async function load(forceRefresh = false) {
    const subdomain = getSubdomain()

    if (!subdomain) {
      if (!userTenantActive.current) { setTenant(DEFAULT); applyBrand(DEFAULT) }
      setLoading(false)
      return
    }

    const cacheKey = `tenant:${subdomain}`

    if (!forceRefresh) {
      const cached = getCache<TenantBrand>(cacheKey)
      if (cached) {
        if (!userTenantActive.current) { setTenant(cached); applyBrand(cached) }
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
        color_terciario,
        color_texto1,
        color_texto2,
        usar_marca_elevra
      `)
      .eq('subdominio', subdomain)
      .eq('activo', true)
      .maybeSingle()

    if (data) {
      const brand = buildBrand(data as TenantBrand)
      setCache(cacheKey, brand, TTL_TENANT)
      if (!userTenantActive.current) { setTenant(brand); applyBrand(brand) }
    } else if (!userTenantActive.current) {
      setTenant(DEFAULT)
      applyBrand(DEFAULT)
    }
    setLoading(false)
  }

  // El perfil del usuario ya trae su tenant embebido (via join en la
  // consulta de auth) — se aplica directo, sin otra llamada a la red.
  function setTenantFromProfile(raw: Partial<TenantBrand> | null) {
    userTenantActive.current = true
    const brand = buildBrand(raw ?? undefined)
    if (raw?.id) setCache(`tenant:id:${raw.id}`, brand, TTL_TENANT)
    setTenant(brand)
    applyBrand(brand)
    setLoading(false)
  }

  function clearUserTenant() {
    userTenantActive.current = false
    load(true)
  }

  useEffect(() => { load() }, [])

  return (
    <Ctx.Provider value={{ tenant, loading, refetch: () => load(true), setTenantFromProfile, clearUserTenant }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTenant() { return useContext(Ctx) }