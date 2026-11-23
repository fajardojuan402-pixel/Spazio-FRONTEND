import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { SpaceSummary } from '../../api/types'
import { formatCOP } from '../../lib/format'

const BOGOTA: [number, number] = [4.6097, -74.0817]

/** Glifos SVG por tipo de vehículo (trazo blanco sobre el pin de color). */
const VEHICLE_GLYPH: Record<string, string> = {
  // Carro
  carro:
    '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11m-14 0h14m-14 0v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4M7.5 13.5h.01M16.5 13.5h.01" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  // Moto
  moto:
    '<circle cx="6" cy="16" r="2.3" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="18" cy="16" r="2.3" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M8 16h5l2-4h3m-9 4 2.5-5H15m-7.5 0H5" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  // Ambos (carro + moto): usamos el de carro con un punto extra
  ambos:
    '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11m-14 0h14m-14 0v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4M7.5 13.5h.01M16.5 13.5h.01" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
}

/**
 * Pin llamativo de alto contraste con sombra (RF-01 / H6). Muestra el icono del
 * tipo de vehículo, una etiqueta de precio y, si el espacio es cubierto, un
 * distintivo. Cambia de color cuando está seleccionado.
 */
function priceIcon(
  precio: number,
  active: boolean,
  tipoVehiculo: string,
  cubierto: boolean,
): L.DivIcon {
  const bg = active ? '#0f766e' : '#14576a' // teal fuerte / teal
  const glyph = VEHICLE_GLYPH[tipoVehiculo] ?? VEHICLE_GLYPH.carro
  const cubiertoBadge = cubierto
    ? `<span style="
        display:inline-block; margin-left:4px; padding:0 4px; border-radius:4px;
        background:#fde68a; color:#78350f; font-size:9px; font-weight:800;
        vertical-align:middle;">CUBIERTO</span>`
    : ''
  return L.divIcon({
    className: 'spazio-price-pin',
    html: `<div style="position:relative; width:40px; height:52px;">
      <svg width="40" height="52" viewBox="0 0 40 52" style="
        position:absolute; top:0; left:0;
        filter: drop-shadow(0 3px 4px rgba(0,0,0,.4));">
        <path d="M20 2C11.2 2 4 9.0 4 17.6c0 10.8 13.2 21.4 15.1 22.9a1.4 1.4 0 0 0 1.8 0C22.8 39 36 28.4 36 17.6 36 9.0 28.8 2 20 2Z"
          fill="${bg}" stroke="#ffffff" stroke-width="2.5"/>
        <svg x="8" y="5" width="24" height="24" viewBox="0 0 24 24">${glyph}</svg>
      </svg>
      <div style="
        position:absolute; top:44px; left:50%; transform:translateX(-50%);
        white-space:nowrap; background:#ffffff; color:#14303D;
        border:1.5px solid ${bg}; border-radius:999px; padding:1px 8px;
        font-size:11px; font-weight:800; box-shadow:0 2px 6px rgba(20,48,61,.25);
        font-family:Inter,system-ui,sans-serif;">${formatCOP(precio)}/h${cubiertoBadge}</div>
    </div>`,
    // 40×52 con la punta del pin en la base (centro-inferior del SVG, y=41).
    iconSize: [40, 52],
    iconAnchor: [20, 41],
    popupAnchor: [0, -38],
  })
}

/** Punto azul "tu ubicación". */
const userIcon = L.divIcon({
  className: 'spazio-user-pin',
  html: `<div style="
    transform: translate(-50%, -50%);
    width:16px; height:16px; border-radius:999px;
    background:#2563eb; border:3px solid #fff;
    box-shadow:0 0 0 4px rgba(37,99,235,.25);"></div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
})

/** Pin rojo del punto buscado (dirección escrita), estilo Google. */
const searchIcon = L.divIcon({
  className: 'spazio-search-pin',
  html: `<div style="
    transform: translate(-50%, -100%);
    width:22px; height:22px; border-radius:50% 50% 50% 0;
    background:#d93636; border:2px solid #fff; rotate:-45deg;
    box-shadow:0 2px 6px rgba(0,0,0,.3);"></div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
})

/** Mueve/encaja el mapa cuando cambia la búsqueda, la selección o el centro. */
function FitBounds({
  puntos,
  selected,
  centro,
}: {
  puntos: [number, number][]
  selected?: SpaceSummary
  centro?: { lat: number; lng: number }
}) {
  const map = useMap()

  // Prioridad 1: si hay una tarjeta seleccionada, el mapa va a ese parqueadero.
  useEffect(() => {
    if (selected) map.setView([selected.lat, selected.lng], 16, { animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  // Prioridad 2: al cambiar el centro de búsqueda (dirección o "mi ubicación"),
  // el mapa se mueve a ese punto y encuadra los resultados cercanos.
  useEffect(() => {
    if (!centro) return
    if (puntos.length >= 1) {
      // Encuadra el centro + los parqueaderos para que todo quede visible.
      const bounds = L.latLngBounds([[centro.lat, centro.lng], ...puntos])
      map.fitBounds(bounds.pad(0.25), { animate: true, maxZoom: 16 })
    } else {
      map.setView([centro.lat, centro.lng], 15, { animate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro?.lat, centro?.lng, JSON.stringify(puntos)])

  return null
}

/**
 * MapPanel: mapa real interactivo (Leaflet + OpenStreetMap). Muestra los
 * parqueaderos como pines de precio, el pin de "tu ubicación" si está
 * disponible, y sincroniza el pin seleccionado con la tarjeta elegida (RF-01).
 */
export default function MapPanel({
  selected,
  otros,
  userCoords,
  centro,
  onSelect,
}: {
  radioKm: number
  selected?: SpaceSummary
  otros: SpaceSummary[]
  userCoords?: { lat: number; lng: number }
  /** Punto de la búsqueda (dirección escrita o ubicación), al que el mapa se mueve. */
  centro?: { lat: number; lng: number }
  onSelect?: (id: string) => void
}) {
  const centroInicial = useMemo<[number, number]>(() => {
    if (centro) return [centro.lat, centro.lng]
    if (userCoords) return [userCoords.lat, userCoords.lng]
    if (otros[0]) return [otros[0].lat, otros[0].lng]
    return BOGOTA
  }, [centro, userCoords, otros])

  const puntos = useMemo<[number, number][]>(() => {
    const p = otros.map((s) => [s.lat, s.lng] as [number, number])
    if (userCoords) p.push([userCoords.lat, userCoords.lng])
    return p
  }, [otros, userCoords])

  return (
    <div className="relative min-h-[520px] overflow-hidden rounded-xl border border-line">
      <MapContainer
        center={centroInicial}
        zoom={14}
        scrollWheelZoom
        style={{ height: '100%', width: '100%', minHeight: 520 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Pin del punto buscado (dirección). Si es la ubicación del usuario,
            usa el punto azul; si es una dirección escrita, el pin de búsqueda. */}
        {userCoords ? (
          <Marker position={[userCoords.lat, userCoords.lng]} icon={userIcon}>
            <Popup>Tu ubicación</Popup>
          </Marker>
        ) : (
          centro && (
            <Marker position={[centro.lat, centro.lng]} icon={searchIcon}>
              <Popup>Tu búsqueda</Popup>
            </Marker>
          )
        )}

        {otros.map((s) => (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={priceIcon(s.precioHora, selected?.id === s.id, s.tipoVehiculo, s.cubierto)}
            eventHandlers={{ click: () => onSelect?.(s.id) }}
          >
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-bold text-ink">{s.titulo}</p>
                <p className="text-sm text-subtle">
                  {s.distanciaKm.toLocaleString('es-CO')} km · {s.cubierto ? 'Cubierto' : 'Descubierto'}
                </p>
                <p className="mt-1 font-extrabold text-teal">{formatCOP(s.precioHora)}/h</p>
                <Link to={`/espacio/${s.id}`} className="mt-1 inline-block text-sm font-semibold text-teal underline">
                  Ver espacio
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}

        <FitBounds puntos={puntos} selected={selected} centro={centro} />
      </MapContainer>

      <span className="pointer-events-none absolute bottom-2 right-3 z-[500] rounded bg-white/80 px-2 py-0.5 text-xs text-subtle">
        Mapa · OpenStreetMap
      </span>
    </div>
  )
}
