// Tipos de la sesión del cliente (SDD §7.1.1 — SesionContext).

export interface Cuenta {
  id: string
  nombre: string
  rolAnfitrion: boolean
}

export interface Sesion {
  jwt: string
  cuenta: Cuenta
}
