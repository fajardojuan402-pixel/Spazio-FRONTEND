import { Clock } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import { useCancelPreview } from '../../hooks/queries'
import { formatCOP, formatShortDate } from '../../lib/format'
import type { BookingListItem } from '../../api/types'

/**
 * P-08 Modal "¿Cancelar esta reserva?" (RF-08, RN-12). Al abrir llama a
 * /cancel/preview y muestra el reembolso aplicable: 100% con 24 h o más,
 * 0% con menos de 24 h. La confirmación es irreversible y libera el periodo.
 */
export default function CancelModal({
  reserva,
  open,
  onClose,
  onConfirm,
  confirmando,
}: {
  reserva: BookingListItem
  open: boolean
  onClose: () => void
  onConfirm: () => void
  confirmando: boolean
}) {
  const { data: preview, isLoading } = useCancelPreview(reserva.id, open)
  const reembolso100 = (preview?.pct ?? 0) === 100

  return (
    <Modal open={open} onClose={onClose} title="¿Cancelar esta reserva?">
      <p className="text-subtle">
        Revisa el reembolso antes de continuar. Al confirmar, tu horario dejará de estar reservado y
        no se puede deshacer.
      </p>

      <div className="mt-5 rounded-lg bg-canvas p-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-ink">{reserva.espacio.titulo}</p>
          <Badge tone="success">CONFIRMADA</Badge>
        </div>
        <p className="mt-1 text-sm text-subtle">
          {formatShortDate(reserva.fecha)} · {reserva.desde} – {reserva.hasta}
        </p>
        {!isLoading && preview && (
          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-teal">
            <Clock size={16} /> Inicia en {preview.horasParaInicio} h ·{' '}
            {reembolso100 ? '24 h o más' : 'Menos de 24 h'}
          </p>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-24 w-full" />
      ) : (
        <div className={`mt-4 flex items-center justify-between rounded-lg p-5 ${reembolso100 ? 'bg-success-soft' : 'bg-warn-soft'}`}>
          <div>
            <p className={`font-bold ${reembolso100 ? 'text-success' : 'text-warn'}`}>
              Reembolso: {preview?.pct ?? 0}%
            </p>
            <p className={`mt-0.5 text-sm ${reembolso100 ? 'text-success' : 'text-warn'}`}>
              Cancelación con {reembolso100 ? '24 h o más' : 'menos de 24 h'}
            </p>
            <p className={`mt-2 text-sm ${reembolso100 ? 'text-success/90' : 'text-warn/90'}`}>
              Reembolso simulado en COP. No se mueve dinero real.
            </p>
          </div>
          <p className={`text-3xl font-extrabold ${reembolso100 ? 'text-success' : 'text-warn'}`}>
            {formatCOP(preview?.monto ?? 0)}
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={onClose}>Volver</Button>
        <Button variant="danger" onClick={onConfirm} loading={confirmando}>
          Confirmar cancelación
        </Button>
      </div>
    </Modal>
  )
}
