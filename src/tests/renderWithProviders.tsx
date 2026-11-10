import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SesionProvider } from '../session/SesionContext'
import { ToastProvider } from '../components/ui/toast'

/** Renderiza un componente con todos los providers de la app, para pruebas. */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SesionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SesionProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return render(ui, { wrapper: Wrapper })
}
