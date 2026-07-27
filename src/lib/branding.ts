import type { TenantBrand } from '@/contexts/TenantContext'

export const DEFAULT_BRAND: TenantBrand = {
  id: 'elevra',
  nombre: 'Elevra',
  subdominio: '',
  logo_url: null,
  logo_icono_url: null,
  color_primario: '#39D353',
  color_secundario: '#2ECC71',
  color_terciario: '#000000',
  color_texto1: '#FFFFFF',
  color_texto2: '#FFFFFF',
  card_brillo: 26,
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
  root.style.setProperty('--brand-tertiary', brand.color_terciario)
  root.style.setProperty('--brand-text2', brand.color_texto2)
  root.style.setProperty('--card-alpha', String((brand.card_brillo ?? 26) / 100))
  root.style.setProperty('--color-primario', brand.color_primario)
  root.style.setProperty('--color-secundario', brand.color_secundario)

  root.style.setProperty('--df-purple-rgb', hexToRgbChannels(brand.color_primario))
  root.style.setProperty('--df-violet-rgb', hexToRgbChannels(brand.color_primario))
  root.style.setProperty('--df-pink-rgb', hexToRgbChannels(brand.color_secundario))

  document.title = brand.nombre

  const iconoParaApp = brand.logo_icono_url || brand.logo_url

  const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (favicon) favicon.href = iconoParaApp || '/icons/icon-192x192.png'

  const appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
  if (appleIcon) appleIcon.href = iconoParaApp || '/icons/apple-touch-icon.png'

  // Manifest dinámico (ícono/nombre al "Instalar app" en Android) — antes
  // quedaba fijo en public/manifest.json (heredado de cuando la app era
  // solo para un instructor). Si el tenant no tiene ícono propio, se deja
  // el manifest estático de siempre.
  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (manifestLink) {
    if (iconoParaApp) {
      const manifest = {
        name: brand.nombre,
        short_name: brand.nombre,
        description: `App de entrenamiento de ${brand.nombre}`,
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0118',
        theme_color: brand.color_primario,
        orientation: 'portrait',
        icons: [
          { src: iconoParaApp, sizes: 'any', type: 'image/png', purpose: 'any' },
        ],
      }
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' })
      manifestLink.href = URL.createObjectURL(blob)
    } else {
      manifestLink.href = '/manifest.json'
    }
  }

  const theme = document.querySelector('meta[name="theme-color"]')
  theme?.setAttribute('content', brand.color_primario)

  const apple = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  apple?.setAttribute('content', brand.nombre)
}