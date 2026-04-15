# Implementation Plan: trader-profiles-chat

## Overview

Implementación incremental: primero la migración SQL, luego el módulo `chatService.js`, después los componentes React (`TraderSearch`, `ProfileViewer`, `ChatWindow`, `ConversationList`) y finalmente la integración en `Community.jsx`.

## Tasks

- [x] 1. Migración SQL: tablas conversations y messages
  - Crear `supabase/migrations/20260414000000_chat.sql` con las tablas `conversations` y `messages`, constraints, índices, trigger `update_conversation_last_message`, políticas RLS y publicación Realtime.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 2. Módulo chatService.js
  - [x] 2.1 Implementar `getOrCreateConversation`, `sendMessage`, `markAsRead` y `getUnreadCount` en `frontend/chatService.js`
    - `getOrCreateConversation` normaliza el par poniendo el UUID menor como `participant_a`; lanza error si `userA === userB`.
    - `sendMessage` trunca `body` a 1000 chars antes de persistir; rechaza si `body.trim()` está vacío.
    - `markAsRead` actualiza `read_by_a`/`read_by_b` según qué participante es el usuario.
    - `getUnreadCount` cuenta mensajes donde el campo `read_by_*` del usuario es false.
    - _Requirements: 3.2, 3.3, 3.5, 4.1, 4.4, 4.5, 6.2_

  - [ ]* 2.2 Property test: idempotencia de getOrCreateConversation (Property 7)
    - **Property 7: Idempotencia de getOrCreateConversation**
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 2.3 Property test: rechazo de body vacío/whitespace (Property 8)
    - **Property 8: Validación de body vacío o solo whitespace**
    - **Validates: Requirements 4.4**

  - [ ]* 2.4 Property test: truncado de body a 1000 chars (Property 9)
    - **Property 9: Truncado de body a 1000 caracteres**
    - **Validates: Requirements 4.5**

  - [x] 2.5 Implementar `subscribeToMessages` y `subscribeToConversations` en `frontend/chatService.js`
    - Ambas funciones retornan el `RealtimeChannel` para que el llamador pueda desuscribirse.
    - _Requirements: 4.2, 4.3, 5.2_

- [x] 3. Componente TraderSearch
  - [x] 3.1 Crear `frontend/TraderSearch.jsx`
    - Input controlado con debounce de 300 ms.
    - Strip del `@` inicial antes de buscar; ejecuta búsqueda solo si `query.length >= 2`.
    - Muestra hasta 10 resultados con avatar fallback, `display_name` y `@handle`.
    - Muestra "No se encontraron traders con ese handle" si no hay resultados.
    - Muestra mensaje de error descriptivo si la consulta falla.
    - Al seleccionar un resultado llama `onSelectProfile(profile.id)`.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ]* 3.2 Property test: búsqueda ILIKE con normalización de @ (Property 4)
    - **Property 4: Búsqueda ILIKE con normalización de @**
    - **Validates: Requirements 2.1, 2.2, 2.7**

  - [ ]* 3.3 Property test: búsqueda no ejecutada con < 2 chars (Property 5)
    - **Property 5: Búsqueda no se ejecuta con menos de 2 caracteres**
    - **Validates: Requirements 2.3**

  - [ ]* 3.4 Property test: error de búsqueda propagado al UI (Property 3)
    - **Property 3: Error de carga se propaga al UI**
    - **Validates: Requirements 2.6**

- [x] 4. Componente ProfileViewer
  - [x] 4.1 Crear `frontend/ProfileViewer.jsx`
    - Carga perfil desde `profiles` y últimas 20 ideas desde `community_ideas`.
    - Avatar fallback con la inicial del `display_name` en mayúscula si no hay `avatar_url`.
    - Omite `bio` y `country` si son null o string vacío.
    - Muestra mensaje de error descriptivo si la carga falla.
    - Llama `onClose()` al cerrar (el padre desmonta el componente).
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 4.2 Property test: avatar fallback muestra la inicial correcta (Property 1)
    - **Property 1: Avatar fallback muestra la inicial correcta**
    - **Validates: Requirements 1.3**

  - [ ]* 4.3 Property test: campos opcionales ausentes no generan texto vacío (Property 2)
    - **Property 2: Campos opcionales ausentes no generan texto vacío**
    - **Validates: Requirements 1.4**

  - [ ]* 4.4 Property test: error de carga propagado al UI (Property 3)
    - **Property 3: Error de carga se propaga al UI**
    - **Validates: Requirements 1.6**

  - [x] 4.5 Añadir lógica del botón "Enviar mensaje" en ProfileViewer
    - Visible y activo: viewer es EmailUser (`!!user?.email`) y perfil es de otro EmailUser distinto.
    - Visible pero deshabilitado + tooltip: viewer no es EmailUser.
    - Oculto: perfil pertenece a AnonUser (email null).
    - Al hacer clic llama `chatService.getOrCreateConversation` y luego `onOpenChat(conversationId)`.
    - _Requirements: 3.1, 3.4, 3.5, 3.6_

  - [ ]* 4.6 Property test: visibilidad del botón "Enviar mensaje" (Property 6)
    - **Property 6: Visibilidad del botón "Enviar mensaje" según tipo de usuario**
    - **Validates: Requirements 3.1, 3.4, 3.6**

- [ ] 5. Checkpoint — Asegúrate de que todos los tests pasan hasta aquí
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Componente ChatWindow
  - [x] 6.1 Crear `frontend/ChatWindow.jsx`
    - Carga mensajes históricos ordenados por `created_at` ASC al montar.
    - Suscribe `RealtimeChannel` al montar vía `chatService.subscribeToMessages`; desuscribe al desmontar.
    - Llama `chatService.markAsRead` al montar y al recibir mensajes nuevos.
    - Input con contador visual de 1000 chars; rechaza envío si `body.trim()` está vacío.
    - Muestra error inline si el envío falla; no cierra la ventana.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.2_

  - [ ]* 6.2 Property test: mensajes ordenados por created_at ASC (Property 10)
    - **Property 10: Mensajes ordenados por created_at ascendente**
    - **Validates: Requirements 4.7**

- [x] 7. Componente ConversationList
  - [x] 7.1 Crear `frontend/ConversationList.jsx`
    - Si `currentUser` no es EmailUser, muestra mensaje de requerimiento de email.
    - Carga conversaciones del usuario ordenadas por `last_message_at` DESC.
    - Suscribe canal Realtime a `conversations` del usuario vía `chatService.subscribeToConversations`; desuscribe al desmontar.
    - Preview: avatar + `display_name` del otro participante, último mensaje truncado a 60 chars, timestamp relativo.
    - Badge de no leídos por conversación; indicador global si total > 0.
    - Muestra "Aún no tienes conversaciones. Busca un trader para empezar." si la lista está vacía.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.3, 6.4, 6.5_

  - [ ]* 7.2 Property test: conversaciones ordenadas por last_message_at DESC (Property 11)
    - **Property 11: Conversaciones ordenadas por last_message_at descendente**
    - **Validates: Requirements 5.1**

  - [ ]* 7.3 Property test: preview truncado a 60 chars (Property 12)
    - **Property 12: Preview de último mensaje truncado a 60 caracteres**
    - **Validates: Requirements 5.3**

  - [ ]* 7.4 Property test: UnreadBadge valor y cap 99+ (Property 13)
    - **Property 13: UnreadBadge muestra el valor correcto con cap en 99+**
    - **Validates: Requirements 6.1, 6.5**

  - [ ]* 7.5 Property test: markAsRead resetea el contador (Property 14)
    - **Property 14: Abrir conversación resetea el contador de no leídos**
    - **Validates: Requirements 6.2**

- [x] 8. Integración en Community.jsx
  - [x] 8.1 Añadir `TraderSearch` en `Community.jsx` con `onSelectProfile` que abre `ProfileViewer`
    - Renderizar `TraderSearch` en la sección de Comunidad.
    - Gestionar estado `selectedProfileId` para montar/desmontar `ProfileViewer`.
    - Al hacer clic en el nombre/handle de un autor en el feed, también abrir `ProfileViewer`.
    - _Requirements: 1.1, 2.4_

  - [x] 8.2 Añadir `ConversationList` y `ChatWindow` en `Community.jsx`
    - Renderizar `ConversationList` con acceso desde la sección de Comunidad.
    - Gestionar estado `openConversationId` para montar/desmontar `ChatWindow`.
    - `ProfileViewer.onOpenChat` actualiza `openConversationId` y desmonta el viewer.
    - _Requirements: 3.1, 3.2, 5.1_

- [ ] 9. Archivos de test
  - [ ]* 9.1 Crear `test/trader-profiles-chat.spec.js` con unit tests de ejemplo
    - ProfileViewer renderiza todos los campos cuando el perfil está completo (Req 1.1).
    - ProfileViewer llama cleanup al desmontarse (Req 1.5).
    - TraderSearch abre ProfileViewer al hacer clic en resultado (Req 2.4).
    - TraderSearch muestra mensaje vacío cuando no hay resultados (Req 2.5).
    - ChatWindow suscribe/desuscribe Realtime al montar/desmontar (Req 4.3).
    - ConversationList actualiza preview al recibir mensaje via Realtime (Req 5.2).
    - ConversationList muestra mensaje vacío cuando no hay conversaciones (Req 5.4).
    - ConversationList muestra requerimiento de email para usuarios anónimos (Req 5.5).
    - `getOrCreateConversation` rechaza cuando userA === userB (Req 3.5).

  - [ ]* 9.2 Crear `test/trader-profiles-chat.pbt.spec.js` con property-based tests (fast-check)
    - Incluir Properties 1–15 del diseño usando `fc` de fast-check.
    - Mínimo 100 iteraciones por propiedad.
    - Cada test con tag `// Feature: trader-profiles-chat, Property N: <texto>`.

- [x] 10. Checkpoint final — Asegúrate de que todos los tests pasan
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia los requisitos específicos para trazabilidad.
- El helper `isEmailUser = (user) => !!user?.email` se define en `chatService.js` y se reutiliza en los componentes.
- Los `RealtimeChannel` deben desuscribirse siempre en el cleanup de `useEffect` para evitar fugas de memoria.
- Property tests van en `test/trader-profiles-chat.pbt.spec.js`; unit tests en `test/trader-profiles-chat.spec.js`.
