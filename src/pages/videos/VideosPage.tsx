import { useEffect, useState } from 'react'
import { supabase, Video } from '@/lib/supabase'
import { Spinner, EmptyState } from '@/components/ui/index'

export default function VideosPage() {
  const [videos, setVideos]     = useState<Video[]>([])
  const [loading, setLoading]   = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: false })
    setVideos(data ?? [])
    setLoading(false)
  }

  const categorias = ['Todas', ...Array.from(new Set(videos.map(v => v.categoria).filter(Boolean) as string[]))]
  const filtrados = videos.filter(v => {
    const coincide = v.titulo.toLowerCase().includes(busqueda.toLowerCase())
    const cat = categoria === 'Todas' ? true : v.categoria === categoria
    return coincide && cat
  })

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Videos</h1>
          <p className="text-df-muted text-sm mt-0.5">{videos.length} videos</p>
        </div>
        <button className="df-btn px-4 py-2.5 text-sm flex items-center gap-2">
          <i className="fa-solid fa-plus" /> Agregar video
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-df-muted text-sm" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar video..." className="df-input !pl-8 pr-16" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categorias.map(c => (
            <button key={c} onClick={() => setCategoria(c)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all
                ${categoria === c ? 'bg-df-purple text-white' : 'df-surface text-df-muted hover:text-white'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtrados.length === 0
        ? <EmptyState icon="fa-solid fa-clapperboard" title="Sin videos" desc="Agrega tu primer video de entrenamiento" />
        : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map(v => (
              <a key={v.id} href={v.url} target="_blank" rel="noreferrer"
                className="df-card overflow-hidden hover:border-df-violet/40 transition-all group">
                <div className="h-40 bg-df-surface relative flex items-center justify-center overflow-hidden">
                  {v.miniatura_url
                    ? <img src={v.miniatura_url} alt={v.titulo} className="w-full h-full object-cover" />
                    : <i className="fa-solid fa-play-circle text-4xl text-df-purple/40" />
                  }
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-df-purple rounded-full flex items-center justify-center">
                      <i className="fa-solid fa-play text-white text-sm ml-0.5" />
                    </div>
                  </div>
                  {v.publica && (
                    <span className="absolute top-2 right-2 bg-df-purple/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Público
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-white truncate group-hover:text-df-violet transition-colors">{v.titulo}</p>
                  {v.descripcion && <p className="text-xs text-df-muted mt-1 line-clamp-2">{v.descripcion}</p>}
                  {v.categoria && (
                    <span className="inline-block mt-2 text-[10px] font-semibold bg-df-purple/20 text-df-violet px-2 py-0.5 rounded-full">
                      {v.categoria}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )
      }
    </div>
  )
}
