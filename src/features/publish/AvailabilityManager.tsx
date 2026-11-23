import { useState } from 'react'
import { CalendarDays, Clock, Plus, Repeat, Trash2 } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Alert from '../../components/ui/Alert'
import DatePicker from '../../components/ui/DatePicker'
import type { PeriodoInput } from '../../api/types'
import { formatShortDate } from '../../lib/format'
import { periodsOverlap, toMinutes } from '../../lib/time'

interface OverlapError {
  tipo: 'traslape' | 'invalido' | 'sin-fecha'
  nuevo?: { desde: string; hasta: string }
  conflicto?: { desde: string; hasta: string }
}

type Modo = 'manual' | 'recurrente'

// 0 = Lunes ... 6 = Domingo (coincide con el backend: date.weekday()).
const DIAS_SEMANA = [
  { idx: 0, label: 'L', nombre: 'Lunes' },
  { idx: 1, label: 'M', nombre: 'Martes' },
  { idx: 2, label: 'M', nombre: 'Miércoles' },
  { idx: 3, label: 'J', nombre: 'Jueves' },
  { idx: 4, label: 'V', nombre: 'Viernes' },
  { idx: 5, label: 'S', nombre: 'Sábado' },
  { idx: 6, label: 'D', nombre: 'Domingo' },
]

/** Día de la semana (0=Lun..6=Dom) de un "YYYY-MM-DD", sin desfase UTC. */
function weekdayDeISO(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  const js = new Date(y, m - 1, d).getDay() // 0=Dom..6=Sab
  return (js + 6) % 7 // -> 0=Lun..6=Dom
}

/** Suma un día a un "YYYY-MM-DD" devolviendo otro "YYYY-MM-DD" (hora local). */
function sumarDia(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

/**
 * Gestor de periodos de disponibilidad (RF-05, RN-14, H3). Dos modos:
 * - Manual: Fecha/Desde/Hasta puntual.
 * - Recurrente: días de la semana (L–D) + horario + rango de fechas, que se
 *   expande a bloques por cada día coincidente (ej. "Lun a Vie, 08:00–18:00").
 * Valida en cliente que no se traslapen (mismo día).
 */
export default function AvailabilityManager({
  periodos,
  onChange,
}: {
  periodos: PeriodoInput[]
  onChange: (p: PeriodoInput[]) => void
}) {
  const [modo, setModo] = useState<Modo>('manual')

  // Modo manual
  const [fecha, setFecha] = useState('')
  const [desde, setDesde] = useState('10:00')
  const [hasta, setHasta] = useState('13:00')
  const [error, setError] = useState<OverlapError | null>(null)

  // Modo recurrente
  const [diasSel, setDiasSel] = useState<number[]>([0, 1, 2, 3, 4]) // L–V por defecto
  const [desdeR, setDesdeR] = useState('08:00')
  const [hastaR, setHastaR] = useState('18:00')
  const [inicioR, setInicioR] = useState('')
  const [finR, setFinR] = useState('')
  const [errorR, setErrorR] = useState<string | null>(null)
  const [resumenR, setResumenR] = useState<string | null>(null)

  const agregar = () => {
    setError(null)
    if (!fecha) {
      setError({ tipo: 'sin-fecha' })
      return
    }
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
    setFecha('')
  }

  const toggleDia = (idx: number) => {
    setErrorR(null)
    setResumenR(null)
    setDiasSel((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort((a, b) => a - b),
    )
  }

  const agregarRecurrente = () => {
    setErrorR(null)
    setResumenR(null)
    if (diasSel.length === 0) {
      setErrorR('Elige al menos un día de la semana.')
      return
    }
    if (!inicioR || !finR) {
      setErrorR('Elige el rango de fechas (desde y hasta).')
      return
    }
    if (finR < inicioR) {
      setErrorR('La fecha final no puede ser anterior a la inicial.')
      return
    }
    if (toMinutes(hastaR) <= toMinutes(desdeR)) {
      setErrorR('La hora «Hasta» debe ser posterior a «Desde».')
      return
    }

    // Expande el rango a bloques por cada día coincidente, omitiendo traslapes.
    const nuevos: PeriodoInput[] = []
    const acumulado = [...periodos]
    let omitidos = 0
    let actual = inicioR
    let guard = 0
    while (actual <= finR && guard < 3660) {
      guard += 1
      if (diasSel.includes(weekdayDeISO(actual))) {
        const choque = acumulado.find(
          (p) => p.fecha === actual && periodsOverlap(p.desde, p.hasta, desdeR, hastaR),
        )
        if (choque) {
          omitidos += 1
        } else {
          const bloque = { fecha: actual, desde: desdeR, hasta: hastaR }
          nuevos.push(bloque)
          acumulado.push(bloque)
        }
      }
      actual = sumarDia(actual)
    }

    if (nuevos.length === 0) {
      setErrorR(
        'No se generó ningún bloque nuevo: revisa los días, el rango de fechas y los traslapes.',
      )
      return
    }

    onChange([...periodos, ...nuevos])
    setResumenR(
      `Se agregaron ${nuevos.length} bloque${nuevos.length !== 1 ? 's' : ''}` +
        (omitidos > 0 ? ` (${omitidos} omitido${omitidos !== 1 ? 's' : ''} por traslape).` : '.'),
    )
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

      {/* Selector de modo */}
      <div className="mt-4 inline-flex rounded-lg border border-line p-1">
        <button
          type="button"
          onClick={() => setModo('manual')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
            modo === 'manual' ? 'bg-teal-soft text-teal' : 'text-subtle hover:text-ink'
          }`}
        >
          <CalendarDays size={16} /> Fechas puntuales
        </button>
        <button
          type="button"
          onClick={() => setModo('recurrente')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
            modo === 'recurrente' ? 'bg-teal-soft text-teal' : 'text-subtle hover:text-ink'
          }`}
        >
          <Repeat size={16} /> Repetir por semana
        </button>
      </div>

      {/* Lista de periodos ya agregados */}
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

      {modo === 'manual' ? (
        <>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="per-fecha">Fecha</label>
              <DatePicker
                id="per-fecha"
                value={fecha}
                onChange={setFecha}
                placeholder="Elige una fecha"
                ariaLabel="Seleccionar fecha del periodo"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <TimeField id="per-desde" label="Desde" value={desde} onChange={setDesde} />
              <TimeField id="per-hasta" label="Hasta" value={hasta} onChange={setHasta} />
              <button type="button" onClick={agregar} className="btn-outline h-[50px]">
                Agregar periodo <Plus size={16} />
              </button>
            </div>
          </div>

          {error && (
            <Alert
              tone="danger"
              className="mt-4"
              title={
                error.tipo === 'sin-fecha'
                  ? 'No se agregó el periodo: falta la fecha'
                  : error.tipo === 'invalido'
                    ? 'No se agregó el periodo: horas inválidas'
                    : 'No se agregó el periodo: hay un traslape'
              }
            >
              {error.tipo === 'sin-fecha' ? (
                <>Elige una fecha para el periodo antes de agregarlo.</>
              ) : error.tipo === 'invalido' ? (
                <>La hora «Hasta» debe ser posterior a «Desde».</>
              ) : (
                <>
                  {error.nuevo!.desde} – {error.nuevo!.hasta} se cruza con {error.conflicto!.desde} –{' '}
                  {error.conflicto!.hasta} del mismo día. Elige otra fecha u horas que no se superpongan.
                </>
              )}
            </Alert>
          )}
        </>
      ) : (
        <>
          <div className="mt-4 space-y-4">
            <div>
              <span className="mb-2 block text-sm font-semibold text-ink">Días de la semana</span>
              <div className="flex flex-wrap gap-2">
                {DIAS_SEMANA.map((d) => {
                  const activo = diasSel.includes(d.idx)
                  return (
                    <button
                      key={d.idx}
                      type="button"
                      aria-pressed={activo}
                      aria-label={d.nombre}
                      title={d.nombre}
                      onClick={() => toggleDia(d.idx)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-bold transition ${
                        activo
                          ? 'border-teal bg-teal text-white'
                          : 'border-line bg-white text-subtle hover:border-teal hover:text-teal'
                      }`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <TimeField id="rec-desde" label="Desde" value={desdeR} onChange={setDesdeR} />
              <TimeField id="rec-hasta" label="Hasta" value={hastaR} onChange={setHastaR} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="rec-inicio">Desde la fecha</label>
                <DatePicker
                  id="rec-inicio"
                  value={inicioR}
                  onChange={setInicioR}
                  placeholder="Fecha inicial"
                  ariaLabel="Fecha inicial del rango recurrente"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="rec-fin">Hasta la fecha</label>
                <DatePicker
                  id="rec-fin"
                  value={finR}
                  onChange={setFinR}
                  placeholder="Fecha final"
                  ariaLabel="Fecha final del rango recurrente"
                />
              </div>
            </div>

            <button type="button" onClick={agregarRecurrente} className="btn-outline h-[50px]">
              Generar bloques <Plus size={16} />
            </button>
          </div>

          {errorR && (
            <Alert tone="danger" className="mt-4" title="No se agregó la regla recurrente">
              {errorR}
            </Alert>
          )}
          {resumenR && (
            <Alert tone="success" className="mt-4" title="Disponibilidad recurrente agregada">
              {resumenR}
            </Alert>
          )}
        </>
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
