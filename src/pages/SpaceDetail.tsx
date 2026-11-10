import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, CalendarX, Car, Clock, Images, MapPin } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Stepper from '../components/layout/Stepper'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Alert from '../components/ui/Alert'
import Skeleton from '../components/ui/Skeleton'
import { useSpace, useCreateBooking } from '../hooks/queries'
import { formatCOP, formatLongDate } from '../lib/format'
import { calcularMonto } from '../lib/pricing'
import { hoursBetween, hoyISO, isWholeHours, validarHorario } from '../lib/time'
import { ApiException } from '../api/types'

/**
 * P-04 Detalle del espacio (RF-06). Galería ("Foto 1 de 3", clic cambia la
 * principal), monto desglosado en vivo, validación de horario (dentro del
 * horario del espacio y salida > entrada; solo horas completas). El botón
 * "Reservar y pagar" se deshabilita si la selección no es válida.
 */
export default function SpaceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: space, isLoading, isError, refetch } = useSpace(id)
  const crearReserva = useCreateBooking()

  const [principal, setPrincipal] = useState(0)
  const [fecha, setFecha] = useState(hoyISO())
  const [desde, setDesde] = useState('10:00')
  const [hasta, setHasta] = useState('13:00')
  const [conflicto, setConflicto] = useState(false)

  // Al cargar el espacio, propone por defecto la fecha del primer periodo
  // disponible (su parte "YYYY-MM-DD"), para que la reserva caiga dentro del
  // horario real y no quede en una fecha pasada.
  useEffect(() => {
    const primer = space?.periodos?.[0]
    if (primer?.inicio) {
      setFecha(primer.inicio.slice(0, 10))
    }
  }, [space])

  if (isLoading) {
    return (
      <Layout wide>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-6 h-10 w-72" />
        <Skeleton className="mt-6 h-[420px] w-full" />
      </Layout>
    )
  }

  if (isError || !space) {
    return (
      <Layout wide>
        <Alert tone="danger" title="No pudimos cargar el espacio">
          Inténtalo de nuevo.
          <div className="mt-3">
            <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
          </div>
        </Alert>
        <Link to="/buscar" className="btn-ghost mt-4">Volver a resultados</Link>
      </Layout>
    )
  }

  const { desde: openFrom, hasta: openTo } = space.horarioApertura
  const validacion = validarHorario(desde, hasta, openFrom, openTo)
  const horasCompletas = isWholeHours(desde, hasta)
  const horas = hoursBetween(desde, hasta)
  const total = calcularMonto(space.precioHora, desde, hasta)
  const valido = validacion.ok && horasCompletas

  const onReservar = async () => {
    if (!valido) return
    setConflicto(false)
    try {
      const booking = await crearReserva.mutateAsync({
        spaceId: space.id,
        inicio: `${fecha}T${desde}`,
        fin: `${fecha}T${hasta}`,
      })
      navigate(`/pago/${booking.id}`)
    } catch (e) {
      if (e instanceof ApiException && e.status === 409) {
        setConflicto(true)
      } else {
        setConflicto(true)
      }
    }
  }

  return (
    <Layout wide>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link to="/buscar" className="flex min-h-touch items-center gap-2 text-sm font-semibold text-teal hover:underline">
          <ArrowLeft size={18} /> Volver a resultados
        </Link>
        <div className="w-full max-w-md lg:w-auto">
          <Stepper current={1} />
        </div>
      </div>

      <h1 className="text-4xl font-extrabold text-ink">{space.titulo}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-subtle">
        <MapPin size={18} className="text-teal" />
        {space.direccion} · Bogotá
        <span className="text-teal">· A {space.distanciaKm.toLocaleString('es-CO')} km de tu búsqueda</span>
      </p>

      {/* Galería: foto principal con relación de aspecto fija + tira de miniaturas */}
      <div className="mt-6">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl">
          <img src={space.fotos[principal]} alt={space.titulo} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-semibold text-ink">
            <Images size={16} /> Foto {principal + 1} de {space.fotos.length}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {space.fotos.slice(0, 3).map((p, i) => (
            <button
              key={i}
              onClick={() => setPrincipal(i)}
              className={`relative aspect-[4/3] overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal ${
                i === principal ? 'ring-2 ring-teal' : ''
              }`}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === principal}
            >
              <img src={p} alt={`Vista ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_minmax(0,380px)]">
        {/* Info */}
        <div>
          <div className="flex flex-wrap gap-2">
            <span className="chip capitalize">{space.tipoVehiculo}</span>
            {space.cubierto && <span className="chip">Cubierto</span>}
            <span className="chip">{space.horario}</span>
          </div>

          <h2 className="mt-6 text-2xl font-bold text-ink">Un espacio cerca de todo</h2>
          <p className="mt-3 leading-relaxed text-subtle">{space.descripcion}</p>

          <hr className="my-7 border-line" />

          <h3 className="text-xl font-bold text-ink">Antes de llegar</h3>
          <ul className="mt-4 space-y-5">
            <Feature icon={<Car size={20} />} title="Espacio para carro">Acceso para un vehículo por reserva.</Feature>
            <Feature icon={<Clock size={20} />} title="Respeta tu horario">Entrada y salida dentro del periodo reservado.</Feature>
            <Feature icon={<CalendarX size={20} />} title="Cancelación con anticipación">Si faltan 24 horas o más, recibes el 100% del monto.</Feature>
          </ul>
        </div>

        {/* Tarjeta de reserva */}
        <aside className="card h-fit p-6">
          <div className="flex items-start justify-between">
            <p className="text-3xl font-extrabold text-teal">
              {formatCOP(space.precioHora)}
              <span className="text-sm font-semibold text-subtle"> COP / hora</span>
            </p>
            <Badge tone="success">Disponible</Badge>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="fecha">Fecha de la reserva</label>
            <div className="relative">
              <input id="fecha" className="w-full rounded-lg border border-line bg-white px-4 py-3 pr-11 text-sm" value={formatLongDate(fecha)} readOnly />
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Seleccionar fecha" />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-subtle"><CalendarDays size={20} /></span>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <TimeField id="desde" label="Hora de entrada" value={desde} onChange={setDesde} />
            <TimeField id="hasta" label="Hora de salida" value={hasta} onChange={setHasta} />
          </div>

          <div className="mt-6 rounded-lg bg-canvas p-4">
            <div className="flex items-center justify-between text-sm text-subtle">
              <span>{horas > 0 ? `${horas} hora${horas !== 1 ? 's' : ''}` : '—'} × {formatCOP(space.precioHora)}</span>
              <span>{formatCOP(total)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-semibold text-ink">Total (COP)</span>
              <span className="text-2xl font-extrabold text-teal">{formatCOP(total)}</span>
            </div>
          </div>

          {!validacion.ok && <p className="mt-3 text-sm text-danger">{validacion.motivo}</p>}
          {validacion.ok && !horasCompletas && (
            <p className="mt-3 text-sm text-danger">Elige horas completas (en punto).</p>
          )}
          {conflicto && (
            <Alert tone="danger" className="mt-3">
              Ese horario ya no está disponible. Elige otro horario.
            </Alert>
          )}

          <Button
            onClick={onReservar}
            disabled={!valido}
            loading={crearReserva.isPending}
            className="mt-5 w-full py-3.5 text-base"
            rightIcon={<ArrowRight size={18} />}
          >
            Reservar y pagar
          </Button>
          <p className="mt-3 text-center text-sm text-subtle">No se cobra ahora. El monto está visible antes de pagar.</p>
        </aside>
      </div>
    </Layout>
  )
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3.5">
      <span className="mt-0.5 flex-none text-teal">{icon}</span>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-sm text-subtle">{children}</p>
      </div>
    </li>
  )
}

function TimeField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-ink" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type="time"
          step={3600}
          className="w-full rounded-lg border border-line bg-white px-4 py-3 pr-10 text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-subtle"><Clock size={18} /></span>
      </div>
    </div>
  )
}
