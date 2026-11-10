import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import { renderWithProviders } from './renderWithProviders'
import Search from '../pages/Search'
import SpaceDetail from '../pages/SpaceDetail'

describe('RF-01 Búsqueda', () => {
  it('RF01_muestra_resultados_cercanos', async () => {
    renderWithProviders(<Search />)
    // El título de cada resultado es un heading; el mapa lo repite como <p>.
    expect(await screen.findByRole('heading', { name: 'Parqueadero Centro' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Cubierto Chapinero' })).toBeInTheDocument()
  })

  it('RF01_boton_ir_relanza_busqueda', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Search />)
    await screen.findByRole('heading', { name: 'Parqueadero Centro' })
    await user.click(screen.getByRole('button', { name: /^ir$/i }))
    expect(await screen.findByRole('heading', { name: 'Parqueadero Centro' })).toBeInTheDocument()
  })
})

describe('RF-06 Detalle — reserva', () => {
  function renderDetail() {
    return renderWithProviders(
      <Routes>
        <Route path="/espacio/:id" element={<SpaceDetail />} />
      </Routes>,
      { route: '/espacio/centro' },
    )
  }

  it('RF06_calcula_total_en_vivo', async () => {
    renderDetail()
    // 10:00–13:00 = 3 horas × $4.000 = $12.000
    await waitFor(() => expect(screen.getByText('Total (COP)')).toBeInTheDocument())
    expect(screen.getAllByText('$12.000').length).toBeGreaterThan(0)
  })

  it('RF06_boton_deshabilitado_si_salida_antes_de_entrada', async () => {
    const user = userEvent.setup()
    renderDetail()
    await waitFor(() => expect(screen.getByText('Total (COP)')).toBeInTheDocument())
    const salida = screen.getByLabelText('Hora de salida')
    await user.clear(salida)
    await user.type(salida, '09:00')
    const btn = screen.getByRole('button', { name: /reservar y pagar/i })
    expect(btn).toBeDisabled()
  })
})
