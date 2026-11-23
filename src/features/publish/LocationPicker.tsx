import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Trash2 } from 'lucide-react'
import AddressAutocomplete, { type AddressAutocompleteHandle } from '../search/AddressAutocomplete'
import { api } from '../../api/client'

const BOGOTA: [number, number] = [4.6097, -74.0817]

/**
 * Pin rojo arrastrable (estilo Google) para marcar la ubicación exacta.
 * El icono mide 24×24 y su anclaje está en la punta inferior (12, 24), de modo
 * que la punta del pin coincide exactamente con el punto de coordenadas donde
 * el usuario hizo clic. Al estar rotado -45°, la "punta" cae en la esquina
 * inferior-izquierda del cuadro; se compensa posicionando el div dentro del
 * cuadro de 24×24 para que la punta quede en el centro-inferior.
 */
const pinIcon = L.divIcon({
  className: 'spazio-pub-pin',
  html: `<div style="
    width:24px; height:24px; border-radius:50% 50% 50% 0;
    background:#d93636; border:2px solid #fff; transform: rotate(-45deg);
    transform-origin: center;
    box-shadow:0 2px 6px rgba(0,0,0,.35);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

/** Mueve el mapa cuando cambian las coordenadas desde fuera (texto/sugerencia). */
function Recenter({ coords }: { coords: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (coords) map.setView([coords.lat, coords.lng], 16, { animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lng])
  return null
}

/** Permite colocar el pin haciendo clic en el mapa. */
function ClickToPlace({ onPlace }: { onPlace: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onPlace(e.latlng.lat, e.latlng.lng),
  })
  return null
}

/**
 * Selector de ubicación para publicar (RF-03): campo de dirección con
 * autocompletar + mapa con pin arrastrable. El pin se puede mover (arrastrar),
 * poner con un clic, o quitar. Al moverlo, la dirección se actualiza (geocoding
 * inverso). Entrega al padre la dirección y las coordenadas.
 */
export default function LocationPicker({
  direccion,
  onChange,
}: {
  direccion: string
  onChange: (direccion: string, coords: { lat: number; lng: number } | null) => void
}) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const markerRef = useRef<L.Marker>(null)
  const autoRef = useRef<AddressAutocompleteHandle>(null)
  const [geoError, setGeoError] = useState<string | null>(null)

  // Al elegir una sugerencia: fija el pin y las coordenadas.
  const onPickSugerencia = (s: { label: string; lat: number; lng: number }) => {
    const c = { lat: s.lat, lng: s.lng }
    setGeoError(null)
    setCoords(c)
    onChange(s.label, c)
  }

  // Al mover/colocar el pin: geocodifica inverso y actualiza la dirección.
  // Se suprime la reapertura del dropdown porque el cambio de texto es
  // programático (viene del arrastre del pin), no de que el usuario escriba.
  const fijarPin = async (lat: number, lng: number) => {
    const c = { lat, lng }
    setGeoError(null)
    setCoords(c)
    autoRef.current?.suppressNextOpen()
    onChange(direccion, c) // actualiza coords de inmediato
    try {
      const geo = await api.reverseGeocode(lat, lng)
      autoRef.current?.suppressNextOpen()
      onChange(geo.label, c)
    } catch {
      /* si falla el inverso, dejamos la dirección escrita */
    }
  }

  // Al tipear/pegar una dirección y confirmar (Enter o perder foco), geocodifica
  // el texto y coloca el pin sin requerir un clic manual en el mapa.
  const geocodificarTexto = async () => {
    const texto = direccion.trim()
    if (texto.length < 3) return
    setGeoError(null)
    try {
      const geo = await api.geocode(texto)
      const c = { lat: geo.lat, lng: geo.lng }
      setCoords(c)
      autoRef.current?.suppressNextOpen()
      onChange(geo.label, c)
    } catch {
      setGeoError('No pudimos ubicar esa dirección. Ajusta el texto o marca el punto en el mapa.')
    }
  }

  const quitarPin = () => {
    setGeoError(null)
    setCoords(null)
    onChange(direccion, null)
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="direccion">Dirección</label>
      <div
        onBlurCapture={(e) => {
          // Geocodifica al salir del campo de texto (no al navegar dentro del dropdown).
          if (!e.currentTarget.contains(e.relatedTarget as Node) && !coords) void geocodificarTexto()
        }}
        onKeyDownCapture={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void geocodificarTexto()
          }
        }}
      >
        <AddressAutocomplete
          ref={autoRef}
          id="direccion"
          value={direccion}
          onChange={(v) => onChange(v, coords)}
          onPick={onPickSugerencia}
        />
      </div>
      {geoError && <p className="mt-2 text-sm text-danger">{geoError}</p>}

      <div className="mt-3 overflow-hidden rounded-lg border border-line">
        <MapContainer center={coords ? [coords.lat, coords.lng] : BOGOTA} zoom={coords ? 16 : 12} style={{ height: 260, width: '100%' }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter coords={coords} />
          <ClickToPlace onPlace={fijarPin} />
          {coords && (
            <Marker
              position={[coords.lat, coords.lng]}
              icon={pinIcon}
              draggable
              ref={markerRef}
              eventHandlers={{
                dragend: () => {
                  const m = markerRef.current
                  if (m) {
                    const p = m.getLatLng()
                    void fijarPin(p.lat, p.lng)
                  }
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-subtle">
          <MapPin size={14} className="text-teal" />
          {coords
            ? 'Arrastra el pin para ajustar la ubicación exacta.'
            : 'Escribe la dirección o haz clic en el mapa para marcar el punto.'}
        </span>
        {coords && (
          <button
            type="button"
            onClick={quitarPin}
            className="inline-flex items-center gap-1 font-semibold text-danger hover:underline"
          >
            <Trash2 size={14} /> Quitar pin
          </button>
        )}
      </div>
    </div>
  )
}
