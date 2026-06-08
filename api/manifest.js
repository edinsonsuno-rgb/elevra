export const config = { runtime: 'edge' }

export default async function handler(req) {
  const host   = req.headers.get('host') || ''
  const parts  = host.split('.')
  const sub    = parts.length >= 3 && parts[0] !== 'www' ? parts[0] : null

  const SUPA_URL = process.env.VITE_SUPABASE_URL
  const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY

  let nombre   = 'Elevra'
  let color    = '#39D353'
  let logo_url = null

  if (sub && SUPA_URL && SUPA_KEY) {
    try {
      const res = await fetch(
        `${SUPA_URL}/rest/v1/tenants?subdominio=eq.${sub}&activo=eq.true&select=nombre,color_primario,logo_url&limit=1`,
        { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
      )
      const data = await res.json()
      if (Array.isArray(data) && data[0]) {
        nombre   = data[0].nombre        || nombre
        color    = data[0].color_primario || color
        logo_url = data[0].logo_url       || null
      }
    } catch (_) {}
  }

  const icons = [
    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ]
  if (logo_url) icons.unshift({ src: logo_url, sizes: '512x512', type: 'image/png', purpose: 'any' })

  const manifest = {
    name:             nombre,
    short_name:       nombre,
    description:      'Tu app de entrenamiento personal',
    start_url:        '/',
    display:          'standalone',
    background_color: '#0a0118',
    theme_color:      color,
    orientation:      'portrait',
    icons,
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type':  'application/manifest+json',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
