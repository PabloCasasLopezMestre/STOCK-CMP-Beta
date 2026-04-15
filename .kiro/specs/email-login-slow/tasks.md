# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Identidad Referencial del Singleton
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to N calls (N between 2 and 20) with env vars defined; assert all calls return `===` the first result
  - Add a new test file `test/email-login-slow.spec.js` (or extend existing) that mocks `import.meta.env` with valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, and mocks `@supabase/supabase-js` `createClient` to return a fresh object each call
  - Use fast-check: `fc.integer({ min: 2, max: 20 })` to generate N; call `getSupabase()` N times; assert every result `=== calls[0]`
  - Run test on UNFIXED code (`frontend/supabaseClient.js` as-is)
  - **EXPECTED OUTCOME**: Test FAILS (e.g., counterexample `N=2`: `getSupabase() !== getSupabase()`) — this proves the bug exists
  - Document counterexamples found (e.g., "getSupabase() called twice returns two distinct objects")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 2.1_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Comportamiento con Variables de Entorno Ausentes
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `getSupabase()` with missing `VITE_SUPABASE_URL` returns `null` on unfixed code
  - Observe: `getSupabase()` with missing `VITE_SUPABASE_ANON_KEY` returns `null` on unfixed code
  - Observe: `getSupabase()` with both vars missing returns `null` on unfixed code
  - Write property-based test using fast-check: generate combinations of missing/present env vars where at least one is absent; assert `getSupabase()` returns `null` (from Preservation Requirements 3.1 in design)
  - Also write example-based tests for requirements 3.2–3.5 using mocked supabase client: verify `signInWithOtp` is called for valid email, `bad_email` shown for invalid email without calling supabase, `signOut` invokes `supabase.auth.signOut`, and `onAuthStateChange` subscription/unsubscription lifecycle
  - Run all tests on UNFIXED code
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for getSupabase() singleton — múltiples instancias del cliente Supabase

  - [x] 3.1 Implement the fix in `frontend/supabaseClient.js`
    - Declare module-level variable: `let _instance = null` outside the function
    - In `getSupabase()`: if `!url || !anonKey` return `null` (unchanged guard)
    - Add early return: `if (_instance) return _instance`
    - Assign and return: `_instance = createClient(url, anonKey, { auth: { ... } }); return _instance`
    - Do NOT modify `AuthEmailPanel.jsx` (the `useMemo` is harmless and can stay)
    - _Bug_Condition: isBugCondition(calls) — calls[i] !== calls[0] for any i, meaning getSupabase() returns a new object on each invocation_
    - _Expected_Behavior: all N calls to getSupabase() return the same reference (calls[i] === calls[0] for all i)_
    - _Preservation: null returned when VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are absent; all auth flows (signInWithOtp, signOut, onAuthStateChange) unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Identidad Referencial del Singleton
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (all N calls return `===` the first result)
    - When this test passes, it confirms the singleton property is satisfied
    - Run bug condition exploration test from step 1 on FIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed — `createClient` called exactly once)
    - _Requirements: 2.1, 2.2_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Comportamiento con Variables de Entorno Ausentes
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run all preservation property tests from step 2 on FIXED code
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions in null-return behavior and auth flows)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run the full test suite: `npx vitest --run`
  - Ensure all tests pass, ask the user if questions arise.
