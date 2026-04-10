var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
var EXCHANGE_RATE_URL = "https://api.exchangerate-api.com/v4/latest/USD";
var FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=USD";
var FINNHUB_API_KEY = "d7c9avpr01qsv375otd0d7c9avpr01qsv375otdg";
var FINNHUB_BASE = "https://finnhub.io/api/v1";
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};
var PREFLIGHT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
var YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com"
};
var cachedCrumb = null;
var cachedCookie = null;
async function getYahooCrumb() {
  if (cachedCrumb && cachedCookie) return { crumb: cachedCrumb, cookie: cachedCookie };
  const consentRes = await fetch("https://fc.yahoo.com", {
    headers: { "User-Agent": YAHOO_HEADERS["User-Agent"] },
    redirect: "follow"
  }).catch(() => null);
  const cookieHeader = consentRes?.headers?.get("set-cookie") ?? "";
  const cookie = cookieHeader.split(";")[0] ?? "";
  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { ...YAHOO_HEADERS, Cookie: cookie }
  }).catch(() => null);
  if (!crumbRes?.ok) return null;
  const crumb = await crumbRes.text();
  if (!crumb || crumb.includes("{")) return null;
  cachedCrumb = crumb.trim();
  cachedCookie = cookie;
  return { crumb: cachedCrumb, cookie: cachedCookie };
}
__name(getYahooCrumb, "getYahooCrumb");
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}
__name(jsonResponse, "jsonResponse");
function withCors(response) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Content-Type", "application/json");
  return new Response(response.body, { status: response.status, headers });
}
__name(withCors, "withCors");
async function proxyRequest(url, extraHeaders = {}) {
  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(1e4),
      headers: { ...YAHOO_HEADERS, ...extraHeaders }
    });
  } catch (err) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return jsonResponse({ message: "Upstream timeout" }, 504);
    }
    return jsonResponse({ message: "Bad gateway" }, 502);
  }
  if (response.ok) return withCors(response);
  return jsonResponse({ message: `Upstream error: ${response.status}` }, response.status);
}
__name(proxyRequest, "proxyRequest");
function handlePreflight() {
  return new Response(null, { status: 204, headers: PREFLIGHT_HEADERS });
}
__name(handlePreflight, "handlePreflight");
function handleNotFound() {
  return jsonResponse({ message: "Not found" }, 404);
}
__name(handleNotFound, "handleNotFound");
async function handleStockRequest(symbol, interval, range) {
  if (!symbol) return jsonResponse({ message: "Missing required parameter: symbol" }, 400);
  if (!interval) return jsonResponse({ message: "Missing required parameter: interval" }, 400);
  if (!range) return jsonResponse({ message: "Missing required parameter: range" }, 400);
  return proxyRequest(`${YAHOO_FINANCE_BASE}/${symbol}?interval=${interval}&range=${range}`);
}
__name(handleStockRequest, "handleStockRequest");
async function handleFundamentalsRequest(symbol) {
  if (!symbol) return jsonResponse({ message: "Missing required parameter: symbol" }, 400);
  const auth = await getYahooCrumb();
  if (auth) {
    const modules = "summaryDetail,defaultKeyStatistics,price,financialData";
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
    const res = await proxyRequest(url, { Cookie: auth.cookie });
    if (res.status === 200) return res;
    cachedCrumb = null;
    cachedCookie = null;
  }
  const chartRes = await proxyRequest(`${YAHOO_FINANCE_BASE}/${encodeURIComponent(symbol)}?interval=1d&range=5d`);
  try {
    const data = await chartRes.clone().json();
    const meta = data?.chart?.result?.[0]?.meta ?? {};
    return jsonResponse({
      quoteSummary: {
        result: [{
          price: {
            regularMarketDayHigh: { raw: meta.regularMarketDayHigh },
            regularMarketDayLow: { raw: meta.regularMarketDayLow },
            regularMarketVolume: { raw: meta.regularMarketVolume },
            shortName: meta.shortName,
            longName: meta.longName,
            currency: meta.currency,
            exchangeName: meta.fullExchangeName
          },
          summaryDetail: {
            fiftyTwoWeekHigh: { raw: meta.fiftyTwoWeekHigh },
            fiftyTwoWeekLow: { raw: meta.fiftyTwoWeekLow },
            previousClose: { raw: meta.chartPreviousClose },
            regularMarketVolume: { raw: meta.regularMarketVolume }
          },
          defaultKeyStatistics: {},
          financialData: {}
        }],
        error: null
      }
    });
  } catch {
    return chartRes;
  }
}
__name(handleFundamentalsRequest, "handleFundamentalsRequest");
async function handleNewsRequest(symbol) {
  if (!symbol) return jsonResponse({ message: "Missing required parameter: symbol" }, 400);
  const to = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const from = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  try {
    const finnhubUrl = `${FINNHUB_BASE}/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
    const res = await fetch(finnhubUrl, { signal: AbortSignal.timeout(8e3) });
    if (res.ok) {
      const articles = await res.json();
      if (Array.isArray(articles) && articles.length > 0) {
        const items = articles.slice(0, 20).map((a) => ({
          title: a.headline ?? "",
          link: a.url ?? "",
          pubDate: a.datetime ? new Date(a.datetime * 1e3).toUTCString() : "",
          source: a.source ?? "Finnhub",
          summary: (a.summary ?? "").slice(0, 200),
          image: a.image ?? null
        }));
        return jsonResponse({ symbol, items, source: "finnhub" });
      }
    }
  } catch (_) {
  }
  try {
    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
    const res = await fetch(rssUrl, { signal: AbortSignal.timeout(8e3), headers: YAHOO_HEADERS });
    if (res.ok) {
      const xml = await res.text();
      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 20) {
        const block = match[1];
        const get = /* @__PURE__ */ __name((tag) => {
          const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
          return m ? (m[1] ?? m[2] ?? "").trim() : "";
        }, "get");
        items.push({
          title: get("title"),
          link: get("link"),
          pubDate: get("pubDate"),
          source: get("source") || "Yahoo Finance",
          summary: get("description").replace(/<[^>]+>/g, "").slice(0, 200),
          image: null
        });
      }
      return jsonResponse({ symbol, items, source: "yahoo" });
    }
  } catch (_) {
  }
  return jsonResponse({ symbol, items: [], source: "none" });
}
__name(handleNewsRequest, "handleNewsRequest");
async function handleExchangeRateRequest() {
  try {
    const res = await fetch(EXCHANGE_RATE_URL, { signal: AbortSignal.timeout(8e3) });
    if (res.ok) {
      const data = await res.json();
      if (data.rates) return jsonResponse({ rates: data.rates });
    }
  } catch (_) {
  }
  try {
    const res = await fetch(FRANKFURTER_URL, { signal: AbortSignal.timeout(8e3) });
    if (res.ok) {
      const data = await res.json();
      if (data.rates) return jsonResponse({ rates: data.rates });
    }
  } catch (_) {
  }
  return jsonResponse({ rates: {} }, 502);
}
__name(handleExchangeRateRequest, "handleExchangeRateRequest");
var src_default = {
  async fetch(request) {
    const { method, url } = request;
    const { pathname, searchParams } = new URL(url);
    if (method === "OPTIONS") return handlePreflight();
    if (pathname === "/api/exchange-rate") return handleExchangeRateRequest();
    const stockMatch = pathname.match(/^\/api\/stock\/([^/]+)$/);
    if (stockMatch) {
      return handleStockRequest(
        stockMatch[1],
        searchParams.get("interval") ?? "",
        searchParams.get("range") ?? ""
      );
    }
    const fundamentalsMatch = pathname.match(/^\/api\/fundamentals\/([^/]+)$/);
    if (fundamentalsMatch) return handleFundamentalsRequest(fundamentalsMatch[1]);
    const newsMatch = pathname.match(/^\/api\/news\/([^/]+)$/);
    if (newsMatch) return handleNewsRequest(newsMatch[1]);
    return handleNotFound();
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-TzyGXX/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-TzyGXX/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
