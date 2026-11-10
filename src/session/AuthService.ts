// AuthService (SDD Tabla 7): registrar e iniciar sesión vía la API
// (Supabase Auth en el backend real; mock en modo prueba). Actualiza SesionContext.

import { api } from '../api/client'
import type { LoginResponse } from '../api/types'
import type { Sesion } from './types'

function toSesion(res: LoginResponse): Sesion {
  return {
    jwt: res.token,
    cuenta: { id: res.user.id, nombre: res.user.nombre, rolAnfitrion: res.user.rolAnfitrion },
  }
}

export const AuthService = {
  async registrar(nombre: string, email: string, password: string): Promise<Sesion> {
    const res = await api.register({ nombre, email, password })
    return toSesion(res)
  },
  async iniciarSesion(email: string, password: string): Promise<Sesion> {
    const res = await api.login({ email, password })
    return toSesion(res)
  },
}
