// Tipos del contrato de API que consume el frontend de SPAZIO.
// Alineados con el SDD (vocabulario único, Tabla 3) y las RF/RN del SRS.
// El backend (FastAPI + Supabase) y el mock deben respetar estos tipos.

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------

/** Formato de error de la API: { code, message, field? } con HTTP 4xx. */
export interface ApiError {
  code: string
  message: string
  field?: string
}

/** Error lanzado por el cliente HTTP; conserva el status y el cuerpo. */
export class ApiException extends Error {
  status: number
  code: string
  field?: string
  constructor(status: number, body: ApiError) {
    super(body.message)
    this.name = 'ApiException'
    this.status = status
    this.code = body.code
    this.field = body.field
  }
}

// ---------------------------------------------------------------------------
// Enumeraciones (SDD Tabla 3)
// ---------------------------------------------------------------------------

/** Estados de la Reserva (SRS §7.2.3). */
export type EstadoReserva =
  | 'PENDIENTE_PAGO'
  | 'CONFIRMADA'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'EXPIRADA'

/** Escenarios del pago simulado (SDD Tabla 3 / RF-06). */
export type EscenarioPago = 'APROBADO' | 'RECHAZADO' | 'SIN_RESPUESTA'

export type TipoVehiculo = 'carro' | 'moto' | 'ambos'

// ---------------------------------------------------------------------------
// Auth (RF-12, RF-13) — SDD M-05
// ---------------------------------------------------------------------------

export interface RegisterRequest {
  nombre: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  nombre: string
  rolAnfitrion: boolean
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

// ---------------------------------------------------------------------------
// Geocodificación (RF-01) — SDD AdaptadorGeocodificacion
// ---------------------------------------------------------------------------

export interface GeocodeResult {
  lat: number
  lng: number
  label: string
}

export interface GeocodeSuggestion {
  label: string
  lat: number
  lng: number
}

// ---------------------------------------------------------------------------
// Búsqueda y espacios (RF-01, RF-03) — SDD M-01 / M-02
// ---------------------------------------------------------------------------

export interface SearchParams {
  q: string
  lat?: number
  lng?: number
  radioKm: number
}

/** Resultado de búsqueda (lista de P-03). */
export interface SpaceSummary {
  id: string
  titulo: string
  direccion: string
  distanciaKm: number
  horario: string
  precioHora: number
  tipoVehiculo: TipoVehiculo
  cubierto: boolean
  foto: string
  lat: number
  lng: number
}

export interface Periodo {
  inicio: string // ISO: fecha+hora, p. ej. "2026-10-14T08:00"
  fin: string
}

/** Detalle del espacio (P-04). */
export interface SpaceDetail extends SpaceSummary {
  descripcion: string
  fotos: string[]
  periodos: Periodo[]
  /** Horario de apertura derivado de los periodos (para validar la selección). */
  horarioApertura: { desde: string; hasta: string }
}

// ---------------------------------------------------------------------------
// Publicar (RF-03, RF-05) — SDD M-02
// ---------------------------------------------------------------------------

export interface PeriodoInput {
  fecha: string // "2026-10-14"
  desde: string // "08:00"
  hasta: string // "18:00"
}

export interface CreateSpaceRequest {
  direccion: string
  tipoVehiculo: TipoVehiculo
  precioHora: number
  cubierto: boolean
  condiciones: string
  periodos: PeriodoInput[]
  fotos: string[] // en el mock: data URLs; con backend: multipart
  lat?: number
  lng?: number
}

export interface CreateSpaceResponse {
  id: string
  rolAnfitrionActivado: boolean
}

/** 409 al agregar disponibilidad que se traslapa (RN-14). */
export interface AvailabilityConflict {
  message: string
  conflicto: Periodo
}

// ---------------------------------------------------------------------------
// Reservas y pago (RF-06, RF-07, RF-08, RF-15) — SDD M-03
// ---------------------------------------------------------------------------

export interface CreateBookingRequest {
  spaceId: string
  inicio: string // ISO fecha+hora
  fin: string
}

export interface CreateBookingResponse {
  id: string
  expiresAt: string // ISO
  monto: number
}

export interface PayRequest {
  escenario: EscenarioPago
}

export interface PayResponse {
  estado: EstadoReserva
}

// --- Wompi ---
export interface WompiCheckout {
  publicKey: string
  reference: string
  amountInCents: number
  currency: string
  signature: string
}

export interface WompiProcessRequest {
  transactionId: string
  paymentMethod?: string
}

export interface WompiProcessResponse {
  estado: EstadoReserva
  wompiStatus: string
}

export interface BookingEspacio {
  id: string
  titulo: string
  direccion: string
  foto: string
}

/** GET /bookings/{id} */
export interface BookingStatus {
  id: string
  estado: EstadoReserva
  segundosRestantes: number
  espacio: BookingEspacio
  inicio: string
  fin: string
  monto: number
}

/** Fila de "Mis reservas" (P-07). */
export interface BookingListItem {
  id: string
  espacio: BookingEspacio
  ciudad: string
  fecha: string // "2026-10-14"
  desde: string // "10:00"
  hasta: string // "13:00"
  horas: number
  monto: number
  estado: EstadoReserva
  /** Motivo breve para estados no cancelables. */
  motivo?: string
  /** Horas hasta el inicio (para habilitar cancelar y calcular reembolso). */
  horasParaInicio: number
}

export type EstadoFiltro = 'todas' | 'confirmada' | 'cancelada' | 'expirada'

export interface BookingsContadores {
  todas: number
  confirmada: number
  cancelada: number
  expirada: number
}

export interface MyBookingsResponse {
  items: BookingListItem[]
  contadores: BookingsContadores
}

export interface CancelPreviewResponse {
  pct: number
  monto: number
  horasParaInicio: number
}

export interface CancelResponse {
  estado: 'CANCELADA'
  reembolso: number
}
