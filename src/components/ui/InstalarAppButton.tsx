import { useEffect, useState } from 'react'

export default function InstalarAppButton() {
  const [prompt, setPrompt] = useState<any>(null)
  const [instalada, setInstalada] = useState(false)

  useEffect(() => {
    // Detectar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalada(true)
      return
    }

    // Capturar el evento de instalación
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function instalar() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      setInstalada(true)
      setPrompt(null)
    }
  }

  if (instalada || !prompt) return null

  return (
    <button onClick={instalar}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left
        text-df-muted hover:text-white hover:bg-df-surface transition-all">
      <i className="fa-solid fa-mobile-screen text-sm w-4 text-center text-df-violet" />
      <span className="hidden lg:block text-sm font-medium">Instalar app</span>
    </button>
  )
}