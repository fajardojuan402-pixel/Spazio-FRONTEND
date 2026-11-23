import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Plus, Settings, Trash2 } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import Alert from '../components/ui/Alert'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import ManageSpaceModal from '../features/host/ManageSpaceModal'
import { useDeleteSpace, useMySpaces } from '../hooks/queries'
import { useToast } from '../components/ui/toast'
import { ApiException, type HostSpaceItem } from '../api/types'
import { formatCOP } from '../lib/format'

/**
 * P-10 "Mis espacios" (RF-03, RF-05). El anfitrión ve lo que publicó y puede
 * gestionar cada espacio: precio por hora, estado (pausar/activar),
 * disponibilidad y eliminación. Consume GET /spaces/my-spaces y, por espacio,
 * PUT /spaces/{id}, DELETE /spaces/{id} y las rutas de /availabilities.
 */
export default function MySpaces() {
  const { data, isLoading, isError, refetch } = useMySpaces()
  const borrar = useDeleteSpace()
  const toast = useToast()
  const [gestionar, setGestionar] = useState<HostSpaceItem | null>(null)
  const [aEliminar, setAEliminar] = useState<HostSpaceItem | null>(null)

  const spaces = data ?? []

  const confirmarEliminar = async () => {
    if (!aEliminar) return
    try {
      await borrar.mutateAsync(aEliminar.id)
      toast.show('Espacio eliminado', 'success')
      setAEliminar(null)
    } catch (e) {
      const msg =
        e instanceof ApiException
          ? e.message
          : 'No pudimos eliminar el espacio. Inténtalo de nuevo.'
      toast.show(msg, 'danger')
      setAEliminar(null)
    }
  }

  return (
    <Layout wide>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Para anfitriones</p>
          <h1 className="mt-2 text-4xl font-extrabold text-ink">Mis espacios</h1>
          <p className="mt-3 max-w-xl text-subtle">
            Gestiona los parqueaderos que publicaste: cambia el precio por hora, agrega días de
            disponibilidad, pausa una publicación o elimínala.
          </p>
        </div>
        <Link to="/publicar" className="btn-primary">
          Publicar espacio <Plus size={18} />
        </Link>
      </div>

      <div className="mt-8">
        {isError ? (
          <Alert tone="danger" title="No pudimos cargar tus espacios">
            <div className="mt-3">
              <Button variant="outline" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          </Alert>
        ) : isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : spaces.length === 0 ? (
          <EmptyState
            title="Todavía no has publicado espacios"
            description="Cuando publiques un parqueadero aparecerá aquí para que lo gestiones."
            actions={
              <Link to="/publicar" className="btn-primary">
                Publicar mi primer espacio
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((s) => (
              <Card key={s.id} className="flex flex-col overflow-hidden p-0">
                <div className="relative h-40">
                  <img src={s.foto} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-3 top-3">
                    <Badge tone={s.activo ? 'success' : 'muted'}>
                      {s.activo ? 'ACTIVO' : 'PAUSADO'}
                    </Badge>
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="font-bold text-ink">{s.titulo}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-subtle">
                    <MapPin size={15} className="flex-none text-teal" />
                    <span className="truncate">{s.direccion}</span>
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xl font-extrabold text-teal">
                      {formatCOP(s.precioHora)}
                      <span className="text-xs font-semibold text-subtle"> COP / hora</span>
                    </span>
                    <span className="text-sm text-subtle">
                      {s.periodosVigentes} periodo{s.periodosVigentes !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="mt-5 flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setGestionar(s)}
                      leftIcon={<Settings size={16} />}
                    >
                      Gestionar
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => setAEliminar(s)}
                      aria-label={`Eliminar ${s.titulo}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {gestionar && (
        <ManageSpaceModal
          space={gestionar}
          open={!!gestionar}
          onClose={() => setGestionar(null)}
        />
      )}

      {aEliminar && (
        <Modal open={!!aEliminar} onClose={() => setAEliminar(null)} title="¿Eliminar este espacio?">
          <p className="text-subtle">
            Vas a eliminar <span className="font-semibold text-ink">{aEliminar.titulo}</span>. Esta
            acción no se puede deshacer. Si el espacio tiene reservas vigentes, no podrá eliminarse.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setAEliminar(null)}>
              Volver
            </Button>
            <Button variant="danger" loading={borrar.isPending} onClick={confirmarEliminar}>
              Eliminar
            </Button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
