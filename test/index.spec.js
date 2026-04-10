import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, vi, afterEach } from 'vitest';
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

describe('CORS preflight', () => {
  it('returns 204 with CORS headers for OPTIONS', async () => {
    const res = await workerFetch('http://worker/api/stock/AAPL', { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });
});

describe('Parameter validation', () => {
  it('returns 400 when interval is missing', async () => {
    const res = await workerFetch('http://worker/api/stock/AAPL?range=1mo');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('interval');
  });

  it('returns 400 when range is missing', async () => {
    const res = await workerFetch('http://worker/api/stock/AAPL?interval=1d');
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain('range');
  });
});

describe('Not found', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await workerFetch('http://worker/unknown/path');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toBe('Not found');
  });
});

describe('Timeout handling', () => {
  it('returns 504 when Yahoo Finance times out', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      new Promise((_, reject) => {
        const err = new DOMException('Timeout', 'TimeoutError');
        reject(err);
      })
    );

    const res = await workerFetch('http://worker/api/stock/AAPL?interval=1d&range=1mo');
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.message).toBe('Upstream timeout');
  });

  it('returns 504 when ExchangeRate API times out', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      new Promise((_, reject) => {
        const err = new DOMException('Timeout', 'TimeoutError');
        reject(err);
      })
    );

    const res = await workerFetch('http://worker/api/exchange-rate');
    expect(res.status).toBe(504);
    const body = await res.json();
    expect(body.message).toBe('Upstream timeout');
  });
});

describe('CORS headers on all responses', () => {
  it('includes CORS header on 404', async () => {
    const res = await workerFetch('http://worker/nope');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('includes CORS header on 400', async () => {
    const res = await workerFetch('http://worker/api/stock/AAPL');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
