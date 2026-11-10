import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Lock, Mail } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Checkbox from '../components/ui/Checkbox'
import Alert from '../components/ui/Alert'
import { registerSchema, type RegisterForm } from '../features/auth/schemas'
import { AuthService } from '../session/AuthService'
import { useSesion } from '../session/SesionContext'
import { ApiException } from '../api/types'

/**
 * P-01 Registro (RF-12). Valida correo y contraseña (mín. 8) en el campo,
 * exige aceptar términos y mayoría de edad, y maneja el 409 de correo repetido.
 */
export default function Register() {
  const navigate = useNavigate()
  const { iniciar } = useSesion()
  const [correoExiste, setCorreoExiste] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: { nombre: '', email: '', password: '', terminos: false as unknown as true },
  })

  const terminos = watch('terminos')

  const onSubmit = async (data: RegisterForm) => {
    setCorreoExiste(false)
    try {
      const sesion = await AuthService.registrar(data.nombre, data.email, data.password)
      iniciar(sesion)
      navigate('/buscar', { replace: true })
    } catch (e) {
      if (e instanceof ApiException && e.status === 409) {
        setCorreoExiste(true)
        setError('email', { message: 'Este correo ya está registrado.' })
      } else {
        setError('root', { message: 'No pudimos crear tu cuenta. Inténtalo de nuevo.' })
      }
    }
  }

  return (
    <AuthLayout title="Menos vueltas. Más ciudad.">
      <p className="eyebrow">Bienvenido a SPAZIO</p>
      <h1 className="mt-2 text-4xl font-extrabold text-ink">Crea tu cuenta</h1>
      <p className="mt-3 text-subtle">
        Tu espacio en la ciudad empieza aquí. Regístrate para reservar o publicar un parqueadero.
      </p>

      {errors.root && (
        <Alert tone="danger" className="mt-6">
          {errors.root.message}
        </Alert>
      )}
      {correoExiste && (
        <Alert tone="warn" className="mt-6">
          Este correo ya tiene una cuenta.{' '}
          <Link to="/login" className="font-bold underline">
            Inicia sesión
          </Link>
          .
        </Alert>
      )}

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Nombre"
          placeholder="Tu nombre completo"
          autoComplete="name"
          error={errors.nombre?.message}
          {...register('nombre')}
        />
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="tu@correo.com"
          autoComplete="email"
          icon={<Mail size={20} />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Contraseña"
          placeholder="Crea una contraseña"
          autoComplete="new-password"
          passwordToggle
          hint="Al menos 8 caracteres."
          error={errors.password?.message}
          {...register('password')}
        />

        <Checkbox
          label="Acepto los Términos de uso y la Política de privacidad. Declaro ser mayor de 18 años."
          checked={!!terminos}
          {...register('terminos')}
        />
        {errors.terminos && (
          <p role="alert" className="-mt-2 text-sm text-danger">
            {errors.terminos.message}
          </p>
        )}

        <Button
          type="submit"
          className="w-full py-3.5 text-base"
          loading={isSubmitting}
          disabled={!terminos}
          rightIcon={<ArrowRight size={18} />}
        >
          Registrarme
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-subtle">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="font-bold text-teal hover:underline">
          Inicia sesión
        </Link>
      </p>
      <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-subtle">
        <Lock size={16} /> Tus datos, siempre protegidos.
      </p>
    </AuthLayout>
  )
}
