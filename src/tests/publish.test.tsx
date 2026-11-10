import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from './renderWithProviders'
import Publish from '../pages/Publish'

describe('RF-05 Publicar — disponibilidad', () => {
  it('RF05_rechaza_periodo_traslapado', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Publish />)
    // Ya hay un periodo 08:00–18:00. Agregamos 10:00–13:00 que se traslapa
    // (valores por defecto del formulario), y debe rechazarse.
    await user.click(screen.getByRole('button', { name: /agregar periodo/i }))
    expect(await screen.findByText(/hay un traslape/i)).toBeInTheDocument()
  })

  it('RF03_publicar_habilitado_con_datos_validos', () => {
    renderWithProviders(<Publish />)
    // Por defecto: dirección llena, precio 5000, 1 periodo -> habilitado.
    const btn = screen.getByRole('button', { name: /^publicar$/i })
    expect(btn).toBeEnabled()
  })

  it('RF03_publicar_deshabilitado_sin_precio', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Publish />)
    const precio = screen.getByLabelText('Precio por hora (COP)')
    await user.clear(precio)
    await user.type(precio, '0')
    const btn = screen.getByRole('button', { name: /^publicar$/i })
    expect(btn).toBeDisabled()
    expect(screen.getByText(/falta .*precio mayor que 0/i)).toBeInTheDocument()
  })
})
