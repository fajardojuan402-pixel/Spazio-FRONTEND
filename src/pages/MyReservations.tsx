import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarX, CircleCheck, Search as SearchIcon, Timer } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import Alert from '../components/ui/Alert'
import EmptyState from '../components/ui/EmptyState'
import CancelModal from '../features/booking/CancelModal'
import { useMyBookings, useCancelBooking } from '../hooks/queries'
import { useToast } from '../components/ui/toast'
import { formatCOP, formatShortDate } from '../lib/format'
import type { BookingListItem, EstadoFiltro, EstadoReserva } from '../api/types'

const STATUS_META: Record<EstadoReserva, { label: string; tone: 'success' | 'muted' | 'warn' | 'teal' }> = {
  CONFIRMADA: { label: 'CONFIRMADA', tone: 'success' },
  CANCELADA: { label: 'CANCELADA', tone: 'muted' },
  EXPIRADA: { label: 'EXPIRADA', tone: 'warn' },
  PENDIENTE_PAGO: { label: 'PENDIENTE DE PAGO', tone: 'teal' },
  FINALIZADA: { label: 'FINALIZADA', tone: 'muted' },
}

const FILTROS: { id: EstadoFiltro; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'confirmada', label: 'Confirmadas' },
  { id: 'cancelada', label: 'Canceladas' },
  { id: 'expirada', label: 'Expiradas' },
]

/**
 * P-07 Mis reservas (RF-15). Tarjetas de resumen con contadores reales,
 * tabs-filtro funcionales, tabla (que pasa a tarjetas en móvil, RNF-04),
 * banner "Cancela con claridad" y estado vacío. Abre el modal de cancelación.
 */
export default function MyReservations() {
  const [filtro, setFiltro] = useState<EstadoFiltro>('todas')
  const { data, isLoading, isError, refetch } = useMyBookings(filtro)
  const cancelar = useCancelBooking()
  const toast = useToast()
  const [aCancelar, setACancelar] = useState<BookingListItem | null>(null)

  const contadores = data?.contadores ?? { todas: 0, confirmada: 0, cancelada: 0, expirada: 0 }
  const items = data?.items ?? []

  const confirmarCancelacion = async () => {
    if (!aCancelar) return
    try {
      const res = await cancelar.mutateAsync(aCancelar.id)
      toast.show(
        res.reembolso > 0
          ? `Reserva cancelada · Reembolso ${formatCOP(res.reembolso)}`
          : 'Reserva cancelada · Sin reembolso (menos de 24 h)',
        'success',
      )
      setACancelar(null)
    } catch {
      toast.show('No pudimos cancelar la reserva. Inténtalo de nuevo.', 'danger')
    }
  }

  return (
    <Layout wide>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Tu actividad</p>
          <h1 className="mt-2 text-4xl font-extrabold text-ink">Mis reservas</h1>
          <p className="mt-3 max-w-xl text-subtle">
            Consulta tus horarios, revisa el estado de cada reserva y gestiona tus cancelaciones.
          </p>
        </div>
        <Link to="/buscar" className="btn-primary">
          Buscar parqueadero <SearchIcon size={18} />
        </Link>
      </div>

      {/* Tarjetas de resumen */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <SummaryCard icon={<CalendarCheck size={22} />} count={contadores.confirmada} title="Reserva confirmada" note="Tu próximo espacio" />
        <SummaryCard icon={<CircleCheck size={22} />} count={contadores.cancelada} title="Reserva cancelada" note="Reembolso según anticipación" />
        <SummaryCard icon={<Timer size={22} />} count={contadores.expirada} title="Reserva expirada" note="Periodo liberado" />
      </div>

      {/* Tabla / listado */}
      <Card className="mt-8 overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-line p-5" role="tablist" aria-label="Filtrar reservas">
          {FILTROS.map((f) => {
            const n = f.id === 'todas' ? contadores.todas : contadores[f.id]
            const active = filtro === f.id
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={active}
                onClick={() => setFiltro(f.id)}
                className={`min-h-touch rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  active ? 'bg-teal-soft text-teal' : 'text-subtle hover:text-ink'
                }`}
              >
                {f.label} · {n}
              </button>
            )
          })}
        </div>

        {isError ? (
          <div className="p-6">
            <Alert tone="danger" title="No pudimos cargar tus reservas">
              <div className="mt-3">
                <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
              </div>
            </Alert>
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Aún no tienes reservas aquí"
              description="Cuando reserves un parqueadero, aparecerá en esta lista."
              actions={<Link to="/buscar" className="btn-primary">Buscar parqueadero</Link>}
            />
          </div>
        ) : (
          <>
            {/* Tabla en escritorio */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-subtle">
                    <th className="px-5 py-4">Parqueadero</th>
                    <th className="px-5 py-4">Fecha</th>
                    <th className="px-5 py-4">Horario</th>
                    <th className="px-5 py-4">Monto</th>
                    <th className="px-5 py-4">Estado</th>
                    <th className="px-5 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-line last:border-0">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img src={r.espacio.foto} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" />
                          <div>
                            <p className="font-bold text-ink">{r.espacio.titulo}</p>
                            <p className="text-sm text-subtle">{r.espacio.direccion}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-ink">{formatShortDate(r.fecha)}</p>
                        <p className="text-sm text-subtle">{r.ciudad}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-ink">{r.desde} – {r.hasta}</p>
                        <p className="text-sm text-subtle">{r.horas} hora{r.horas !== 1 ? 's' : ''}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-ink">{r.monto ? formatCOP(r.monto) : '—'}</p>
                        <p className="text-sm text-subtle">COP</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={STATUS_META[r.estado].tone}>{STATUS_META[r.estado].label}</Badge>
                        {r.motivo && (
                          <p className={`mt-1 text-sm ${r.estado === 'CANCELADA' ? 'text-success' : 'text-subtle'}`}>{r.motivo}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {r.estado === 'CONFIRMADA' ? (
                          <button onClick={() => setACancelar(r)} className="btn-outline px-4 py-2 text-sm">Cancelar</button>
                        ) : (
                          <button className="text-sm font-semibold text-teal hover:underline">Ver detalles</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas en móvil (RNF-04) */}
            <div className="space-y-3 p-4 md:hidden">
              {items.map((r) => (
                <div key={r.id} className="rounded-lg border border-line p-4">
                  <div className="flex items-center gap-3">
                    <img src={r.espacio.foto} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">{r.espacio.titulo}</p>
                      <p className="text-sm text-subtle">{formatShortDate(r.fecha)} · {r.desde} – {r.hasta}</p>
                    </div>
                    <Badge tone={STATUS_META[r.estado].tone}>{STATUS_META[r.estado].label}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-semibold text-ink">{r.monto ? formatCOP(r.monto) : '—'} COP</span>
                    {r.estado === 'CONFIRMADA' ? (
                      <button onClick={() => setACancelar(r)} className="btn-outline px-4 py-2 text-sm">Cancelar</button>
                    ) : (
                      <span className="text-sm text-subtle">{r.motivo}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-teal-soft p-5">
        <CalendarX size={20} className="mt-0.5 text-teal" />
        <div>
          <p className="font-bold text-ink">Cancela con claridad</p>
          <p className="mt-1 text-sm text-teal-700/90">
            Antes de confirmar una cancelación verás el reembolso aplicable. Si tu reserva empieza
            en 24 horas o más, el reembolso es del 100%.
          </p>
        </div>
      </div>

      {aCancelar && (
        <CancelModal
          reserva={aCancelar}
          open={!!aCancelar}
          onClose={() => setACancelar(null)}
          onConfirm={confirmarCancelacion}
          confirmando={cancelar.isPending}
        />
      )}
    </Layout>
  )
}

function SummaryCard({ icon, count, title, note }: { icon: React.ReactNode; count: number; title: string; note: string }) {
  return (
    <div className="card flex items-center gap-4 p-6">
      <span className="flex h-12 w-12 flex-none items-center justify-center rounded-lg bg-teal-soft text-teal">{icon}</span>
      <div>
        <p className="font-bold text-ink">{count} · {title}</p>
        <p className="text-sm text-subtle">{note}</p>
      </div>
    </div>
  )
}
