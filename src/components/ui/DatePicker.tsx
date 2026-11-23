import { useEffect, useId, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { compareISODate, hoyISO, toISODate } from '../../lib/time'
import { formatLongDate } from '../../lib/format'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
// Semana que empieza en lunes, como Airbnb en español.
const DIAS = ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D']

interface DatePickerProps {
  /** Fecha seleccionada en "YYYY-MM-DD", o '' si no hay ninguna. */
  value: string
  onChange: (iso: string) => void
  /** Fecha mínima seleccionable "YYYY-MM-DD". Por defecto, hoy. */
  min?: string
  /** Fecha máxima seleccionable "YYYY-MM-DD" (opcional). */
  max?: string
  placeholder?: string
  id?: string
  ariaLabel?: string
  className?: string
}

/**
 * Selector de fecha estilo Airbnb: abre un popover con dos meses lado a lado.
 * Los días anteriores a `min` (hoy por defecto) se muestran en gris y no se
 * pueden elegir. No propone ninguna fecha automática: si `value` es '', el
 * campo queda vacío hasta que el usuario elija un día.
 */
export default function DatePicker({
  value,
  onChange,
  min = hoyISO(),
  max,
  placeholder = 'Selecciona una fecha',
  id,
  ariaLabel = 'Seleccionar fecha',
  className = '',
}: DatePickerProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const [open, setOpen] = useState(false)
  // Hacia dónde se abre el popover: true = arriba, false = abajo.
  const [dropUp, setDropUp] = useState(false)
  // Mes de la izquierda; el de la derecha es el siguiente.
  const [cursor, setCursor] = useState(() => monthStart(value || min))
  const rootRef = useRef<HTMLDivElement>(null)

  // Al abrir, posiciona el calendario en el mes de la selección o del mínimo
  // y decide si abre hacia arriba o hacia abajo según el espacio disponible.
  useEffect(() => {
    if (!open) return
    setCursor(monthStart(value || min))
    const rect = rootRef.current?.getBoundingClientRect()
    if (rect) {
      const altoEstimado = 360 // alto aprox. del calendario en px
      const espacioAbajo = window.innerHeight - rect.bottom
      const espacioArriba = rect.top
      setDropUp(espacioAbajo < altoEstimado && espacioArriba > espacioAbajo)
    }
  }, [open, value, min])

  // Cierra al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const mesIzq = cursor
  const mesDer = addMonths(cursor, 1)
  const minCursor = monthStart(min)
  const puedeRetroceder = compareMonths(mesIzq, minCursor) > 0

  const elegir = (iso: string) => {
    onChange(iso)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={fieldId}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex w-full items-center justify-between rounded-lg border border-line bg-white px-4 py-3 text-left text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
      >
        <span className={value ? 'text-ink' : 'text-subtle'}>
          {value ? formatLongDate(value) : placeholder}
        </span>
        <CalendarDays size={18} className="text-subtle" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Calendario"
          className={`absolute left-0 z-50 w-[min(92vw,300px)] rounded-xl border border-line bg-white p-3 shadow-pop lg:w-[560px] ${
            dropUp ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]'
          }`}
        >
          <div className="relative mb-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => puedeRetroceder && setCursor(addMonths(cursor, -1))}
              disabled={!puedeRetroceder}
              aria-label="Mes anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setCursor(addMonths(cursor, 1))}
              aria-label="Mes siguiente"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-canvas"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <MonthGrid month={mesIzq} value={value} min={min} max={max} onSelect={elegir} />
            <div className="hidden lg:block">
              <MonthGrid month={mesDer} value={value} min={min} max={max} onSelect={elegir} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MonthGrid({
  month,
  value,
  min,
  max,
  onSelect,
}: {
  month: { year: number; monthIndex: number }
  value: string
  min: string
  max?: string
  onSelect: (iso: string) => void
}) {
  const { year, monthIndex } = month
  const diasEnMes = new Date(year, monthIndex + 1, 0).getDate()
  // getDay(): 0=domingo..6=sábado. Lo convertimos a 0=lunes..6=domingo.
  const primerDiaJs = new Date(year, monthIndex, 1).getDay()
  const offset = (primerDiaJs + 6) % 7

  const celdas: (number | null)[] = []
  for (let i = 0; i < offset; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  return (
    <div>
      <p className="mb-2 text-center text-sm font-bold text-ink">
        {MESES[monthIndex]} {year}
      </p>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-subtle">
        {DIAS.map((d) => (
          <span key={d} className="py-1">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 text-center text-sm">
        {celdas.map((dia, i) => {
          if (dia === null) return <span key={`e${i}`} />
          const iso = toISODate(year, monthIndex, dia)
          const esPasado = compareISODate(iso, min) < 0
          const esFuturoBloqueado = max ? compareISODate(iso, max) > 0 : false
          const deshabilitado = esPasado || esFuturoBloqueado
          const seleccionado = value === iso
          return (
            <div key={iso} className="flex items-center justify-center">
              <button
                type="button"
                disabled={deshabilitado}
                onClick={() => onSelect(iso)}
                aria-pressed={seleccionado}
                aria-label={formatLongDate(iso)}
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full text-[13px] transition',
                  deshabilitado
                    ? 'cursor-not-allowed text-subtle/40 line-through'
                    : 'text-ink hover:border hover:border-ink',
                  seleccionado ? 'bg-ink text-white hover:border-ink' : '',
                ].join(' ')}
              >
                {dia}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function monthStart(iso: string): { year: number; monthIndex: number } {
  const base = iso || hoyISO()
  const [y, m] = base.split('-').map(Number)
  return { year: y, monthIndex: m - 1 }
}

function addMonths(
  m: { year: number; monthIndex: number },
  delta: number,
): { year: number; monthIndex: number } {
  const total = m.year * 12 + m.monthIndex + delta
  return { year: Math.floor(total / 12), monthIndex: ((total % 12) + 12) % 12 }
}

function compareMonths(
  a: { year: number; monthIndex: number },
  b: { year: number; monthIndex: number },
): number {
  return a.year * 12 + a.monthIndex - (b.year * 12 + b.monthIndex)
}
