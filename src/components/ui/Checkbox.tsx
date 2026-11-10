import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { Check } from 'lucide-react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  description?: ReactNode
}

/** Checkbox accesible con área táctil >= 44px. */
const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, id, checked, className = '', ...rest },
  ref,
) {
  const autoId = useId()
  const cbId = id ?? autoId
  return (
    <label htmlFor={cbId} className={`flex cursor-pointer items-start gap-3 ${className}`}>
      <span className="relative flex min-h-touch min-w-touch items-center justify-center">
        <input ref={ref} id={cbId} type="checkbox" checked={checked} className="peer sr-only" {...rest} />
        <span
          aria-hidden
          className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-white text-white transition peer-checked:border-teal peer-checked:bg-teal peer-focus-visible:ring-2 peer-focus-visible:ring-teal/40"
        >
          {checked && <Check size={16} />}
        </span>
      </span>
      <span className="pt-2.5 text-sm">
        <span className="font-semibold text-ink">{label}</span>
        {description && <span className="ml-1 text-subtle">{description}</span>}
      </span>
    </label>
  )
})

export default Checkbox
