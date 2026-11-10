import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Cuenta, Sesion } from './types'

const STORAGE_KEY = 'spazio.sesion'

interface SesionContextValue {
  jwt: string | null
  cuenta: Cuenta | null
  estaAutenticado: boolean
  rolAnfitrion: boolean
  iniciar: (sesion: Sesion) => void
  actualizarCuenta: (parcial: Partial<Cuenta>) => void
  cerrar: () => void
}

const SesionContext = createContext<SesionContextValue | null>(null)

function leerSesion(): Sesion | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Sesion) : null
  } catch {
    return null
  }
}

/**
 * SesionContext (SDD §7.1.1): mantiene jwt, cuentaId y rolAnfitrion en el
 * cliente, con persistencia en sessionStorage. Se limpia ante 401 (ver ApiClient).
 */
export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => leerSesion())

  const iniciar = useCallback((nueva: Sesion) => {
    setSesion(nueva)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nueva))
  }, [])

  const actualizarCuenta = useCallback((parcial: Partial<Cuenta>) => {
    setSesion((prev) => {
      if (!prev) return prev
      const next = { ...prev, cuenta: { ...prev.cuenta, ...parcial } }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const cerrar = useCallback(() => {
    setSesion(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  // Escucha el evento global de 401 emitido por el ApiClient.
  useEffect(() => {
    const handler = () => cerrar()
    window.addEventListener('spazio:unauthorized', handler)
    return () => window.removeEventListener('spazio:unauthorized', handler)
  }, [cerrar])

  const value = useMemo<SesionContextValue>(
    () => ({
      jwt: sesion?.jwt ?? null,
      cuenta: sesion?.cuenta ?? null,
      estaAutenticado: !!sesion,
      rolAnfitrion: sesion?.cuenta.rolAnfitrion ?? false,
      iniciar,
      actualizarCuenta,
      cerrar,
    }),
    [sesion, iniciar, actualizarCuenta, cerrar],
  )

  return <SesionContext.Provider value={value}>{children}</SesionContext.Provider>
}

export function useSesion(): SesionContextValue {
  const ctx = useContext(SesionContext)
  if (!ctx) throw new Error('useSesion debe usarse dentro de SesionProvider')
  return ctx
}
