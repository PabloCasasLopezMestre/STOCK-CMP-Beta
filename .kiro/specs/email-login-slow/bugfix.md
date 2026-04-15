# Bugfix Requirements Document

## Introduction

El inicio de sesión con magic link (email) es lento e inconsistente. La causa raíz es que
`getSupabase()` llama a `createClient()` en cada invocación, creando una nueva instancia del
cliente Supabase en lugar de reutilizar una singleton. Aunque `AuthEmailPanel.jsx` usa
`useMemo` para memoizar la instancia, si el componente se desmonta y remonta se genera una
nueva instancia, acumulando listeners de autenticación duplicados (`onAuthStateChange`) que
degradan el rendimiento y producen comportamiento inconsistente.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN `getSupabase()` es llamado múltiples veces THEN el sistema crea una nueva instancia
    de `createClient()` en cada llamada en lugar de reutilizar una existente.

1.2 WHEN `AuthEmailPanel` se desmonta y remonta THEN el sistema crea una nueva instancia del
    cliente Supabase, registrando listeners `onAuthStateChange` adicionales sin limpiar los
    anteriores correctamente.

1.3 WHEN existen múltiples instancias del cliente Supabase activas simultáneamente THEN el
    sistema presenta lentitud y comportamiento inconsistente al invocar `signInWithOtp`.

### Expected Behavior (Correct)

2.1 WHEN `getSupabase()` es llamado múltiples veces THEN el sistema SHALL retornar siempre la
    misma instancia singleton del cliente Supabase.

2.2 WHEN `AuthEmailPanel` se desmonta y remonta THEN el sistema SHALL reutilizar la instancia
    singleton existente, evitando la acumulación de listeners duplicados.

2.3 WHEN se invoca `signInWithOtp` con una dirección de email válida THEN el sistema SHALL
    completar la solicitud sin degradación de rendimiento causada por múltiples instancias del
    cliente.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN las variables de entorno `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY` no están
    definidas THEN el sistema SHALL CONTINUE TO retornar `null` desde `getSupabase()`.

3.2 WHEN el usuario envía un magic link con un email válido THEN el sistema SHALL CONTINUE TO
    llamar a `supabase.auth.signInWithOtp` y mostrar el estado `check_email` al completarse.

3.3 WHEN el usuario envía un email con formato inválido THEN el sistema SHALL CONTINUE TO
    mostrar el estado `bad_email` sin realizar la llamada a Supabase.

3.4 WHEN el usuario cierra sesión THEN el sistema SHALL CONTINUE TO invocar
    `supabase.auth.signOut` y limpiar la sesión correctamente.

3.5 WHEN el componente `AuthEmailPanel` se monta THEN el sistema SHALL CONTINUE TO suscribirse
    a `onAuthStateChange` y desuscribirse al desmontar.
