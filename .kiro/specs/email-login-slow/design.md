# email-login-slow Bugfix Design

## Overview

`getSupabase()` en `frontend/supabaseClient.js` llama a `createClient()` en cada invocación,
creando una nueva instancia del cliente Supabase en lugar de reutilizar una singleton. Esto
provoca que cada montaje de `AuthEmailPanel` registre un nuevo listener `onAuthStateChange`
sin que los anteriores sean limpiados correctamente, acumulando listeners duplicados que
degradan el rendimiento y producen comportamiento inconsistente en el login con magic link.

La solución es convertir `getSupabase()` en un singleton: crear la instancia una sola vez
(cuando las variables de entorno estén disponibles) y retornar siempre la misma referencia.

## Glossary

- **Bug_Condition (C)**: La condición que dispara el bug — `getSupabase()` es llamado más de
  una vez, retornando instancias distintas en lugar de la misma referencia.
- **Property (P)**: El comportamiento correcto — todas las llamadas a `getSupabase()` retornan
  la misma instancia singleton (identidad referencial `===`).
- **Preservation**: El comportamiento existente que no debe cambiar — retornar `null` cuando
  faltan variables de entorno, y el flujo completo de autenticación (magic link, signOut,
  onAuthStateChange).
- **getSupabase()**: Función en `frontend/supabaseClient.js` que provee el cliente Supabase.
- **singleton**: Patrón de diseño que garantiza una única instancia de un objeto durante el
  ciclo de vida del módulo.
- **onAuthStateChange**: Listener de Supabase que se registra por cada instancia del cliente;
  múltiples instancias acumulan múltiples listeners.

## Bug Details

### Bug Condition

El bug se manifiesta cuando `getSupabase()` es llamado más de una vez (por ejemplo, al
remontar `AuthEmailPanel`). Cada llamada ejecuta `createClient()` y retorna un objeto nuevo,
por lo que la identidad referencial entre llamadas es `false`.

**Formal Specification:**
```
FUNCTION isBugCondition(calls)
  INPUT: calls — lista de resultados de invocar getSupabase() N veces (N >= 2)
  OUTPUT: boolean

  FOR i FROM 1 TO length(calls) - 1 DO
    IF calls[i] !== calls[0] THEN
      RETURN true   -- instancias distintas: bug presente
    END IF
  END FOR
  RETURN false
END FUNCTION
```

### Examples

- Llamar `getSupabase()` dos veces seguidas retorna dos objetos distintos (`a !== b`) →
  **bug**: deberían ser el mismo objeto.
- Montar `AuthEmailPanel`, desmontarlo y remontarlo registra dos listeners
  `onAuthStateChange` activos simultáneamente → **bug**: solo debe existir uno.
- Con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` definidos, la primera llamada crea la
  instancia; las siguientes deben retornar la misma referencia → **comportamiento correcto
  esperado tras el fix**.
- Con variables de entorno ausentes, `getSupabase()` retorna `null` → **sin cambio**.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Cuando las variables de entorno no están definidas, `getSupabase()` debe seguir retornando
  `null`.
- El flujo de envío de magic link (`signInWithOtp`) debe continuar funcionando igual.
- La validación de email inválido (`bad_email`) debe continuar mostrándose sin llamar a
  Supabase.
- `signOut` debe continuar invocando `supabase.auth.signOut` y limpiando la sesión.
- `AuthEmailPanel` debe continuar suscribiéndose a `onAuthStateChange` al montarse y
  desuscribiéndose al desmontarse.

**Scope:**
Todo el comportamiento que no depende de la identidad de la instancia (flujos de UI,
validaciones, manejo de sesión) debe quedar completamente inalterado. El único cambio
observable es que múltiples llamadas a `getSupabase()` retornan la misma referencia.

## Hypothesized Root Cause

1. **Sin memoización a nivel de módulo**: `getSupabase()` no guarda la instancia creada;
   cada llamada ejecuta `createClient()` incondicionalmente (cuando las vars existen).

2. **`useMemo` insuficiente**: `AuthEmailPanel` usa `useMemo(() => getSupabase(), [])` para
   memoizar dentro del componente, pero esto solo protege mientras el componente está montado.
   Al desmontarse y remontarse, `useMemo` se reinicia y llama a `getSupabase()` de nuevo,
   creando una nueva instancia.

3. **Acumulación de listeners**: Cada nueva instancia del cliente registra su propio listener
   `onAuthStateChange`. Aunque el `useEffect` llama a `subscription.unsubscribe()` al
   desmontar, la nueva instancia crea una nueva suscripción, y si hay race conditions o
   múltiples instancias activas, los listeners se acumulan.

## Correctness Properties

Property 1: Bug Condition - Identidad Referencial del Singleton

_For any_ secuencia de N llamadas (N >= 1) a `getSupabase()` cuando las variables de entorno
están definidas, la función fija SHALL retornar siempre la misma instancia (identidad
referencial `===` entre todas las llamadas).

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Comportamiento con Variables de Entorno Ausentes

_For any_ llamada a `getSupabase()` cuando `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY` no
están definidas, la función fija SHALL retornar `null`, igual que la función original.

**Validates: Requirements 3.1**

## Fix Implementation

### Changes Required

**File**: `frontend/supabaseClient.js`

**Specific Changes**:

1. **Declarar variable singleton a nivel de módulo**: Añadir `let _instance = null` fuera de
   la función, en el scope del módulo. Esto garantiza que la instancia persiste durante todo
   el ciclo de vida del módulo (la vida de la página).

2. **Retornar early si ya existe instancia**: Al inicio de `getSupabase()`, si `_instance`
   no es `null`, retornarlo directamente sin llamar a `createClient()`.

3. **Asignar y retornar la instancia**: Solo cuando `_instance` es `null` y las vars de
   entorno están disponibles, llamar a `createClient()`, asignar el resultado a `_instance`
   y retornarlo.

4. **Mantener el guard de variables de entorno**: Si `!url || !anonKey`, retornar `null` sin
   asignar `_instance` (para que el próximo intento reintente si las vars se cargan tarde).

**Pseudocode del fix:**
```
let _instance = null

FUNCTION getSupabase()
  IF NOT url OR NOT anonKey THEN
    RETURN null
  END IF
  IF _instance IS null THEN
    _instance = createClient(url, anonKey, { auth: { ... } })
  END IF
  RETURN _instance
END FUNCTION
```

**Note**: `AuthEmailPanel.jsx` no requiere cambios. El `useMemo` puede mantenerse (es
inofensivo) o eliminarse, ya que `getSupabase()` ahora es idempotente.

## Testing Strategy

### Validation Approach

Primero se ejecutan tests exploratorios sobre el código **sin corregir** para confirmar el
bug (las llamadas retornan instancias distintas). Luego se implementa el fix y se verifica
que la propiedad singleton se cumple y que el comportamiento existente se preserva.

### Exploratory Bug Condition Checking

**Goal**: Confirmar que `getSupabase()` actual retorna instancias distintas en llamadas
sucesivas, validando la hipótesis de causa raíz.

**Test Plan**: Llamar a `getSupabase()` múltiples veces y verificar que las referencias son
distintas. Ejecutar sobre el código **sin corregir** para observar el fallo.

**Test Cases**:
1. **Dos llamadas consecutivas**: `getSupabase() !== getSupabase()` debe ser `true` en código
   sin corregir (confirmará el bug).
2. **N llamadas aleatorias**: Generar N entre 2 y 10, llamar N veces, verificar que no todas
   son la misma referencia (fallará en código sin corregir).
3. **Llamada tras simular remount**: Llamar, "resetear" el módulo (reimportar), llamar de
   nuevo — las referencias deben diferir.

**Expected Counterexamples**:
- `getSupabase() !== getSupabase()` → instancias distintas, confirma el bug.
- Causa: ausencia de variable singleton a nivel de módulo.

### Fix Checking

**Goal**: Verificar que tras el fix, para toda secuencia de llamadas donde las vars de
entorno están definidas, todas las llamadas retornan la misma referencia.

**Pseudocode:**
```
FOR ALL N WHERE N >= 2 DO
  calls = [getSupabase() repeated N times]
  FOR ALL i IN calls DO
    ASSERT calls[i] === calls[0]
  END FOR
END FOR
```

### Preservation Checking

**Goal**: Verificar que el comportamiento con variables de entorno ausentes no cambia, y que
los flujos de autenticación siguen funcionando.

**Pseudocode:**
```
FOR ALL env WHERE NOT env.hasUrl OR NOT env.hasKey DO
  ASSERT getSupabase_fixed(env) === null
  ASSERT getSupabase_original(env) === null
END FOR
```

**Testing Approach**: Property-based testing para la propiedad singleton (genera N aleatorio
de llamadas). Tests de ejemplo para los flujos de autenticación con mocks de Supabase.

**Test Cases**:
1. **Null preservation**: Con vars ausentes, `getSupabase()` retorna `null` — igual que antes.
2. **signInWithOtp preservation**: Mock de supabase, verificar que el flujo de magic link
   sigue llamando a `signInWithOtp` y mostrando `check_email`.
3. **bad_email preservation**: Email inválido sigue mostrando `bad_email` sin llamar a
   Supabase.
4. **signOut preservation**: `signOut` sigue invocando `supabase.auth.signOut`.
5. **onAuthStateChange preservation**: El `useEffect` sigue suscribiéndose y el cleanup
   llama a `unsubscribe`.

### Unit Tests

- Verificar identidad referencial: múltiples llamadas a `getSupabase()` retornan `===`.
- Verificar retorno `null` cuando faltan variables de entorno.
- Verificar que `createClient` es llamado exactamente una vez aunque `getSupabase()` se
  invoque N veces.

### Property-Based Tests

- Generar N aleatorio (2–20): todas las N llamadas a `getSupabase()` deben retornar la misma
  referencia (Property 1).
- Generar combinaciones de vars de entorno ausentes: `getSupabase()` siempre retorna `null`
  (Property 2).

### Integration Tests

- Montar `AuthEmailPanel`, desmontarlo y remontarlo: verificar que solo existe un listener
  `onAuthStateChange` activo.
- Flujo completo de magic link con la instancia singleton: enviar email, verificar estado
  `check_email`.
- Flujo de signOut con la instancia singleton: verificar limpieza de sesión.
