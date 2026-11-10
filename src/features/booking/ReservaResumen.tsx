import type { BookingStatus } from '../../api/types'
import { formatCOP, formatLongDate } from '../../lib/format'
import { hoursBetween } from '../../lib/time'

/**
 * Panel lateral "Tu reserva" reutilizado en P-05 (pago) y P-06 (confirmación).
 */
export default function ReservaResumen({
  booking,
  montoLabel = 'Total de la reserva',
}: {
  booking: BookingStatus
  montoLabel?: string
}) {
  const fecha = booking.inicio.split('T')[0]
  const desde = booking.inicio.split('T')[1] ?? ''
  const hasta = booking.fin.split('T')[1] ?? ''
  const horas = hoursBetween(desde, hasta)

  return (
    <div className="card p-6">
      <h3 className="text-xl font-bold text-ink">Tu reserva</h3>
      <img
        src={booking.espacio.foto}
        alt={booking.espacio.titulo}
        className="mt-4 h-40 w-full rounded-lg object-cover"
      />
      <p className="mt-4 text-lg font-bold text-ink">{booking.espacio.titulo}</p>
      <p className="text-sm text-subtle">{booking.espacio.direccion} · Bogotá</p>

      <dl className="mt-5 space-y-3 text-sm">
        <Row label="Fecha" value={formatLongDate(fecha)} />
        <Row label="Horario" value={`${desde} – ${hasta}`} />
        <Row label="Duración" value={`${horas} hora${horas !== 1 ? 's' : ''}`} />
        <Row label="Tarifa por hora" value={`${formatCOP(booking.monto / Math.max(1, horas))} COP`} />
      </dl>

      <hr className="my-5 border-line" />
      <div className="flex items-center justify-between">
        <span className="font-bold text-ink">{montoLabel}</span>
        <span className="text-2xl font-extrabold text-teal">{formatCOP(booking.monto)}</span>
      </div>
      <p className="mt-1 text-right text-xs text-subtle">Pesos colombianos (COP)</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-subtle">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  )
}
