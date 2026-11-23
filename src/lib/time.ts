// Cálculos de horario: horas completas, validación de rango y solapes (RN-14).

/** Fecha de hoy en formato "YYYY-MM-DD" (hora local de Bogotá, UTC-5). */
export function hoyISO(): string {
  const ahora = new Date()
  const bogota = new Date(ahora.getTime() - 5 * 3600 * 1000)
  return bogota.toISOString().slice(0, 10)
}

/** Construye un "YYYY-MM-DD" a partir de año, mes (0-11) y día, sin desfase UTC. */
export function toISODate(year: number, monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

/**
 * Compara dos fechas "YYYY-MM-DD" como texto (orden cronológico).
 * Devuelve <0 si a es anterior, 0 si igual, >0 si a es posterior.
 */
export function compareISODate(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Convierte "HH:mm" a minutos desde medianoche. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Horas entre dos "HH:mm" (puede ser fraccionaria). */
export function hoursBetween(from: string, to: string): number {
  return (toMinutes(to) - toMinutes(from)) / 60
}

/** RF-06: solo horas completas. Verdadero si ambas marcas caen en :00. */
export function isWholeHours(from: string, to: string): boolean {
  return toMinutes(from) % 60 === 0 && toMinutes(to) % 60 === 0
}

/** Verdadero si [aFrom,aTo) y [bFrom,bTo) se traslapan (RN-14). */
export function periodsOverlap(
  aFrom: string,
  aTo: string,
  bFrom: string,
  bTo: string,
): boolean {
  return toMinutes(aFrom) < toMinutes(bTo) && toMinutes(bFrom) < toMinutes(aTo)
}

export interface HorarioValidacion {
  ok: boolean
  motivo?: string
}

/**
 * Valida la selección de horario del detalle (RF-06):
 * salida > entrada y dentro del horario del espacio [openFrom, openTo].
 */
export function validarHorario(
  from: string,
  to: string,
  openFrom: string,
  openTo: string,
): HorarioValidacion {
  if (toMinutes(to) <= toMinutes(from)) {
    return { ok: false, motivo: 'La hora de salida debe ser posterior a la de entrada.' }
  }
  if (toMinutes(from) < toMinutes(openFrom) || toMinutes(to) > toMinutes(openTo)) {
    return {
      ok: false,
      motivo: `El horario debe estar dentro de ${openFrom}–${openTo}.`,
    }
  }
  return { ok: true }
}
