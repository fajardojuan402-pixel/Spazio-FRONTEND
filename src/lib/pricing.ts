// Reglas de negocio de cálculo (espejo del backend para poder demostrar la app).

import { hoursBetween } from './time'

/** RN-11: monto = precio por hora × horas reservadas (COP, sin comisión). */
export function calcularMonto(precioHora: number, from: string, to: string): number {
  const horas = hoursBetween(from, to)
  return Math.max(0, Math.round(precioHora * horas))
}

export interface Reembolso {
  pct: 0 | 100
  monto: number
  motivo: string
}

/**
 * RN-12: reembolso 100% si faltan 24 h o más para el inicio; 0% si falta menos.
 * (El SDD confirma esta regla aunque el copy del Figma diga "más de 24 horas".)
 */
export function calcularReembolso(montoReserva: number, horasParaInicio: number): Reembolso {
  if (horasParaInicio >= 24) {
    return { pct: 100, monto: montoReserva, motivo: 'Cancelación con 24 h o más' }
  }
  return { pct: 0, monto: 0, motivo: 'Cancelación con menos de 24 h' }
}
