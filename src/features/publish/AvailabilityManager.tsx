import { useState } from 'react'
import { CalendarDays, Clock, Plus, Trash2 } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Alert from '../../components/ui/Alert'
import type { PeriodoInput } from '../../api/types'
import { formatShortDate } from '../../lib/format'
import { hoyISO, periodsOverlap, toMinutes } from '../../lib/time'

interface OverlapError {
  tipo: 'traslape' | 'invalido'
  nuevo?: { desde: string; hasta: string }
  conflicto?: { desde: string; hasta: string }
}

/**
 * Gestor de periodos de disponibilidad (RF-05, RN-14): lista con papelera y
 * formulario Fecha/Desde/Hasta. Valida en cliente que no se traslapen (mismo día)
 * y rechaza el periodo con un mensaje que identifica el conflicto exacto.
 */
export default function AvailabilityManager({
  periodos,
  onChange,
}: {
  periodos: PeriodoInput[]
  onChange: (p: PeriodoInput[]) => void
}) {
  const [fecha, setFecha] = useState(hoyISO())
  const [desde, setDesde] = useState('10:00')
  const [hasta, setHasta] = useState('13:00')
  const [error, setError] = useState<OverlapError | null>(null)

  const agregar = () => {
    setError(null)
    if (toMinutes(hasta) <= toMinutes(desde)) {
      setError({ tipo: 'invalido' })
      return
    }
    const choque = periodos.find(
      (p) => p.fecha === fecha && periodsOverlap(p.desde, p.hasta, desde, hasta),
    )
    if (choque) {
      setError({
        tipo: 'traslape',
        nuevo: { desde, hasta },
        conflicto: { desde: choque.desde, hasta: choque.hasta },
      })
      return
    }
    onChange([...periodos, { fecha, desde, hasta }])
  }

  const quitar = (idx: number) => onChange(periodos.filter((_, i) => i !== idx))

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink">Disponibilidad</h2>
        <Badge tone="teal">
          {periodos.length} periodo{periodos.length !== 1 ? 's' : ''} agregado
          {periodos.length !== 1 ? 's' : ''}
        </Badge>
      </div>
      <p className="mt-2 text-subtle">Agrega los periodos en los que se puede reservar tu parqueadero.</p>

      <div className="mt-5 space-y-3">
        {periodos.map((p, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-canvas px-4 py-3">
            <span className="flex items-center gap-3 font-semibold text-ink">
              <CalendarDays size={18} className="text-teal" /> {formatShortDate(p.fecha)}
            </span>
            <span className="flex items-center gap-4 text-ink">
              <span>{p.desde} – {p.hasta}</span>
              <button
                type="button"
                onClick={() => quitar(i)}
                className="flex min-h-touch min-w-touch items-center justify-center text-subtle hover:text-danger"
                aria-label={`Eliminar periodo ${formatShortDate(p.fecha)} ${p.desde} a ${p.hasta}`}
              >
                <Trash2 size={18} />
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="per-fecha">Fecha</label>
          <div className="relative">
            <input id="per-fecha" className="w-full rounded-lg border border-line bg-white px-4 py-3 pr-10 text-sm" value={formatShortDate(fecha)} readOnly />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Seleccionar fecha del periodo"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-subtle">
              <CalendarDays size={18} />
            </span>
          </div>
        </div>
        <TimeField id="per-desde" label="Desde" value={desde} onChange={setDesde} />
        <TimeField id="per-hasta" label="Hasta" value={hasta} onChange={setHasta} />
        <button type="button" onClick={agregar} className="btn-outline h-[50px]">
          Agregar periodo <Plus size={16} />
        </button>
      </div>

      {error && (
        <Alert tone="danger" className="mt-4" title={error.tipo === 'invalido' ? 'No se agregó el periodo: horas inválidas' : 'No se agregó el periodo: hay un traslape'}>
          {error.tipo === 'invalido' ? (
            <>La hora «Hasta» debe ser posterior a «Desde».</>
          ) : (
            <>
              {error.nuevo!.desde} – {error.nuevo!.hasta} se cruza con {error.conflicto!.desde} –{' '}
              {error.conflicto!.hasta} del mismo día. Elige otra fecha u horas que no se superpongan.
            </>
          )}
        </Alert>
      )}

      <p className="mt-4 text-sm text-subtle">Solo se guardan periodos sin traslapes.</p>
    </section>
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
          className="w-full rounded-lg border border-line bg-white px-4 py-3 pr-10 text-sm sm:w-36"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-subtle">
          <Clock size={18} />
        </span>
      </div>
    </div>
  )
}
