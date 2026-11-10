export interface BackendToken {
  access_token: string
  token_type: string
}

export interface BackendUser {
  id: string
  email: string
  full_name: string
  is_host: boolean
  created_at: string
}

export interface BackendAvailability {
  id: string
  space_id: string
  start_time: string
  end_time: string
}

export interface BackendSpace {
  id: string
  host_id: string
  title: string | null
  category: string
  address: string
  neighborhood: string | null
  conditions: string | null
  price_per_hour: number
  latitude: number
  longitude: number
  photos: string[]
  is_active: boolean
}

export interface BackendSpaceNearby extends BackendSpace {
  distance_meters: number
  availabilities: { start_time: string; end_time: string }[]
}

export interface BackendSpaceCreate extends BackendSpace {
  host_role_activated: boolean
}

export type BackendBookingStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED'

export interface BackendBooking {
  id: string
  space_id: string
  user_id: string
  start_time: string
  end_time: string
  hourly_price_snapshot: number
  total_amount: number
  status: BackendBookingStatus
  locked_until: string
  cancelled_at: string | null
  created_at: string
  is_cancellable?: boolean
  cancellation_reason?: string | null
  refund_percentage?: number | null
  refund_amount?: number | null
}

export interface BackendWompiCheckout {
  public_key: string
  currency: string
  amount_in_cents: number
  reference: string
  signature: string
}

export interface BackendPaymentResult {
  message: string
  payment_id: string
  status: string
  gateway_reference: string | null
}
