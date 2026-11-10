// Tipos mínimos del widget de Wompi cargado por checkout.wompi.co/widget.js

export interface WompiTransaction {
  id: string
  status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING'
  reference: string
  amount_in_cents: number
  payment_method_type?: string
}

interface WompiResult {
  transaction?: WompiTransaction
}

interface WidgetCheckoutConfig {
  currency: string
  amountInCents: number
  reference: string
  publicKey: string
  signature: { integrity: string }
  redirectUrl?: string
  expirationTime?: string
}

interface WidgetCheckoutInstance {
  open: (cb: (result: WompiResult) => void) => void
}

declare global {
  interface Window {
    WidgetCheckout: new (config: WidgetCheckoutConfig) => WidgetCheckoutInstance
  }
}

export {}
