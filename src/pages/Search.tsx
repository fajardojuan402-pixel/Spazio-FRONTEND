import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, LocateFixed, Search as SearchIcon, SearchX } from 'lucide-react'
import Layout from '../components/layout/Layout'
import ParkingCard from '../features/search/ParkingCard'
import MapPanel from '../features/search/MapPanel'
import AddressAutocomplete from '../features/search/AddressAutocomplete'
import Skeleton from '../components/ui/Skeleton'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useSearchSpaces } from '../hooks/queries'
import { api } from '../api/client'
import type { SearchParams } from '../api/types'

const RADIOS = [1, 2, 5]

/**
 * P-03 Búsqueda y resultados (RF-01). Barra con dirección + radio + "Ir",
 * geolocalización automática del navegador (como Google Maps), lista con
 * skeletons, estado "sin resultados" (solo cuando aplica) con "Ampliar radio /
 * Cambiar sitio" y mapa real (Leaflet) con marcadores sincronizados a la tarjeta.
 */
export default function Search() {
  const [place, setPlace] = useState('Centro, Bogotá')
  const [radio, setRadio] = useState(1)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>()
  // Centro de la búsqueda: el punto al que el mapa debe moverse (dirección o "mi ubicación").
  const [centro, setCentro] = useState<{ lat: number; lng: number } | undefined>()
  const [query, setQuery] = useState<SearchParams>({ q: 'Centro, Bogotá', radioKm: 1 })
  const [selected, setSelected] = useState<string | null>(null)
  const [geoMsg, setGeoMsg] = useState<string | null>(null)
  const [buscando, setBuscando] = useState(false)

  const { data, isFetching, isError, refetch } = useSearchSpaces(query, true)

  /**
   * Geocodifica la dirección escrita y mueve el mapa a ese punto antes de
   * buscar (como Google: escribes la dirección y el mapa se va para allá).
   */
  const lanzarBusqueda = async (radioKm = radio) => {
    setGeoMsg(null)
    setSelected(null)
    const texto = place.trim()
    if (!texto) return
    try {
      setBuscando(true)
      const geo = await api.geocode(texto)
      const punto = { lat: geo.lat, lng: geo.lng }
      setCentro(punto)
      setCoords(undefined) // ya no es "mi ubicación", es la dirección buscada
      setQuery({ q: texto, radioKm, lat: punto.lat, lng: punto.lng })
    } catch {
      setGeoMsg('No pudimos ubicar esa dirección. Intenta con otra.')
    } finally {
      setBuscando(false)
    }
  }

  /** Busca directamente en un punto ya conocido (sugerencia elegida). */
  const buscarEn = (lat: number, lng: number, label: string) => {
    setGeoMsg(null)
    setSelected(null)
    setPlace(label)
    setCoords(undefined)
    setCentro({ lat, lng })
    setQuery({ q: label, radioKm: radio, lat, lng })
  }

  const localizar = (auto = false) => {
    setGeoMsg(null)
    if (!('geolocation' in navigator)) {
      if (!auto) setGeoMsg('Tu navegador no permite compartir la ubicación.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const punto = { lat: latitude, lng: longitude }
        setCoords(punto)
        setCentro(punto)
        setQuery({ q: 'Mi ubicación', radioKm: radio, lat: latitude, lng: longitude })
        try {
          const geo = await api.geocode(`${latitude},${longitude}`)
          setPlace(geo.label)
        } catch {
          setPlace('Mi ubicación')
        }
      },
      () => {
        // Si el usuario no da permiso: en modo automático no molestamos;
        // en modo manual avisamos que escriba la dirección.
        if (!auto) setGeoMsg('No pudimos obtener tu ubicación. Escribe una dirección.')
      },
    )
  }

  // Al entrar a Buscar, intenta ubicar al usuario automáticamente (como Google Maps).
  const yaIntento = useRef(false)
  useEffect(() => {
    if (yaIntento.current) return
    yaIntento.current = true
    localizar(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ampliarRadio = () => {
    const siguiente = RADIOS.find((r) => r > radio) ?? radio
    setRadio(siguiente)
    // Reusa el centro ya calculado; solo amplía el radio.
    setQuery((q) => ({ ...q, radioKm: siguiente }))
  }

  const resultados = data ?? []
  const selectedSpace = resultados.find((s) => s.id === selected) ?? resultados[0]
  const sinResultados = !isFetching && !isError && resultados.length === 0

  return (
    <Layout wide>
      <header className="max-w-2xl">
        <p className="eyebrow">Encuentra tu espacio</p>
        <h1 className="mt-2 text-4xl font-extrabold text-ink">¿Dónde necesitas parquear?</h1>
        <p className="mt-3 text-subtle">
          Busca por dirección o barrio y compara espacios cerca de tu destino.
        </p>
      </header>

      {/* Barra de búsqueda */}
      <form
        className="card mt-8 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          lanzarBusqueda()
        }}
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="place">Dirección o barrio</label>
            <AddressAutocomplete
              value={place}
              onChange={setPlace}
              onPick={(s) => buscarEn(s.lat, s.lng, s.label)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="radio">Radio de búsqueda</label>
            <div className="relative">
              <select
                id="radio"
                className="w-full appearance-none rounded-lg border border-line bg-white px-4 py-3 pr-10 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20 md:w-44"
                value={radio}
                onChange={(e) => setRadio(Number(e.target.value))}
              >
                {RADIOS.map((r) => (
                  <option key={r} value={r}>{r} km</option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-subtle">
                <ChevronDown size={20} />
              </span>
            </div>
          </div>
          <button type="submit" className="btn-primary h-[50px] md:px-6" disabled={buscando}>
            {buscando ? 'Buscando…' : 'Ir'} <SearchIcon size={18} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => localizar(false)}
          className="mt-4 inline-flex min-h-touch items-center gap-2 text-sm font-semibold text-teal hover:underline"
        >
          <LocateFixed size={16} /> Usar mi ubicación
        </button>
        {geoMsg && <p className="mt-2 text-sm text-subtle">{geoMsg}</p>}
      </form>

      {/* Resultados + mapa */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div>
          <div className="mb-4 flex items-baseline justify-between">
            <p className="text-lg font-semibold text-ink">
              {isFetching ? 'Buscando…' : `${resultados.length} espacios cerca de ti`}
            </p>
            <p className="text-sm text-subtle">Ordenados por distancia</p>
          </div>

          {isError ? (
            <Alert tone="danger" title="No pudimos cargar los resultados">
              Revisa tu conexión e inténtalo de nuevo.
              <div className="mt-3">
                <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
              </div>
            </Alert>
          ) : isFetching ? (
            <div className="space-y-4">
              {[0, 1].map((i) => (
                <div key={i} className="card flex gap-4 p-4">
                  <Skeleton className="h-28 w-28 flex-none" />
                  <div className="flex-1 space-y-3 py-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : sinResultados ? (
            <EmptyState
              icon={<SearchX size={22} />}
              title="Sin resultados en esta zona"
              description="Amplía el radio o cambia la dirección para encontrar un espacio."
              actions={
                <>
                  <Button variant="outline" onClick={ampliarRadio} disabled={radio >= RADIOS[RADIOS.length - 1]}>
                    Ampliar radio
                  </Button>
                  <button
                    onClick={() => document.getElementById('place')?.focus()}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-teal hover:underline"
                  >
                    Cambiar sitio <ArrowRight size={16} />
                  </button>
                </>
              }
            />
          ) : (
            <div className="space-y-4">
              {resultados.map((space) => (
                <ParkingCard
                  key={space.id}
                  space={space}
                  active={selectedSpace?.id === space.id}
                  onSelect={() => setSelected(space.id)}
                />
              ))}
            </div>
          )}
        </div>

        <MapPanel
          radioKm={query.radioKm}
          selected={selectedSpace}
          otros={resultados}
          userCoords={coords}
          centro={centro}
          onSelect={setSelected}
        />
      </div>
    </Layout>
  )
}
