import type { ApiClient } from '../contract'
import {
  ApiException,
  type AddAvailabilityRequest,
  type AddRecurringAvailabilityRequest,
  type AuthUser,
  type AvailabilityItem,
  type BookingListItem,
  type BookingStatus,
  type BookingsContadores,
  type CancelPreviewResponse,
  type CancelResponse,
  type CreateBookingRequest,
  type CreateBookingResponse,
  type CreateSpaceRequest,
  type CreateSpaceResponse,
  type EstadoFiltro,
  type GeocodeResult,
  type GeocodeSuggestion,
  type HostSpaceItem,
  type LoginRequest,
  type LoginResponse,
  type MyBookingsResponse,
  type PayRequest,
  type PayResponse,
  type Periodo,
  type RegisterRequest,
  type SearchParams,
  type SpaceDetail,
  type SpaceSummary,
  type UpdateSpaceRequest,
  type WompiCheckout,
  type WompiProcessRequest,
  type WompiProcessResponse,
} from '../types'
import type {
  BackendAvailability,
  BackendBooking,
  BackendPaymentResult,
  BackendSpace,
  BackendSpaceCreate,
  BackendSpaceNearby,
  BackendToken,
  BackendUser,
  BackendWompiCheckout,
} from './types'
import {
  derivarHorario,
  fechaParte,
  fotosDe,
  horaParte,
  horasEntre,
  horasParaInicio,
  isoEnBogota,
  mapSummary,
  parseError,
  segundosRestantes,
  toEstado,
  toIsoBogota,
  FOTOS_FALLBACK,
} from './mappers'

const STORAGE_KEY = 'spazio.sesion'

/** Día de la semana (0=Lun..6=Dom) de un "YYYY-MM-DD", sin desfase UTC. */
function weekdayDeISO(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const js = new Date(y, m - 1, d).getDay() // 0=Dom..6=Sab
  return (js + 6) % 7 // -> 0=Lun..6=Dom
}

/** Suma un día a un "YYYY-MM-DD" devolviendo otro "YYYY-MM-DD" (hora local). */
function sumarDiaISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

export class BackendApiClient implements ApiClient {
  constructor(private baseUrl: string) {}

  private authHeader(): Record<string, string> {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return {}
      const jwt = JSON.parse(raw)?.jwt
      return jwt ? { Authorization: `Bearer ${jwt}` } : {}
    } catch {
      return {}
    }
  }

  private async request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
    const auth = token ? { Authorization: `Bearer ${token}` } : this.authHeader()
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...auth,
        ...(init.headers ?? {}),
      },
    })

    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('spazio:unauthorized'))
    }
    if (!res.ok) {
      throw new ApiException(res.status, await parseError(res))
    }
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  async register(body: RegisterRequest): Promise<LoginResponse> {
    await this.request<BackendUser>('/users/register', {
      method: 'POST',
      body: JSON.stringify({
        full_name: body.nombre,
        email: body.email,
        password: body.password,
      }),
    })
    return this.login({ email: body.email, password: body.password })
  }

  async login(body: LoginRequest): Promise<LoginResponse> {
    const token = await this.request<BackendToken>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: body.email, password: body.password }),
    })
    const me = await this.request<BackendUser>('/users/me', {}, token.access_token)
    const user: AuthUser = {
      id: me.id,
      nombre: me.full_name,
      rolAnfitrion: me.is_host,
    }
    return { token: token.access_token, user }
  }

  async geocode(q: string): Promise<GeocodeResult> {
    const r = await this.request<{ address: string; latitude: number; longitude: number }>(
      `/geocode?q=${encodeURIComponent(q)}`,
    )
    return { lat: r.latitude, lng: r.longitude, label: r.address }
  }

  async suggestAddresses(q: string): Promise<GeocodeSuggestion[]> {
    const r = await this.request<{ display_name: string; latitude: number; longitude: number }[]>(
      `/geocode/suggest?q=${encodeURIComponent(q)}`,
    )
    return r.map((s) => ({ label: s.display_name, lat: s.latitude, lng: s.longitude }))
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    const r = await this.request<{ address: string; latitude: number; longitude: number }>(
      `/geocode/reverse?latitude=${lat}&longitude=${lng}`,
    )
    return { lat: r.latitude, lng: r.longitude, label: r.address }
  }

  async searchSpaces(params: SearchParams): Promise<SpaceSummary[]> {
    let lat = params.lat
    let lng = params.lng
    if (lat == null || lng == null) {
      const geo = await this.geocode(params.q)
      lat = geo.lat
      lng = geo.lng
    }
    const radius = Math.round(params.radioKm * 1000)
    const spaces = await this.request<BackendSpaceNearby[]>(
      `/spaces/nearby?latitude=${lat}&longitude=${lng}&radius=${radius}`,
    )
    return spaces.map((s) => mapSummary(s, Math.round((s.distance_meters / 1000) * 100) / 100))
  }

  async getSpace(id: string): Promise<SpaceDetail> {
    const [space, avails] = await Promise.all([
      this.request<BackendSpace>(`/spaces/${id}`),
      this.request<BackendAvailability[]>(`/availabilities/space/${id}`),
    ])
    const periodos: Periodo[] = avails.map((a) => ({
      inicio: isoEnBogota(a.start_time),
      fin: isoEnBogota(a.end_time),
    }))
    const { horario, horarioApertura } = derivarHorario(periodos)
    return {
      ...mapSummary(space, 0),
      horario,
      descripcion: space.conditions || 'Espacio de parqueo disponible en Bogotá.',
      fotos: fotosDe(space),
      periodos,
      horarioApertura,
    }
  }

  async createSpace(body: CreateSpaceRequest): Promise<CreateSpaceResponse> {
    // Validar los periodos ANTES de crear el espacio. El backend crea y hace
    // commit del espacio en POST /spaces/ y recién después valida cada
    // disponibilidad en POST /availabilities/. Si un periodo es inválido (p. ej.
    // ya terminó respecto a la hora actual), la petición se corta pero el espacio
    // ya quedó persistido sin horarios: un espacio huérfano. Validar aquí evita
    // llegar a crear el espacio cuando algún periodo no es publicable.
    const ahora = Date.now()
    for (const p of body.periodos) {
      const inicioMs = new Date(toIsoBogota(`${p.fecha}T${p.desde}`)).getTime()
      const finMs = new Date(toIsoBogota(`${p.fecha}T${p.hasta}`)).getTime()
      if (Number.isNaN(inicioMs) || Number.isNaN(finMs)) {
        throw new ApiException(422, {
          code: 'AVAILABILITY_INVALID',
          message: 'Hay un periodo de disponibilidad con fecha u hora inválida.',
          field: 'periodos',
        })
      }
      if (finMs <= inicioMs) {
        throw new ApiException(422, {
          code: 'AVAILABILITY_INVALID',
          message: 'La hora de fin de un periodo debe ser posterior a la de inicio.',
          field: 'periodos',
        })
      }
      if (finMs <= ahora) {
        throw new ApiException(422, {
          code: 'AVAILABILITY_ENDED',
          message:
            'Un periodo de disponibilidad ya terminó. Ajusta la fecha u hora antes de publicar.',
          field: 'periodos',
        })
      }
    }

    let lat = body.lat
    let lng = body.lng
    if (lat == null || lng == null) {
      const geo = await this.geocode(body.direccion)
      lat = geo.lat
      lng = geo.lng
    }
    const created = await this.request<BackendSpaceCreate>('/spaces/', {
      method: 'POST',
      body: JSON.stringify({
        title: body.direccion.split(',')[0]?.slice(0, 150) || 'Parqueadero',
        category: 'PARKING',
        address: body.direccion,
        conditions: body.condiciones,
        price_per_hour: body.precioHora,
        latitude: lat,
        longitude: lng,
        photos: (body.fotos ?? []).slice(0, 3),
      }),
    })

    for (const p of body.periodos) {
      await this.request('/availabilities/', {
        method: 'POST',
        body: JSON.stringify({
          space_id: created.id,
          start_time: toIsoBogota(`${p.fecha}T${p.desde}`),
          end_time: toIsoBogota(`${p.fecha}T${p.hasta}`),
        }),
      })
    }

    return { id: created.id, rolAnfitrionActivado: created.host_role_activated }
  }

  // --- Gestión de "Mis espacios" por el anfitrión (RF-03, RF-05) ------------

  async mySpaces(): Promise<HostSpaceItem[]> {
    const spaces = await this.request<BackendSpace[]>('/spaces/my-spaces')
    const ahora = Date.now()
    return Promise.all(
      spaces.map(async (s) => {
        let periodosVigentes = 0
        try {
          const avails = await this.request<BackendAvailability[]>(
            `/availabilities/space/${s.id}`,
          )
          periodosVigentes = avails.filter((a) => new Date(a.end_time).getTime() > ahora).length
        } catch {
          void 0
        }
        return {
          id: s.id,
          titulo: s.title || 'Parqueadero en Bogotá',
          direccion: s.address,
          precioHora: s.price_per_hour,
          activo: s.is_active,
          foto: fotosDe(s)[0],
          periodosVigentes,
        }
      }),
    )
  }

  async updateSpace(id: string, body: UpdateSpaceRequest): Promise<void> {
    const payload: Record<string, unknown> = {}
    if (body.precioHora != null) payload.price_per_hour = body.precioHora
    if (body.activo != null) payload.is_active = body.activo
    if (body.condiciones != null) payload.conditions = body.condiciones
    await this.request<BackendSpace>(`/spaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  }

  async deleteSpace(id: string): Promise<void> {
    await this.request(`/spaces/${id}`, { method: 'DELETE' })
  }

  async listAvailabilities(spaceId: string): Promise<AvailabilityItem[]> {
    const avails = await this.request<BackendAvailability[]>(
      `/availabilities/space/${spaceId}`,
    )
    const ahora = Date.now()
    return avails.map((a) => ({
      id: a.id,
      fecha: fechaParte(a.start_time),
      desde: horaParte(a.start_time),
      hasta: horaParte(a.end_time),
      vencido: new Date(a.end_time).getTime() <= ahora,
    }))
  }

  async addAvailability(body: AddAvailabilityRequest): Promise<AvailabilityItem> {
    const a = await this.request<BackendAvailability>('/availabilities/', {
      method: 'POST',
      body: JSON.stringify({
        space_id: body.spaceId,
        start_time: toIsoBogota(`${body.fecha}T${body.desde}`),
        end_time: toIsoBogota(`${body.fecha}T${body.hasta}`),
      }),
    })
    return {
      id: a.id,
      fecha: fechaParte(a.start_time),
      desde: horaParte(a.start_time),
      hasta: horaParte(a.end_time),
      vencido: new Date(a.end_time).getTime() <= Date.now(),
    }
  }

  async addRecurringAvailability(
    body: AddRecurringAvailabilityRequest,
  ): Promise<AvailabilityItem[]> {
    // Compatibilidad con el backend "antiguo" (Backend-SPAZIO): no expone
    // POST /availabilities/recurring. Expandimos la regla recurrente en el
    // cliente a bloques por cada día coincidente y los creamos uno por uno con
    // POST /availabilities/ (que sí existe). El comportamiento visible es el
    // mismo que el endpoint recurrente: genera un bloque por día del rango que
    // caiga en los weekdays elegidos.
    const ahora = Date.now()
    const creados: AvailabilityItem[] = []

    let actual = body.startDate
    let guard = 0
    // Tope defensivo: ~10 años de días para no colgarse ante fechas corruptas.
    while (actual <= body.endDate && guard < 3660) {
      guard += 1
      if (body.weekdays.includes(weekdayDeISO(actual))) {
        const startIso = toIsoBogota(`${actual}T${body.desde}`)
        const endIso = toIsoBogota(`${actual}T${body.hasta}`)
        // Omite bloques ya terminados (igual que la validación del backend).
        if (new Date(endIso).getTime() > ahora) {
          const a = await this.request<BackendAvailability>('/availabilities/', {
            method: 'POST',
            body: JSON.stringify({
              space_id: body.spaceId,
              start_time: startIso,
              end_time: endIso,
            }),
          })
          creados.push({
            id: a.id,
            fecha: fechaParte(a.start_time),
            desde: horaParte(a.start_time),
            hasta: horaParte(a.end_time),
            vencido: new Date(a.end_time).getTime() <= ahora,
          })
        }
      }
      actual = sumarDiaISO(actual)
    }

    if (creados.length === 0) {
      throw new ApiException(400, {
        code: 'AVAILABILITY_RECURRING_EMPTY',
        message:
          'La regla recurrente no generó ningún bloque nuevo: revisa los días y el rango de fechas.',
        field: 'weekdays',
      })
    }

    return creados
  }

  async removeAvailability(id: string): Promise<void> {
    await this.request(`/availabilities/${id}`, { method: 'DELETE' })
  }

  async createBooking(body: CreateBookingRequest): Promise<CreateBookingResponse> {
    const booking = await this.request<BackendBooking>('/bookings/', {
      method: 'POST',
      body: JSON.stringify({
        space_id: body.spaceId,
        start_time: toIsoBogota(body.inicio),
        end_time: toIsoBogota(body.fin),
      }),
    })
    return {
      id: booking.id,
      expiresAt: booking.locked_until,
      monto: booking.total_amount,
    }
  }

  async payBooking(id: string, body: PayRequest): Promise<PayResponse> {
    const simulated = body.escenario === 'APROBADO' ? 'APPROVED' : 'REJECTED'
    await this.request<BackendPaymentResult>('/payments/process', {
      method: 'POST',
      body: JSON.stringify({
        booking_id: id,
        payment_method: 'CARD',
        simulated_status: simulated,
      }),
    })
    const booking = await this.request<BackendBooking>(`/bookings/${id}`)
    return { estado: toEstado(booking.status) }
  }

  async wompiCheckout(id: string): Promise<WompiCheckout> {
    const r = await this.request<BackendWompiCheckout>(`/payments/checkout/${id}`, {
      method: 'POST',
    })
    return {
      publicKey: r.public_key,
      reference: r.reference,
      amountInCents: r.amount_in_cents,
      currency: r.currency,
      signature: r.signature,
    }
  }

  async wompiProcess(id: string, body: WompiProcessRequest): Promise<WompiProcessResponse> {
    const r = await this.request<BackendPaymentResult>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ booking_id: id, transaction_id: body.transactionId }),
    })
    const booking = await this.request<BackendBooking>(`/bookings/${id}`)
    return { estado: toEstado(booking.status), wompiStatus: r.status }
  }

  async getBooking(id: string): Promise<BookingStatus> {
    const b = await this.request<BackendBooking>(`/bookings/${id}`)
    const space = await this.request<BackendSpace>(`/spaces/${b.space_id}`)
    return {
      id: b.id,
      estado: toEstado(b.status),
      segundosRestantes: segundosRestantes(b.locked_until),
      espacio: {
        id: space.id,
        titulo: space.title || 'Parqueadero en Bogotá',
        direccion: space.address,
        foto: fotosDe(space)[0],
      },
      inicio: isoEnBogota(b.start_time),
      fin: isoEnBogota(b.end_time),
      monto: b.total_amount,
    }
  }

  async releaseHold(id: string): Promise<void> {
    try {
      await this.request(`/bookings/${id}/cancel`, { method: 'POST' })
    } catch {
      void 0
    }
  }

  async myBookings(estado?: EstadoFiltro): Promise<MyBookingsResponse> {
    const bookings = await this.request<BackendBooking[]>('/bookings/me')

    const items: BookingListItem[] = await Promise.all(
      bookings.map(async (b) => {
        let titulo = 'Parqueadero en Bogotá'
        let direccion = 'Bogotá'
        let foto = FOTOS_FALLBACK[0]
        try {
          const space = await this.request<BackendSpace>(`/spaces/${b.space_id}`)
          titulo = space.title || titulo
          direccion = space.address
          foto = fotosDe(space)[0]
        } catch {
          void 0
        }
        return {
          id: b.id,
          espacio: { id: b.space_id, titulo, direccion, foto },
          ciudad: 'Bogotá',
          fecha: fechaParte(b.start_time),
          desde: horaParte(b.start_time),
          hasta: horaParte(b.end_time),
          horas: horasEntre(b.start_time, b.end_time),
          monto: b.total_amount,
          estado: toEstado(b.status),
          motivo: b.cancellation_reason ?? undefined,
          horasParaInicio: horasParaInicio(b.start_time),
        }
      }),
    )

    const contadores: BookingsContadores = {
      todas: items.length,
      confirmada: items.filter((i) => i.estado === 'CONFIRMADA').length,
      cancelada: items.filter((i) => i.estado === 'CANCELADA').length,
      expirada: items.filter((i) => i.estado === 'EXPIRADA').length,
    }

    const filtrados =
      !estado || estado === 'todas'
        ? items
        : items.filter((i) => i.estado === estado.toUpperCase())

    return { items: filtrados, contadores }
  }

  async cancelPreview(id: string): Promise<CancelPreviewResponse> {
    const b = await this.request<BackendBooking>(`/bookings/${id}`)
    const horas = horasParaInicio(b.start_time)
    const pct = horas >= 24 ? 100 : 0
    const monto = (b.total_amount * pct) / 100
    return { pct, monto, horasParaInicio: horas }
  }

  async cancelBooking(id: string): Promise<CancelResponse> {
    const b = await this.request<BackendBooking>(`/bookings/${id}/cancel`, { method: 'POST' })
    return { estado: 'CANCELADA', reembolso: b.refund_amount ?? 0 }
  }
}
