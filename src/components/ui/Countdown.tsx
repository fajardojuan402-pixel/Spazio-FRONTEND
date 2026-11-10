import { useEffect, useRef, useState } from 'react'
import { Timer } from 'lucide-react'
import { formatMMSS } from '../../lib/format'

interface CountdownProps {
  /** Segundos restantes iniciales (vienen del servidor: segundosRestantes). */
  initialSeconds: number
  /** Se llama cuando el contador llega a 0 (RF-07: pasa a EXPIRADA). */
  onExpire?: () => void
  /** Re-sincroniza desde el servidor al enfocar la pestaña. */
  onResync?: () => Promise<number> | number
}

/**
 * Temporizador mm:ss para la retención de 10 minutos (RF-07).
 * En el último minuto cambia a color de advertencia y mayor peso.
 * Al enfocar la pestaña vuelve a sincronizar con el servidor.
 */
export default function Countdown({ initialSeconds, onExpire, onResync }: CountdownProps) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const expiredRef = useRef(false)

  useEffect(() => {
    setSeconds(initialSeconds)
    expiredRef.current = false
  }, [initialSeconds])

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => {
        const next = s - 1
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true
          onExpire?.()
          return 0
        }
        return Math.max(0, next)
      })
    }, 1000)
    return () => clearInterval(id)
  }, [onExpire])

  // Re-sincroniza al volver a la pestaña (visibilitychange).
  useEffect(() => {
    if (!onResync) return
    async function handle() {
      if (document.visibilityState === 'visible') {
        const fresh = await onResync!()
        if (typeof fresh === 'number') {
          setSeconds(fresh)
          if (fresh <= 0 && !expiredRef.current) {
            expiredRef.current = true
            onExpire?.()
          }
        }
      }
    }
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
  }, [onResync, onExpire])

  const lastMinute = seconds <= 60

  return (
    <div className="text-right" aria-live="polite">
      <p
        className={`tabular-nums font-extrabold ${lastMinute ? 'text-3xl text-warn' : 'text-3xl text-teal'}`}
      >
        <Timer size={18} className="mr-1 inline align-[-2px]" aria-hidden />
        {formatMMSS(seconds)}
      </p>
      <p className="text-xs text-subtle">restantes</p>
    </div>
  )
}
