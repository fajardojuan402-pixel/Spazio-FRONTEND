import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

type ToastTone = 'success' | 'info' | 'danger'
interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const toneCfg: Record<ToastTone, { cls: string; Icon: typeof Info }> = {
  success: { cls: 'border-success/30 text-success', Icon: CheckCircle2 },
  info: { cls: 'border-teal/30 text-teal', Icon: Info },
  danger: { cls: 'border-danger/30 text-danger', Icon: XCircle },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = Date.now() + Math.random()
      setItems((prev) => [...prev, { id, tone, message }])
      setTimeout(() => remove(id), 4000)
    },
    [remove],
  )

  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
        aria-live="polite"
        role="status"
      >
        {items.map((t) => {
          const { cls, Icon } = toneCfg[t.tone]
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-pop ${cls}`}
            >
              <Icon size={20} className="flex-none" aria-hidden />
              <p className="flex-1 text-sm font-medium text-ink">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="text-subtle hover:text-ink"
                aria-label="Cerrar aviso"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
