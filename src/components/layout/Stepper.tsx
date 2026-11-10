import { Check } from 'lucide-react'

const STEPS = [
  { n: 1, label: 'Elige tu espacio' },
  { n: 2, label: 'Pago simulado' },
  { n: 3, label: 'Confirmación' },
] as const

/**
 * Stepper de 3 pasos (P-04 → P-05 → P-06). `current` marca el paso activo;
 * los anteriores se muestran completados. Accesible con aria-current.
 */
export default function Stepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-3 text-sm">
      {STEPS.map((step, i) => {
        const done = step.n < current
        const active = step.n === current
        return (
          <li key={step.n} className="flex flex-1 items-center gap-3 last:flex-none">
            <span className="flex items-center gap-2.5" aria-current={active ? 'step' : undefined}>
              <span
                className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold ${
                  done || active ? 'bg-teal text-white' : 'bg-line text-subtle'
                }`}
              >
                {done ? <Check size={14} aria-hidden /> : step.n}
              </span>
              <span className={`font-semibold ${active || done ? 'text-ink' : 'text-subtle'}`}>
                {step.label}
              </span>
            </span>
            {i < STEPS.length - 1 && <span className="hidden h-px flex-1 bg-line sm:block" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}
