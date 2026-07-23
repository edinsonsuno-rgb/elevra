import type { TenantBrand } from '@/contexts/TenantContext'

export const DEFAULT_BRAND: TenantBrand = {
  id: 'elevra',
  nombre: 'Elevra',
  subdominio: '',
  logo_url: null,
  color_primario: '#39D353',
  color_secundario: '#2ECC71',
  color_terciario: '#000000',
  color_texto1: '#FFFFFF',
  color_texto2: '#FFFFFF',
  usar_marca_elevra: true,
}

export function buildBrand(tenant?: Partial<TenantBrand> | null): TenantBrand {
  if (!tenant || tenant.usar_marca_elevra !== false) {
    return { ...DEFAULT_BRAND }
  }

  return {
    ...DEFAULT_BRAND,
    ...tenant,
    usar_marca_elevra: false,
  }
}

function hexToRgbChannels(hex: string): string {
  const clean = hex.replace('#', '')
  const bigint = parseInt(clean, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `${r} ${g} ${b}`
}

export function applyBrand(brand: TenantBrand) {
  const root = document.documentElement

  root.style.setProperty('--brand-primary', brand.color_primario)
  root.style.setProperty('--brand-secondary', brand.color_secundario)
  root.style.setProperty('--brand-text2', brand.color_texto2)
  root.style.setProperty('--color-primario', brand.color_primario)
  root.style.setProperty('--color-secundario', brand.color_secundario)

  root.style.setProperty('--df-purple-rgb', hexToRgbChannels(brand.color_primario))
  root.style.setProperty('--df-violet-rgb', hexToRgbChannels(brand.color_primario))
  root.style.setProperty('--df-pink-rgb', hexToRgbChannels(brand.color_secundario))

  document.title = brand.nombre

  const theme = document.querySelector('meta[name="theme-color"]')
  theme?.setAttribute('content', brand.color_primario)

  const apple = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  apple?.setAttribute('content', brand.nombre)
}