// Contrato del ApiClient (SDD §7.1.1): única puerta al backend.
// Lo implementan el cliente HTTP real (http.ts) y el adaptador mock (mock/).

import type {
  AddAvailabilityRequest,
  AddRecurringAvailabilityRequest,
  AvailabilityConflict,
  AvailabilityItem,
  BookingStatus,
  CancelPreviewResponse,
  CancelResponse,
  CreateBookingRequest,
  CreateBookingResponse,
  CreateSpaceRequest,
  CreateSpaceResponse,
  EstadoFiltro,
  GeocodeResult,
  GeocodeSuggestion,
  HostSpaceItem,
  LoginRequest,
  LoginResponse,
  MyBookingsResponse,
  PayRequest,
  PayResponse,
  RegisterRequest,
  SearchParams,
  SpaceDetail,
  SpaceSummary,
  UpdateSpaceRequest,
  WompiCheckout,
  WompiProcessRequest,
  WompiProcessResponse,
} from './types'

export { AvailabilityConflict }

/** Operaciones que el frontend consume. Devuelven promesas y lanzan ApiException en 4xx. */
export interface ApiClient {
  // Auth (RF-12, RF-13)
  register(body: RegisterRequest): Promise<LoginResponse>
  login(body: LoginRequest): Promise<LoginResponse>

  // Geocodificación (RF-01)
  geocode(q: string): Promise<GeocodeResult>
  suggestAddresses(q: string): Promise<GeocodeSuggestion[]>
  reverseGeocode(lat: number, lng: number): Promise<GeocodeResult>

  // Búsqueda y espacios (RF-01, RF-03)
  searchSpaces(params: SearchParams): Promise<SpaceSummary[]>
  getSpace(id: string): Promise<SpaceDetail>

  // Publicar (RF-03, RF-05)
  createSpace(body: CreateSpaceRequest): Promise<CreateSpaceResponse>

  // Gestión de "Mis espacios" por el anfitrión (RF-03, RF-05)
  mySpaces(): Promise<HostSpaceItem[]>
  updateSpace(id: string, body: UpdateSpaceRequest): Promise<void>
  deleteSpace(id: string): Promise<void>
  listAvailabilities(spaceId: string): Promise<AvailabilityItem[]>
  addAvailability(body: AddAvailabilityRequest): Promise<AvailabilityItem>
  addRecurringAvailability(body: AddRecurringAvailabilityRequest): Promise<AvailabilityItem[]>
  removeAvailability(id: string): Promise<void>

  // Reservas y pago (RF-06, RF-07, RF-08, RF-15)
  createBooking(body: CreateBookingRequest): Promise<CreateBookingResponse>
  payBooking(id: string, body: PayRequest): Promise<PayResponse>
  wompiCheckout(id: string): Promise<WompiCheckout>
  wompiProcess(id: string, body: WompiProcessRequest): Promise<WompiProcessResponse>
  getBooking(id: string): Promise<BookingStatus>
  releaseHold(id: string): Promise<void>
  myBookings(estado?: EstadoFiltro): Promise<MyBookingsResponse>
  cancelPreview(id: string): Promise<CancelPreviewResponse>
  cancelBooking(id: string): Promise<CancelResponse>
}
