# Requirements Document

## Introduction

Actualmente la app de comparación de acciones guarda el portafolio simulado, las alertas de precio y las preferencias de usuario exclusivamente en `localStorage`. Esta feature sincroniza todos esos datos con Supabase para que persistan entre dispositivos y sesiones, tanto para usuarios anónimos como para usuarios con email. Si Supabase no está disponible, el sistema cae de vuelta a `localStorage` como respaldo.

## Glossary

- **SyncService**: Módulo encargado de leer y escribir datos de usuario en Supabase con fallback a localStorage.
- **Portfolio**: Objeto que contiene `cash`, `holdings`, `transactions`, `deposits` y `dividendsReceived` de un usuario.
- **PriceAlert**: Objeto con `id`, `symbol`, `condition` (`above` | `below`) y `price` que representa una alerta de precio configurada por el usuario.
- **Preferences**: Objeto con `currency`, `lang`, `timezone` y `enabledCurrencies` del usuario.
- **AnonymousUser**: Usuario autenticado en Supabase mediante sign-in anónimo (sin email).
- **EmailUser**: Usuario autenticado en Supabase con email y contraseña.
- **LocalFallback**: Mecanismo que usa `localStorage` cuando Supabase no está disponible o devuelve error.
- **MigrationProcess**: Proceso de transferir datos de un AnonymousUser a un EmailUser al vincular el email.

---

## Requirements

### Requirement 1: Almacenamiento del portafolio en Supabase

**User Story:** Como usuario, quiero que mi portafolio simulado se guarde en Supabase, para que mis datos persistan entre dispositivos y sesiones.

#### Acceptance Criteria

1. WHEN un usuario autenticado (anónimo o con email) modifica el Portfolio, THE SyncService SHALL persistir el Portfolio actualizado en Supabase dentro de los 2 segundos siguientes a la modificación.
2. WHEN la app se inicializa y existe una sesión activa, THE SyncService SHALL cargar el Portfolio desde Supabase antes de renderizar el componente PortfolioSimulator.
3. IF Supabase devuelve un error al guardar el Portfolio, THEN THE SyncService SHALL guardar el Portfolio en LocalFallback y registrar el error en consola.
4. IF Supabase no está disponible al inicializar la app, THEN THE SyncService SHALL cargar el Portfolio desde LocalFallback.
5. THE SyncService SHALL almacenar los campos `cash`, `holdings`, `transactions`, `deposits` y `dividendsReceived` del Portfolio como una columna JSONB en la tabla `user_data` de Supabase.

---

### Requirement 2: Almacenamiento de alertas de precio en Supabase

**User Story:** Como usuario, quiero que mis alertas de precio se guarden en Supabase, para no perderlas al cambiar de dispositivo.

#### Acceptance Criteria

1. WHEN un usuario autenticado agrega o elimina una PriceAlert, THE SyncService SHALL persistir el array actualizado de PriceAlerts en Supabase dentro de los 2 segundos siguientes al cambio.
2. WHEN la app se inicializa y existe una sesión activa, THE SyncService SHALL cargar las PriceAlerts desde Supabase.
3. IF Supabase devuelve un error al guardar las PriceAlerts, THEN THE SyncService SHALL guardar las PriceAlerts en LocalFallback y registrar el error en consola.
4. IF Supabase no está disponible al inicializar la app, THEN THE SyncService SHALL cargar las PriceAlerts desde LocalFallback.

---

### Requirement 3: Almacenamiento de preferencias en Supabase

**User Story:** Como usuario, quiero que mis preferencias (moneda, idioma, zona horaria, monedas habilitadas) se guarden en Supabase, para tener la misma configuración en todos mis dispositivos.

#### Acceptance Criteria

1. WHEN un usuario autenticado modifica las Preferences, THE SyncService SHALL persistir las Preferences actualizadas en Supabase dentro de los 2 segundos siguientes al cambio.
2. WHEN la app se inicializa y existe una sesión activa, THE SyncService SHALL cargar las Preferences desde Supabase y aplicarlas al estado de la app.
3. IF Supabase devuelve un error al guardar las Preferences, THEN THE SyncService SHALL guardar las Preferences en LocalFallback y registrar el error en consola.
4. IF Supabase no está disponible al inicializar la app, THEN THE SyncService SHALL cargar las Preferences desde LocalFallback.
5. THE SyncService SHALL almacenar `currency`, `lang`, `timezone` y `enabledCurrencies` como campos de las Preferences.

---

### Requirement 4: Soporte para usuarios anónimos

**User Story:** Como usuario anónimo, quiero que mis datos se guarden en Supabase sin necesidad de registrarme, para no perder mi portafolio si cierro el navegador.

#### Acceptance Criteria

1. WHEN un AnonymousUser abre la app por primera vez, THE SyncService SHALL crear una sesión anónima en Supabase mediante `signInAnonymously` si no existe sesión activa.
2. WHILE existe una sesión de AnonymousUser activa, THE SyncService SHALL sincronizar el Portfolio, las PriceAlerts y las Preferences del AnonymousUser con Supabase usando su `user_id` como clave.
3. THE SyncService SHALL aplicar Row Level Security en Supabase de modo que cada usuario solo pueda leer y escribir sus propios datos.

---

### Requirement 5: Migración de datos al vincular email

**User Story:** Como usuario anónimo que decide registrar su email, quiero que todos mis datos migren automáticamente a mi nueva cuenta, para no perder mi historial.

#### Acceptance Criteria

1. WHEN un AnonymousUser vincula un email a su cuenta mediante `linkIdentity`, THE SyncService SHALL conservar todos los datos existentes del AnonymousUser bajo el mismo `user_id` en Supabase.
2. WHEN el proceso de vinculación de email se completa exitosamente, THE SyncService SHALL verificar que el Portfolio, las PriceAlerts y las Preferences del usuario siguen accesibles con la nueva identidad de EmailUser.
3. IF el proceso de vinculación de email falla, THEN THE SyncService SHALL mantener la sesión de AnonymousUser sin pérdida de datos.

---

### Requirement 6: Fallback a localStorage

**User Story:** Como usuario, quiero que la app siga funcionando aunque Supabase no esté disponible, para no perder acceso a mis datos.

#### Acceptance Criteria

1. WHILE Supabase no está disponible, THE SyncService SHALL leer y escribir el Portfolio, las PriceAlerts y las Preferences exclusivamente en LocalFallback.
2. WHEN Supabase vuelve a estar disponible después de un período de indisponibilidad, THE SyncService SHALL sincronizar los datos de LocalFallback hacia Supabase en la siguiente operación de escritura.
3. THE SyncService SHALL detectar la indisponibilidad de Supabase mediante el error de respuesta de la operación y no mediante polling activo.

---

### Requirement 7: Esquema de base de datos

**User Story:** Como desarrollador, quiero una tabla dedicada en Supabase para los datos de usuario, para mantener separados los datos de portafolio/alertas/preferencias del perfil de comunidad.

#### Acceptance Criteria

1. THE SyncService SHALL utilizar una tabla `user_data` en Supabase con columnas: `user_id` (uuid, PK, FK a `auth.users`), `portfolio` (jsonb), `price_alerts` (jsonb), `preferences` (jsonb), `updated_at` (timestamptz).
2. THE SyncService SHALL usar `upsert` (INSERT ... ON CONFLICT DO UPDATE) para todas las operaciones de escritura en `user_data`.
3. THE SyncService SHALL aplicar una política RLS en `user_data` que permita a cada usuario autenticado (incluyendo AnonymousUser) leer y escribir únicamente la fila donde `user_id = auth.uid()`.
4. WHEN se crea una nueva fila en `user_data`, THE SyncService SHALL inicializar `portfolio` con el Portfolio por defecto, `price_alerts` con un array vacío y `preferences` con los valores por defecto de la app.
