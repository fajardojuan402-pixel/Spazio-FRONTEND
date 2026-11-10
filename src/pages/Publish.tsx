import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Lightbulb } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'
import Checkbox from '../components/ui/Checkbox'
import Alert from '../components/ui/Alert'
import PhotosManager from '../features/publish/PhotosManager'
import AvailabilityManager from '../features/publish/AvailabilityManager'
import LocationPicker from '../features/publish/LocationPicker'
import { useCreateSpace } from '../hooks/queries'
import { useSesion } from '../session/SesionContext'
import { useToast } from '../components/ui/toast'
import { formatCOP } from '../lib/format'
import { hoyISO } from '../lib/time'
import type { PeriodoInput, TipoVehiculo } from '../api/types'

const TIPS = [
  'Una dirección precisa facilita la llegada.',
  'Las fotos claras ayudan a elegir.',
  'El precio se muestra antes del pago.',
  'Los periodos no pueden superponerse.',
]

/**
 * P-09 Publicar parqueadero (RF-03, RF-05). "Publicar" queda deshabilitado
 * hasta tener dirección, precio > 0 y al menos un periodo válido, indicando
 * qué falta. Al publicar por primera vez activa el rol anfitrión.
 */
export default function Publish() {
  const navigate = useNavigate()
  const { actualizarCuenta } = useSesion()
  const toast = useToast()
  const crear = useCreateSpace()

  const [direccion, setDireccion] = useState('Cra. 9 # 22-18, Bogotá')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [tipoVehiculo, setTipoVehiculo] = useState<TipoVehiculo>('carro')
  const [precioHora, setPrecioHora] = useState(5000)
  const [cubierto, setCubierto] = useState(true)
  const [condiciones, setCondiciones] = useState(
    'Espacio para un carro. Ingresa por la puerta principal y respeta el horario reservado. No se permite dejar objetos fuera del vehículo.',
  )
  const [fotos, setFotos] = useState<string[]>([])
  const [periodos, setPeriodos] = useState<PeriodoInput[]>([
    { fecha: hoyISO(), desde: '08:00', hasta: '18:00' },
  ])

  // Qué falta para poder publicar (RF-03).
  const faltantes = useMemo(() => {
    const f: string[] = []
    if (!direccion.trim()) f.push('la dirección')
    if (!(precioHora > 0)) f.push('un precio mayor que 0')
    if (periodos.length === 0) f.push('al menos un periodo')
    return f
  }, [direccion, precioHora, periodos])

  const puedePublicar = faltantes.length === 0

  const onPublicar = async () => {
    try {
      const res = await crear.mutateAsync({
        direccion: direccion.trim(),
        tipoVehiculo,
        precioHora,
        cubierto,
        condiciones,
        periodos,
        fotos,
        lat: coords?.lat,
        lng: coords?.lng,
      })
      if (res.rolAnfitrionActivado) {
        actualizarCuenta({ rolAnfitrion: true })
        toast.show('Tu rol de anfitrión quedó activado', 'success')
      } else {
        toast.show('Tu parqueadero quedó publicado', 'success')
      }
      navigate('/buscar')
    } catch {
      toast.show('No pudimos publicar el espacio. Inténtalo de nuevo.', 'danger')
    }
  }

  return (
    <Layout wide>
      <header className="max-w-2xl">
        <p className="eyebrow">Para quienes tienen un espacio</p>
        <h1 className="mt-2 text-4xl font-extrabold text-ink">Publica tu parqueadero</h1>
        <p className="mt-3 text-subtle">
          Completa los datos, agrega hasta 3 fotos y define cuándo estará disponible.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_minmax(0,380px)]">
        {/* Columna principal */}
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-2xl font-bold text-ink">Información del espacio</h2>

            <div className="mt-5">
              <LocationPicker
                direccion={direccion}
                onChange={(dir, c) => {
                  setDireccion(dir)
                  setCoords(c)
                }}
              />
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Select
                label="Tipo de vehículo"
                value={tipoVehiculo}
                onChange={(e) => setTipoVehiculo(e.target.value as TipoVehiculo)}
                hint="Opciones: Carro, Moto o Ambos."
                options={[
                  { value: 'carro', label: 'Carro' },
                  { value: 'moto', label: 'Moto' },
                  { value: 'ambos', label: 'Ambos' },
                ]}
              />
              <div>
                <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="precio">Precio por hora (COP)</label>
                <input
                  id="precio"
                  type="number"
                  min={0}
                  step={500}
                  className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 ${
                    precioHora > 0 ? 'border-line focus:border-teal focus:ring-teal/20' : 'border-danger focus:ring-danger/20'
                  }`}
                  value={precioHora}
                  onChange={(e) => setPrecioHora(Number(e.target.value))}
                />
                <p className="mt-1.5 text-sm text-subtle">
                  {precioHora > 0 ? `${formatCOP(precioHora)} · se mostrará antes de reservar.` : 'El precio debe ser mayor que 0.'}
                </p>
              </div>
            </div>

            <Checkbox
              className="mt-5"
              label="Cubierto"
              description="El vehículo estará bajo techo."
              checked={cubierto}
              onChange={(e) => setCubierto(e.target.checked)}
            />

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-ink" htmlFor="condiciones">Condiciones de uso</label>
              <textarea
                id="condiciones"
                rows={3}
                className="w-full resize-none rounded-lg border border-line bg-white px-4 py-3 text-sm text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
                value={condiciones}
                onChange={(e) => setCondiciones(e.target.value)}
              />
            </div>
          </section>

          <AvailabilityManager periodos={periodos} onChange={setPeriodos} />

          {/* Barra de publicar */}
          <Card className="p-6">
            {!puedePublicar && (
              <Alert tone="warn" className="mb-4">
                Falta {faltantes.join(', ')} para poder publicar.
              </Alert>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-bold text-ink">Tu espacio está listo para publicar</p>
                <p className="text-sm text-subtle">
                  {fotos.length} foto{fotos.length !== 1 ? 's' : ''} · {periodos.length} periodo
                  {periodos.length !== 1 ? 's' : ''} válido{periodos.length !== 1 ? 's' : ''} ·{' '}
                  {formatCOP(precioHora)} COP / hora
                </p>
              </div>
              <Button
                onClick={onPublicar}
                disabled={!puedePublicar}
                loading={crear.isPending}
                rightIcon={<ArrowRight size={18} />}
              >
                Publicar
              </Button>
            </div>
          </Card>
        </div>

        {/* Columna lateral */}
        <aside className="space-y-6">
          <PhotosManager fotos={fotos} onChange={setFotos} />

          <section className="rounded-xl bg-teal-soft p-6">
            <p className="flex items-center gap-2 font-bold text-ink">
              <Lightbulb size={20} className="text-teal" /> Un buen espacio empieza aquí
            </p>
            <ul className="mt-4 space-y-3 text-sm text-ink">
              {TIPS.map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-0.5 text-teal">
                    <Check size={16} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </Layout>
  )
}
