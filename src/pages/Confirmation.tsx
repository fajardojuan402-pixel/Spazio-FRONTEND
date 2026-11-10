import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Timer, XCircle } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Stepper from '../components/layout/Stepper'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Skeleton from '../components/ui/Skeleton'
import ReservaResumen from '../features/booking/ReservaResumen'
import { useBooking } from '../hooks/queries'
import { formatCOP, formatLongDate } from '../lib/format'
import type { EstadoReserva } from '../api/types'

/**
 * P-06 Confirmación (RF-07). Muestra UNA sola variante a la vez según el
 * resultado del pago: CONFIRMADA, RECHAZADO/ERROR (pago no completado) o
 * EXPIRADA. Nunca se muestran los tres resultados juntos.
 */
export default function Confirmation() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const resultado = (params.get('resultado') ?? 'CONFIRMADA') as EstadoReserva
  const { data: booking, isLoading } = useBooking(bookingId)

  if (isLoading || !booking) {
    return (
      <Layout wide>
        <Skeleton className="h-6 w-80" />
        <Skeleton className="mt-6 h-72 w-full" />
      </Layout>
    )
  }

  const confirmada = resultado === 'CONFIRMADA'
  const expirada = resultado === 'EXPIRADA'
  // Rechazado/sin respuesta => "pago no completado".
  const fallido = !confirmada && !expirada

  const fecha = booking.inicio.split('T')[0]
  const desde = booking.inicio.split('T')[1] ?? ''
  const hasta = booking.fin.split('T')[1] ?? ''

  return (
    <Layout wide>
      <div className="mb-6 w-full max-w-2xl">
        <Stepper current={3} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,380px)]">
        <div>
          {confirmada && (
            <div className="card p-10 text-center">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-soft text-success">
                <Check size={36} />
              </span>
              <div className="mt-5">
                <Badge tone="success">CONFIRMADA</Badge>
              </div>
              <h1 className="mt-4 text-4xl font-extrabold text-ink">¡Reserva confirmada!</h1>
              <p className="mx-auto mt-3 max-w-md text-subtle">
                Tu espacio en {booking.espacio.titulo} está listo. Consulta los detalles y gestiona
                tu reserva desde Mis reservas.
              </p>

              <div className="mt-6 grid gap-4 rounded-lg bg-canvas p-5 text-left sm:grid-cols-3">
                <Cell label="Fecha" value={formatLongDate(fecha)} />
                <Cell label="Entrada y salida" value={`${desde} – ${hasta}`} center />
                <Cell label="Monto (COP)" value={formatCOP(booking.monto)} right teal />
              </div>

              <Button onClick={() => navigate('/mis-reservas')} className="mt-7" rightIcon={<ArrowRight size={18} />}>
                Ver mis reservas
              </Button>
              <div className="mt-4">
                <Link to="/buscar" className="font-semibold text-teal hover:underline">Buscar otro espacio</Link>
              </div>
              <p className="mt-4 text-sm text-warn">Resultado de un pago simulado. No se cobró dinero real.</p>
            </div>
          )}

          {fallido && (
            <div className="card p-10 text-center">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-danger-soft text-danger">
                <XCircle size={36} />
              </span>
              <div className="mt-5">
                <Badge tone="danger">RECHAZADO / ERROR</Badge>
              </div>
              <h1 className="mt-4 text-4xl font-extrabold text-ink">No se completó el pago</h1>
              <p className="mx-auto mt-3 max-w-md text-subtle">
                El pago fue rechazado o no hubo respuesta. La reserva no está confirmada. Puedes
                volver al pago simulado mientras siga vigente la retención.
              </p>
              {booking.segundosRestantes > 0 ? (
                <Button onClick={() => navigate(`/pago/${booking.id}`)} className="mt-7" rightIcon={<ArrowRight size={18} />}>
                  Volver al pago simulado
                </Button>
              ) : (
                <Button onClick={() => navigate('/buscar')} className="mt-7" rightIcon={<ArrowRight size={18} />}>
                  Buscar otro horario
                </Button>
              )}
              <p className="mt-4 text-sm text-warn">Resultado de un pago simulado. No se cobró dinero real.</p>
            </div>
          )}

          {expirada && (
            <div className="card p-10 text-center">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-warn-soft text-warn">
                <Timer size={36} />
              </span>
              <div className="mt-5">
                <Badge tone="warn">EXPIRADA</Badge>
              </div>
              <h1 className="mt-4 text-4xl font-extrabold text-ink">Tu reserva expiró</h1>
              <p className="mx-auto mt-3 max-w-md text-subtle">
                Terminó la retención de 10 minutos. El periodo quedó liberado; selecciona un horario
                disponible para volver a reservar.
              </p>
              <Button onClick={() => navigate('/buscar')} className="mt-7" rightIcon={<ArrowRight size={18} />}>
                Buscar otro horario
              </Button>
            </div>
          )}
        </div>

        <aside className="h-fit lg:sticky lg:top-28">
          <ReservaResumen booking={booking} montoLabel={confirmada ? 'Monto confirmado' : 'Monto estimado'} />
        </aside>
      </div>
    </Layout>
  )
}

function Cell({ label, value, center, right, teal }: { label: string; value: string; center?: boolean; right?: boolean; teal?: boolean }) {
  return (
    <div className={center ? 'sm:text-center' : right ? 'sm:text-right' : ''}>
      <p className="text-xs text-subtle">{label}</p>
      <p className={`mt-1 font-bold ${teal ? 'text-teal' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
