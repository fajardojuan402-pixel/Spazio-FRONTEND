# Trazabilidad — Frontend SPAZIO (incremento 1, MVP parqueaderos)

Matriz **Requisito → pantalla/componente → prueba → estado**. Los requisitos y
pantallas siguen el SRS v0.3 y el SDD v1.1 (vocabulario único, Tabla 3; pantallas
P-01…P-09). Las pruebas están en `src/tests/` y se nombran con el ID del requisito.

> Estado del frontend: **implementado y verificado** (40 pruebas en verde,
> `tsc -b && vite build` sin errores). El backend (FastAPI + Supabase) es
> responsabilidad de otro equipo; esta app lo consume por el contrato de
> `src/api/` y corre con el adaptador mock (`VITE_USE_MOCK=true`).

## Requisitos funcionales

| Requisito | Pantalla (SDD) | Componentes / archivos | Prueba(s) | Estado |
|-----------|----------------|------------------------|-----------|--------|
| **RF-01** Buscar por ubicación | P-03 Búsqueda | `pages/Search.tsx`, `features/search/ParkingCard.tsx`, `features/search/MapPanel.tsx`, `hooks/queries.ts` | `search.test.tsx` (`RF01_muestra_resultados_cercanos`, `RF01_boton_ir_relanza_busqueda`), `mockClient.test.ts` (`RF01_busqueda_sin_resultados_con_radio_pequeno`) | ✅ |
| **RF-03** Publicar espacio | P-09 Publicar | `pages/Publish.tsx`, `features/publish/PhotosManager.tsx` | `publish.test.tsx` (`RF03_publicar_habilitado_con_datos_validos`, `RF03_publicar_deshabilitado_sin_precio`) | ✅ |
| **RF-05** Definir disponibilidad (sin traslapes) | P-09 Publicar | `features/publish/AvailabilityManager.tsx`, `lib/time.ts` (`periodsOverlap`) | `publish.test.tsx` (`RF05_rechaza_periodo_traslapado`), `lib.test.ts` (`RF05_detecta_traslape`, `RF05_no_traslape_contiguo`) | ✅ |
| **RF-06** Reservar y pagar | P-04 Detalle · P-05 Pago | `pages/SpaceDetail.tsx`, `pages/Payment.tsx`, `lib/pricing.ts` (`calcularMonto`), `lib/time.ts` (`validarHorario`) | `search.test.tsx` (`RF06_calcula_total_en_vivo`, `RF06_boton_deshabilitado_si_salida_antes_de_entrada`), `lib.test.ts` (`RF06_calcula_total_desglosado`), `mockClient.test.ts` (`RF06_RF07_pago_aprobado_confirma`) | ✅ |
| **RF-07** Confirmación automática (retención 10 min) | P-05 Pago · P-06 Confirmación | `components/ui/Countdown.tsx`, `pages/Confirmation.tsx` | `payment.test.tsx` (`RF07_muestra_expirada_al_llegar_a_cero`, `RF07_formatea_mm_ss`, `RF07_confirmada_muestra_solo_confirmacion`, `RF07_rechazado_muestra_solo_error`, `RF07_expirada_muestra_solo_expiracion`), `mockClient.test.ts` (`RF07_pago_rechazado_expira`) | ✅ |
| **RF-08** Cancelar con reembolso | P-07 Mis reservas · P-08 Cancelar | `features/booking/CancelModal.tsx`, `lib/pricing.ts` (`calcularReembolso`) | `myReservations.test.tsx` (`RF08_preview_muestra_reembolso_100_y_cancela`), `lib.test.ts` (`RF08_reembolso_100_con_24h_o_mas`, `RF08_reembolso_0_con_menos_de_24h`), `mockClient.test.ts` (`RF08_cancel_preview_100_con_30h`) | ✅ |
| **RF-12** Registro | P-01 Registro | `pages/Register.tsx`, `features/auth/schemas.ts` | `auth.test.tsx` (`RF12_boton_deshabilitado_hasta_aceptar_terminos`, `RF12_valida_correo_invalido_y_password_corta`, `RF12_correo_ya_registrado_muestra_aviso`) | ✅ |
| **RF-13** Inicio de sesión | P-02 Login | `pages/Login.tsx`, `session/AuthService.ts` | `auth.test.tsx` (`RF13_credenciales_invalidas_mensaje_generico`, `RF13_tiene_enlace_recuperacion_deshabilitado`) | ✅ |
| **RF-15** Consultar mis reservas | P-07 Mis reservas | `pages/MyReservations.tsx` | `myReservations.test.tsx` (`RF15_muestra_contadores_reales`, `RF15_filtro_confirmadas_muestra_solo_una`) | ✅ |

## Reglas de negocio implementadas en el cliente

| Regla | Dónde | Prueba | Estado |
|-------|-------|--------|--------|
| **RN-11** monto = precio × horas | `lib/pricing.ts` `calcularMonto` | `lib.test.ts` `RF06_calcula_total_desglosado` | ✅ |
| **RN-12** reembolso 100% si ≥24 h, 0% si <24 h | `lib/pricing.ts` `calcularReembolso` | `lib.test.ts` `RF08_reembolso_*`, `limite_exacto_24h_es_100` | ✅ |
| **RN-14** periodos sin traslape | `lib/time.ts` `periodsOverlap`, `AvailabilityManager.tsx` | `lib.test.ts` `RF05_detecta_traslape`, `publish.test.tsx` `RF05_rechaza_periodo_traslapado` | ✅ |
| **RN-15** mayoría de edad al registrarse | `features/auth/schemas.ts` (checkbox términos+18) | `auth.test.tsx` `RF12_boton_deshabilitado_hasta_aceptar_terminos` | ✅ |

## Requisitos no funcionales

| RNF | Cómo se cumple | Estado |
|-----|----------------|--------|
| **RNF-03** Compatibilidad (Chrome/Edge/Firefox/Safari) | React + Vite estándar, sin APIs propietarias | ✅ |
| **RNF-04** Responsive 360×640 + objetivos táctiles ≥44px | Tailwind responsivo, `min-h-touch`/`min-w-touch`, tabla→tarjetas en móvil (P-07) | ✅ |
| **RNF-05** Español, etiquetas visibles, teclado, foco, contraste | Labels en todos los campos, `:focus-visible`, modal con foco atrapado, roles aria | ✅ |
| **RNF-06** Búsqueda < 3 s | Consulta ligera vía TanStack Query (en mock, respuesta inmediata) | ✅ (dependiente del backend) |
| **RNF-01** No persistir datos de pago sensibles | El pago es solo selector de escenario; no hay campos de tarjeta | ✅ |
| **RNF-02** HTTPS/TLS | `VITE_API_URL` apunta a https; el cliente no fuerza http | ✅ (según despliegue) |

## Flujo feliz (end-to-end)

| Escenario | Prueba | Estado |
|-----------|--------|--------|
| Buscar → detalle → reservar → pagar (APROBADO) → confirmación | `flujoFeliz.test.tsx` `FLUJO_buscar_reservar_pagar_confirmar` | ✅ |

## Fuera de alcance (no implementado, por diseño)

RF-02 (comparar/ordenar), RF-04 (editar/pausar/eliminar publicación), RF-09
(reservas recibidas), RF-10 (pago al anfitrión), RF-11 (calificar), incremento 2
(deportes) y FV-01…FV-09. La recuperación de contraseña queda visible pero
deshabilitada (P-02).
