// Hooks de TanStack Query sobre el ApiClient: carga, error, reintento y caché.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type {
  CreateBookingRequest,
  CreateSpaceRequest,
  EstadoFiltro,
  PayRequest,
  SearchParams,
} from '../api/types'

// --- Búsqueda y espacios ----------------------------------------------------

export function useSearchSpaces(params: SearchParams, enabled: boolean) {
  return useQuery({
    queryKey: ['spaces', 'search', params],
    queryFn: () => api.searchSpaces(params),
    enabled,
  })
}

export function useSpace(id: string | undefined) {
  return useQuery({
    queryKey: ['space', id],
    queryFn: () => api.getSpace(id!),
    enabled: !!id,
  })
}

// --- Publicar ---------------------------------------------------------------

export function useCreateSpace() {
  return useMutation({
    mutationFn: (body: CreateSpaceRequest) => api.createSpace(body),
  })
}

// --- Reservas ---------------------------------------------------------------

export function useCreateBooking() {
  return useMutation({
    mutationFn: (body: CreateBookingRequest) => api.createBooking(body),
  })
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => api.getBooking(id!),
    enabled: !!id,
  })
}

export function usePayBooking() {
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PayRequest }) => api.payBooking(id, body),
  })
}

export function useReleaseHold() {
  return useMutation({
    mutationFn: (id: string) => api.releaseHold(id),
  })
}

export function useMyBookings(estado: EstadoFiltro) {
  return useQuery({
    queryKey: ['bookings', 'me', estado],
    queryFn: () => api.myBookings(estado),
  })
}

export function useCancelPreview(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['booking', id, 'cancel-preview'],
    queryFn: () => api.cancelPreview(id!),
    enabled: !!id && enabled,
    staleTime: 0,
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.cancelBooking(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookings', 'me'] }),
  })
}
