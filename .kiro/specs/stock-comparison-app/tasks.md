# Implementation Plan: Stock Comparison App — Cloudflare Worker Proxy

## Overview

Implementar el Worker proxy en `src/index.js`, instalar `fast-check`, escribir los tests de ejemplo y property-based tests, y actualizar el frontend React para apuntar al Worker.

## Tasks

- [x] 1. Implementar el Worker proxy en `src/index.js`
  - [x] 1.1 Implementar utilidades compartidas: `jsonResponse`, `withCors`, `proxyRequest`
    - `jsonResponse(body, status)`: construye una `Response` con body JSON y status dado
    - `withCors(response)`: añade `Access-Control-Allow-Origin: *` y `Content-Type: application/json`
    - `proxyRequest(url)`: hace `fetch(url, { signal: AbortSignal.timeout(10_000) })`, maneja 2xx pass-through, 4xx/5xx con mismo status + `{ message }`, timeout → 504, error de red → 502
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.2 Implementar los route handlers: `handleStockRequest`, `handleExchangeRateRequest`, `handlePreflight`, `handleNotFound`
    - `handleStockRequest(symbol, interval, range)`: valida parámetros, construye URL Yahoo Finance, llama a `proxyRequest`
    - `handleExchangeRateRequest()`: llama a `proxyRequest(EXCHANGE_RATE_URL)`
    - `handlePreflight()`: devuelve 204 con headers CORS preflight
    - `handleNotFound()`: devuelve 404 con `{ message: "Not found" }`
    - _Requirements: 1.1, 2.1, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 5.3, 5.4_

  - [x] 1.3 Implementar el entry point `fetch(request, env, ctx)` con routing por URL
    - Parsear la URL, despachar a los handlers según la ruta y el método HTTP
    - Aplicar `withCors` a todas las respuestas
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 2. Instalar `fast-check` y escribir los tests de ejemplo en `test/index.spec.js`
  - [x] 2.1 Instalar `fast-check` como devDependency
    - Ejecutar `npm install --save-dev fast-check`
    - _Requirements: (prerequisito para property tests)_

  - [x] 2.2 Reemplazar `test/index.spec.js` con tests de ejemplo concretos
    - Test: timeout en Yahoo Finance → 504 + `{ message: "Upstream timeout" }`
    - Test: timeout en ExchangeRate → 504 + `{ message: "Upstream timeout" }`
    - Test: GET `/api/exchange-rate` llama a la URL upstream correcta
    - Usar `worker.fetch(request, env, ctx)` con mock de `fetch` global para simular timeouts
    - _Requirements: 1.4, 2.4_

- [x] 3. Escribir los property-based tests en `test/properties.spec.js`
  - [x] 3.1 Crear `test/properties.spec.js` e implementar Property 1: CORS headers invariant
    - Para cualquier ruta (válida, inválida, preflight), la respuesta incluye `Access-Control-Allow-Origin: *` y `Content-Type: application/json`
    - Tag: `Feature: stock-comparison-app, Property 1: CORS headers invariant`
    - _Requirements: 1.5, 1.6, 2.5, 2.6, 4.2, 5.4_

  - [x] 3.2 Implementar Property 2: Proxy pass-through para respuestas exitosas
    - Para cualquier status 2xx y body arbitrario del mock upstream, el Worker devuelve el mismo status y body
    - Tag: `Feature: stock-comparison-app, Property 2: Proxy pass-through para respuestas exitosas`
    - _Requirements: 1.2, 2.2_

  - [x] 3.3 Implementar Property 3: Upstream error pass-through
    - Para cualquier status en [400, 599], el Worker devuelve el mismo status y un body JSON con campo `message`
    - Tag: `Feature: stock-comparison-app, Property 3: Upstream error pass-through`
    - _Requirements: 1.3, 2.3_

  - [x] 3.4 Implementar Property 4: Preflight OPTIONS para cualquier ruta
    - Para cualquier path, OPTIONS devuelve 204 con los tres headers CORS preflight sin llamar al upstream
    - Tag: `Feature: stock-comparison-app, Property 4: Preflight OPTIONS para cualquier ruta`
    - _Requirements: 3.1, 3.2_

  - [x] 3.5 Implementar Property 5: 404 para rutas desconocidas
    - Para cualquier path que no sea `/api/stock/{symbol}` ni `/api/exchange-rate`, el Worker devuelve 404 con `{ message: "Not found" }`
    - Tag: `Feature: stock-comparison-app, Property 5: 404 para rutas desconocidas`
    - _Requirements: 4.1_

  - [x] 3.6 Implementar Property 6: Validación de parámetros de stock
    - Para cualquier combinación de parámetros ausentes en `/api/stock/{symbol}`, el Worker devuelve 400 con `message` indicando el parámetro faltante
    - Tag: `Feature: stock-comparison-app, Property 6: Validación de parámetros de stock`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 3.7 Implementar Property 7: Construcción correcta de URL upstream para stock
    - Para cualquier combinación válida de `symbol`, `interval` y `range`, la URL construida tiene la forma `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={interval}&range={range}`
    - Tag: `Feature: stock-comparison-app, Property 7: Construcción correcta de URL upstream para stock`
    - _Requirements: 1.1_

- [x] 4. Checkpoint — Asegurarse de que todos los tests pasan
  - Ejecutar `npx vitest --run` y verificar que todos los tests pasan sin errores.
  - Preguntar al usuario si hay dudas antes de continuar.

- [x] 5. Actualizar el frontend React para apuntar al Worker y agregar nuevas funcionalidades
  - [x] 5.1 Reemplazar las URLs directas por las rutas del Worker
    - Cambiar `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?...` por `/api/stock/{symbol}?interval=...&range=...`
    - Cambiar `https://api.exchangerate-api.com/v4/latest/USD` por `/api/exchange-rate`
    - _Requirements: 1.1, 2.1_

  - [x] 5.2 Agregar rangos de tiempo "1 Hora" y "6 Horas"
    - Añadir `'1hour': { label: '1 Hora', interval: '2m', range: '1h' }` y `'6hours': { label: '6 Horas', interval: '5m', range: '1d' }` al objeto `timeRanges`
    - Para "6 Horas", filtrar los datos del response para mostrar solo los últimos 360 minutos
    - Cuando el rango sea `1hour` o `6hours`, formatear el eje X con HH:MM en lugar de fecha
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 5.3 Mostrar reloj en tiempo real junto a la gráfica
    - Agregar un `useEffect` con `setInterval` de 1 segundo que actualice un estado `currentTime`
    - Mostrar `currentTime` formateado como HH:MM:SS en el panel de la gráfica
    - _Requirements: 8.1, 8.2_

  - [x] 5.4 Implementar gestión de sectores: agregar y eliminar sectores
    - Agregar botón "+" para crear un nuevo sector con nombre y lista de símbolos
    - Agregar botón de eliminar en cada sector (deshabilitado si es el último)
    - Persistir sectores en `localStorage` y restaurarlos al cargar la app
    - _Requirements: 6.1, 6.2, 6.4, 6.7_

  - [x] 5.5 Implementar gestión de stocks dentro de un sector: agregar y quitar
    - En la vista de sector activo, mostrar botón "+" para agregar un símbolo nuevo
    - Validar que el símbolo sea 1–5 letras mayúsculas antes de agregarlo
    - Mostrar botón "×" en cada stock para quitarlo del sector (deshabilitado si es el último)
    - Persistir cambios en `localStorage`
    - _Requirements: 6.3, 6.5, 6.6, 6.7_

- [x] 6. Checkpoint final — Asegurarse de que todos los tests pasan
  - Ejecutar `npx vitest --run` y verificar que todos los tests pasan sin errores.
  - Preguntar al usuario si hay dudas antes de continuar.

## Notes

- Las sub-tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los property-based tests usan `fast-check` con mínimo 100 iteraciones por propiedad
- Los tests de ejemplo usan mocks del `fetch` global para simular timeouts sin llamadas reales a las APIs
