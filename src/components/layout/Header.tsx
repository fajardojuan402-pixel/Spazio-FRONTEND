import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut } from 'lucide-react'
import { useSesion } from '../../session/SesionContext'
import { initials } from '../../lib/format'
import Logo from './Logo'

const NAV = [
  { to: '/buscar', label: 'Buscar parqueadero' },
  { to: '/mis-reservas', label: 'Mis reservas' },
  { to: '/publicar', label: 'Publicar espacio' },
]

/**
 * Header común (SDD P-01…P-09). Sin sesión: enlaces "Iniciar sesión" y
 * "Crear cuenta". Con sesión: avatar con iniciales + nombre y menú de salir.
 */
export default function Header() {
  const { estaAutenticado, cuenta, cerrar } = useSesion()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to={estaAutenticado ? '/buscar' : '/registro'} className="flex items-center gap-3">
          <Logo size={40} />
          <span className="text-2xl font-extrabold tracking-tight text-ink">SPAZIO</span>
        </Link>

        {estaAutenticado && (
          <nav className="hidden items-center gap-8 md:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative flex min-h-touch items-center py-6 text-sm font-semibold transition ${
                    isActive
                      ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-teal'
                      : 'text-subtle hover:text-ink'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}

        {estaAutenticado && cuenta ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex min-h-touch items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-canvas"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-soft text-xs font-bold text-teal">
                {initials(cuenta.nombre)}
              </span>
              <span className="hidden text-sm font-semibold text-ink sm:block">{cuenta.nombre}</span>
              <ChevronDown size={16} className="text-subtle" aria-hidden />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-pop"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    cerrar()
                    navigate('/login')
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink hover:bg-canvas"
                >
                  <LogOut size={16} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="flex min-h-touch items-center text-sm font-bold text-ink hover:text-teal"
            >
              Iniciar sesión
            </Link>
            <Link to="/registro" className="btn-primary">
              Crear cuenta
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
