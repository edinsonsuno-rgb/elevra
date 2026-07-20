import type { TenantBrand } from '@/contexts/TenantContext'

export const DEFAULT_BRAND: TenantBrand = {
  id: 'elevra',
  nombre: 'Elevra',
  subdominio: '',
  logo_url: null,
  color_primario: '#39D353',
  color_secundario: '#2ECC71',
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

export function applyBrand(brand: TenantBrand) {
  const root = document.documentElement

  root.style.setProperty('--brand-primary', brand.color_primario)
  root.style.setProperty('--brand-secondary', brand.color_secundario)
  root.style.setProperty('--color-primario', brand.color_primario)
  root.style.setProperty('--color-secundario', brand.color_secundario)

  document.title = brand.nombre

  const theme = document.querySelector('meta[name="theme-color"]')
  theme?.setAttribute('content', brand.color_primario)

  const apple = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  apple?.setAttribute('content', brand.nombre)
}
