import { describe, expect, it } from 'vitest'
import { MockApiClient } from '../api/mock/mockClient'
import { ApiException } from '../api/types'

describe('MockApiClient — contrato', () => {
  it('RF12_registro_rechaza_correo_existente', async () => {
    const api = new MockApiClient()
    await expect(api.register({ nombre: 'Andrea M.', email: 'andrea@correo.com', password: '12345678' }))
      .rejects.toBeInstanceOf(ApiException)
  })

  it('RF13_login_vacio_da_401', async () => {
    const api = new MockApiClient()
    await expect(api.login({ email: '', password: '' })).rejects.toMatchObject({ status: 401 })
  })

  it('RF01_busqueda_sin_resultados_con_radio_pequeno', async () => {
    const api = new MockApiClient()
    const res = await api.searchSpaces({ q: 'Centro', radioKm: 0.5 })
    expect(res).toHaveLength(0)
  })

  it('RF06_RF07_pago_aprobado_confirma', async () => {
    const api = new MockApiClient()
    const b = await api.createBooking({ spaceId: 'centro', inicio: '2026-10-14T10:00', fin: '2026-10-14T13:00' })
    expect(b.monto).toBe(12000)
    const pago = await api.payBooking(b.id, { escenario: 'APROBADO' })
    expect(pago.estado).toBe('CONFIRMADA')
  })

  it('RF07_pago_rechazado_expira', async () => {
    const api = new MockApiClient()
    const b = await api.createBooking({ spaceId: 'centro', inicio: '2026-10-14T10:00', fin: '2026-10-14T13:00' })
    const pago = await api.payBooking(b.id, { escenario: 'RECHAZADO' })
    expect(pago.estado).toBe('EXPIRADA')
  })

  it('RF15_contadores_de_mis_reservas', async () => {
    const api = new MockApiClient()
    const res = await api.myBookings('todas')
    expect(res.contadores.todas).toBe(3)
    expect(res.contadores.confirmada).toBe(1)
    expect(res.contadores.cancelada).toBe(1)
    expect(res.contadores.expirada).toBe(1)
  })

  it('RF08_cancel_preview_100_con_30h', async () => {
    const api = new MockApiClient()
    const prev = await api.cancelPreview('r-centro')
    expect(prev.pct).toBe(100)
    expect(prev.monto).toBe(12000)
  })
})
