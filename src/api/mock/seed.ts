// Datos semilla del mock (SDD §5 nota: datos del Figma = semilla).
// Espacios: Parqueadero Centro, Cubierto Chapinero, Parqueadero Norte.
// Usuaria de ejemplo: Andrea M. · 3 reservas (confirmada/cancelada/expirada).

import type { BookingListItem, SpaceDetail } from '../types'

export const SEED_USER = {
  id: 'u-andrea',
  nombre: 'Andrea M.',
  email: 'andrea@correo.com',
  rolAnfitrion: false,
}

export const SEED_SPACES: SpaceDetail[] = [
  {
    id: 'centro',
    titulo: 'Parqueadero Centro',
    direccion: 'Cra. 7 # 16-24, Centro',
    distanciaKm: 0.4,
    horario: '8:00 – 18:00',
    precioHora: 4000,
    tipoVehiculo: 'carro',
    cubierto: true,
    foto: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=70',
    lat: 4.5981,
    lng: -74.0758,
    descripcion:
      'Deja tu carro bajo techo en el corazón del Centro. Un parqueadero práctico para tus diligencias, reuniones o una vuelta por la ciudad. Reserva el horario que necesitas y conoce el monto antes de pagar.',
    fotos: [
      'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=1200&q=70',
      'https://images.unsplash.com/photo-1545179605-1296651e9d0c?auto=format&fit=crop&w=800&q=70',
      'https://images.unsplash.com/photo-1470224114660-3f6686c562eb?auto=format&fit=crop&w=800&q=70',
    ],
    periodos: [{ inicio: '2026-10-14T08:00', fin: '2026-10-14T18:00' }],
    horarioApertura: { desde: '08:00', hasta: '18:00' },
  },
  {
    id: 'chapinero',
    titulo: 'Cubierto Chapinero',
    direccion: 'Calle 63 # 11-40, Chapinero',
    distanciaKm: 0.8,
    horario: '24 horas',
    precioHora: 6000,
    tipoVehiculo: 'carro',
    cubierto: true,
    foto: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=70',
    lat: 4.6486,
    lng: -74.0629,
    descripcion:
      'Parqueadero cubierto disponible las 24 horas en Chapinero. Ideal para estadías largas y acceso cómodo a la zona rosa y de oficinas.',
    fotos: [
      'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=1200&q=70',
      'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?auto=format&fit=crop&w=800&q=70',
      'https://images.unsplash.com/photo-1604275689235-fdc521556c16?auto=format&fit=crop&w=800&q=70',
    ],
    periodos: [{ inicio: '2026-10-14T00:00', fin: '2026-10-14T23:59' }],
    horarioApertura: { desde: '00:00', hasta: '23:59' },
  },
]

export function seedBookings(): BookingListItem[] {
  return [
    {
      id: 'r-centro',
      espacio: {
        id: 'centro',
        titulo: 'Parqueadero Centro',
        direccion: 'Cra. 7 # 16-24 · Centro',
        foto: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?auto=format&fit=crop&w=800&q=70',
      },
      ciudad: 'Bogotá',
      fecha: '2026-10-14',
      desde: '10:00',
      hasta: '13:00',
      horas: 3,
      monto: 12000,
      estado: 'CONFIRMADA',
      motivo: 'Tu espacio está reservado',
      horasParaInicio: 30,
    },
    {
      id: 'r-chapi',
      espacio: {
        id: 'chapinero',
        titulo: 'Cubierto Chapinero',
        direccion: 'Chapinero',
        foto: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?auto=format&fit=crop&w=800&q=70',
      },
      ciudad: 'Bogotá',
      fecha: '2026-10-12',
      desde: '09:00',
      hasta: '11:00',
      horas: 2,
      monto: 12000,
      estado: 'CANCELADA',
      motivo: 'Reembolso 100% aplicado',
      horasParaInicio: -40,
    },
    {
      id: 'r-norte',
      espacio: {
        id: 'norte',
        titulo: 'Parqueadero Norte',
        direccion: 'Zona Norte',
        foto: 'https://images.unsplash.com/photo-1470224114660-3f6686c562eb?auto=format&fit=crop&w=800&q=70',
      },
      ciudad: 'Bogotá',
      fecha: '2026-10-11',
      desde: '07:00',
      hasta: '08:00',
      horas: 1,
      monto: 0,
      estado: 'EXPIRADA',
      motivo: 'Periodo liberado',
      horasParaInicio: -60,
    },
  ]
}
