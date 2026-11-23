// Adaptador mock del ApiClient: implementa el MISMO contrato que el backend,
// con datos semilla y persistencia en memoria durante la sesión.
// Simula las reglas reales (RN-11, RN-12, RN-14, RF-07) para demostrar la app.

import type { ApiClient } from '../contract'
import {
  ApiException,
  type AddAvailabilityRequest,
  type AddRecurringAvailabilityRequest,
  type AvailabilityItem,
  type BookingListItem,
  type BookingStatus,
  type CancelPreviewResponse,
  type CancelResponse,
  type CreateBookingRequest,
  type CreateBookingResponse,
  type CreateSpaceRequest,
  type CreateSpaceResponse,
  type EscenarioPago,
  type EstadoFiltro,
  type EstadoReserva,
  type GeocodeResult,
  type GeocodeSuggestion,
  type HostSpaceItem,
  type LoginRequest,
  type LoginResponse,
  type MyBookingsResponse,
  type PayRequest,
  type PayResponse,
  type RegisterRequest,
  type SearchParams,
  type SpaceDetail,
  type SpaceSummary,
  type UpdateSpaceRequest,
  type WompiCheckout,
  type WompiProcessRequest,
  type WompiProcessResponse,
} from '../types'
import { calcularMonto, calcularReembolso } from '../../lib/pricing'
import { hoursBetween } from '../../lib/time'
import { SEED_SPACES, SEED_USER, seedBookings } from './seed'

const HOLD_SECONDS = 600 // 10 minutos (RF-07)

interface MockBooking {
  id: string
  spaceId: string
  titulo: string
  direccion: string
  foto: string
  ciudad: string
  fecha: string
  desde: string
  hasta: string
  inicioISO: string
  finISO: string
  monto: number
  estado: EstadoReserva
  holdStart: number // epoch ms en que empezó la retención
  horasParaInicio: number
  reembolso?: number
}

function delay<T>(value: T, ms = 320): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`
}

// Registro de cuentas del mock (correo -> datos) para simular 409 en registro.
const cuentas = new Map<string, { nombre: string; rolAnfitrion: boolean }>()
cuentas.set(SEED_USER.email, { nombre: SEED_USER.nombre, rolAnfitrion: SEED_USER.rolAnfitrion })

interface MockAvailability {
  id: string
  spaceId: string
  fecha: string
  desde: string
  hasta: string
}

export class MockApiClient implements ApiClient {
  private spaces: SpaceDetail[] = SEED_SPACES.map((s) => ({ ...s }))
  private bookings: Map<string, MockBooking> = new Map()
  // Reservas que ya se muestran en "Mis reservas" (semilla del Figma).
  private listados: BookingListItem[] = seedBookings()
  // Disponibilidades gestionables por espacio. Se siembran de forma perezosa
  // a partir de los periodos del espacio la primera vez que se consultan.
  private availabilities: Map<string, MockAvailability[]> = new Map()
  private availSembrados = new Set<string>()

  // --- Auth -----------------------------------------------------------------

  async register(body: RegisterRequest): Promise<LoginResponse> {
    if (cuentas.has(body.email.toLowerCase())) {
      throw new ApiException(409, {
        code: 'email_exists',
        message: 'Este correo ya está registrado.',
        field: 'email',
      })
    }
    cuentas.set(body.email.toLowerCase(), { nombre: body.nombre, rolAnfitrion: false })
    return delay({
      token: uid('jwt'),
      user: { id: uid('u'), nombre: body.nombre, rolAnfitrion: false },
    })
  }

  async login(body: LoginRequest): Promise<LoginResponse> {
    // Credenciales vacías o contraseña con solo espacios => 401.
    const email = body.email.trim().toLowerCase()
    const password = body.password.trim()
    if (!email || !password) {
      throw new ApiException(401, { code: 'bad_credentials', message: 'Correo o contraseña incorrectos' })
    }
    // Solo cuentas conocidas (semilla o registradas en esta sesión) pueden entrar;
    // así el login de un correo inexistente devuelve 401, como el backend real.
    const existing = cuentas.get(email)
    if (!existing) {
      throw new ApiException(401, { code: 'bad_credentials', message: 'Correo o contraseña incorrectos' })
    }
    return delay({
      token: uid('jwt'),
      user: { id: SEED_USER.id, nombre: existing.nombre, rolAnfitrion: existing.rolAnfitrion },
    })
  }

  // --- Geocodificación ------------------------------------------------------

  async geocode(q: string): Promise<GeocodeResult> {
    return delay({ lat: 4.6097, lng: -74.0817, label: q || 'Bogotá' })
  }

  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    return delay({ lat, lng, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` })
  }

  async suggestAddresses(q: string): Promise<GeocodeSuggestion[]> {
    // En modo mock no hay geocoder real; devolvemos unas sugerencias de ejemplo.
    if (q.trim().length < 3) return delay([])
    const base = [
      { label: `${q} · Centro, Bogotá`, lat: 4.5981, lng: -74.0758 },
      { label: `${q} · Chapinero, Bogotá`, lat: 4.6486, lng: -74.0629 },
      { label: `${q} · Zona Norte, Bogotá`, lat: 4.69, lng: -74.05 },
    ]
    return delay(base)
  }

  // --- Búsqueda y espacios --------------------------------------------------

  async searchSpaces(params: SearchParams): Promise<SpaceSummary[]> {
    // Simula "sin resultados" cuando el radio es muy pequeño (< 1 km).
    if (params.radioKm < 1) return delay<SpaceSummary[]>([], 500)
    const list: SpaceSummary[] = this.spaces.map((s) => ({
      id: s.id,
      hostId: s.hostId,
      titulo: s.titulo,
      direccion: s.direccion,
      distanciaKm: s.distanciaKm,
      horario: s.horario,
      precioHora: s.precioHora,
      tipoVehiculo: s.tipoVehiculo,
      cubierto: s.cubierto,
      foto: s.foto,
      lat: s.lat,
      lng: s.lng,
    }))
    // Dentro del radio (todas nuestras semillas están cerca) y ordenadas por distancia.
    const filtered = list
      .filter((s) => s.distanciaKm <= params.radioKm)
      .sort((a, b) => a.distanciaKm - b.distanciaKm)
    return delay(filtered, 500)
  }

  async getSpace(id: string): Promise<SpaceDetail> {
    const s = this.spaces.find((x) => x.id === id)
    if (!s) throw new ApiException(404, { code: 'not_found', message: 'Espacio no encontrado.' })
    return delay({ ...s })
  }

  // --- Publicar -------------------------------------------------------------

  async createSpace(body: CreateSpaceRequest): Promise<CreateSpaceResponse> {
    // El traslape se valida en /spaces/{id}/availability; aquí asumimos
    // periodos ya validados en cliente. Creamos el espacio en memoria.
    const id = uid('sp')
    const primero = body.periodos[0]
    const nuevo: SpaceDetail = {
      id,
      hostId: SEED_USER.id,
      titulo: body.cubierto ? 'Parqueadero cubierto' : 'Parqueadero',
      direccion: body.direccion,
      distanciaKm: 0.5,
      horario: primero ? `${primero.desde} – ${primero.hasta}` : '—',
      precioHora: body.precioHora,
      tipoVehiculo: body.tipoVehiculo,
      cubierto: body.cubierto,
      foto: body.fotos[0] ?? SEED_SPACES[0].foto,
      lat: 4.61,
      lng: -74.08,
      descripcion: body.condiciones,
      fotos: body.fotos.length ? body.fotos : [SEED_SPACES[0].foto],
      periodos: body.periodos.map((p) => ({
        inicio: `${p.fecha}T${p.desde}`,
        fin: `${p.fecha}T${p.hasta}`,
      })),
      horarioApertura: primero
        ? { desde: primero.desde, hasta: primero.hasta }
        : { desde: '00:00', hasta: '23:59' },
    }
    this.spaces.push(nuevo)
    // Activa el rol anfitrión para la cuenta semilla (RF-03).
    const cuenta = cuentas.get(SEED_USER.email)
    const activadoAhora = cuenta ? !cuenta.rolAnfitrion : true
    if (cuenta) cuenta.rolAnfitrion = true
    return delay({ id, rolAnfitrionActivado: activadoAhora })
  }

  // --- Gestión de "Mis espacios" por el anfitrión ---------------------------

  /** Siembra (una sola vez por espacio) las disponibilidades a partir de sus periodos. */
  private seedAvailabilities(space: SpaceDetail): void {
    if (this.availSembrados.has(space.id)) return
    this.availSembrados.add(space.id)
    const lista: MockAvailability[] = space.periodos.map((p, i) => ({
      id: `${space.id}-av-${i}`,
      spaceId: space.id,
      fecha: p.inicio.slice(0, 10),
      desde: p.inicio.slice(11, 16),
      hasta: p.fin.slice(11, 16),
    }))
    this.availabilities.set(space.id, lista)
  }

  private availItem(a: MockAvailability): AvailabilityItem {
    const finMs = new Date(`${a.fecha}T${a.hasta}:00`).getTime()
    return { id: a.id, fecha: a.fecha, desde: a.desde, hasta: a.hasta, vencido: finMs <= Date.now() }
  }

  async mySpaces(): Promise<HostSpaceItem[]> {
    // En el mock todos los espacios pertenecen al usuario semilla (anfitrión).
    const items: HostSpaceItem[] = this.spaces.map((s) => {
      this.seedAvailabilities(s)
      const avails = this.availabilities.get(s.id) ?? []
      return {
        id: s.id,
        titulo: s.titulo,
        direccion: s.direccion,
        precioHora: s.precioHora,
        activo: (s as SpaceDetail & { activo?: boolean }).activo ?? true,
        foto: s.foto,
        periodosVigentes: avails.filter((a) => !this.availItem(a).vencido).length,
      }
    })
    return delay(items)
  }

  async updateSpace(id: string, body: UpdateSpaceRequest): Promise<void> {
    const s = this.spaces.find((x) => x.id === id)
    if (!s) throw new ApiException(404, { code: 'not_found', message: 'Espacio no encontrado.' })
    if (body.precioHora != null) s.precioHora = body.precioHora
    if (body.condiciones != null) s.descripcion = body.condiciones
    if (body.activo != null) (s as SpaceDetail & { activo?: boolean }).activo = body.activo
    return delay(undefined)
  }

  async deleteSpace(id: string): Promise<void> {
    this.spaces = this.spaces.filter((x) => x.id !== id)
    this.availabilities.delete(id)
    return delay(undefined)
  }

  async listAvailabilities(spaceId: string): Promise<AvailabilityItem[]> {
    const s = this.spaces.find((x) => x.id === spaceId)
    if (!s) throw new ApiException(404, { code: 'not_found', message: 'Espacio no encontrado.' })
    this.seedAvailabilities(s)
    const avails = this.availabilities.get(spaceId) ?? []
    return delay(avails.map((a) => this.availItem(a)))
  }

  async addAvailability(body: AddAvailabilityRequest): Promise<AvailabilityItem> {
    const s = this.spaces.find((x) => x.id === body.spaceId)
    if (!s) throw new ApiException(404, { code: 'not_found', message: 'Espacio no encontrado.' })
    this.seedAvailabilities(s)
    const avails = this.availabilities.get(body.spaceId) ?? []
    // RN-14: rechaza traslapes en el mismo día.
    const choque = avails.find(
      (a) =>
        a.fecha === body.fecha &&
        a.desde < body.hasta &&
        body.desde < a.hasta,
    )
    if (choque) {
      throw new ApiException(400, {
        code: 'availability_overlap',
        message: `El periodo se traslapa con ${choque.desde} – ${choque.hasta} del mismo día.`,
      })
    }
    const nuevo: MockAvailability = {
      id: uid('av'),
      spaceId: body.spaceId,
      fecha: body.fecha,
      desde: body.desde,
      hasta: body.hasta,
    }
    this.availabilities.set(body.spaceId, [...avails, nuevo])
    return delay(this.availItem(nuevo))
  }

  async addRecurringAvailability(
    body: AddRecurringAvailabilityRequest,
  ): Promise<AvailabilityItem[]> {
    const s = this.spaces.find((x) => x.id === body.spaceId)
    if (!s) throw new ApiException(404, { code: 'not_found', message: 'Espacio no encontrado.' })
    this.seedAvailabilities(s)
    const avails = this.availabilities.get(body.spaceId) ?? []

    const weekdayDeISO = (iso: string): number => {
      const [y, m, d] = iso.split('-').map(Number)
      return (new Date(y, m - 1, d).getDay() + 6) % 7 // 0=Lun..6=Dom
    }
    const sumarDia = (iso: string): string => {
      const [y, m, d] = iso.split('-').map(Number)
      const dt = new Date(y, m - 1, d + 1)
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    }

    const creados: MockAvailability[] = []
    const acumulado = [...avails]
    let actual = body.startDate
    let guard = 0
    while (actual <= body.endDate && guard < 3660) {
      guard += 1
      if (body.weekdays.includes(weekdayDeISO(actual))) {
        const choque = acumulado.find(
          (a) => a.fecha === actual && a.desde < body.hasta && body.desde < a.hasta,
        )
        if (!choque) {
          const nuevo: MockAvailability = {
            id: uid('av'),
            spaceId: body.spaceId,
            fecha: actual,
            desde: body.desde,
            hasta: body.hasta,
          }
          creados.push(nuevo)
          acumulado.push(nuevo)
        }
      }
      actual = sumarDia(actual)
    }

    if (creados.length === 0) {
      throw new ApiException(400, {
        code: 'availability_overlap',
        message: 'La regla recurrente no generó ningún bloque nuevo (revisa días, fechas y traslapes).',
      })
    }

    this.availabilities.set(body.spaceId, acumulado)
    return delay(creados.map((a) => this.availItem(a)))
  }

  async removeAvailability(id: string): Promise<void> {
    for (const [spaceId, avails] of this.availabilities) {
      if (avails.some((a) => a.id === id)) {
        this.availabilities.set(
          spaceId,
          avails.filter((a) => a.id !== id),
        )
        break
      }
    }
    return delay(undefined)
  }

  // --- Reservas y pago ------------------------------------------------------

  async createBooking(body: CreateBookingRequest): Promise<CreateBookingResponse> {
    const space = this.spaces.find((s) => s.id === body.spaceId)
    if (!space) throw new ApiException(404, { code: 'not_found', message: 'Espacio no encontrado.' })

    const desde = body.inicio.split('T')[1] ?? '00:00'
    const hasta = body.fin.split('T')[1] ?? '00:00'
    const fecha = body.inicio.split('T')[0]
    const monto = calcularMonto(space.precioHora, desde, hasta)
    const id = uid('r')
    const holdStart = Date.now()

    this.bookings.set(id, {
      id,
      spaceId: space.id,
      titulo: space.titulo,
      direccion: space.direccion,
      foto: space.foto,
      ciudad: 'Bogotá',
      fecha,
      desde,
      hasta,
      inicioISO: body.inicio,
      finISO: body.fin,
      monto,
      estado: 'PENDIENTE_PAGO',
      holdStart,
      horasParaInicio: 30,
    })

    return delay({
      id,
      expiresAt: new Date(holdStart + HOLD_SECONDS * 1000).toISOString(),
      monto,
    })
  }

  private secondsLeft(b: MockBooking): number {
    const elapsed = (Date.now() - b.holdStart) / 1000
    return Math.max(0, Math.round(HOLD_SECONDS - elapsed))
  }

  async payBooking(id: string, body: PayRequest): Promise<PayResponse> {
    const b = this.bookings.get(id)
    if (!b) throw new ApiException(404, { code: 'not_found', message: 'Reserva no encontrada.' })

    // Expiración perezosa: si venció la retención, la reserva expira (RF-07).
    if (this.secondsLeft(b) <= 0) {
      b.estado = 'EXPIRADA'
      return delay({ estado: b.estado })
    }

    const resultado: Record<EscenarioPago, EstadoReserva> = {
      APROBADO: 'CONFIRMADA',
      RECHAZADO: 'EXPIRADA',
      SIN_RESPUESTA: 'EXPIRADA',
    }
    b.estado = resultado[body.escenario]

    if (b.estado === 'CONFIRMADA') {
      // Aparece en "Mis reservas".
      this.listados.unshift({
        id: b.id,
        espacio: { id: b.spaceId, titulo: b.titulo, direccion: b.direccion, foto: b.foto },
        ciudad: b.ciudad,
        fecha: b.fecha,
        desde: b.desde,
        hasta: b.hasta,
        horas: hoursBetween(b.desde, b.hasta),
        monto: b.monto,
        estado: 'CONFIRMADA',
        motivo: 'Tu espacio está reservado',
        horasParaInicio: b.horasParaInicio,
      })
    }
    return delay({ estado: b.estado })
  }

  async wompiCheckout(id: string): Promise<WompiCheckout> {
    const b = this.bookings.get(id)
    if (!b) throw new ApiException(404, { code: 'not_found', message: 'Reserva no encontrada.' })
    return delay({
      publicKey: 'pub_test_mock',
      reference: `spazio-${id}-${Date.now()}`,
      amountInCents: Math.round(b.monto * 100),
      currency: 'COP',
      signature: 'mock-signature',
    })
  }

  async wompiProcess(id: string, body: WompiProcessRequest): Promise<WompiProcessResponse> {
    // En mock aprobamos siempre (no hay widget real).
    const res = await this.payBooking(id, { escenario: 'APROBADO' })
    void body
    return { estado: res.estado, wompiStatus: 'APPROVED' }
  }

  async getBooking(id: string): Promise<BookingStatus> {
    const b = this.bookings.get(id)
    if (!b) {
      // Puede ser una reserva ya listada (semilla o confirmada antes).
      const l = this.listados.find((x) => x.id === id)
      if (l) {
        return delay({
          id: l.id,
          estado: l.estado,
          segundosRestantes: 0,
          espacio: l.espacio,
          inicio: `${l.fecha}T${l.desde}`,
          fin: `${l.fecha}T${l.hasta}`,
          monto: l.monto,
        })
      }
      throw new ApiException(404, { code: 'not_found', message: 'Reserva no encontrada.' })
    }
    const segundos = this.secondsLeft(b)
    if (segundos <= 0 && b.estado === 'PENDIENTE_PAGO') b.estado = 'EXPIRADA'
    return delay({
      id: b.id,
      estado: b.estado,
      segundosRestantes: segundos,
      espacio: { id: b.spaceId, titulo: b.titulo, direccion: b.direccion, foto: b.foto },
      inicio: b.inicioISO,
      fin: b.finISO,
      monto: b.monto,
    })
  }

  async releaseHold(id: string): Promise<void> {
    const b = this.bookings.get(id)
    if (b && b.estado === 'PENDIENTE_PAGO') this.bookings.delete(id)
    return delay(undefined)
  }

  // --- Mis reservas y cancelación ------------------------------------------

  async myBookings(estado?: EstadoFiltro): Promise<MyBookingsResponse> {
    const all = this.listados
    const contadores = {
      todas: all.length,
      confirmada: all.filter((r) => r.estado === 'CONFIRMADA').length,
      cancelada: all.filter((r) => r.estado === 'CANCELADA').length,
      expirada: all.filter((r) => r.estado === 'EXPIRADA').length,
    }
    const items =
      !estado || estado === 'todas'
        ? all
        : all.filter((r) => r.estado === estado.toUpperCase())
    return delay({ items: [...items], contadores })
  }

  async cancelPreview(id: string): Promise<CancelPreviewResponse> {
    const r = this.listados.find((x) => x.id === id)
    if (!r) throw new ApiException(404, { code: 'not_found', message: 'Reserva no encontrada.' })
    const reembolso = calcularReembolso(r.monto, r.horasParaInicio)
    return delay({ pct: reembolso.pct, monto: reembolso.monto, horasParaInicio: r.horasParaInicio })
  }

  async cancelBooking(id: string): Promise<CancelResponse> {
    const r = this.listados.find((x) => x.id === id)
    if (!r) throw new ApiException(404, { code: 'not_found', message: 'Reserva no encontrada.' })
    const reembolso = calcularReembolso(r.monto, r.horasParaInicio)
    r.estado = 'CANCELADA'
    r.motivo = reembolso.pct === 100 ? 'Reembolso 100% aplicado' : 'Sin reembolso (menos de 24 h)'
    return delay({ estado: 'CANCELADA', reembolso: reembolso.monto })
  }
}
