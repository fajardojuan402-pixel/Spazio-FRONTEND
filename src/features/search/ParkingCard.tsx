import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { SpaceSummary } from '../../api/types'
import { formatCOP } from '../../lib/format'

/**
 * ParkingCard (SDD "Componentes UI"): tarjeta de resultado de búsqueda,
 * clicable en toda su área (RF-01). Resalta cuando está seleccionada.
 */
export default function ParkingCard({
  space,
  active,
  onSelect,
}: {
  space: SpaceSummary
  active: boolean
  onSelect: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      aria-pressed={active}
      className={`card cursor-pointer overflow-hidden p-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40 ${
        active ? 'ring-2 ring-teal' : 'hover:border-teal/40'
      }`}
    >
      <div className="flex gap-4">
        <img src={space.foto} alt={space.titulo} className="h-28 w-28 flex-none rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-ink">{space.titulo}</h3>
          <p className="mt-0.5 text-sm text-subtle">
            {space.distanciaKm.toLocaleString('es-CO')} km · {space.horario}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="chip capitalize">{space.tipoVehiculo}</span>
            {space.cubierto && <span className="chip-muted">Cubierto</span>}
          </div>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-xl font-extrabold text-teal">
              {formatCOP(space.precioHora)}
              <span className="text-sm font-medium text-subtle"> / hora</span>
            </p>
            <Link
              to={`/espacio/${space.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex min-h-touch items-center gap-1 text-sm font-semibold text-teal hover:underline"
            >
              Ver espacio <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
