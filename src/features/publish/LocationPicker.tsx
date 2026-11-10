import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Trash2 } from 'lucide-react'
import AddressAutocomplete from '../search/AddressAutocomplete'
import { api } from '../../api/client'

const BOGOTA: [number, number] = [4.6097, -74.0817]

/** Pin rojo arrastrable (estilo Google) para marcar la ubicación exacta. */
const pinIcon = L.divIcon({
  className: 'spazio-pub-pin',
  html: `<div style="
    transform: translate(-50%, -100%);
    width:24px; height:24px; border-radius:50% 50% 50% 0;
    background:#d93636; border:2px solid #fff; rotate:-45deg;
    box-shadow:0 2px 6px rgba(0,0,0,.35);"></div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
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

  // Al elegir una sugerencia: fija el pin y las coordenadas.
  const onPickSugerencia = (s: { label: string; lat: number; lng: number }) => {
    const c = { lat: s.lat, lng: s.lng }
    setCoords(c)
    onChange(s.label, c)
  }

  // Al mover/colocar el pin: geocodifica inverso y actualiza la dirección.
  const fijarPin = async (lat: number, lng: number) => {
    const c = { lat, lng }
    setCoords(c)
    onChange(direccion, c) // actualiza coords de inmediato
    try {
      const geo = await api.reverseGeocode(lat, lng)
      onChange(geo.label, c)
    } catch {
      /* si falla el inverso, dejamos la dirección escrita */
    }
  }

  const quitarPin = () => {
    setCoords(null)
    onChange(direccion, null)
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="direccion">Dirección</label>
      <AddressAutocomplete id="direccion" value={direccion} onChange={(v) => onChange(v, coords)} onPick={onPickSugerencia} />

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
