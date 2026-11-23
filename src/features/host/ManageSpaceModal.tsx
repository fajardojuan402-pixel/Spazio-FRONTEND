import { useEffect, useState } from 'react'
import { CalendarDays, Clock, Plus, Repeat, Trash2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Alert from '../../components/ui/Alert'
import Skeleton from '../../components/ui/Skeleton'
import DatePicker from '../../components/ui/DatePicker'
import {
  useAddAvailability,
  useAddRecurringAvailability,
  useAvailabilities,
  useRemoveAvailability,
  useUpdateSpace,
} from '../../hooks/queries'
import { useToast } from '../../components/ui/toast'
import { formatCOP, formatShortDate } from '../../lib/format'
import { periodsOverlap, toMinutes } from '../../lib/time'
import { ApiException, type HostSpaceItem } from '../../api/types'

/**
 * P-10 "Gestionar espacio". Permite al anfitrión (RF-03/RF-05):
 * cambiar el precio por hora, pausar/activar la publicación y agregar o
 * eliminar periodos de disponibilidad. Usa las rutas del backend
 * PUT /spaces/{id} y POST/DELETE /availabilities.
 */
export default function ManageSpaceModal({
  space,
  open,
  onClose,
}: {
  space: HostSpaceItem
  open: boolean
  onClose: () => void
}) {
  const toast = useToast()
  const { data: avails, isLoading: cargandoAvails } = useAvailabilities(space.id, open)
  const actualizar = useUpdateSpace()
  const agregar = useAddAvailability()
  const agregarRec = useAddRecurringAvailability()
  const eliminar = useRemoveAvailability()

  const [precio, setPrecio] = useState(space.precioHora)
  const [modo, setModo] = useState<'manual' | 'recurrente'>('manual')
  const [fecha, setFecha] = useState('')
  const [desde, setDesde] = useState('08:00')
  const [hasta, setHasta] = useState('18:00')
  const [errorPeriodo, setErrorPeriodo] = useState<string | null>(null)

  // Modo recurrente
  const [diasSel, setDiasSel] = useState<number[]>([0, 1, 2, 3, 4])
  const [desdeR, setDesdeR] = useState('08:00')
  const [hastaR, setHastaR] = useState('18:00')
  const [inicioR, setInicioR] = useState('')
  const [finR, setFinR] = useState('')
  const [msgRec, setMsgRec] = useState<{ tone: 'danger' | 'success'; texto: string } | null>(null)

  // Reinicia el precio editable y la fecha del formulario cada vez que se abre.
  useEffect(() => {
    if (open) {
      setPrecio(space.precioHora)
      setFecha('')
    }
  }, [open, space.id, space.precioHora])

  const precioValido = precio > 0 && precio !== space.precioHora

  const guardarPrecio = async () => {
    if (!(precio > 0)) return
    try {
      await actualizar.mutateAsync({ id: space.id, body: { precioHora: precio } })
      toast.show('Precio actualizado', 'success')
    } catch {
      toast.show('No pudimos actualizar el precio. Inténtalo de nuevo.', 'danger')
    }
  }

  const alternarEstado = async () => {
    try {
      await actualizar.mutateAsync({ id: space.id, body: { activo: !space.activo } })
      toast.show(space.activo ? 'Espacio pausado' : 'Espacio activado', 'success')
    } catch {
      toast.show('No pudimos cambiar el estado del espacio.', 'danger')
    }
  }

  const agregarPeriodo = async () => {
    setErrorPeriodo(null)
    if (!fecha) {
      setErrorPeriodo('Elige una fecha para el periodo antes de agregarlo.')
      return
    }
    if (toMinutes(hasta) <= toMinutes(desde)) {
      setErrorPeriodo('La hora «Hasta» debe ser posterior a «Desde».')
      return
    }
    const choque = (avails ?? []).find(
      (a) => a.fecha === fecha && periodsOverlap(a.desde, a.hasta, desde, hasta),
    )
    if (choque) {
      setErrorPeriodo(
        `Se cruza con ${choque.desde} – ${choque.hasta} del mismo día. Elige otras horas.`,
      )
      return
    }
    try {
      await agregar.mutateAsync({ spaceId: space.id, fecha, desde, hasta })
      setFecha('')
      toast.show('Disponibilidad agregada', 'success')
    } catch (e) {
      const msg =
        e instanceof ApiException ? e.message : 'No pudimos agregar la disponibilidad.'
      setErrorPeriodo(msg)
    }
  }

  const DIAS_SEMANA = [
    { idx: 0, label: 'L', nombre: 'Lunes' },
    { idx: 1, label: 'M', nombre: 'Martes' },
    { idx: 2, label: 'M', nombre: 'Miércoles' },
    { idx: 3, label: 'J', nombre: 'Jueves' },
    { idx: 4, label: 'V', nombre: 'Viernes' },
    { idx: 5, label: 'S', nombre: 'Sábado' },
    { idx: 6, label: 'D', nombre: 'Domingo' },
  ]

  const toggleDia = (idx: number) => {
    setMsgRec(null)
    setDiasSel((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort((a, b) => a - b),
    )
  }

  const agregarRecurrente = async () => {
    setMsgRec(null)
    if (diasSel.length === 0) {
      setMsgRec({ tone: 'danger', texto: 'Elige al menos un día de la semana.' })
      return
    }
    if (!inicioR || !finR) {
      setMsgRec({ tone: 'danger', texto: 'Elige el rango de fechas (desde y hasta).' })
      return
    }
    if (finR < inicioR) {
      setMsgRec({ tone: 'danger', texto: 'La fecha final no puede ser anterior a la inicial.' })
      return
    }
    if (toMinutes(hastaR) <= toMinutes(desdeR)) {
      setMsgRec({ tone: 'danger', texto: 'La hora «Hasta» debe ser posterior a «Desde».' })
      return
    }
    try {
      const creados = await agregarRec.mutateAsync({
        spaceId: space.id,
        weekdays: diasSel,
        startDate: inicioR,
        endDate: finR,
        desde: desdeR,
        hasta: hastaR,
      })
      setMsgRec({
        tone: 'success',
        texto: `Se agregaron ${creados.length} bloque${creados.length !== 1 ? 's' : ''} de disponibilidad.`,
      })
      toast.show('Disponibilidad recurrente agregada', 'success')
    } catch (e) {
      const texto = e instanceof ApiException ? e.message : 'No pudimos agregar la disponibilidad recurrente.'
      setMsgRec({ tone: 'danger', texto })
    }
  }

  const quitarPeriodo = async (id: string) => {
    try {
      await eliminar.mutateAsync({ id, spaceId: space.id })
      toast.show('Disponibilidad eliminada', 'success')
    } catch {
      toast.show('No pudimos eliminar la disponibilidad.', 'danger')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Gestionar espacio">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{space.titulo}</p>
          <p className="truncate text-sm text-subtle">{space.direccion}</p>
        </div>
        <Badge tone={space.activo ? 'success' : 'muted'}>
          {space.activo ? 'ACTIVO' : 'PAUSADO'}
        </Badge>
      </div>

      {/* Precio por hora */}
      <section className="mt-5 rounded-lg bg-canvas p-4">
        <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="precio-hora">
          Precio por hora (COP)
        </label>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <input
              id="precio-hora"
              type="number"
              min={0}
              step={500}
              className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 ${
                precio > 0
                  ? 'border-line focus:border-teal focus:ring-teal/20'
                  : 'border-danger focus:ring-danger/20'
              }`}
              value={precio}
              onChange={(e) => setPrecio(Number(e.target.value))}
            />
            <p className="mt-1.5 text-sm text-subtle">
              {precio > 0 ? `${formatCOP(precio)} · se mostrará antes de reservar.` : 'Debe ser mayor que 0.'}
            </p>
          </div>
          <Button
            variant="outline"
            disabled={!precioValido}
            loading={actualizar.isPending}
            onClick={guardarPrecio}
          >
            Guardar
          </Button>
        </div>
      </section>

      {/* Estado de publicación */}
      <section className="mt-4 flex items-center justify-between rounded-lg border border-line p-4">
        <div>
          <p className="font-semibold text-ink">
            {space.activo ? 'Publicado y visible' : 'Pausado (no aparece en búsquedas)'}
          </p>
          <p className="text-sm text-subtle">
            {space.activo
              ? 'Pausa el espacio para dejar de recibir reservas temporalmente.'
              : 'Actívalo para que vuelva a aparecer en los resultados.'}
          </p>
        </div>
        <Button
          variant={space.activo ? 'outline' : 'primary'}
          loading={actualizar.isPending}
          onClick={alternarEstado}
        >
          {space.activo ? 'Pausar' : 'Activar'}
        </Button>
      </section>

      {/* Disponibilidad */}
      <section className="mt-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-subtle">Disponibilidad</h3>

        <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {cargandoAvails ? (
            <>
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </>
          ) : (avails ?? []).length === 0 ? (
            <p className="rounded-lg bg-canvas px-4 py-3 text-sm text-subtle">
              Aún no hay periodos. Agrega al menos uno para que sea reservable.
            </p>
          ) : (
            (avails ?? []).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg bg-canvas px-4 py-2.5"
              >
                <span className="flex items-center gap-3 text-ink">
                  <CalendarDays size={18} className="text-teal" />
                  <span className="font-medium">{formatShortDate(a.fecha)}</span>
                  <span className="text-subtle">
                    {a.desde} – {a.hasta}
                  </span>
                  {a.vencido && <Badge tone="warn">Vencido</Badge>}
                </span>
                <button
                  type="button"
                  onClick={() => quitarPeriodo(a.id)}
                  disabled={eliminar.isPending}
                  className="flex min-h-touch min-w-touch items-center justify-center text-subtle hover:text-danger disabled:opacity-50"
                  aria-label={`Eliminar periodo ${formatShortDate(a.fecha)} ${a.desde} a ${a.hasta}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Selector de modo */}
        <div className="mt-3 inline-flex rounded-lg border border-line p-1">
          <button
            type="button"
            onClick={() => setModo('manual')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition ${
              modo === 'manual' ? 'bg-teal-soft text-teal' : 'text-subtle hover:text-ink'
            }`}
          >
            <CalendarDays size={16} /> Fecha puntual
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

        {modo === 'manual' ? (
          <>
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="nueva-fecha">
                  Fecha
                </label>
                <DatePicker
                  id="nueva-fecha"
                  value={fecha}
                  onChange={setFecha}
                  placeholder="Elige una fecha"
                  ariaLabel="Seleccionar fecha del periodo"
                />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <TimeField id="nueva-desde" label="Desde" value={desde} onChange={setDesde} />
                <TimeField id="nueva-hasta" label="Hasta" value={hasta} onChange={setHasta} />
                <Button
                  variant="outline"
                  className="h-[50px]"
                  loading={agregar.isPending}
                  onClick={agregarPeriodo}
                  rightIcon={<Plus size={16} />}
                >
                  Agregar
                </Button>
              </div>
            </div>

            {errorPeriodo && (
              <Alert tone="danger" className="mt-3" title="No se agregó el periodo">
                {errorPeriodo}
              </Alert>
            )}
          </>
        ) : (
          <>
            <div className="mt-3 space-y-4">
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
                  <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="rec-inicio">
                    Desde la fecha
                  </label>
                  <DatePicker
                    id="rec-inicio"
                    value={inicioR}
                    onChange={setInicioR}
                    placeholder="Fecha inicial"
                    ariaLabel="Fecha inicial del rango recurrente"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="rec-fin">
                    Hasta la fecha
                  </label>
                  <DatePicker
                    id="rec-fin"
                    value={finR}
                    onChange={setFinR}
                    placeholder="Fecha final"
                    ariaLabel="Fecha final del rango recurrente"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                className="h-[50px]"
                loading={agregarRec.isPending}
                onClick={agregarRecurrente}
                rightIcon={<Plus size={16} />}
              >
                Generar bloques
              </Button>
            </div>

            {msgRec && (
              <Alert
                tone={msgRec.tone}
                className="mt-3"
                title={msgRec.tone === 'danger' ? 'No se agregó la regla recurrente' : 'Disponibilidad recurrente agregada'}
              >
                {msgRec.texto}
              </Alert>
            )}
          </>
        )}
      </section>

      <div className="mt-6 flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  )
}

function TimeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-ink" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="time"
          step={3600}
          className="w-full rounded-lg border border-line bg-white px-4 py-3 pr-10 text-sm sm:w-32"
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
