import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTenant } from '@/contexts/TenantContext'

export default function SplashPage() {
  const navigate   = useNavigate()
  const { tenant } = useTenant()
  const [dot, setDot]       = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t        = setTimeout(() => setVisible(true), 50)
    const interval = setInterval(() => setDot(d => (d + 1) % 3), 2000)
    return () => { clearTimeout(t); clearInterval(interval) }
  }, [])

  const p  = tenant.color_primario

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0D1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      overflow: 'hidden',
      position: 'relative',
      padding: '24px 16px',
    }}>

      {/* Glow ambiente — esquinas */}
      <div style={{
        position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 400,
        background: `radial-gradient(ellipse, ${p}22 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: -60, right: -40,
        width: 300, height: 300,
        background: `radial-gradient(circle, ${p}11 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: `color-mix(in srgb, ${p} 50%, #0D1117)`,
        border: `1px solid ${p}44`,
        borderRadius: 32,
        boxShadow: `0 0 0 1px ${p}18, 0 24px 80px rgba(0,0,0,0.6), 0 0 60px ${p}18`,
        padding: '40px 32px 36px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>

        {/* Logo */}
        <div style={{
          marginBottom: 20,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-12px)',
          transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
          filter: tenant.usar_marca_elevra ? `drop-shadow(0 0 20px ${p}55)` : 'none',
        }}>
          <img
            src={tenant.logo_url ?? '/logo.png'}
            alt={tenant.nombre}
            style={{ height: 96, width: 'auto', maxWidth: 480, objectFit: 'contain' }}
          />
        </div>

        {/* Texto */}
        <div style={{
          textAlign: 'center', marginBottom: 20,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
        }}>
          <p style={{
            fontSize: 11, letterSpacing: '0.25em', color: p,
            textTransform: 'uppercase', fontWeight: 600, marginBottom: 8,
          }}>
            TU MEJOR VERSIÓN
          </p>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 44, letterSpacing: '0.06em',
            color: '#ffffff', lineHeight: 1,
            margin: '0 0 12px',
            textShadow: `0 0 32px ${p}33`,
          }}>
            EMPIEZA HOY
          </h1>
          <p style={{
            fontSize: 13, color: '#8B949E', lineHeight: 1.6,
            maxWidth: 240, margin: '0 auto',
          }}>
            Entrenamientos personalizados, seguimiento de progreso y motivación para lograr tus objetivos.
          </p>
        </div>

        {/* Dots */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 20,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.6s ease 0.35s',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              height: 5, borderRadius: 3,
              width: i === dot ? 24 : 8,
              background: i === dot ? p : `${p}33`,
              transition: 'all 0.4s ease',
            }} />
          ))}
        </div>

        {/* Botón COMENZAR */}
        <button
          onClick={() => navigate('/login?start=1')}
          style={{
            width: '550%', padding: '6px 0',
            background: `linear-gradient(160deg, color-mix(in srgb, ${p} 100%, white 30%) 0%, ${p} 45%, color-mix(in srgb, ${p} 100%, black 25%) 100%)`,
            border: `1px solid color-mix(in srgb, ${p} 100%, white 40%)`, borderRadius: 14,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 18, letterSpacing: '0.2em', color: '#ffffff',
            cursor: 'pointer',
            boxShadow: `0 8px 32px ${p}70, 0 2px 8px ${p}50, inset 0 1px 0 rgba(255,255,255,0.35)`,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.6s ease 0.45s, transform 0.6s ease 0.45s, box-shadow 0.2s ease, transform 0.1s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.boxShadow = `0 10px 40px ${p}90, 0 4px 12px ${p}70, inset 0 1px 0 rgba(255,255,255,0.45)`
            e.currentTarget.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.boxShadow = `0 8px 32px ${p}70, 0 2px 8px ${p}50, inset 0 1px 0 rgba(255,255,255,0.35)`
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          COMENZAR
        </button>

      </div>
    </div>
  )
}