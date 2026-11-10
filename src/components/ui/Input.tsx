import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
  icon?: ReactNode
  /** Si es true, muestra el botón ojo para alternar la visibilidad. */
  passwordToggle?: boolean
}

/**
 * Campo con etiqueta visible (RNF-05), ícono opcional, texto de ayuda,
 * mensaje de error junto al campo y ojo de contraseña.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, passwordToggle = false, type = 'text', id, className = '', ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const [show, setShow] = useState(false)
  const resolvedType = passwordToggle ? (show ? 'text' : 'password') : type

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-lg border bg-white px-4 py-3 text-sm text-ink placeholder:text-subtle/70 focus:outline-none focus:ring-2 ${
            error
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-line focus:border-teal focus:ring-teal/20'
          } ${icon || passwordToggle ? 'pr-11' : ''}`}
          {...rest}
        />
        {passwordToggle ? (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-2 flex min-h-touch min-w-touch items-center justify-center text-subtle hover:text-ink"
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {show ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        ) : (
          icon && (
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-subtle">
              {icon}
            </span>
          )
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
})

export default Input
