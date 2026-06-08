import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SplashPage() {
  const navigate = useNavigate()
  const [dot, setDot] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // fade in on mount
    const t = setTimeout(() => setVisible(true), 50)
    // auto-rotate dots
    const interval = setInterval(() => setDot(d => (d + 1) % 3), 2000)
    return () => { clearTimeout(t); clearInterval(interval) }
  }, [])

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(175deg, #1a0533 0%, #2d0d5e 25%, #3b0f7a 45%, #2a0a60 65%, #150328 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif",
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Noise texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.035,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat', backgroundSize: '180px',
      }} />

      {/* Glow orbs */}
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: 340, height: 340,
        background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '15%', left: '30%',
        width: 220, height: 220,
        background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      {/* Card container — mobile width */}
      <div style={{
        width: '100%', maxWidth: 380,
        padding: '0 32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
        gap: 0,
      }}>

        {/* Logo */}
        <div style={{
          marginBottom: 56,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(-16px)',
          transition: 'opacity 0.8s ease 0.1s, transform 0.8s ease 0.1s',
          filter: 'drop-shadow(0 0 24px rgba(167,139,250,0.5))',
          textAlign: 'center',
        }}>
          <img
            src="/logo.png"
            alt="Dorita Fit"
            style={{ height: 100, width: 'auto', maxWidth: 300, objectFit: 'contain' }}
          />
        </div>

        {/* Texto motivacional */}
        <div style={{
          textAlign: 'center', marginBottom: 36,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.8s ease 0.25s, transform 0.8s ease 0.25s',
        }}>
          <p style={{
            fontSize: 12, letterSpacing: '0.2em', color: '#c084fc',
            textTransform: 'uppercase', fontWeight: 600, marginBottom: 10,
          }}>
            TU MEJOR VERSIÓN
          </p>
          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 48, letterSpacing: '0.06em',
            color: '#ffffff', lineHeight: 1,
            margin: '0 0 18px',
            textShadow: '0 0 40px rgba(167,139,250,0.3)',
          }}>
            EMPIEZA HOY
          </h1>
          <p style={{
            fontSize: 13, color: '#a78bcc', lineHeight: 1.7,
            maxWidth: 260, margin: '0 auto',
          }}>
            Entrenamientos personalizados,<br />
            seguimiento de progreso y<br />
            motivación para lograr tus objetivos.
          </p>
        </div>

        {/* Dots */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 36,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease 0.4s',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              height: 5, borderRadius: 3,
              width: i === dot ? 24 : 8,
              background: i === dot ? '#9b30ff' : 'rgba(155,48,255,0.3)',
              transition: 'all 0.4s ease',
            }} />
          ))}
        </div>

        {/* Botón COMENZAR */}
        <button
          onClick={() => navigate('/login?start=1')}
          style={{
            width: '70%', padding: '7px 0',
            background: 'linear-gradient(135deg, #7c3aed 0%, #9b30ff 50%, #a855f7 100%)',
            border: 'none', borderRadius: 14,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 22, letterSpacing: '0.2em', color: '#ffffff',
            cursor: 'pointer', marginBottom: 20,
            boxShadow: '0 6px 32px rgba(124,58,237,0.55), 0 0 0 1px rgba(168,85,247,0.2)',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.8s ease 0.5s, transform 0.8s ease 0.5s, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 40px rgba(124,58,237,0.75), 0 0 0 1px rgba(168,85,247,0.4)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 6px 32px rgba(124,58,237,0.55), 0 0 0 1px rgba(168,85,247,0.2)')}
        >
          COMENZAR
        </button>

      </div>
    </div>
  )
}