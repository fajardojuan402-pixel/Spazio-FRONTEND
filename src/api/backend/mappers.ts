import type { ApiError, EstadoReserva, Periodo, SpaceSummary, TipoVehiculo } from '../types'
import type { BackendBookingStatus, BackendSpace, BackendSpaceNearby } from './types'

export const TZ_OFFSET = '-05:00'

export const FOTOS_FALLBACK = [
  'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1470224114660-3f6686c562eb?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1545179605-1296651e9d0a?auto=format&fit=crop&w=800&q=60',
]

const ESTADO_MAP: Record<BackendBookingStatus, EstadoReserva> = {
  PENDING_PAYMENT: 'PENDIENTE_PAGO',
  CONFIRMED: 'CONFIRMADA',
  CANCELLED: 'CANCELADA',
  EXPIRED: 'EXPIRADA',
}

export function toEstado(status: BackendBookingStatus): EstadoReserva {
  return ESTADO_MAP[status] ?? 'PENDIENTE_PAGO'
}

export function toIsoBogota(fechaHora: string): string {
  const base = fechaHora.length === 16 ? `${fechaHora}:00` : fechaHora
  return `${base}${TZ_OFFSET}`
}

export function isoEnBogota(iso: string): string {
  const d = new Date(iso)
  const bogota = new Date(d.getTime() - 5 * 3600 * 1000)
  return bogota.toISOString().slice(0, 16)
}

export function fechaParte(iso: string): string {
  return isoEnBogota(iso).slice(0, 10)
}

export function horaParte(iso: string): string {
  return isoEnBogota(iso).slice(11, 16)
}

export function horasEntre(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  return Math.round((ms / 3_600_000) * 100) / 100
}

export function segundosRestantes(lockedUntil: string): number {
  const ms = new Date(lockedUntil).getTime() - Date.now()
  return Math.max(0, Math.floor(ms / 1000))
}

export function horasParaInicio(startIso: string): number {
  return Math.max(0, (new Date(startIso).getTime() - Date.now()) / 3_600_000)
}

export function fotosDe(space: BackendSpace): string[] {
  const fotos = (space.photos ?? []).filter(Boolean)
  if (fotos.length >= 3) return fotos.slice(0, 3)
  return [...fotos, ...FOTOS_FALLBACK].slice(0, 3)
}

/** Un bloque horario concreto (de un día específico). */
export interface BloqueHorario {
  desde: string // "HH:mm"
  hasta: string // "HH:mm"
}

/**
 * Agrupa los periodos por fecha ("YYYY-MM-DD") devolviendo, para cada día, sus
 * bloques horarios ordenados. NO une horas de días distintos: cada fecha
 * conserva sus propios bloques (p. ej. un día 08:00–12:00 y otro 14:00–18:00
 * quedan separados, no fusionados en 08:00–18:00).
 */
export function bloquesPorFecha(periodos: Periodo[]): Map<string, BloqueHorario[]> {
  const mapa = new Map<string, BloqueHorario[]>()
  for (const p of periodos) {
    const fecha = p.inicio.slice(0, 10)
    const bloque: BloqueHorario = { desde: p.inicio.slice(11, 16), hasta: p.fin.slice(11, 16) }
    const lista = mapa.get(fecha) ?? []
    lista.push(bloque)
    mapa.set(fecha, lista)
  }
  for (const lista of mapa.values()) {
    lista.sort((a, b) => a.desde.localeCompare(b.desde))
  }
  return mapa
}

export function derivarHorario(periodos: Periodo[]): {
  horario: string
  horarioApertura: { desde: string; hasta: string }
} {
  if (periodos.length === 0) {
    return { horario: 'Horario por confirmar', horarioApertura: { desde: '00:00', hasta: '23:00' } }
  }

  // Resumen textual: muestra los rangos horarios DISTINTOS sin fusionar días.
  // Si todos los días comparten el mismo rango, se muestra uno solo.
  const rangos = new Set<string>()
  let minDesde = '23:59'
  let maxHasta = '00:00'
  for (const p of periodos) {
    const d = p.inicio.slice(11, 16)
    const h = p.fin.slice(11, 16)
    rangos.add(`${d}–${h}`)
    if (d < minDesde) minDesde = d
    if (h > maxHasta) maxHasta = h
  }
  const listaRangos = Array.from(rangos).sort()
  const horario =
    listaRangos.length === 1
      ? listaRangos[0]
      : `${listaRangos.slice(0, 3).join(' · ')}${listaRangos.length > 3 ? ' …' : ''}`

  // horarioApertura se mantiene como el envolvente (min–max) para compatibilidad,
  // pero la validación por fecha usa los bloques reales de cada día.
  return { horario, horarioApertura: { desde: minDesde, hasta: maxHasta } }
}

export function mapSummary(space: BackendSpaceNearby | BackendSpace, distanciaKm: number): SpaceSummary {
  const fotos = fotosDe(space)
  return {
    id: space.id,
    hostId: space.host_id,
    titulo: space.title || 'Parqueadero en Bogotá',
    direccion: space.address,
    distanciaKm,
    horario:
      'availabilities' in space && space.availabilities.length > 0
        ? derivarHorario(
            space.availabilities.map((a) => ({
              inicio: isoEnBogota(a.start_time),
              fin: isoEnBogota(a.end_time),
            })),
          ).horario
        : 'Consultar disponibilidad',
    precioHora: space.price_per_hour,
    tipoVehiculo: 'ambos' as TipoVehiculo,
    cubierto: false,
    foto: fotos[0],
    lat: space.latitude,
    lng: space.longitude,
  }
}

export async function parseError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json()
    const detail = body?.detail
    if (typeof detail === 'string') return { code: 'error', message: detail }
    if (Array.isArray(detail) && detail[0]?.msg) {
      return { code: 'validation', message: String(detail[0].msg) }
    }
    if (body?.message) return { code: body.code ?? 'error', message: body.message }
  } catch {
    void 0
  }
  return { code: 'error', message: 'Ocurrió un error inesperado.' }
}
