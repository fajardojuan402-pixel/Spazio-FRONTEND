import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSesion } from '../session/SesionContext'

/**
 * Envuelve rutas que requieren sesión. Si no hay sesión, redirige a /login
 * recordando el destino para volver después de autenticarse.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { estaAutenticado } = useSesion()
  const location = useLocation()

  if (!estaAutenticado) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <>{children}</>
}
