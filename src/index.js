const YAHOO_FINANCE_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const EXCHANGE_RATE_URL  = 'https://api.exchangerate-api.com/v4/latest/USD';
const FRANKFURTER_URL    = 'https://api.frankfurter.app/latest?from=USD';
const FINNHUB_API_KEY    = 'd7c9avpr01qsv375otd0d7c9avpr01qsv375otdg';
const FINNHUB_BASE       = 'https://finnhub.io/api/v1';

// New real-time APIs
const ALPHA_VANTAGE_API_KEY = '9VCPU2QGDHJ8KFZW';
const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
const TWELVE_DATA_API_KEY = 'ed5e6725518743c2bd5f9937c6318d34';
const TWELVE_DATA_BASE = 'https://api.twelvedata.com';

// Rate limiting counters
let alphaVantageCallsThisMinute = 0;
let twelveDataCallsToday = 0;
let lastAlphaVantageReset = Date.now();
let lastTwelveDataReset = new Date().toDateString();

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

// --- Rate Limiting Management ---
function resetRateLimits() {
  const now = Date.now();
  const today = new Date().toDateString();
  
  // Reset Alpha Vantage calls every minute
  if (now - lastAlphaVantageReset > 60000) {
    alphaVantageCallsThisMinute = 0;
    lastAlphaVantageReset = now;
  }
  
  // Reset Twelve Data calls every day
  if (today !== lastTwelveDataReset) {
    twelveDataCallsToday = 0;
    lastTwelveDataReset = today;
  }
}

// --- Alpha Vantage API ---
async function fetchAlphaVantagePrice(symbol) {
  resetRateLimits();
  
  if (alphaVantageCallsThisMinute >= 60) {
    return null; // Rate limit exceeded
  }
  
  try {
    alphaVantageCallsThisMinute++;
    const url = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const quote = data['Global Quote'];
    
    if (!quote) return null;
    
    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume']),
      source: 'alphavantage',
      realtime: true
    };
  } catch (error) {
    console.error('Alpha Vantage error:', error);
    return null;
  }
}

// --- Twelve Data API ---
async function fetchTwelveDataPrice(symbol) {
  resetRateLimits();
  
  if (twelveDataCallsToday >= 800) {
    return null; // Rate limit exceeded
  }
  
  try {
    twelveDataCallsToday++;
    const url = `${TWELVE_DATA_BASE}/price?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (!data.price) return null;
    
    // Get additional quote data
    const quoteUrl = `${TWELVE_DATA_BASE}/quote?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`;
    const quoteResponse = await fetch(quoteUrl, { signal: AbortSignal.timeout(10000) });
    
    let quoteData = {};
    if (quoteResponse.ok) {
      quoteData = await quoteResponse.json();
    }
    
    return {
      symbol: symbol,
      price: parseFloat(data.price),
      change: quoteData.change ? parseFloat(quoteData.change) : 0,
      changePercent: quoteData.percent_change ? parseFloat(quoteData.percent_change) : 0,
      volume: quoteData.volume ? parseInt(quoteData.volume) : 0,
      source: 'twelvedata',
      realtime: true
    };
  } catch (error) {
    console.error('Twelve Data error:', error);
    return null;
  }
}

// --- Multi-API Fallback System ---
async function fetchRealTimePrice(symbol) {
  // Try Alpha Vantage first (60 calls/minute)
  let result = await fetchAlphaVantagePrice(symbol);
  if (result) return result;
  
  // Try Twelve Data second (800 calls/day)
  result = await fetchTwelveDataPrice(symbol);
  if (result) return result;
  
  // Fallback to Yahoo Finance (15min delay)
  return await fetchYahooPrice(symbol);
}

// --- Yahoo Finance (Fallback) ---
async function fetchYahooPrice(symbol) {
  try {
    const auth = await getYahooCrumb();
    
    if (auth) {
      const modules = 'summaryDetail,defaultKeyStatistics,price,financialData';
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
      
      const res = await proxyRequest(url, { Cookie: auth.cookie });
      if (res.status === 200) {
        const data = await res.json();
        const price = data?.quoteSummary?.result?.[0]?.price;
        
        if (price) {
          return {
            symbol: price.symbol,
            price: price.regularMarketPrice?.raw || 0,
            change: price.regularMarketChange?.raw || 0,
            changePercent: price.regularMarketChangePercent?.raw || 0,
            volume: price.regularMarketVolume?.raw || 0,
            source: 'yahoo',
            realtime: false, // 15min delay
            delay: '15min'
          };
        }
      }
    }
    
    // Fallback to chart data
    const chartRes = await proxyRequest(`${YAHOO_FINANCE_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=5d`);
    const chartData = await chartRes.json();
    
    if (chartData?.chart?.result?.[0]) {
      const result = chartData.chart.result[0];
      const meta = result.meta;
      
      return {
        symbol: meta.symbol,
        price: meta.regularMarketPrice || 0,
        change: 0,
        changePercent: 0,
        volume: meta.regularMarketVolume || 0,
        source: 'yahoo',
        realtime: false,
        delay: '15min'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Yahoo Finance error:', error);
    return null;
  }
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

// New real-time price endpoint
async function handleRealTimePriceRequest(symbol) {
  if (!symbol) return jsonResponse({ message: 'Missing required parameter: symbol' }, 400);
  
  const priceData = await fetchRealTimePrice(symbol);
  
  if (!priceData) {
    return jsonResponse({ message: 'Unable to fetch price data' }, 404);
  }
  
  return jsonResponse(priceData);
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

// API Status endpoint
async function handleStatusRequest() {
  resetRateLimits();
  
  return jsonResponse({
    apis: {
      alphavantage: {
        callsThisMinute: alphaVantageCallsThisMinute,
        limitPerMinute: 60,
        available: alphaVantageCallsThisMinute < 60,
        resetTime: new Date(lastAlphaVantageReset + 60000).toISOString()
      },
      twelvedata: {
        callsToday: twelveDataCallsToday,
        limitPerDay: 800,
        available: twelveDataCallsToday < 800,
        resetDate: new Date(new Date().getTime() + 24*60*60*1000).toDateString()
      },
      yahoo: {
        available: true,
        delay: '15min',
        note: 'Fallback option with 15-minute delay'
      }
    },
    currentTime: new Date().toISOString()
  });
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

    const priceMatch = pathname.match(/^\/api\/price\/([^/]+)$/);
    if (priceMatch) return handleRealTimePriceRequest(priceMatch[1]);

    if (pathname === '/api/status') return handleStatusRequest();

    const fundamentalsMatch = pathname.match(/^\/api\/fundamentals\/([^/]+)$/);
    if (fundamentalsMatch) return handleFundamentalsRequest(fundamentalsMatch[1]);

    const newsMatch = pathname.match(/^\/api\/news\/([^/]+)$/);
    if (newsMatch) return handleNewsRequest(newsMatch[1]);

    return handleNotFound();
  },
};
