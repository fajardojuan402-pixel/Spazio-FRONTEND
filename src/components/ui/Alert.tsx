import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, FlaskConical, Info, XCircle } from 'lucide-react'

type Tone = 'info' | 'success' | 'warn' | 'danger' | 'sim'

const config: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: 'bg-teal-soft text-teal', Icon: Info },
  success: { cls: 'bg-success-soft text-success', Icon: CheckCircle2 },
  warn: { cls: 'bg-warn-soft text-warn', Icon: AlertTriangle },
  danger: { cls: 'bg-danger-soft text-danger', Icon: XCircle },
  sim: { cls: 'bg-warn-soft text-warn', Icon: FlaskConical },
}

export default function Alert({
  tone = 'info',
  title,
  children,
  className = '',
}: {
  tone?: Tone
  title?: ReactNode
  children?: ReactNode
  className?: string
}) {
  const { cls, Icon } = config[tone]
  return (
    <div className={`flex items-start gap-3 rounded-xl p-4 ${cls} ${className}`} role="alert">
      <Icon size={20} className="mt-0.5 flex-none" aria-hidden />
      <div className="text-sm">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
      </div>
    </div>
  )
}
