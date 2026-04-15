const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const EXCHANGE_RATE_URL  = 'https://api.exchangerate-api.com/v4/latest/USD';
const FRANKFURTER_URL    = 'https://api.frankfurter.app/latest?from=USD';
const FINNHUB_API_KEY    = 'd7c9avpr01qsv375otd0d7c9avpr01qsv375otdg';
const FINNHUB_BASE       = 'https://finnhub.io/api/v1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const PREFLIGHT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
};

// --- Crumb management ---
let cachedCrumb = null;
let cachedCookie = null;

async function getYahooCrumb() {
  if (cachedCrumb && cachedCookie) return { crumb: cachedCrumb, cookie: cachedCookie };

  const consentRes = await fetch('https://fc.yahoo.com', {
    headers: { 'User-Agent': YAHOO_HEADERS['User-Agent'] },
    redirect: 'follow',
  }).catch(() => null);

  const cookieHeader = consentRes?.headers?.get('set-cookie') ?? '';
  const cookie = cookieHeader.split(';')[0] ?? '';

  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { ...YAHOO_HEADERS, Cookie: cookie },
  }).catch(() => null);

  if (!crumbRes?.ok) return null;
  const crumb = await crumbRes.text();
  if (!crumb || crumb.includes('{')) return null;

  cachedCrumb = crumb.trim();
  cachedCookie = cookie;
  return { crumb: cachedCrumb, cookie: cachedCookie };
}

// --- Utilities ---

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

function withCors(response) {
  const cloned = response.clone();
  const headers = new Headers(cloned.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Content-Type', 'application/json');
  return new Response(cloned.body, { status: cloned.status, headers });
}

async function proxyRequest(url, extraHeaders = {}) {
  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { ...YAHOO_HEADERS, ...extraHeaders },
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return jsonResponse({ message: 'Upstream timeout' }, 504);
    }
    return jsonResponse({ message: 'Bad gateway' }, 502);
  }
  if (response.ok) return withCors(response);
  return jsonResponse({ message: `Upstream error: ${response.status}` }, response.status);
}

// --- Handlers ---

function handlePreflight() {
  return new Response(null, { status: 204, headers: PREFLIGHT_HEADERS });
}

function handleNotFound() {
  return jsonResponse({ message: 'Not found' }, 404);
}

async function handleStockRequest(symbol, interval, range) {
  if (!symbol)   return jsonResponse({ message: 'Missing required parameter: symbol' }, 400);
  if (!interval) return jsonResponse({ message: 'Missing required parameter: interval' }, 400);
  if (!range)    return jsonResponse({ message: 'Missing required parameter: range' }, 400);
  return proxyRequest(`${YAHOO_FINANCE_BASE}/${symbol}?interval=${interval}&range=${range}`);
}

async function handleFundamentalsRequest(symbol) {
  if (!symbol) return jsonResponse({ message: 'Missing required parameter: symbol' }, 400);

  const auth = await getYahooCrumb();

  if (auth) {
    const modules = 'summaryDetail,defaultKeyStatistics,price,financialData';
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
    const res = await proxyRequest(url, { Cookie: auth.cookie });
    if (res.status === 200) return res;
    cachedCrumb = null;
    cachedCookie = null;
  }

  // Fallback: v8/finance/chart meta
  const chartRes = await proxyRequest(`${YAHOO_FINANCE_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=5d`);
  try {
    const data = await chartRes.clone().json();
    const meta = data?.chart?.result?.[0]?.meta ?? {};
    return jsonResponse({
      quoteSummary: {
        result: [{
          price: {
            regularMarketDayHigh: { raw: meta.regularMarketDayHigh },
            regularMarketDayLow:  { raw: meta.regularMarketDayLow },
            regularMarketVolume:  { raw: meta.regularMarketVolume },
            shortName: meta.shortName,
            longName:  meta.longName,
            currency:  meta.currency,
            exchangeName: meta.fullExchangeName,
          },
          summaryDetail: {
            fiftyTwoWeekHigh:    { raw: meta.fiftyTwoWeekHigh },
            fiftyTwoWeekLow:     { raw: meta.fiftyTwoWeekLow },
            previousClose:       { raw: meta.chartPreviousClose },
            regularMarketVolume: { raw: meta.regularMarketVolume },
          },
          defaultKeyStatistics: {},
          financialData: {},
        }],
        error: null,
      }
    });
  } catch {
    return chartRes;
  }
}

async function handleNewsRequest(symbol) {
  if (!symbol) return jsonResponse({ message: 'Missing required parameter: symbol' }, 400);

  // Date range: last 30 days
  const to   = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);

  // --- Primary: Finnhub ---
  try {
    const finnhubUrl = `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(finnhubUrl, { signal: AbortSignal.timeout(8_000) });
    if (res.ok) {
      const articles = await res.json();
      if (Array.isArray(articles) && articles.length > 0) {
        const items = articles.slice(0, 20).map((a) => ({
          title:   a.headline ?? '',
          link:    a.url ?? '',
          pubDate: a.datetime ? new Date(a.datetime * 1000).toUTCString() : '',
          source:  a.source ?? 'Finnhub',
          summary: (a.summary ?? '').slice(0, 200),
          image:   a.image ?? null,
        }));
        return jsonResponse({ symbol, items, source: 'finnhub' });
      }
    }
  } catch (_) { /* fall through */ }

  // --- Fallback: Yahoo Finance RSS ---
  try {
    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
    const res = await fetch(rssUrl, { signal: AbortSignal.timeout(8_000), headers: YAHOO_HEADERS });
    if (res.ok) {
      const xml = await res.text();
      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
        const block = match[1];
        const get = (tag) => {
          const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
          return m ? (m[1] ?? m[2] ?? '').trim() : '';
        };
        items.push({
          title:   get('title'),
          link:    get('link'),
          pubDate: get('pubDate'),
          source:  get('source') || 'Yahoo Finance',
          summary: get('description').replace(/<[^>]+>/g, '').slice(0, 200),
          image:   null,
        });
      }
      return jsonResponse({ symbol, items, source: 'yahoo' });
    }
  } catch (_) { /* fall through */ }

  return jsonResponse({ symbol, items: [], source: 'none' });
}

async function handleExchangeRateRequest() {
  // Primary: exchangerate-api.com (has all currencies including MXN, BRL, etc.)
  const primaryRes = await proxyRequest(EXCHANGE_RATE_URL);
  if (primaryRes.status !== 502 && primaryRes.status !== 504) return primaryRes;

  // Fallback: Frankfurter (ECB, open source, no key needed)
  return proxyRequest(FRANKFURTER_URL);
}

// --- Router ---

export default {
  async fetch(request) {
    const { method, url } = request;
    const { pathname, searchParams } = new URL(url);

    if (method === 'OPTIONS') return handlePreflight();
    if (pathname === '/api/exchange-rate') return handleExchangeRateRequest();

    const stockMatch = pathname.match(/^\/api\/stock\/([^/]+)$/);
    if (stockMatch) {
      return handleStockRequest(
        stockMatch[1],
        searchParams.get('interval') ?? '',
        searchParams.get('range') ?? ''
      );
    }

    const fundamentalsMatch = pathname.match(/^\/api\/fundamentals\/([^/]+)$/);
    if (fundamentalsMatch) return handleFundamentalsRequest(fundamentalsMatch[1]);

    const newsMatch = pathname.match(/^\/api\/news\/([^/]+)$/);
    if (newsMatch) return handleNewsRequest(newsMatch[1]);

    return handleNotFound();
  },
};
