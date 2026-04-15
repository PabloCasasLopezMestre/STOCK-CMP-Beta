# Requirements Document

## Introduction

Esta feature añade dos capacidades a la sección de Comunidad de la app de comparación de acciones:

1. **Perfiles públicos de traders**: cualquier visitante (anónimo o con email) puede buscar traders por `@handle` y ver un panel con su perfil público (avatar, nombre, bio, país, ideas publicadas). Al hacer clic en el nombre/handle de un autor en el feed, se abre el mismo panel.

2. **Chat directo en tiempo real**: usuarios con email registrado pueden iniciar conversaciones privadas 1-a-1 con otros traders, ver la lista de sus chats activos y recibir notificaciones de mensajes no leídos. La mensajería usa Supabase Realtime (WebSocket) para entrega instantánea.

La tabla `profiles` ya existe con los campos `id`, `handle`, `display_name`, `bio`, `avatar_url`, `country`. La tabla `community_ideas` ya existe. La autenticación usa Supabase (anónimo + email magic link).

---

## Glossary

- **ProfileViewer**: Componente modal/panel que muestra el perfil público de un trader.
- **TraderSearch**: Campo de búsqueda de traders por `@handle` en la sección de Comunidad.
- **EmailUser**: Usuario autenticado en Supabase con email (magic link). Puede chatear.
- **AnonUser**: Usuario autenticado en Supabase de forma anónima. Solo puede ver perfiles y buscar.
- **ChatService**: Módulo que gestiona conversaciones, mensajes y suscripciones Realtime.
- **Conversation**: Registro de una conversación privada 1-a-1 entre dos EmailUsers.
- **Message**: Texto enviado por un participante dentro de una Conversation.
- **ConversationList**: Panel que muestra las Conversations activas del EmailUser autenticado.
- **UnreadBadge**: Indicador visual del número de Messages no leídos en una Conversation.
- **RealtimeChannel**: Canal de Supabase Realtime (WebSocket) suscrito a cambios en la tabla `messages`.

---

## Requirements

### Requirement 1: Ver perfil público de un trader

**User Story:** Como usuario (anónimo o con email), quiero ver el perfil público de un trader al hacer clic en su nombre o handle en el feed, para conocer más sobre él y sus ideas publicadas.

#### Acceptance Criteria

1. WHEN un usuario hace clic en el nombre o handle de un autor en el feed de ideas, THE ProfileViewer SHALL abrirse mostrando: avatar, `display_name`, `@handle`, `bio`, `country` y las últimas 20 ideas publicadas por ese autor.
2. THE ProfileViewer SHALL ser accesible tanto para AnonUser como para EmailUser.
3. WHEN el perfil no tiene `avatar_url`, THE ProfileViewer SHALL mostrar un avatar generado con la inicial del `display_name`.
4. WHEN el perfil no tiene `bio` o `country`, THE ProfileViewer SHALL omitir esos campos sin mostrar texto vacío ni placeholder.
5. WHEN el usuario cierra el ProfileViewer, THE ProfileViewer SHALL desmontarse y liberar la suscripción de datos.
6. IF la consulta del perfil devuelve un error, THEN THE ProfileViewer SHALL mostrar un mensaje de error descriptivo en lugar del contenido del perfil.

---

### Requirement 2: Buscar traders por @handle

**User Story:** Como usuario (anónimo o con email), quiero buscar traders escribiendo su `@handle` en un campo de búsqueda, para encontrar perfiles específicos sin necesidad de conocer su email.

#### Acceptance Criteria

1. THE TraderSearch SHALL aceptar texto libre y buscar coincidencias parciales en el campo `handle` de la tabla `profiles` (búsqueda tipo `ILIKE '%query%'`).
2. WHEN el campo de búsqueda contiene 2 o más caracteres, THE TraderSearch SHALL ejecutar la búsqueda y mostrar hasta 10 resultados con `avatar`, `display_name` y `@handle`.
3. WHEN el campo de búsqueda tiene menos de 2 caracteres, THE TraderSearch SHALL ocultar la lista de resultados sin ejecutar consultas.
4. WHEN el usuario hace clic en un resultado de búsqueda, THE ProfileViewer SHALL abrirse con el perfil del trader seleccionado.
5. IF la búsqueda no devuelve resultados, THEN THE TraderSearch SHALL mostrar el mensaje "No se encontraron traders con ese handle".
6. IF la consulta de búsqueda devuelve un error, THEN THE TraderSearch SHALL mostrar un mensaje de error descriptivo.
7. THE TraderSearch SHALL ignorar el prefijo `@` si el usuario lo escribe al inicio del término de búsqueda.

---

### Requirement 3: Iniciar y gestionar conversaciones de chat

**User Story:** Como EmailUser, quiero iniciar una conversación privada con otro trader desde su perfil público, para comunicarme directamente con él.

#### Acceptance Criteria

1. WHEN un EmailUser visualiza el ProfileViewer de otro EmailUser, THE ProfileViewer SHALL mostrar un botón "Enviar mensaje".
2. WHEN un EmailUser hace clic en "Enviar mensaje", THE ChatService SHALL crear una Conversation entre los dos usuarios si no existe una previa, o abrir la Conversation existente.
3. THE ChatService SHALL garantizar que cada par de usuarios tenga como máximo una Conversation activa (unicidad del par `(participant_a, participant_b)`).
4. IF el perfil visualizado pertenece a un AnonUser, THEN THE ProfileViewer SHALL ocultar el botón "Enviar mensaje".
5. IF el EmailUser autenticado intenta enviarse un mensaje a sí mismo, THEN THE ChatService SHALL rechazar la operación y mostrar un mensaje de error.
6. WHILE el usuario no está autenticado como EmailUser, THE ProfileViewer SHALL mostrar el botón "Enviar mensaje" deshabilitado con un tooltip que indique que se requiere cuenta con email.

---

### Requirement 4: Enviar y recibir mensajes en tiempo real

**User Story:** Como EmailUser, quiero enviar y recibir mensajes en tiempo real dentro de una conversación, para tener una comunicación fluida con otros traders.

#### Acceptance Criteria

1. WHEN un EmailUser envía un Message en una Conversation, THE ChatService SHALL persistir el Message en Supabase con `conversation_id`, `sender_id`, `body` y `created_at`.
2. WHEN un Message es persistido, THE RealtimeChannel SHALL entregar el Message al receptor en menos de 2 segundos bajo condiciones normales de red.
3. THE ChatService SHALL suscribirse al RealtimeChannel de la Conversation activa al abrirla y desuscribirse al cerrarla.
4. WHEN el usuario envía un Message con el campo `body` vacío o con solo espacios, THE ChatService SHALL rechazar el envío sin persistir el Message.
5. THE ChatService SHALL limitar el campo `body` de cada Message a 1000 caracteres; si el texto supera ese límite, THE ChatService SHALL truncar el texto antes de persistirlo.
6. IF la persistencia del Message falla, THEN THE ChatService SHALL mostrar un mensaje de error al remitente sin cerrar la ventana de chat.
7. THE ChatService SHALL mostrar los Messages de una Conversation ordenados por `created_at` ascendente.

---

### Requirement 5: Lista de conversaciones activas

**User Story:** Como EmailUser, quiero ver la lista de mis conversaciones activas con el último mensaje de cada una, para navegar rápidamente entre mis chats.

#### Acceptance Criteria

1. THE ConversationList SHALL mostrar todas las Conversations en las que participa el EmailUser autenticado, ordenadas por `last_message_at` descendente.
2. WHEN una Conversation recibe un nuevo Message, THE ConversationList SHALL actualizar la vista previa del último mensaje y el timestamp sin recargar la página.
3. THE ConversationList SHALL mostrar para cada Conversation: avatar y `display_name` del otro participante, texto del último Message (truncado a 60 caracteres) y timestamp relativo.
4. IF el EmailUser no tiene Conversations activas, THEN THE ConversationList SHALL mostrar el mensaje "Aún no tienes conversaciones. Busca un trader para empezar."
5. WHILE el EmailUser no está autenticado con email, THE ConversationList SHALL mostrar un mensaje indicando que se requiere cuenta con email para acceder al chat.

---

### Requirement 6: Notificaciones de mensajes no leídos

**User Story:** Como EmailUser, quiero ver cuántos mensajes no leídos tengo en cada conversación, para saber cuándo hay mensajes nuevos sin abrir cada chat.

#### Acceptance Criteria

1. THE UnreadBadge SHALL mostrar el número de Messages no leídos en cada Conversation de la ConversationList.
2. WHEN el EmailUser abre una Conversation, THE ChatService SHALL marcar todos los Messages de esa Conversation como leídos para ese usuario.
3. WHEN llega un nuevo Message a una Conversation que el EmailUser no tiene abierta, THE UnreadBadge SHALL incrementarse en 1 en tiempo real vía RealtimeChannel.
4. WHEN el total de Messages no leídos en todas las Conversations es mayor que 0, THE ConversationList SHALL mostrar un indicador de notificación en el acceso a la sección de chat.
5. IF el EmailUser tiene más de 99 Messages no leídos en una Conversation, THEN THE UnreadBadge SHALL mostrar "99+" en lugar del número exacto.

---

### Requirement 7: Esquema de base de datos para chat

**User Story:** Como desarrollador, quiero las tablas necesarias en Supabase para soportar conversaciones y mensajes con RLS, para garantizar que cada usuario solo acceda a sus propios datos.

#### Acceptance Criteria

1. THE ChatService SHALL utilizar una tabla `conversations` con columnas: `id` (uuid PK), `participant_a` (uuid FK a `auth.users`), `participant_b` (uuid FK a `auth.users`), `last_message_at` (timestamptz), `created_at` (timestamptz). La combinación `(participant_a, participant_b)` SHALL ser única con `participant_a < participant_b` para evitar duplicados.
2. THE ChatService SHALL utilizar una tabla `messages` con columnas: `id` (uuid PK), `conversation_id` (uuid FK a `conversations`), `sender_id` (uuid FK a `auth.users`), `body` (text, máx 1000 chars), `created_at` (timestamptz), `read_by_a` (boolean default false), `read_by_b` (boolean default false).
3. THE ChatService SHALL aplicar políticas RLS en `conversations` de modo que un usuario autenticado solo pueda leer y escribir filas donde `participant_a = auth.uid()` OR `participant_b = auth.uid()`.
4. THE ChatService SHALL aplicar políticas RLS en `messages` de modo que un usuario autenticado solo pueda leer mensajes de Conversations en las que participa, y solo pueda insertar mensajes donde `sender_id = auth.uid()`.
5. THE ChatService SHALL habilitar Supabase Realtime en la tabla `messages` para que los cambios se propaguen vía RealtimeChannel.
6. WHEN se inserta un nuevo Message, THE ChatService SHALL actualizar `last_message_at` en la Conversation correspondiente mediante un trigger de base de datos.
