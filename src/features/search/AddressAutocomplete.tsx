import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { api } from '../../api/client'
import type { GeocodeSuggestion } from '../../api/types'

/**
 * Campo de dirección con autocompletar (estilo Google Places). Mientras el
 * usuario escribe (con debounce) consulta /geocode/suggest y muestra un
 * dropdown. Al elegir una sugerencia entrega su label + coordenadas.
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onPick,
  id = 'place',
}: {
  value: string
  onChange: (v: string) => void
  onPick: (s: GeocodeSuggestion) => void
  id?: string
}) {
  const [sugerencias, setSugerencias] = useState<GeocodeSuggestion[]>([])
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(-1)
  const [cargando, setCargando] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const debounce = useRef<ReturnType<typeof setTimeout>>()
  // Evita sobrescribir sugerencias con una respuesta vieja (petición desfasada).
  const reqId = useRef(0)
  // Cuando el usuario acaba de elegir, no reabrimos el dropdown por el cambio de texto.
  const acabaDeElegir = useRef(false)

  useEffect(() => {
    if (acabaDeElegir.current) {
      acabaDeElegir.current = false
      return
    }
    const q = value.trim()
    if (debounce.current) clearTimeout(debounce.current)
    if (q.length < 3) {
      setSugerencias([])
      setAbierto(false)
      return
    }
    setCargando(true)
    debounce.current = setTimeout(async () => {
      const id = ++reqId.current
      try {
        const res = await api.suggestAddresses(q)
        if (id === reqId.current) {
          setSugerencias(res)
          setAbierto(res.length > 0)
          setActivo(-1)
        }
      } catch {
        if (id === reqId.current) setSugerencias([])
      } finally {
        if (id === reqId.current) setCargando(false)
      }
    }, 300)
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
  }, [value])

  // Cierra el dropdown al hacer clic fuera.
  useEffect(() => {
    const onClickFuera = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', onClickFuera)
    return () => document.removeEventListener('mousedown', onClickFuera)
  }, [])

  const elegir = (s: GeocodeSuggestion) => {
    acabaDeElegir.current = true
    onChange(s.label)
    onPick(s)
    setAbierto(false)
    setActivo(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!abierto || sugerencias.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActivo((a) => (a + 1) % sugerencias.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActivo((a) => (a - 1 + sugerencias.length) % sugerencias.length)
    } else if (e.key === 'Enter' && activo >= 0) {
      e.preventDefault()
      elegir(sugerencias[activo])
    } else if (e.key === 'Escape') {
      setAbierto(false)
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        id={id}
        autoComplete="off"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        className="w-full rounded-lg border border-line bg-white px-4 py-3 pr-11 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => sugerencias.length > 0 && setAbierto(true)}
        onKeyDown={onKeyDown}
        placeholder="Ej: Calle 100 # 15-30, Bogotá"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-subtle">
        <MapPin size={20} />
      </span>

      {abierto && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-[1000] mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-white py-1 shadow-pop"
        >
          {sugerencias.map((s, i) => (
            <li key={`${s.lat},${s.lng},${i}`} role="option" aria-selected={i === activo}>
              <button
                type="button"
                onMouseEnter={() => setActivo(i)}
                onClick={() => elegir(s)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm ${
                  i === activo ? 'bg-teal-soft text-ink' : 'text-ink hover:bg-canvas'
                }`}
              >
                <MapPin size={16} className="mt-0.5 flex-none text-teal" />
                <span className="line-clamp-2">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {cargando && value.trim().length >= 3 && !abierto && (
        <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs text-subtle">…</span>
      )}
    </div>
  )
}
