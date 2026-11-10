import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { Routes, Route } from 'react-router-dom'
import Countdown from '../components/ui/Countdown'
import Confirmation from '../pages/Confirmation'
import { renderWithProviders } from './renderWithProviders'

describe('RF-07 Countdown (retención 10 min)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('RF07_muestra_expirada_al_llegar_a_cero', () => {
    const onExpire = vi.fn()
    render(<Countdown initialSeconds={2} onExpire={onExpire} />)
    expect(screen.getByText('00:02')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('RF07_formatea_mm_ss', () => {
    render(<Countdown initialSeconds={582} />)
    expect(screen.getByText('09:42')).toBeInTheDocument()
  })
})

describe('RF-07 Confirmación — resultado único', () => {
  function renderResultado(resultado: string) {
    return renderWithProviders(
      <Routes>
        <Route path="/confirmacion/:bookingId" element={<Confirmation />} />
      </Routes>,
      { route: `/confirmacion/r-centro?resultado=${resultado}` },
    )
  }

  it('RF07_confirmada_muestra_solo_confirmacion', async () => {
    renderResultado('CONFIRMADA')
    expect(await screen.findByText('¡Reserva confirmada!')).toBeInTheDocument()
    expect(screen.queryByText('No se completó el pago')).not.toBeInTheDocument()
    expect(screen.queryByText('Tu reserva expiró')).not.toBeInTheDocument()
  })

  it('RF07_rechazado_muestra_solo_error', async () => {
    renderResultado('RECHAZADO')
    expect(await screen.findByText('No se completó el pago')).toBeInTheDocument()
    expect(screen.queryByText('¡Reserva confirmada!')).not.toBeInTheDocument()
    expect(screen.queryByText('Tu reserva expiró')).not.toBeInTheDocument()
  })

  it('RF07_expirada_muestra_solo_expiracion', async () => {
    renderResultado('EXPIRADA')
    expect(await screen.findByText('Tu reserva expiró')).toBeInTheDocument()
    expect(screen.queryByText('¡Reserva confirmada!')).not.toBeInTheDocument()
    expect(screen.queryByText('No se completó el pago')).not.toBeInTheDocument()
  })
})
