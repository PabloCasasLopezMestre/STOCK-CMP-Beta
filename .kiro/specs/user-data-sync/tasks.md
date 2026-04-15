# Implementation Plan: user-data-sync

## Overview

Implementar el SyncService como módulo singleton en JavaScript, crear la migración SQL para la tabla `user_data`, integrar el servicio en `main.jsx` y `AuthEmailPanel.jsx`, y cubrir las propiedades de corrección con tests de fast-check.

## Tasks

- [x] 1. Crear migración SQL para la tabla `user_data` con RLS
  - Crear `supabase/migrations/20260413000000_user_data.sql`
  - Definir tabla con columnas: `user_id` (uuid PK FK), `portfolio` (jsonb), `price_alerts` (jsonb), `preferences` (jsonb), `updated_at` (timestamptz)
  - Añadir política RLS: `user_id = auth.uid()` para SELECT, INSERT y UPDATE (incluye usuarios anónimos)
  - Inicializar valores por defecto en las columnas JSONB
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 4.3_

- [x] 2. Implementar `frontend/syncService.js`
  - [x] 2.1 Implementar `initSync()` — sesión anónima y carga inicial
    - Llamar a `getSupabase().auth.getSession()`; si no hay sesión, llamar a `signInAnonymously()`
    - Llamar a `loadUserData()` y retornar los datos
    - Si Supabase no está disponible (`getSupabase()` retorna `null`) o falla, leer desde localStorage
    - _Requirements: 4.1, 1.2, 2.2, 3.2, 6.1_

  - [x] 2.2 Implementar `loadUserData()` — lectura desde Supabase con fallback
    - Hacer `from('user_data').select().eq('user_id', uid).maybeSingle()`
    - Si la fila no existe, retornar valores por defecto (portfolio vacío, alertas `[]`, preferencias por defecto)
    - Si Supabase falla, leer `portfolio`, `priceAlerts` y `preferences` desde localStorage
    - _Requirements: 1.2, 1.4, 2.2, 2.4, 3.2, 3.4_

  - [x] 2.3 Implementar `syncPortfolio(portfolio)`, `syncAlerts(alerts)`, `syncPreferences(preferences)`
    - Siempre escribir en localStorage primero (claves: `portfolio`, `priceAlerts`, `preferences`)
    - Hacer upsert en Supabase con `{ user_id, <campo> }` usando `.upsert()`
    - En éxito: llamar a `_flushPendingIfNeeded()` y limpiar `_sync_pending`
    - En error: marcar `localStorage.setItem('_sync_pending', 'true')` y loguear en consola
    - _Requirements: 1.1, 1.3, 1.5, 2.1, 2.3, 3.1, 3.3, 3.5, 6.1, 6.3, 7.2_

  - [x] 2.4 Implementar `_flushPendingIfNeeded()` — re-sync tras escritura exitosa
    - Si `localStorage.getItem('_sync_pending') === 'true'`, leer los tres campos de localStorage y hacer upsert completo en Supabase
    - Limpiar `_sync_pending` solo si el upsert tiene éxito
    - _Requirements: 6.2_

- [ ] 3. Checkpoint — verificar que el módulo syncService.js funciona de forma aislada
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Escribir tests de propiedades y unitarios para `syncService.js`
  - [ ] 4.1 Configurar archivo de test `test/user-data-sync.spec.js` con mocks de Supabase y localStorage
    - Crear helpers para mockear el cliente Supabase (cadena fluida `.from().upsert()`, `.from().select().eq().maybeSingle()`)
    - Crear mock de localStorage con `getItem`/`setItem`/`removeItem` rastreables
    - _Requirements: 1.1, 2.1, 3.1_

  - [ ]* 4.2 Property 1 — `syncXxx` escribe el payload correcto en Supabase
    - **Property 1: Sync escribe el payload correcto en Supabase**
    - **Validates: Requirements 1.1, 1.5, 2.1, 3.1, 3.5**
    - Usar arbitrarios de fast-check para portfolios, arrays de alertas y preferencias
    - Verificar que el mock de upsert recibió exactamente los campos del modelo de datos

  - [ ]* 4.3 Property 2 — Fallback a localStorage cuando Supabase falla en escritura
    - **Property 2: Fallback a localStorage cuando Supabase falla en escritura**
    - **Validates: Requirements 1.3, 2.3, 3.3, 6.1**
    - Mock de Supabase que rechaza con error; verificar `localStorage.setItem` y `_sync_pending`

  - [ ]* 4.4 Property 3 — Carga desde localStorage cuando Supabase falla en lectura
    - **Property 3: Carga desde localStorage cuando Supabase falla en lectura**
    - **Validates: Requirements 1.4, 2.4, 3.4, 6.1**
    - Datos pre-cargados en mock de localStorage; mock de Supabase que rechaza en select
    - Verificar que `loadUserData()` retorna los datos de localStorage

  - [ ]* 4.5 Property 4 — Todas las escrituras usan upsert con el user_id correcto
    - **Property 4: Todas las escrituras usan upsert con el user_id correcto**
    - **Validates: Requirements 4.2, 7.2**
    - Arbitrarios: UUIDs aleatorios como user_id, datos aleatorios
    - Verificar que `.upsert()` fue llamado con `{ user_id: <uuid> }` en cada operación

  - [ ]* 4.6 Property 5 — Re-sincronización en la siguiente escritura exitosa
    - **Property 5: Re-sincronización en la siguiente escritura exitosa**
    - **Validates: Requirements 6.2**
    - Setup: `_sync_pending = true` en localStorage con datos aleatorios; primera llamada falla, segunda tiene éxito
    - Verificar que Supabase recibe los datos de localStorage y `_sync_pending` se limpia

  - [ ]* 4.7 Tests unitarios de ejemplo para `initSync()` y `loadUserData()`
    - `initSync()` sin sesión activa llama a `signInAnonymously`
    - `loadUserData()` con Supabase disponible retorna datos de Supabase
    - `loadUserData()` con fila nueva retorna valores por defecto
    - Post-`linkIdentity` exitoso: `loadUserData()` retorna los mismos datos
    - Post-`linkIdentity` fallido: la sesión anónima sigue activa
    - _Requirements: 4.1, 5.1, 5.2, 5.3_

- [ ] 5. Actualizar `vitest.frontend.config.js` para incluir los tests de user-data-sync
  - Añadir `test/user-data-sync.spec.js` al array `include`
  - _Requirements: (infraestructura de tests)_

- [x] 6. Integrar `syncService` en `main.jsx`
  - [x] 6.1 Llamar a `initSync()` en `useEffect` al montar y aplicar datos al estado de React
    - Aplicar `portfolio` al estado de `PortfolioSimulator` (pasar como prop inicial o via callback)
    - Aplicar `alerts` a `setAlerts`
    - Aplicar `preferences` a `setCurrency`, `setEnabledCurrencies`, `setLang`, `setUserTimezone`
    - _Requirements: 1.2, 2.2, 3.2, 4.1_

  - [x] 6.2 Envolver los setters de estado para llamar también al `syncXxx` correspondiente
    - `updatePortfolio` → también llama `syncService.syncPortfolio(next)`
    - `setAlerts` (en addAlert/removeAlert de PortfolioSimulator) → también llama `syncService.syncAlerts(next)`
    - `setEnabledCurrencies`, `setLang`, `setUserTimezone`, `setCurrency` → también llaman `syncService.syncPreferences({...})`
    - _Requirements: 1.1, 2.1, 3.1_

- [x] 7. Integrar `loadUserData()` en `AuthEmailPanel.jsx` tras `SIGNED_IN`
  - En el handler de `onAuthStateChange`, cuando el evento es `SIGNED_IN`, llamar a `loadUserData()` y aplicar los datos al estado de la app mediante callbacks
  - _Requirements: 5.1, 5.2_

- [x] 8. Checkpoint final — Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los tests de propiedades usan fast-check (ya instalado) con mínimo 100 iteraciones
- Los tests de frontend se ejecutan con: `npx vitest --run --config vitest.frontend.config.js`
- La migración SQL debe ejecutarse en el SQL Editor de Supabase o mediante `supabase db push`
