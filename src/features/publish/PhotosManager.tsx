import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import Badge from '../../components/ui/Badge'

const MAX_FOTOS = 3
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

/**
 * Gestor de fotos del espacio (RF-03, RI-02): de 0 a 3 fotos, JPG/PNG máx 5 MB,
 * con vista previa (data URL) y botón de eliminar. Las fotos son opcionales.
 */
export default function PhotosManager({
  fotos,
  onChange,
}: {
  fotos: string[]
  onChange: (fotos: string[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = (files: FileList | null) => {
    setError(null)
    if (!files || files.length === 0) return
    const restante = MAX_FOTOS - fotos.length
    const seleccion = Array.from(files).slice(0, restante)

    for (const file of seleccion) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Solo se permiten imágenes JPG o PNG.')
        continue
      }
      if (file.size > MAX_BYTES) {
        setError('Cada foto debe pesar máximo 5 MB.')
        continue
      }
      const reader = new FileReader()
      reader.onload = () => {
        onChange([...fotosRef.current, reader.result as string])
      }
      reader.readAsDataURL(file)
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  // Referencia viva para encadenar varias lecturas asíncronas sin perder estado.
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos

  const quitar = (idx: number) => onChange(fotos.filter((_, i) => i !== idx))

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">Fotos del espacio</h2>
        <Badge tone="teal">
          {fotos.length} de {MAX_FOTOS}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-subtle">
        Muestra el acceso y el lugar de parqueo. Puedes subir un máximo de 3 fotos.
      </p>

      {fotos[0] && (
        <img src={fotos[0]} alt="Foto principal del parqueadero" className="mt-4 h-48 w-full rounded-xl object-cover" />
      )}

      <div className="mt-3 grid grid-cols-2 gap-3">
        {fotos.slice(1).map((src, i) => (
          <div key={i} className="relative">
            <img src={src} alt={`Foto ${i + 2}`} className="h-28 w-full rounded-xl object-cover" />
            <button
              type="button"
              onClick={() => quitar(i + 1)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-danger shadow-card hover:bg-white"
              aria-label={`Eliminar foto ${i + 2}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {fotos.length < MAX_FOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`flex h-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-subtle hover:border-teal hover:text-teal ${
              fotos.length === 0 ? 'col-span-2' : ''
            }`}
          >
            <ImagePlus size={22} />
            <span className="text-sm font-semibold">Agregar foto</span>
          </button>
        )}
      </div>

      {fotos[0] && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => quitar(0)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-danger hover:underline"
          >
            <Trash2 size={16} /> Quitar foto principal
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <p className="mt-3 text-sm text-subtle">JPG o PNG · Hasta 3 fotos · Máx. 5 MB</p>
    </section>
  )
}
