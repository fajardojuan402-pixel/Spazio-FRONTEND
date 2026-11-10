# SPAZIO — Frontend (incremento 1 · MVP parqueaderos)

Frontend del marketplace de parqueaderos **SPAZIO** en Bogotá, construido a partir
del diseño de Figma y alineado con los documentos del proyecto (**SRS v0.3**,
**SDD v1.1**, **PMP v2.0**). Implementa el incremento 1: registro, inicio de sesión,
búsqueda, publicación, reserva con pago simulado, confirmación con retención de
10 minutos, cancelación con reembolso y "mis reservas".

El **backend** (FastAPI + Supabase) lo desarrolla otro equipo. Esta app lo consume
mediante una capa de API con contrato definido y puede correr **sin backend** usando
un adaptador mock en memoria.

## Stack

- **React 18 + Vite + TypeScript** (Node 20 LTS)
- **React Router v6** (rutas protegidas)
- **Tailwind CSS** con tokens de diseño del SDD
- **TanStack Query** (carga, error, reintento, caché)
- **React Hook Form + Zod** (formularios y validación)
- **lucide-react** (iconos)
- **Vitest + Testing Library** (pruebas)

## Pantallas (SDD P-01…P-09)

| Ruta | Pantalla | RF |
|------|----------|----|
| `/registro` | P-01 Registro | RF-12 |
| `/login` | P-02 Inicio de sesión | RF-13 |
| `/buscar` | P-03 Búsqueda y resultados | RF-01 |
| `/espacio/:id` | P-04 Detalle del espacio | RF-06 |
| `/pago/:bookingId` | P-05 Pago simulado | RF-06, RF-07 |
| `/confirmacion/:bookingId` | P-06 Confirmación / error / expirada | RF-07 |
| `/mis-reservas` | P-07 Mis reservas (+ P-08 Cancelar) | RF-15, RF-08 |
| `/publicar` | P-09 Publicar espacio | RF-03, RF-05 |

Las rutas protegidas redirigen a `/login` si no hay sesión; tras entrar van a `/buscar`.

## Requisitos previos

- **Node 20 LTS** (funciona con Node 22). Comprueba con `node -v`.
- En **Windows/PowerShell**, si `npm` está bloqueado por la política de ejecución,
  usa `npm.cmd` en lugar de `npm` (p. ej. `npm.cmd install`).

## Instalación y ejecución

```bash
npm install
npm run dev
```

Abre la URL que muestra Vite (por defecto http://localhost:5173).

Otros comandos:

```bash
npm run build     # type-check (tsc -b) + build de producción
npm run preview   # sirve el build de producción
npm test          # corre las pruebas (Vitest) una vez
npm run test:watch
```

## Variables de entorno

Copia `.env.example` a `.env` y ajusta:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `VITE_API_URL` | URL base del backend (FastAPI). Se usa cuando `VITE_USE_MOCK=false`. | `https://localhost:8000` |
| `VITE_USE_MOCK` | `true` = adaptador mock en memoria (sin backend). `false` = backend real. | `true` |

Con `VITE_USE_MOCK=true` (por defecto) la app arranca con datos semilla
(Parqueadero Centro, Cubierto Chapinero, Parqueadero Norte; usuaria "Andrea M.";
tres reservas de ejemplo) y persiste los cambios **solo durante la sesión**.

## Cómo probar los 3 escenarios de pago (modo mock)

1. Inicia sesión (en mock, el correo semilla es `andrea@correo.com`; cualquier
   contraseña sirve para una cuenta conocida).
2. Entra a **Buscar** → abre un espacio → elige horario → **Reservar y pagar**.
3. En **Pago simulado** elige el escenario y pulsa *Pagar*:
   - **Aprobado** → la reserva se confirma (pantalla CONFIRMADA) y aparece en Mis reservas.
   - **Rechazado** → pantalla "No se completó el pago"; puedes volver mientras la retención siga vigente.
   - **Sin respuesta / error** → mismo resultado de pago no completado.
4. El **temporizador de 10 minutos** cuenta hacia atrás; al llegar a `00:00` la
   reserva pasa a **EXPIRADA**. "Cambiar horario" libera la retención y vuelve al detalle.

> El pago nunca mueve dinero real: el selector de escenario solo simula el resultado.

## Contrato de API (para el equipo de backend)

Los tipos TypeScript del contrato están en `src/api/types.ts` y la interfaz de
operaciones en `src/api/contract.ts`. El cliente HTTP real (`src/api/http.ts`)
agrega el JWT (`Authorization: Bearer`), parsea errores `{ code, message, field }`
y limpia la sesión ante **401**. El mock (`src/api/mock/`) implementa el **mismo
contrato** para poder demostrar la app. Estados de la reserva y escenarios de pago
usan la nomenclatura del SDD: `PENDIENTE_PAGO/CONFIRMADA/FINALIZADA/CANCELADA/EXPIRADA`
y `APROBADO/RECHAZADO/SIN_RESPUESTA`.

## Estructura

```
src/
  api/            contrato, tipos, cliente HTTP y adaptador mock
  components/
    ui/           Button, Input, Select, Checkbox, Badge, Card, Modal, Alert,
                  Countdown, Skeleton, EmptyState, Toast
    layout/       Header, Footer, Layout, AuthLayout, Stepper, Logo
  features/
    auth/         esquemas Zod de registro/login
    search/       ParkingCard, MapPanel
    booking/      ReservaResumen, CancelModal
    publish/      PhotosManager, AvailabilityManager
  hooks/          hooks de TanStack Query
  lib/            formato (COP/fechas), horarios/solapes, precios/reembolso
  pages/          una por pantalla (P-01…P-09)
  routes/         ProtectedRoute
  session/        SesionContext, AuthService
  tests/          pruebas Vitest (nombradas por RF)
docs/
  trazabilidad.md Requisito → pantalla/componente → prueba → estado
```

## Trazabilidad y calidad

Ver [`docs/trazabilidad.md`](docs/trazabilidad.md). Las pruebas se nombran con el
ID del requisito (p. ej. `RF07_muestra_expirada_al_llegar_a_cero`) y cubren:
validaciones de registro/login, cálculo de total, validación de horario, traslape
de periodos, countdown y expiración, resultado único de pago, preview y cálculo de
reembolso, filtros y contadores de Mis reservas, y el flujo feliz end-to-end.

## Decisiones (SRS/SDD sobre Figma)

- **Reembolso**: ≥ 24 h = 100%, < 24 h = 0% (RN-12 / SDD), aunque el copy del Figma diga "más de 24 horas".
- **Registro**: checkbox de Términos + mayoría de edad; "Registrarme" deshabilitado hasta aceptarlo.
- **Fotos** de publicación: opcionales (0–3), JPG/PNG máx 5 MB.
- **Disponibilidad**: periodos únicos (sin repetición semanal).
- **Confirmación**: una sola variante visible a la vez (no las tres juntas).
- **Recuperación de contraseña**: diferida; enlace visible pero deshabilitado.
