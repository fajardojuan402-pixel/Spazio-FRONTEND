// Esquemas de validación de autenticación (RF-12, RF-13) con Zod.
import { z } from 'zod'

/** RF-12: correo válido, contraseña mínimo 8 caracteres, términos aceptados. */
export const registerSchema = z.object({
  nombre: z.string().trim().min(1, 'Escribe tu nombre.'),
  email: z.string().trim().min(1, 'Escribe tu correo.').email('Escribe un correo válido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
  terminos: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los términos para continuar.' }),
  }),
})

export type RegisterForm = z.infer<typeof registerSchema>

/** RF-13: correo y contraseña requeridos (el error de credenciales lo da el servidor). */
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Escribe tu correo.').email('Escribe un correo válido.'),
  password: z.string().min(1, 'Escribe tu contraseña.'),
})

export type LoginForm = z.infer<typeof loginSchema>
