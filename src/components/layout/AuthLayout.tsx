import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, MapPin, ShieldCheck } from 'lucide-react'
import Footer from './Footer'
import Logo from './Logo'

const HERO_IMG =
  'https://images.unsplash.com/photo-1549921296-3a6b3c0a3a4a?auto=format&fit=crop&w=1000&q=70'

/**
 * Layout de P-01 (Registro) y P-02 (Login): header simple + panel visual de
 * Bogotá a la izquierda y el formulario a la derecha (igual al Figma).
 */
export default function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link to="/registro" className="flex items-center gap-3">
            <Logo size={40} />
            <span className="text-2xl font-extrabold tracking-tight text-ink">SPAZIO</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="flex min-h-touch items-center text-sm font-bold text-ink hover:text-teal">
              Iniciar sesión
            </Link>
            <Link to="/registro" className="btn-primary">
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div className="relative hidden overflow-hidden rounded-2xl bg-ink lg:block">
            <img src={HERO_IMG} alt="Calle arbolada en Bogotá" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-ink/10" />
            <div className="relative flex h-full min-h-[560px] flex-col justify-between p-8">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-teal">
                <MapPin size={18} /> Hecho para moverte en Bogotá
              </span>
              <div className="text-white">
                <h2 className="text-4xl font-extrabold leading-tight">{title}</h2>
                <p className="mt-4 max-w-sm text-white/85">
                  Encuentra parqueadero, conoce el precio y reserva antes de llegar. Todo, en un mismo lugar.
                </p>
                <div className="mt-6 flex gap-6 text-sm font-medium text-white/90">
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={18} /> Precios claros
                  </span>
                  <span className="flex items-center gap-2">
                    <CalendarCheck size={18} /> Reserva fácil
                  </span>
                </div>
              </div>
            </div>
          </div>

          <section className="flex items-center">
            <div className="w-full max-w-md">{children}</div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
