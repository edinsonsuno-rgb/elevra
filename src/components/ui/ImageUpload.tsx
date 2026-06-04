import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  label: string
  value: string | null
  onChange: (url: string) => void
  bucket?: string
  folder?: string
}

export default function ImageUpload({ label, value, onChange, bucket = 'ejercicios', folder = 'fotos' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const ext      = file.name.split('.').pop()
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, file, { upsert: false, contentType: file.type })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filename)
    onChange(data.publicUrl)
    setUploading(false)
  }

  async function handleRemove() {
    onChange('')
  }

  return (
    <div>
      <label className="text-[10px] text-df-muted uppercase tracking-wider block mb-1.5">
        {label}
      </label>

      {value ? (
        /* Preview con botón eliminar */
        <div className="relative group">
          <img
            src={value}
            alt={label}
            className="w-full h-28 object-contain bg-df-surface rounded-xl border border-df-border"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 bg-red-900/80 hover:bg-red-600 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all"
          >
            <i className="fa-solid fa-xmark text-xs" />
          </button>
          <div className="absolute bottom-2 left-2">
            <span className="text-[9px] bg-green-900/80 text-green-400 px-2 py-0.5 rounded-full font-bold">
              ✓ Subida
            </span>
          </div>
        </div>
      ) : (
        /* Zona de subida */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-28 border-2 border-dashed border-df-border hover:border-df-violet rounded-xl flex flex-col items-center justify-center gap-2 transition-all group disabled:opacity-60"
        >
          {uploading ? (
            <>
              <div className="w-6 h-6 border-2 border-df-border border-t-df-violet rounded-full animate-spin" />
              <span className="text-xs text-df-muted">Subiendo...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-cloud-arrow-up text-2xl text-df-muted group-hover:text-df-violet transition-colors" />
              <span className="text-xs text-df-muted group-hover:text-white transition-colors">
                Clic para subir foto
              </span>
              <span className="text-[10px] text-df-muted/60">PNG, JPG, WEBP · máx 5MB</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
          <i className="fa-solid fa-triangle-exclamation" /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}