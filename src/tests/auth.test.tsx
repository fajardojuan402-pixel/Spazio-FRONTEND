import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from './renderWithProviders'
import Register from '../pages/Register'
import Login from '../pages/Login'

describe('RF-12 Registro', () => {
  it('RF12_boton_deshabilitado_hasta_aceptar_terminos', () => {
    renderWithProviders(<Register />)
    const btn = screen.getByRole('button', { name: /registrarme/i })
    expect(btn).toBeDisabled()
  })

  it('RF12_valida_correo_invalido_y_password_corta', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Register />)
    await user.type(screen.getByLabelText('Nombre'), 'Andrea')
    await user.type(screen.getByLabelText('Correo electrónico'), 'correo-malo')
    await user.type(screen.getByLabelText('Contraseña'), '123')
    // Acepta términos para habilitar el envío
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /registrarme/i }))

    expect(await screen.findByText('Escribe un correo válido.')).toBeInTheDocument()
    expect(
      await screen.findByText('La contraseña debe tener al menos 8 caracteres.'),
    ).toBeInTheDocument()
  })

  it('RF12_correo_ya_registrado_muestra_aviso', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Register />)
    await user.type(screen.getByLabelText('Nombre'), 'Andrea')
    // Correo semilla ya registrado en el mock
    await user.type(screen.getByLabelText('Correo electrónico'), 'andrea@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), 'clave1234')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /registrarme/i }))

    expect(await screen.findByText(/ya tiene una cuenta/i)).toBeInTheDocument()
  })
})

describe('RF-13 Login', () => {
  it('RF13_credenciales_invalidas_mensaje_generico', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Login />)
    // En el mock, credenciales vacías dan 401; forzamos el error enviando con
    // password vacía tras escribir correo (zod exige password, así que usamos
    // un caso que llegue al servidor: email válido + password 1 char inexistente).
    await user.type(screen.getByLabelText('Correo electrónico'), 'nadie@correo.com')
    await user.type(screen.getByLabelText('Contraseña'), ' ')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() =>
      expect(screen.getByText('Correo o contraseña incorrectos')).toBeInTheDocument(),
    )
  })

  it('RF13_tiene_enlace_recuperacion_deshabilitado', () => {
    renderWithProviders(<Login />)
    const link = screen.getByText('¿Olvidaste tu contraseña?')
    expect(link).toHaveAttribute('aria-disabled', 'true')
  })
})
