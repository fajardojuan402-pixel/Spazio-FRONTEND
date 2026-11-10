import { describe, expect, it } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from './renderWithProviders'
import MyReservations from '../pages/MyReservations'

describe('RF-15 Mis reservas', () => {
  it('RF15_muestra_contadores_reales', async () => {
    renderWithProviders(<MyReservations />)
    // Semilla: 1 confirmada, 1 cancelada, 1 expirada.
    expect(await screen.findByText(/Todas · 3/)).toBeInTheDocument()
    expect(screen.getByText(/Confirmadas · 1/)).toBeInTheDocument()
    expect(screen.getByText(/Canceladas · 1/)).toBeInTheDocument()
    expect(screen.getByText(/Expiradas · 1/)).toBeInTheDocument()
  })

  it('RF15_filtro_confirmadas_muestra_solo_una', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MyReservations />)
    await screen.findByText(/Todas · 3/)
    await user.click(screen.getByRole('tab', { name: /Confirmadas/ }))
    // Tras filtrar, aparece la confirmada (Centro) y no la cancelada (Chapinero).
    await waitFor(() =>
      expect(screen.getAllByText('Parqueadero Centro').length).toBeGreaterThan(0),
    )
    expect(screen.queryByText('Cubierto Chapinero')).not.toBeInTheDocument()
  })
})

describe('RF-08 Cancelar con reembolso', () => {
  it('RF08_preview_muestra_reembolso_100_y_cancela', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MyReservations />)
    await screen.findByText(/Todas · 3/)

    // La reserva confirmada (Parqueadero Centro) tiene botón Cancelar.
    const btnCancelar = screen.getAllByRole('button', { name: 'Cancelar' })[0]
    await user.click(btnCancelar)

    const dialog = await screen.findByRole('dialog')
    // Inicia en 30 h -> reembolso 100%.
    expect(await within(dialog).findByText(/Reembolso: 100%/)).toBeInTheDocument()
    expect(within(dialog).getByText('$12.000')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /confirmar cancelación/i }))
    // Tras confirmar, aparece el toast de cancelación.
    expect(await screen.findByText(/Reserva cancelada/)).toBeInTheDocument()
  })
})
