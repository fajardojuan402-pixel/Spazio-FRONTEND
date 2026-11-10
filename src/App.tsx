import { Navigate, Route, Routes } from 'react-router-dom'
import { useSesion } from './session/SesionContext'
import ProtectedRoute from './routes/ProtectedRoute'
import Register from './pages/Register'
import Login from './pages/Login'
import Publish from './pages/Publish'
import Search from './pages/Search'
import SpaceDetail from './pages/SpaceDetail'
import Payment from './pages/Payment'
import Confirmation from './pages/Confirmation'
import MyReservations from './pages/MyReservations'

/**
 * Router de SPAZIO. Rutas públicas: /registro, /login.
 * Rutas protegidas (redirigen a /login): búsqueda, detalle, pago,
 * confirmación, mis reservas y publicar. (SDD P-01…P-09)
 */
export default function App() {
  const { estaAutenticado } = useSesion()

  return (
    <Routes>
      {/* Entrada: si hay sesión va a buscar; si no, a registro */}
      <Route path="/" element={<Navigate to={estaAutenticado ? '/buscar' : '/registro'} replace />} />

      {/* Públicas */}
      <Route path="/registro" element={<Register />} />
      <Route path="/login" element={<Login />} />

      {/* Protegidas */}
      <Route
        path="/buscar"
        element={
          <ProtectedRoute>
            <Search />
          </ProtectedRoute>
        }
      />
      <Route
        path="/espacio/:id"
        element={
          <ProtectedRoute>
            <SpaceDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pago/:bookingId"
        element={
          <ProtectedRoute>
            <Payment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/confirmacion/:bookingId"
        element={
          <ProtectedRoute>
            <Confirmation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mis-reservas"
        element={
          <ProtectedRoute>
            <MyReservations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/publicar"
        element={
          <ProtectedRoute>
            <Publish />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
