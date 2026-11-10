import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Alert from '../components/ui/Alert'
import { loginSchema, type LoginForm } from '../features/auth/schemas'
import { AuthService } from '../session/AuthService'
import { useSesion } from '../session/SesionContext'

interface FromState {
  from?: { pathname: string }
}

/**
 * P-02 Inicio de sesión (RF-13). Muestra "Correo o contraseña incorrectos"
 * sobre el formulario sin decir cuál falló; el botón se deshabilita y muestra
 * carga mientras valida. Deja el enlace de recuperación visible pero inactivo.
 */
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { iniciar } = useSesion()
  const destino = (location.state as FromState)?.from?.pathname ?? '/buscar'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: LoginForm) => {
    try {
      const sesion = await AuthService.iniciarSesion(data.email, data.password)
      iniciar(sesion)
      navigate(destino, { replace: true })
    } catch {
      // No revelamos cuál dato falló (RF-13).
      setError('root', { message: 'Correo o contraseña incorrectos' })
      setError('email', { message: ' ' })
      setError('password', { message: ' ' })
    }
  }

  return (
    <AuthLayout title="Tu próximo destino ya tiene espacio.">
      <p className="eyebrow">Qué bueno verte de nuevo</p>
      <h1 className="mt-2 text-4xl font-extrabold text-ink">Entra a SPAZIO</h1>
      <p className="mt-3 text-subtle">
        Accede a tus reservas y encuentra un espacio cerca de tu próximo destino.
      </p>

      {errors.root && (
        <Alert tone="danger" className="mt-6">
          {errors.root.message}
        </Alert>
      )}

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="tu@correo.com"
          autoComplete="email"
          icon={<Mail size={20} />}
          error={errors.email?.message?.trim() || undefined}
          {...register('email')}
        />
        <div>
          <Input
            label="Contraseña"
            placeholder="Ingresa tu contraseña"
            autoComplete="current-password"
            passwordToggle
            error={errors.password?.message?.trim() || undefined}
            {...register('password')}
          />
          {/* Recuperación diferida: visible pero deshabilitada (SRS recorte RF-13) */}
          <div className="mt-2 text-right">
            <span
              className="cursor-not-allowed text-sm font-medium text-subtle/60"
              aria-disabled="true"
              title="Disponible próximamente"
            >
              ¿Olvidaste tu contraseña?
            </span>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full py-3.5 text-base"
          loading={isSubmitting}
          rightIcon={<ArrowRight size={18} />}
        >
          Iniciar sesión
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-subtle">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="font-bold text-teal hover:underline">
          Crear cuenta
        </Link>
      </p>
      <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-subtle">
        <ShieldCheck size={16} /> Un acceso seguro, una ciudad más sencilla.
      </p>
    </AuthLayout>
  )
}
