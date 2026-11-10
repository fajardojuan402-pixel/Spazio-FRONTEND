import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Info, ShieldCheck } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Stepper from '../components/layout/Stepper'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import Skeleton from '../components/ui/Skeleton'
import Countdown from '../components/ui/Countdown'
import ReservaResumen from '../features/booking/ReservaResumen'
import { useBooking, useReleaseHold } from '../hooks/queries'
import { api } from '../api/client'
import { useToast } from '../components/ui/toast'
import { formatCOP } from '../lib/format'
import type { WompiTransaction } from '../features/booking/wompi'

/**
 * P-05 Pago con Wompi (sandbox) (RF-06, RF-07). Abre el widget oficial de Wompi
 * con los datos firmados por el backend; al terminar, el backend verifica la
 * transacción y confirma o libera la reserva. El pago es de prueba (sandbox).
 */
export default function Payment() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: booking, isLoading, isError } = useBooking(bookingId)
  const releaseHold = useReleaseHold()
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    if (booking?.estado === 'EXPIRADA') {
      navigate(`/confirmacion/${bookingId}?resultado=EXPIRADA`, { replace: true })
    }
  }, [booking?.estado, bookingId, navigate])

  if (isLoading) {
    return (
      <Layout wide>
        <Skeleton className="h-6 w-80" />
        <Skeleton className="mt-6 h-64 w-full" />
      </Layout>
    )
  }

  if (isError || !booking) {
    return (
      <Layout wide>
        <Alert tone="danger" title="No encontramos la reserva">
          Es posible que la retención haya expirado.
        </Alert>
        <Link to="/buscar" className="btn-ghost mt-4">Buscar un espacio</Link>
      </Layout>
    )
  }

  const procesarResultado = async (tx: WompiTransaction | undefined) => {
    if (!tx) {
      // El usuario cerró el widget sin pagar: seguimos en la pantalla.
      setProcesando(false)
      return
    }
    try {
      const res = await api.wompiProcess(booking.id, {
        transactionId: tx.id,
        paymentMethod: tx.payment_method_type,
      })
      navigate(`/confirmacion/${booking.id}?resultado=${res.estado}`)
    } catch {
      toast.show('No pudimos verificar el pago. Inténtalo de nuevo.', 'danger')
      setProcesando(false)
    }
  }

  const onPagarWompi = async () => {
    setProcesando(true)
    try {
      if (typeof window.WidgetCheckout === 'undefined') {
        toast.show('No se pudo cargar el widget de pago. Revisa tu conexión.', 'danger')
        setProcesando(false)
        return
      }
      // El backend firma la transacción (no exponemos el integrity secret).
      const cfg = await api.wompiCheckout(booking.id)
      const checkout = new window.WidgetCheckout({
        currency: cfg.currency,
        amountInCents: cfg.amountInCents,
        reference: cfg.reference,
        publicKey: cfg.publicKey,
        signature: { integrity: cfg.signature },
      })
      checkout.open((result) => {
        void procesarResultado(result.transaction)
      })
    } catch {
      toast.show('No pudimos iniciar el pago. Inténtalo de nuevo.', 'danger')
      setProcesando(false)
    }
  }

  const onCambiarHorario = async () => {
    await releaseHold.mutateAsync(booking.id)
    navigate(`/espacio/${booking.espacio.id}`)
  }

  return (
    <Layout wide>
      <div className="mb-6 w-full max-w-2xl">
        <Stepper current={2} />
      </div>

      <p className="eyebrow">Reserva sin sorpresas</p>
      <h1 className="mt-2 text-4xl font-extrabold text-ink">Completa tu reserva</h1>
      <p className="mt-3 text-subtle">Paga de forma segura con Wompi para confirmar tu espacio.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(0,380px)]">
        <div>
          <Alert tone="sim" title="Pago de prueba (Wompi sandbox): no se cobra dinero real">
            Estás en el ambiente de pruebas de Wompi. Usa una tarjeta de prueba, por ejemplo{' '}
            <strong>4242 4242 4242 4242</strong>, cualquier fecha futura y CVC de 3 dígitos para un
            pago aprobado. La tarjeta <strong>4111 1111 1111 1111</strong> simula un rechazo.
          </Alert>

          <div className="card mt-6 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-ink">Pagar con Wompi</h2>
              <Badge tone="warn">Sandbox</Badge>
            </div>
            <p className="mt-2 text-subtle">
              Al pulsar el botón se abre la ventana de pago de Wompi, donde puedes pagar con
              tarjeta, PSE o Nequi. No guardamos datos de tu tarjeta.
            </p>

            <div className="mt-5 flex items-center justify-between rounded-lg bg-canvas p-4">
              <span className="font-semibold text-ink">Total a pagar</span>
              <span className="text-2xl font-extrabold text-teal">{formatCOP(booking.monto)}</span>
            </div>

            <hr className="my-5 border-line" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={onCambiarHorario}
                className="flex min-h-touch items-center gap-2 text-sm font-semibold text-teal hover:underline"
              >
                <ArrowLeft size={16} /> Cambiar horario
              </button>
              <Button onClick={onPagarWompi} loading={procesando} leftIcon={<ShieldCheck size={18} />}>
                Pagar {formatCOP(booking.monto)} con Wompi
              </Button>
            </div>
          </div>

          {/* Temporizador de retención */}
          <div className="mt-6 flex items-center justify-between rounded-xl bg-teal-soft p-5">
            <div>
              <p className="font-bold text-ink">Guardamos tu horario durante 10 minutos</p>
              <p className="mt-1 text-sm text-subtle">
                Si el tiempo termina sin completar el pago, la reserva expira y el periodo queda liberado.
              </p>
            </div>
            <Countdown
              initialSeconds={booking.segundosRestantes}
              onExpire={() => navigate(`/confirmacion/${booking.id}?resultado=EXPIRADA`)}
              onResync={async () => {
                const fresh = await api.getBooking(booking.id)
                return fresh.segundosRestantes
              }}
            />
          </div>
        </div>

        <aside className="h-fit lg:sticky lg:top-28">
          <ReservaResumen booking={booking} />
          <p className="mt-4 flex items-center gap-2 text-sm text-warn">
            <Info size={16} /> Pago de prueba de Wompi. No hay un cobro real.
          </p>
        </aside>
      </div>
    </Layout>
  )
}
