# Requirements Document

## Introduction

El Cloudflare Worker actúa como proxy HTTP entre el frontend React (StockComparisonApp) y las APIs externas de datos financieros (Yahoo Finance y ExchangeRate API). El objetivo es eliminar los errores de CORS que impiden al navegador consumir esas APIs directamente, entregando datos reales de precios históricos de acciones y tipos de cambio USD/MXN.

## Glossary

- **Worker**: El Cloudflare Worker desplegado en `src/index.js` que actúa como proxy.
- **Client**: El frontend React (StockComparisonApp) ejecutándose en el navegador del usuario.
- **Yahoo_Finance_API**: El endpoint `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}` que provee datos históricos de precios de acciones.
- **ExchangeRate_API**: El endpoint `https://api.exchangerate-api.com/v4/latest/USD` que provee el tipo de cambio USD/MXN.
- **Symbol**: Ticker bursátil de una acción (ej. AAPL, MSFT, AMZN).
- **Interval**: Granularidad temporal de los datos (ej. `1d`, `1wk`, `1mo`).
- **Range**: Período histórico solicitado (ej. `1mo`, `3mo`, `1y`).
- **CORS**: Cross-Origin Resource Sharing, política del navegador que bloquea peticiones a dominios distintos al origen de la página.
- **Sector**: Agrupación de acciones por industria (ej. Tecnología, Bebidas). El usuario puede crear, editar y eliminar sectores.
- **TimeRange**: Período de tiempo seleccionado para la gráfica (ej. 1 hora, 6 horas, 1 mes).

---

## Requirements

### Requirement 1: Proxy de datos históricos de acciones

**User Story:** As a developer, I want the Worker to proxy requests to Yahoo Finance, so that the React frontend can fetch real stock price data without CORS errors.

#### Acceptance Criteria

1. WHEN the Client sends a GET request to `/api/stock/{symbol}` with query parameters `interval` and `range`, THE Worker SHALL forward the request to `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={interval}&range={range}`.
2. WHEN Yahoo_Finance_API returns a successful response, THE Worker SHALL return the response body and status code to the Client unchanged.
3. WHEN Yahoo_Finance_API returns an HTTP error status (4xx or 5xx), THE Worker SHALL return the same HTTP status code and a JSON error body with a `message` field to the Client.
4. WHEN Yahoo_Finance_API does not respond within 10 seconds, THE Worker SHALL return HTTP 504 and a JSON error body with `message: "Upstream timeout"` to the Client.
5. THE Worker SHALL include the header `Content-Type: application/json` in all responses to the Client.
6. THE Worker SHALL include CORS headers (`Access-Control-Allow-Origin: *`) in all responses to the Client.

---

### Requirement 2: Proxy de tipo de cambio USD/MXN

**User Story:** As a developer, I want the Worker to proxy requests to ExchangeRate API, so that the React frontend can fetch the USD/MXN exchange rate without CORS errors.

#### Acceptance Criteria

1. WHEN the Client sends a GET request to `/api/exchange-rate`, THE Worker SHALL forward the request to `https://api.exchangerate-api.com/v4/latest/USD`.
2. WHEN ExchangeRate_API returns a successful response, THE Worker SHALL return the response body and status code to the Client unchanged.
3. WHEN ExchangeRate_API returns an HTTP error status (4xx or 5xx), THE Worker SHALL return the same HTTP status code and a JSON error body with a `message` field to the Client.
4. WHEN ExchangeRate_API does not respond within 10 seconds, THE Worker SHALL return HTTP 504 and a JSON error body with `message: "Upstream timeout"` to the Client.
5. THE Worker SHALL include the header `Content-Type: application/json` in all responses to the Client.
6. THE Worker SHALL include CORS headers (`Access-Control-Allow-Origin: *`) in all responses to the Client.

---

### Requirement 3: Manejo de preflight CORS (OPTIONS)

**User Story:** As a developer, I want the Worker to handle CORS preflight requests, so that browsers can successfully negotiate cross-origin access before sending data requests.

#### Acceptance Criteria

1. WHEN the Client sends an HTTP OPTIONS request to any route, THE Worker SHALL return HTTP 204 with the headers `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, OPTIONS`, and `Access-Control-Allow-Headers: Content-Type`.
2. THE Worker SHALL respond to OPTIONS requests without forwarding them to any upstream API.

---

### Requirement 4: Rutas no encontradas

**User Story:** As a developer, I want the Worker to return a clear error for unknown routes, so that misconfigured frontend requests are easy to diagnose.

#### Acceptance Criteria

1. WHEN the Client sends a request to a path that does not match `/api/stock/{symbol}` or `/api/exchange-rate`, THE Worker SHALL return HTTP 404 and a JSON body with `message: "Not found"`.
2. THE Worker SHALL include CORS headers (`Access-Control-Allow-Origin: *`) in the 404 response.

---

### Requirement 6: Gestión de sectores y acciones por el usuario

**User Story:** As a user, I want to create, edit, and delete sectors and their stocks, so that I can customize the app to track the companies I care about.

#### Acceptance Criteria

1. WHEN the user clicks "Agregar sector", THE app SHALL show a form to enter a sector name and at least one stock symbol.
2. WHEN the user submits a valid new sector, THE app SHALL add it to the sector list and persist it in `localStorage`.
3. WHEN the user clicks "Editar" on an existing sector, THE app SHALL allow renaming the sector and adding or removing stocks from it.
4. WHEN the user clicks "Eliminar" on a sector, THE app SHALL remove it from the list and from `localStorage`, unless it is the last remaining sector.
5. WHEN the user adds a stock symbol to a sector, THE app SHALL validate that the symbol is a non-empty string of 1–5 uppercase letters.
6. WHEN the user removes a stock from a sector, THE app SHALL prevent removal if it would leave the sector with zero stocks.
7. WHEN the app loads, THE app SHALL restore sectors and stocks from `localStorage` if available, otherwise use the default sectors.

---

### Requirement 7: Rangos de tiempo adicionales en la gráfica

**User Story:** As a user, I want to see stock data for the last 1 hour and last 6 hours, so that I can monitor intraday movements more closely.

#### Acceptance Criteria

1. THE app SHALL include "1 Hora" and "6 Horas" as selectable time range options alongside the existing options.
2. WHEN the user selects "1 Hora", THE app SHALL fetch data with `interval=2m` and `range=1h` from Yahoo Finance.
3. WHEN the user selects "6 Horas", THE app SHALL fetch data with `interval=5m` and `range=6h` from Yahoo Finance (using `range=1d` and trimming to last 6 hours if the API does not support `6h` directly).
4. THE app SHALL display the time (HH:MM) on the X axis when the selected range is 1 hour or 6 hours, instead of the date.

---

### Requirement 8: Reloj en tiempo real junto a la gráfica

**User Story:** As a user, I want to see the current time displayed next to the chart, so that I know when the data was last refreshed.

#### Acceptance Criteria

1. THE app SHALL display the current time (HH:MM:SS) in the chart panel, updating every second.
2. THE displayed time SHALL use the user's local timezone.

---

### Requirement 5: Validación de parámetros de acciones

**User Story:** As a developer, I want the Worker to validate required query parameters, so that malformed requests fail fast with a clear error instead of forwarding garbage to Yahoo Finance.

#### Acceptance Criteria

1. WHEN the Client sends a GET request to `/api/stock/{symbol}` without the `interval` query parameter, THE Worker SHALL return HTTP 400 and a JSON body with `message: "Missing required parameter: interval"`.
2. WHEN the Client sends a GET request to `/api/stock/{symbol}` without the `range` query parameter, THE Worker SHALL return HTTP 400 and a JSON body with `message: "Missing required parameter: range"`.
3. WHEN the Client sends a GET request to `/api/stock/{symbol}` and `symbol` is an empty string, THE Worker SHALL return HTTP 400 and a JSON body with `message: "Missing required parameter: symbol"`.
4. THE Worker SHALL include CORS headers (`Access-Control-Allow-Origin: *`) in all 400 responses.
