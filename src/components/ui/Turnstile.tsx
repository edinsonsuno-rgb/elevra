import { useEffect, useRef } from 'react'

declare global {
  interface Window { turnstile?: any }
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

let scriptPromise: Promise<void> | null = null
function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    if (window.turnstile) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * Widget de verificación humana (anti-bot) para formularios de auth.
 * Si no hay VITE_TURNSTILE_SITE_KEY configurada, no renderiza nada —
 * así el login sigue funcionando en desarrollo local sin romperse.
 */
export default function Turnstile({ onVerify, resetKey }: { onVerify: (token: string | null) => void, resetKey?: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let cancelled = false

    loadScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return
      widgetId.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: 'dark',
        callback: (token: string) => onVerify(token),
        'expired-callback': () => onVerify(null),
        'error-callback': () => onVerify(null),
      })
    })

    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current) } catch { /* noop */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (resetKey === undefined || !widgetId.current || !window.turnstile) return
    onVerify(null)
    try { window.turnstile.reset(widgetId.current) } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  if (!SITE_KEY) return null
  return <div ref={containerRef} className="flex justify-center" />
}