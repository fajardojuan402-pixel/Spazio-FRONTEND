import type { ReactNode } from 'react'

export default function EmptyState({
  icon,
  title,
  description,
  actions,
  className = '',
}: {
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl bg-teal-soft p-6 ${className}`}>
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5 text-teal">{icon}</span>}
        <div>
          <p className="font-semibold text-ink">{title}</p>
          {description && <p className="mt-1 text-sm text-subtle">{description}</p>}
        </div>
      </div>
      {actions && <div className="mt-4 flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}
