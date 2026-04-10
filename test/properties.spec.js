/**
 * Property-based tests for the Stock Comparison App Cloudflare Worker proxy.
 * Feature: stock-comparison-app
 *
 * Uses fast-check to verify correctness properties defined in design.md.
 */
import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import worker from '../src';

async function workerFetch(url, options = {}) {
  const request = new Request(url, options);
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// Arbitraries
const validSymbol = fc.stringMatching(/^[A-Z]{1,5}$/);
const validInterval = fc.constantFrom('2m', '5m', '1h', '1d', '1wk', '1mo');
const validRange = fc.constantFrom('1h', '1d', '5d', '1mo', '3mo', '6mo', '1y');

const knownPaths = fc.oneof(
  fc.tuple(validSymbol, validInterval, validRange).map(
    ([s, i, r]) => `/api/stock/${s}?interval=${i}&range=${r}`
  ),
  fc.constant('/api/exchange-rate')
);

const unknownPath = fc
  .webPath()
  .filter(
    (p) =>
      !p.startsWith('/api/stock/') &&
      p !== '/api/exchange-rate' &&
      p !== '/api/stock'
  );

// --- Property 1: CORS headers invariant ---
// Feature: stock-comparison-app, Property 1: CORS headers invariant
describe('Property 1: CORS headers invariant', () => {
  it('every response includes Access-Control-Allow-Origin: *', async () => {
    // Mock fetch so no real network calls are made
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    await fc.assert(
      fc.asyncProperty(knownPaths, async (path) => {
        const res = await workerFetch(`http://worker${path}`);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      }),
      { numRuns: 50 }
    );
  });

  it('unknown paths also include CORS header', async () => {
    await fc.assert(
      fc.asyncProperty(unknownPath, async (path) => {
        const res = await workerFetch(`http://worker${path}`);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      }),
      { numRuns: 50 }
    );
  });

  it('OPTIONS on any path includes CORS header', async () => {
    await fc.assert(
      fc.asyncProperty(fc.webPath(), async (path) => {
        const res = await workerFetch(`http://worker${path}`, { method: 'OPTIONS' });
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
      }),
      { numRuns: 50 }
    );
  });
});

// --- Property 2: Proxy pass-through para respuestas exitosas ---
// Feature: stock-comparison-app, Property 2: Proxy pass-through para respuestas exitosas
// Validates: Requirements 1.2, 2.2
describe('Property 2: Proxy pass-through para respuestas exitosas', () => {
  // Null-body statuses (204, 205, 304) cannot carry a body per the Fetch spec,
  // so we restrict to statuses that allow a body: 200-203, 206-299.
  const bodyAllowed2xx = fc.integer({ min: 200, max: 299 }).filter(
    (s) => s !== 204 && s !== 205
  );

  it('returns the same 2xx status and body for /api/stock/:symbol requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        bodyAllowed2xx,
        fc.string(),
        validSymbol,
        async (status, body, symbol) => {
          vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(body, { status })
          );

          const res = await workerFetch(
            `http://worker/api/stock/${symbol}?interval=1d&range=1mo`
          );

          expect(res.status).toBe(status);
          const resBody = await res.text();
          expect(resBody).toBe(body);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns the same 2xx status and body for /api/exchange-rate requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        bodyAllowed2xx,
        fc.string(),
        async (status, body) => {
          vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response(body, { status })
          );

          const res = await workerFetch('http://worker/api/exchange-rate');

          expect(res.status).toBe(status);
          const resBody = await res.text();
          expect(resBody).toBe(body);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// --- Property 3: Upstream error pass-through ---
// Feature: stock-comparison-app, Property 3: Upstream error pass-through
// Validates: Requirements 1.3, 2.3
describe('Property 3: Upstream error pass-through', () => {
  const errorStatus = fc.integer({ min: 400, max: 599 });

  it('returns the same error status and a JSON body with message for /api/stock requests', async () => {
    await fc.assert(
      fc.asyncProperty(errorStatus, validSymbol, async (status, symbol) => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
          new Response(JSON.stringify({ error: 'upstream error' }), { status })
        );

        const res = await workerFetch(
          `http://worker/api/stock/${symbol}?interval=1d&range=1mo`
        );

        expect(res.status).toBe(status);
        const body = await res.json();
        expect(typeof body.message).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  it('returns the same error status and a JSON body with message for /api/exchange-rate requests', async () => {
    await fc.assert(
      fc.asyncProperty(errorStatus, async (status) => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
          new Response(JSON.stringify({ error: 'upstream error' }), { status })
        );

        const res = await workerFetch('http://worker/api/exchange-rate');

        expect(res.status).toBe(status);
        const body = await res.json();
        expect(typeof body.message).toBe('string');
      }),
      { numRuns: 100 }
    );
  });
});

// --- Property 4: Preflight OPTIONS for any path ---
// Feature: stock-comparison-app, Property 4: Preflight OPTIONS para cualquier ruta
describe('Property 4: Preflight OPTIONS para cualquier ruta', () => {
  it('OPTIONS always returns 204 with preflight headers without calling upstream', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await fc.assert(
      fc.asyncProperty(fc.webPath(), async (path) => {
        fetchSpy.mockClear();
        const res = await workerFetch(`http://worker${path}`, { method: 'OPTIONS' });
        expect(res.status).toBe(204);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
        expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
        expect(fetchSpy).not.toHaveBeenCalled();
      }),
      { numRuns: 50 }
    );
  });
});

// --- Property 5: 404 for unknown routes ---
// Feature: stock-comparison-app, Property 5: 404 para rutas desconocidas
describe('Property 5: 404 para rutas desconocidas', () => {
  it('unknown paths return 404 with { message: "Not found" }', async () => {
    await fc.assert(
      fc.asyncProperty(unknownPath, async (path) => {
        const res = await workerFetch(`http://worker${path}`);
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.message).toBe('Not found');
      }),
      { numRuns: 50 }
    );
  });
});

// --- Property 6: Stock parameter validation ---
// Feature: stock-comparison-app, Property 6: Validación de parámetros de stock
describe('Property 6: Validación de parámetros de stock', () => {
  it('missing interval returns 400 with message mentioning interval', async () => {
    await fc.assert(
      fc.asyncProperty(validSymbol, validRange, async (symbol, range) => {
        const res = await workerFetch(
          `http://worker/api/stock/${symbol}?range=${range}`
        );
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toContain('interval');
      }),
      { numRuns: 50 }
    );
  });

  it('missing range returns 400 with message mentioning range', async () => {
    await fc.assert(
      fc.asyncProperty(validSymbol, validInterval, async (symbol, interval) => {
        const res = await workerFetch(
          `http://worker/api/stock/${symbol}?interval=${interval}`
        );
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.message).toContain('range');
      }),
      { numRuns: 50 }
    );
  });
});

// --- Property 7: Correct upstream URL construction ---
// Feature: stock-comparison-app, Property 7: Construcción correcta de URL upstream para stock
describe('Property 7: Construcción correcta de URL upstream para stock', () => {
  it('forwards request to correct Yahoo Finance URL', async () => {
    await fc.assert(
      fc.asyncProperty(validSymbol, validInterval, validRange, async (symbol, interval, range) => {
        let capturedUrl = null;
        vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
          capturedUrl = url.toString();
          return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
        });

        await workerFetch(
          `http://worker/api/stock/${symbol}?interval=${interval}&range=${range}`
        );

        expect(capturedUrl).toBe(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`
        );
        vi.restoreAllMocks();
      }),
      { numRuns: 50 }
    );
  });
});
