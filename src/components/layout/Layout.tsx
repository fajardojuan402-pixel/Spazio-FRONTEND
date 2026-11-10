import type { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'

/** Layout de páginas internas: Header + contenido + Footer. */
export default function Layout({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Header />
      <main className="flex-1">
        <div className={`mx-auto w-full px-5 py-10 lg:px-8 ${wide ? 'max-w-7xl' : 'max-w-6xl'}`}>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}
