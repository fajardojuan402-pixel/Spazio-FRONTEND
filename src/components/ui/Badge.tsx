import type { ReactNode } from 'react'

type Tone = 'teal' | 'success' | 'warn' | 'danger' | 'muted'

const toneClass: Record<Tone, string> = {
  teal: 'bg-teal-soft text-teal',
  success: 'bg-success-soft text-success',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  muted: 'bg-canvas text-subtle',
}

export default function Badge({
  tone = 'teal',
  children,
  className = '',
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
