import { describe, expect, it } from 'vitest'
import { formatCOP, formatLongDate, formatShortDate, formatMMSS } from '../lib/format'
import { calcularMonto, calcularReembolso } from '../lib/pricing'
import { isWholeHours, periodsOverlap, validarHorario } from '../lib/time'

describe('format', () => {
  it('formatCOP usa punto de miles', () => {
    expect(formatCOP(12000)).toBe('$12.000')
    expect(formatCOP(4000)).toBe('$4.000')
  })
  it('formatLongDate y formatShortDate en español', () => {
    expect(formatLongDate('2026-10-14')).toBe('14 de octubre de 2026')
    expect(formatShortDate('2026-10-14')).toBe('14 oct 2026')
  })
  it('formatMMSS rellena con ceros', () => {
    expect(formatMMSS(582)).toBe('09:42')
    expect(formatMMSS(0)).toBe('00:00')
  })
})

describe('RN-11 monto = precio × horas', () => {
  it('RF06_calcula_total_desglosado', () => {
    expect(calcularMonto(4000, '10:00', '13:00')).toBe(12000)
    expect(calcularMonto(6000, '09:00', '11:00')).toBe(12000)
  })
})

describe('RN-12 reembolso por anticipación', () => {
  it('RF08_reembolso_100_con_24h_o_mas', () => {
    const r = calcularReembolso(12000, 30)
    expect(r.pct).toBe(100)
    expect(r.monto).toBe(12000)
  })
  it('RF08_reembolso_0_con_menos_de_24h', () => {
    const r = calcularReembolso(12000, 10)
    expect(r.pct).toBe(0)
    expect(r.monto).toBe(0)
  })
  it('limite_exacto_24h_es_100', () => {
    expect(calcularReembolso(12000, 24).pct).toBe(100)
  })
})

describe('RN-14 traslape de periodos', () => {
  it('RF05_detecta_traslape', () => {
    expect(periodsOverlap('10:00', '13:00', '08:00', '18:00')).toBe(true)
  })
  it('RF05_no_traslape_contiguo', () => {
    expect(periodsOverlap('08:00', '10:00', '10:00', '12:00')).toBe(false)
  })
})

describe('RF-06 validación de horario', () => {
  it('rechaza salida <= entrada', () => {
    expect(validarHorario('13:00', '10:00', '08:00', '18:00').ok).toBe(false)
  })
  it('rechaza fuera del horario del espacio', () => {
    expect(validarHorario('07:00', '09:00', '08:00', '18:00').ok).toBe(false)
  })
  it('acepta rango válido dentro del horario', () => {
    expect(validarHorario('10:00', '13:00', '08:00', '18:00').ok).toBe(true)
  })
  it('solo horas completas', () => {
    expect(isWholeHours('10:00', '13:00')).toBe(true)
    expect(isWholeHours('10:30', '13:00')).toBe(false)
  })
})
