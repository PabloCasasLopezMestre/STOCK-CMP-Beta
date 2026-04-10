import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Minus, RefreshCw,
  DollarSign, AlertCircle, Plus, X, Edit2, Check
} from 'lucide-react';
import { t } from './i18n';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORKER_BASE = 'https://proxy.stockcmp-proxy.workers.dev';

const DEFAULT_SECTORS = {
  beverages: {
    name: 'Bebidas',
    stocks: [
      { symbol: 'KO', name: 'Coca-Cola' },
      { symbol: 'PEP', name: 'PepsiCo' },
      { symbol: 'MNST', name: 'Monster Beverage' },
      { symbol: 'TAP', name: 'Molson Coors' },
    ],
  },
  tech: {
    name: 'Big Tech',
    stocks: [
      { symbol: 'AAPL', name: 'Apple' },
      { symbol: 'MSFT', name: 'Microsoft' },
      { symbol: 'GOOGL', name: 'Google' },
      { symbol: 'META', name: 'Meta' },
      { symbol: 'AMZN', name: 'Amazon' },
    ],
  },
  ev: {
    name: 'EV & Auto',
    stocks: [
      { symbol: 'TSLA', name: 'Tesla' },
      { symbol: 'RIVN', name: 'Rivian' },
      { symbol: 'F', name: 'Ford' },
      { symbol: 'GM', name: 'General Motors' },
    ],
  },
  semiconductor: {
    name: 'Semiconductores',
    stocks: [
      { symbol: 'NVDA', name: 'NVIDIA' },
      { symbol: 'AMD', name: 'AMD' },
      { symbol: 'INTC', name: 'Intel' },
      { symbol: 'QCOM', name: 'Qualcomm' },
      { symbol: 'AVGO', name: 'Broadcom' },
    ],
  },
  banking: {
    name: 'Banca',
    stocks: [
      { symbol: 'JPM', name: 'JPMorgan' },
      { symbol: 'BAC', name: 'Bank of America' },
      { symbol: 'WFC', name: 'Wells Fargo' },
      { symbol: 'GS', name: 'Goldman Sachs' },
      { symbol: 'MS', name: 'Morgan Stanley' },
    ],
  },
};

const TIME_RANGES = {
  '1hour':   { label: '1 Hora',   interval: '2m',  range: '1h',  intraday: true },
  '6hours':  { label: '6 Horas',  interval: '5m',  range: '1d',  intraday: true, trimHours: 6 },
  '1day':    { label: '24 Horas', interval: '5m',  range: '1d',  intraday: true },
  '1week':   { label: '1 Semana', interval: '1h',  range: '5d',  intraday: false },
  '1month':  { label: '1 Mes',    interval: '1d',  range: '1mo', intraday: false },
  '3months': { label: '3 Meses',  interval: '1d',  range: '3mo', intraday: false },
  '6months': { label: '6 Meses',  interval: '1d',  range: '6mo', intraday: false },
  '1year':   { label: '1 Año',    interval: '1wk', range: '1y',  intraday: false },
  '2years':  { label: '2 Años',   interval: '1wk', range: '2y',  intraday: false },
  '3years':  { label: '3 Años',   interval: '1mo', range: '3y',  intraday: false },
  '5years':  { label: '5 Años',   interval: '1mo', range: '5y',  intraday: false },
  '10years': { label: '10 Años',  interval: '3mo', range: '10y', intraday: false },
  '15years': { label: '15 Años',  interval: '3mo', range: '15y', intraday: false },
};

const STOCK_COLORS = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];

const SYMBOL_RE = /^[A-Z0-9=\-\.]{1,10}$/;

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadSectors() {
  try {
    const raw = localStorage.getItem('sectors');
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return DEFAULT_SECTORS;
}

function saveSectors(sectors) {
  try { localStorage.setItem('sectors', JSON.stringify(sectors)); } catch (_) {}
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const StockComparisonApp = ({ currency, setCurrency, nextCurrency, currencyLabel, rates, alerts, setAlerts, userTimezone = 'America/New_York', lang = 'es' }) => {
  const exchangeRate = rates?.MXN ?? 20.5;
  const exchangeRateEUR = rates?.EUR ?? 0.92;
  const [sectors, setSectors] = useState(loadSectors);
  const [selectedSector, setSelectedSector] = useState(() => Object.keys(loadSectors())[0]);
  const [selectedStocks, setSelectedStocks] = useState(() => {
    const s = loadSectors();
    const first = Object.keys(s)[0];
    return s[first].stocks.slice(0, 2).map((x) => x.symbol);
  });

  const [timeRange, setTimeRange] = useState('1month');
  const [stockData, setStockData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fundamentals, setFundamentals] = useState({});
  const [fundamentalsLoading, setFundamentalsLoading] = useState(false);
  const [fundamentalsLastUpdate, setFundamentalsLastUpdate] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // News state
  const [newsItems, setNewsItems] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsAgeFilter, setNewsAgeFilter] = useState(48);
  const NEWS_AGE_OPTIONS = [
    { label: '1h',    hours: 1 },
    { label: '6h',    hours: 6 },
    { label: '24h',   hours: 24 },
    { label: '48h',   hours: 48 },
    { label: '7 días',hours: 168 },
    { label: 'Todo',  hours: null },
  ];

  // Price alerts state
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [newAlert, setNewAlert] = useState({ symbol: '', condition: 'above', price: '' });

  // Sector editing state
  const [editingSector, setEditingSector] = useState(null); // key being edited
  const [editName, setEditName] = useState('');
  const [newSymbolInput, setNewSymbolInput] = useState('');
  const [addingSector, setAddingSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');
  const [newSectorSymbols, setNewSectorSymbols] = useState('');

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Save alerts to localStorage
  useEffect(() => {
    localStorage.setItem('priceAlerts', JSON.stringify(alerts));
  }, [alerts]);

  // Check alerts every second against current stats
  useEffect(() => {
    if (!stats) return;
    const fired = [];
    alerts.forEach((alert) => {
      const s = stats[alert.symbol];
      if (!s) return;
      const price = s.current;
      const hit = alert.condition === 'above' ? price >= alert.price : price <= alert.price;
      if (hit) fired.push({ ...alert, currentPrice: price });
    });
    if (fired.length > 0) {
      setTriggeredAlerts(fired);
      // Browser notification
      if (Notification.permission === 'granted') {
        fired.forEach((a) => {
          new Notification(`STOCK-CMP: ${a.symbol}`, {
            body: `${a.symbol} está ${a.condition === 'above' ? 'por encima de' : 'por debajo de'} $${a.price} · Precio actual: $${a.currentPrice.toFixed(2)}`,
          });
        });
      }
    } else {
      setTriggeredAlerts([]);
    }
  }, [stats, alerts]);

  // Exchange rate now comes from props (main.jsx)

  // Fetch stock data
  const fetchStockData = async () => {
    setLoading(true);
    setError(null);
    setStockData([]);
    setStats(null);

    try {
      const { interval, range, trimHours } = TIME_RANGES[timeRange];

      const results = await Promise.all(
        selectedStocks.map(async (symbol) => {
          const url = `${WORKER_BASE}/api/stock/${symbol}?interval=${interval}&range=${range}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Error ${res.status} para ${symbol}`);
          const data = await res.json();
          if (!data.chart?.result?.[0]) throw new Error(`Datos inválidos para ${symbol}`);

          const result = data.chart.result[0];
          let timestamps = result.timestamp;
          let prices = result.indicators.quote[0].close;

          // Trim to last N hours for 6-hour view
          if (trimHours) {
            const cutoff = Date.now() / 1000 - trimHours * 3600;
            const idx = timestamps.findIndex((t) => t >= cutoff);
            if (idx > 0) {
              timestamps = timestamps.slice(idx);
              prices = prices.slice(idx);
            }
          }

          return {
            symbol,
            data: timestamps
              .map((ts, i) => ({
                timestamp: ts,
                date: TIME_RANGES[timeRange].intraday
                  ? new Date(ts * 1000).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
                  : new Date(ts * 1000).toLocaleDateString('es-MX'),
                price: prices[i],
              }))
              .filter((item) => item.price != null),
          };
        })
      );

      const valid = results.filter((r) => r.data.length > 0);
      if (!valid.length) throw new Error('Sin datos disponibles');

      const combined = mergeData(valid);
      setStockData(combined);
      calcStats(combined, valid.map((r) => r.symbol));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    fetchFundamentals();
    fetchNewsForStocks();
  };

  // Fetch news for all selected stocks — only called manually via Actualizar
  const fetchNewsForStocks = async () => {
    setNewsLoading(true);
    try {
      const results = await Promise.all(
        selectedStocks.map((symbol) =>
          fetch(`${WORKER_BASE}/api/news/${symbol}`)
            .then((r) => r.json())
            .then((data) => (data.items ?? []).map((item) => ({ ...item, symbol })))
            .catch(() => [])
        )
      );
      // Merge and sort by date descending
      const all = results.flat().sort((a, b) => {
        const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
        const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
        return db - da;
      });
      setNewsItems(all);
    } finally {
      setNewsLoading(false);
    }
  };

  useEffect(() => { fetchStockData(); }, [timeRange, selectedStocks]);

  // Fetch all available data from Yahoo Finance quoteSummary endpoint
  const fetchFundamentals = () => {
    setFundamentalsLoading(true);
    Promise.all(selectedStocks.map((symbol) =>
      fetch(`${WORKER_BASE}/api/fundamentals/${symbol}`)
        .then((r) => r.json())
        .then((data) => {
          const result = data?.quoteSummary?.result?.[0] ?? {};
          const price  = result.price ?? {};
          const detail = result.summaryDetail ?? {};
          const stats  = result.defaultKeyStatistics ?? {};
          const fin    = result.financialData ?? {};
          const raw    = (obj, key) => obj?.[key]?.raw ?? null;
          return {
            symbol,
            // Price / market data
            open:                  raw(price, 'regularMarketOpen') ?? raw(detail, 'open'),
            prevClose:             raw(price, 'regularMarketPreviousClose') ?? raw(detail, 'previousClose'),
            dayHigh:               raw(price, 'regularMarketDayHigh'),
            dayLow:                raw(price, 'regularMarketDayLow'),
            volume:                raw(price, 'regularMarketVolume') ?? raw(detail, 'regularMarketVolume'),
            avgVolume:             raw(detail, 'averageVolume') ?? raw(detail, 'averageVolume10days'),
            // 52-week
            week52High:            raw(detail, 'fiftyTwoWeekHigh'),
            week52Low:             raw(detail, 'fiftyTwoWeekLow'),
            // Moving averages
            ma50:                  raw(detail, 'fiftyDayAverage'),
            ma200:                 raw(detail, 'twoHundredDayAverage'),
            // Valuation
            trailingPE:            raw(detail, 'trailingPE'),
            forwardPE:             raw(detail, 'forwardPE'),
            priceToBook:           raw(stats,  'priceToBook'),
            priceToSales:          raw(detail, 'priceToSalesTrailing12Months'),
            // EPS
            epsTrailing:           raw(stats,  'trailingEps'),
            epsForward:            raw(stats,  'forwardEps'),
            // Dividends
            dividendRate:          raw(detail, 'dividendRate'),
            dividendYield:         raw(detail, 'dividendYield'),
            exDividendDate:        raw(detail, 'exDividendDate'),
            // Company
            beta:                  raw(detail, 'beta') ?? raw(stats, 'beta'),
            marketCap:             raw(price,  'marketCap') ?? raw(detail, 'marketCap'),
            sharesOutstanding:     raw(stats,  'sharesOutstanding'),
            bookValue:             raw(stats,  'bookValue'),
            shortName:             price.shortName ?? null,
            longName:              price.longName ?? null,
            currency:              price.currency ?? 'USD',
            exchange:              price.exchangeName ?? null,
            // Financial data
            currentRatio:          raw(fin, 'currentRatio'),
            debtToEquity:          raw(fin, 'debtToEquity'),
            returnOnEquity:        raw(fin, 'returnOnEquity'),
            returnOnAssets:        raw(fin, 'returnOnAssets'),
            profitMargin:          raw(fin, 'profitMargins'),
            revenueGrowth:         raw(fin, 'revenueGrowth'),
            earningsGrowth:        raw(fin, 'earningsGrowth'),
          };
        })
        .catch(() => ({ symbol }))
    )).then((results) => {
      setFundamentals((prev) => {
        const next = { ...prev };
        results.forEach(({ symbol, ...vals }) => { next[symbol] = vals; });
        return next;
      });
      setFundamentalsLastUpdate(new Date());
    }).finally(() => setFundamentalsLoading(false));
  };

  useEffect(() => { fetchFundamentals(); }, [selectedStocks]);

  // ---------------------------------------------------------------------------
  // Data helpers
  // ---------------------------------------------------------------------------

  function mergeData(results) {
    const base = results.reduce((a, b) => (a.data.length >= b.data.length ? a : b)).data;
    return base.map((item, i) => {
      const point = { date: item.date };
      results.forEach((r) => {
        const p = r.data[i]?.price ?? r.data[Math.min(i, r.data.length - 1)]?.price;
        if (p != null) point[r.symbol] = p;
      });
      return point;
    });
  }

  function calcStats(data, symbols) {
    const s = {};
    symbols.forEach((sym) => {
      const vals = data.map((d) => d[sym]).filter((v) => v != null);
      if (!vals.length) return;
      const current = vals[vals.length - 1];
      const initial = vals[0];
      s[sym] = {
        current,
        average: vals.reduce((a, b) => a + b) / vals.length,
        change: ((current - initial) / initial) * 100,
        min: Math.min(...vals),
        max: Math.max(...vals),
      };
    });
    setStats(s);
  }

  // ---------------------------------------------------------------------------
  // Currency helpers
  // ---------------------------------------------------------------------------

  const fmt = (v) => {
    if (v == null) return 'N/A';
    const rate = currency === 'USD' ? 1 : (rates?.[currency] ?? 1);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency,
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(v * rate);
  };

  // ---------------------------------------------------------------------------
  // Sector management
  // ---------------------------------------------------------------------------

  function updateSectors(next) {
    setSectors(next);
    saveSectors(next);
  }

  function handleSectorChange(key) {
    setSelectedSector(key);
    setSelectedStocks(sectors[key].stocks.slice(0, 2).map((s) => s.symbol));
    setEditingSector(null);
  }

  function startEditSector(key) {
    setEditingSector(key);
    setEditName(sectors[key].name);
    setNewSymbolInput('');
  }

  function saveEditSector(key) {
    if (!editName.trim()) return;
    // stocks are already saved by addStockToSector/removeStockFromSector
    // only update the name if it changed
    if (editName.trim() !== sectors[key].name) {
      const next = { ...sectors, [key]: { ...sectors[key], name: editName.trim() } };
      updateSectors(next);
    }
    setEditingSector(null);
  }

  function deleteSector(key) {
    if (Object.keys(sectors).length <= 1) return;
    const next = { ...sectors };
    delete next[key];
    updateSectors(next);
    const firstKey = Object.keys(next)[0];
    setSelectedSector(firstKey);
    setSelectedStocks(next[firstKey].stocks.slice(0, 2).map((s) => s.symbol));
  }

  function addStockToSector(key) {
    const sym = newSymbolInput.trim().toUpperCase();
    if (!SYMBOL_RE.test(sym)) return;
    if (sectors[key].stocks.find((s) => s.symbol === sym)) return;
    const next = {
      ...sectors,
      [key]: { ...sectors[key], stocks: [...sectors[key].stocks, { symbol: sym, name: sym }] },
    };
    updateSectors(next);
    setNewSymbolInput('');
  }

  function removeStockFromSector(key, symbol) {
    if (sectors[key].stocks.length <= 1) return;
    const next = {
      ...sectors,
      [key]: { ...sectors[key], stocks: sectors[key].stocks.filter((s) => s.symbol !== symbol) },
    };
    updateSectors(next);
    if (selectedSector === key) {
      setSelectedStocks((prev) => prev.filter((s) => s !== symbol).length ? prev.filter((s) => s !== symbol) : [next[key].stocks[0].symbol]);
    }
  }

  function createSector() {
    const name = newSectorName.trim();
    if (!name) return;
    const symbols = newSectorSymbols
      .split(/[\s,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => SYMBOL_RE.test(s));
    if (!symbols.length) return;
    const key = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    const next = {
      ...sectors,
      [key]: { name, stocks: symbols.map((s) => ({ symbol: s, name: s })) },
    };
    updateSectors(next);
    setAddingSector(false);
    setNewSectorName('');
    setNewSectorSymbols('');
    setSelectedSector(key);
    setSelectedStocks(symbols.slice(0, 2));
  }

  function addAlert() {
    const price = parseFloat(newAlert.price);
    if (!newAlert.symbol || isNaN(price) || price <= 0) return;
    const alert = { id: Date.now(), symbol: newAlert.symbol.toUpperCase(), condition: newAlert.condition, price };
    setAlerts((prev) => [...prev, alert]);
    setNewAlert({ symbol: '', condition: 'above', price: '' });
    if (Notification.permission === 'default') Notification.requestPermission();
  }

  function removeAlert(id) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  function toggleStock(symbol) {
    if (selectedStocks.includes(symbol)) {
      if (selectedStocks.length > 1) setSelectedStocks(selectedStocks.filter((s) => s !== symbol));
    } else {
      if (selectedStocks.length < 8) setSelectedStocks([...selectedStocks, symbol]);
    }
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const TrendIcon = ({ change }) => {
    if (change > 0) return <TrendingUp className="text-green-500" size={18} />;
    if (change < 0) return <TrendingDown className="text-red-500" size={18} />;
    return <Minus className="text-gray-500" size={18} />;
  };

  const trendColor = (c) => c > 0 ? 'text-green-500' : c < 0 ? 'text-red-500' : 'text-gray-500';

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-4 border border-slate-700">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">STOCK-CMP</h1>
              <p className="text-slate-400 text-sm">Datos en tiempo real · Yahoo Finance · ExchangeRate API</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={nextCurrency}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
              >
                {currencyLabel}
              </button>
              <button
                onClick={() => { setShowAlertPanel(!showAlertPanel); if (Notification.permission === 'default') Notification.requestPermission(); }}
                className={`relative px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${triggeredAlerts.length > 0 ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'} text-white`}
              >
                🔔 Alertas
                {alerts.length > 0 && <span className="bg-white text-slate-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{alerts.length}</span>}
              </button>
              <button
                onClick={fetchStockData}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                {t('btn_update', lang)}
              </button>
            </div>
          </div>
        </div>

        {/* Triggered alerts banner */}
        {triggeredAlerts.length > 0 && (
          <div className="bg-red-900/60 border border-red-500 rounded-xl p-3 mb-4 flex flex-wrap gap-2 items-center">
            <span className="text-red-300 font-bold text-sm">🚨 Alerta de precio:</span>
            {triggeredAlerts.map((a) => (
              <span key={a.id} className="bg-red-800 text-white text-xs px-3 py-1 rounded-full">
                {a.symbol} {a.condition === 'above' ? '▲' : '▼'} ${a.price} · actual: ${a.currentPrice.toFixed(2)}
              </span>
            ))}
          </div>
        )}

        {/* Alert panel */}
        {showAlertPanel && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 mb-4 border border-slate-700">
            <h3 className="text-white font-semibold mb-3">🔔 Alertas de precio</h3>
            <div className="flex gap-2 flex-wrap mb-4">
              <input
                className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-24 uppercase"
                placeholder="Símbolo"
                value={newAlert.symbol}
                onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value.toUpperCase() })}
                maxLength={10}
              />
              <select
                className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none"
                value={newAlert.condition}
                onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value })}
              >
                <option value="above">Sube de</option>
                <option value="below">Baja de</option>
              </select>
              <input
                className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-28"
                placeholder="Precio USD"
                type="number"
                value={newAlert.price}
                onChange={(e) => setNewAlert({ ...newAlert, price: e.target.value })}
              />
              <button onClick={addAlert} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm">
                + Agregar
              </button>
            </div>
            {alerts.length === 0 ? (
              <p className="text-slate-500 text-sm">No hay alertas configuradas.</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((a) => {
                  const triggered = triggeredAlerts.find((t) => t.id === a.id);
                  return (
                    <div key={a.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${triggered ? 'bg-red-900/40 border border-red-600' : 'bg-slate-700/50'}`}>
                      <span className="text-white text-sm font-bold">{a.symbol}</span>
                      <span className="text-slate-300 text-sm">{a.condition === 'above' ? 'sube de' : 'baja de'} <span className="text-white font-semibold">${a.price}</span></span>
                      {triggered && <span className="text-red-400 text-xs font-bold">🚨 ACTIVA</span>}
                      <button onClick={() => removeAlert(a.id)} className="text-slate-500 hover:text-red-400 transition-colors"><X size={14} /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="text-red-400 mt-1 flex-shrink-0" size={20} />
            <div>
              <p className="text-red-300">{error}</p>
              <button onClick={fetchStockData} className="mt-2 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg">
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Sector Selection */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 mb-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">{t('label_sectors', lang)}</h3>
            <button
              onClick={() => setAddingSector(true)}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-sm transition-colors"
            >
              <Plus size={16} /> Agregar sector
            </button>
          </div>

          {/* Add sector form */}
          {addingSector && (
            <div className="bg-slate-700/50 rounded-lg p-3 mb-3 flex flex-col gap-2">
              <input
                className="bg-slate-600 text-white rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Nombre del sector"
                value={newSectorName}
                onChange={(e) => setNewSectorName(e.target.value)}
              />
              <input
                className="bg-slate-600 text-white rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Símbolos separados por coma (ej. AAPL, MSFT, BTC-USD, GC=F)"
                value={newSectorSymbols}
                onChange={(e) => setNewSectorSymbols(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={createSector} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">Crear</button>
                <button onClick={() => setAddingSector(false)} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-sm">Cancelar</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {Object.entries(sectors).map(([key, sector]) => (
              <div key={key} className="relative group">
                {editingSector === key ? (
                  <div className="bg-slate-700 rounded-lg p-2 flex flex-col gap-1">
                    <input
                      className="bg-slate-600 text-white rounded px-2 py-1 text-sm outline-none w-full"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    {/* Stocks list with remove */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {sector.stocks.map((s) => (
                        <span key={s.symbol} className="flex items-center gap-0.5 bg-slate-600 text-slate-200 text-xs px-1.5 py-0.5 rounded">
                          {s.symbol}
                          <button
                            onClick={() => removeStockFromSector(key, s.symbol)}
                            disabled={sector.stocks.length <= 1}
                            className="text-slate-400 hover:text-red-400 disabled:opacity-30 ml-0.5"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    {/* Add stock */}
                    <div className="flex gap-1 mt-1">
                      <input
                        className="bg-slate-600 text-white rounded px-2 py-0.5 text-xs outline-none flex-1"
                        placeholder="Símbolo (ej. TSLA)"
                        value={newSymbolInput}
                        onChange={(e) => setNewSymbolInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && addStockToSector(key)}
                        maxLength={10}
                      />
                      <button onClick={() => addStockToSector(key)} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-xs">+</button>
                    </div>
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => saveEditSector(key)} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1"><Check size={10} />Guardar</button>
                      <button onClick={() => setEditingSector(null)} className="bg-slate-600 hover:bg-slate-500 text-white px-2 py-0.5 rounded text-xs">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSectorChange(key)}
                    className={`w-full p-3 rounded-lg font-medium transition-all text-left ${
                      selectedSector === key ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <div className="font-bold text-sm">{sector.name}</div>
                    <div className="text-xs opacity-75 truncate">{sector.stocks.map((s) => s.symbol).join(', ')}</div>
                  </button>
                )}
                {/* Edit / Delete buttons */}
                {editingSector !== key && (
                  <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditSector(key); }}
                      className="bg-slate-600 hover:bg-slate-500 text-slate-300 p-0.5 rounded"
                    >
                      <Edit2 size={10} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSector(key); }}
                      disabled={Object.keys(sectors).length <= 1}
                      className="bg-slate-600 hover:bg-red-600 text-slate-300 p-0.5 rounded disabled:opacity-30"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stock Selection */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 mb-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">{t('label_companies', lang)} ({selectedStocks.length}/8)</h3>
          <div className="flex flex-wrap gap-2">
            {sectors[selectedSector]?.stocks.map((stock) => (
              <button
                key={stock.symbol}
                onClick={() => toggleStock(stock.symbol)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedStocks.includes(stock.symbol)
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {stock.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Time Range */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 mb-4 border border-slate-700">
          <div className="flex gap-2 flex-wrap">
            {Object.entries(TIME_RANGES).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === key ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && Object.keys(stats).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {selectedStocks.map((symbol, i) => {
              const info = stats[symbol];
              if (!info) return null;
              const name = sectors[selectedSector]?.stocks.find((s) => s.symbol === symbol)?.name || symbol;
              return (
                <div key={symbol} className="bg-slate-800/70 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{symbol}</h3>
                      <p className="text-xs text-slate-400">{name}</p>
                    </div>
                    <TrendIcon change={info.change} />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-slate-400 text-xs">{t('label_current_price', lang)}</p>
                      <p className="text-xl font-bold text-white">{fmt(info.current)}</p>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">{t('label_average', lang)}</p>
                        <p className="text-sm text-slate-200">{fmt(info.average)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">{t('label_change', lang)}</p>
                        <p className={`text-sm font-semibold ${trendColor(info.change)}`}>
                          {info.change > 0 ? '+' : ''}{info.change.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">{t('label_min', lang)}</p>
                        <p className="text-sm text-slate-200">{fmt(info.min)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">{t('label_max', lang)}</p>
                        <p className="text-sm text-slate-200">{fmt(info.max)}</p>
                      </div>
                    </div>
                    {/* Quote fundamentals */}
                    {(() => {
                      const q = fundamentals[symbol];
                      if (!q) return null;
                      const fmtVol = (v) => v == null ? '—' : v >= 1e9 ? `${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v;
                      const fmtCap = (v) => v == null ? '—' : v >= 1e12 ? `${(v/1e12).toFixed(2)}T` : v >= 1e9 ? `${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v;
                      return (
                        <div className="border-t border-slate-700 pt-2 mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <div><span className="text-slate-500">{t('label_open', lang)}</span><span className="text-slate-200 float-right">{fmt(q.open)}</span></div>
                          <div><span className="text-slate-500">{t('label_volume', lang)}</span><span className="text-slate-200 float-right">{fmtVol(q.volume)}</span></div>
                          <div><span className="text-slate-500">{t('label_day_high', lang)}</span><span className="text-slate-200 float-right">{fmt(q.dayHigh)}</span></div>
                          <div><span className="text-slate-500">{t('label_avg_volume', lang)}</span><span className="text-slate-200 float-right">{fmtVol(q.avgVolume)}</span></div>
                          <div><span className="text-slate-500">{t('label_day_low', lang)}</span><span className="text-slate-200 float-right">{fmt(q.dayLow)}</span></div>
                          <div><span className="text-slate-500">{t('label_market_cap', lang)}</span><span className="text-slate-200 float-right">{fmtCap(q.marketCap)}</span></div>
                          <div><span className="text-slate-500">{t('label_week52_high', lang)}</span><span className="text-green-400 float-right">{fmt(q.week52High)}</span></div>
                          <div><span className="text-slate-500">{t('label_beta', lang)}</span><span className={`float-right ${q.beta != null ? (q.beta > 1 ? 'text-orange-400' : 'text-green-400') : 'text-slate-200'}`}>{q.beta != null ? q.beta.toFixed(2) : '—'}</span></div>
                          <div><span className="text-slate-500">{t('label_week52_low', lang)}</span><span className="text-red-400 float-right">{fmt(q.week52Low)}</span></div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}

            {/* Bloque de promedios del sector */}
            {(() => {
              const validStats = selectedStocks.map((s) => stats[s]).filter(Boolean);
              if (validStats.length < 2) return null;
              const avg = (key) => validStats.reduce((sum, s) => sum + s[key], 0) / validStats.length;
              const avgChange = avg('change');
              const avgCurrent = avg('current');
              const avgAverage = avg('average');
              const avgMin = avg('min');
              const avgMax = avg('max');
              return (
                <div className="bg-slate-700/60 rounded-lg p-4 border border-blue-500/40 hover:border-blue-500/70 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-blue-300">Promedio</h3>
                      <p className="text-xs text-slate-400">{validStats.length} empresas</p>
                    </div>
                    <TrendIcon change={avgChange} />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-slate-400 text-xs">Precio Actual</p>
                      <p className="text-xl font-bold text-white">{fmt(avgCurrent)}</p>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">Promedio</p>
                        <p className="text-sm text-slate-200">{fmt(avgAverage)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">Cambio</p>
                        <p className={`text-sm font-semibold ${trendColor(avgChange)}`}>
                          {avgChange > 0 ? '+' : ''}{avgChange.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">Mín</p>
                        <p className="text-sm text-slate-200">{fmt(avgMin)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">Máx</p>
                        <p className="text-sm text-slate-200">{fmt(avgMax)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Fundamentals */}
        {selectedStocks.some((s) => fundamentals[s]) && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 mb-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-white font-semibold">{t('label_fundamentals', lang)}</h3>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={fetchFundamentals}
                  disabled={fundamentalsLoading}
                  className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={12} className={fundamentalsLoading ? 'animate-spin' : ''} />
                  Yahoo Finance {fundamentalsLastUpdate ? `· ${fundamentalsLastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : '· nunca'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 pr-4">Empresa</th>
                    <th className="text-right py-2 px-3" title="Precio / Ganancia TTM">P/E</th>
                    <th className="text-right py-2 px-3" title="P/E Forward">P/E Fwd</th>
                    <th className="text-right py-2 px-3" title="Precio / Valor Contable">P/B</th>
                    <th className="text-right py-2 px-3" title="Precio / Ventas TTM">P/S</th>
                    <th className="text-right py-2 px-3" title="EPS Trailing 12m">EPS</th>
                    <th className="text-right py-2 px-3" title="EPS Forward">EPS Fwd</th>
                    <th className="text-right py-2 px-3" title="Dividendo Anual">Div. Yield</th>
                    <th className="text-right py-2 px-3" title="Volatilidad vs mercado">Beta</th>
                    <th className="text-right py-2 pl-3" title="Capitalización de mercado">Cap. Merc.</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStocks.map((symbol) => {
                    const f = fundamentals[symbol];
                    const n2 = (v, d = 2, s = '') => v != null ? `${Number(v).toFixed(d)}${s}` : '—';
                    const fmtCap = (v) => v == null ? '—' : v >= 1e12 ? `${(v/1e12).toFixed(2)}T` : v >= 1e9 ? `${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v;
                    return (
                      <tr key={symbol} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="py-2 pr-4">
                          <span className="font-bold text-white">{symbol}</span>
                          {f?.sector && <span className="block text-slate-500 text-xs">{f.sector}</span>}
                        </td>
                        <td className="text-right py-2 px-3 text-slate-200">{f ? n2(f.trailingPE) : '…'}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{f ? n2(f.forwardPE) : '…'}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{f ? n2(f.priceToBook) : '…'}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{f ? n2(f.priceToSales) : '…'}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{f ? n2(f.epsTrailing) : '…'}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{f ? n2(f.epsForward) : '…'}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{f?.dividendYield != null ? n2(f.dividendYield * 100, 2, '%') : '—'}</td>
                        <td className={`text-right py-2 px-3 font-medium ${f?.beta != null ? (f.beta > 1 ? 'text-orange-400' : 'text-green-400') : 'text-slate-200'}`}>
                          {f?.beta != null ? Number(f.beta).toFixed(2) : '—'}
                        </td>
                        <td className="text-right py-2 pl-3 text-slate-200">{f ? fmtCap(f.marketCap) : '…'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-slate-500 text-xs mt-2">Fuente: Yahoo Finance · Beta &gt; 1 = más volátil que el mercado</p>
          </div>
        )}

        {/* Chart + Outliers panel */}
        <div className="flex gap-4 mb-4 items-start">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-xl font-bold text-white">
              {t('label_comparison', lang)} · {TIME_RANGES[timeRange].label}
            </h3>
            <div className="flex gap-4 text-slate-300 font-mono text-lg tabular-nums">
              <span>{currentTime.toLocaleTimeString('en-US', { timeZone: userTimezone, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>

          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="text-blue-400 animate-spin" size={48} />
              <p className="text-slate-400">{t('label_loading', lang)}</p>
            </div>
          ) : error ? (
            <div className="h-96 flex items-center justify-center">
              <AlertCircle className="text-red-400 mx-auto mb-3" size={48} />
            </div>
          ) : stockData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8' }}
                  tickFormatter={(v) => {
                    const rate = currency === 'USD' ? 1 : (rates?.[currency] ?? 1);
                    const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : currency === 'CHF' ? 'Fr' : '$';
                    return `${sym}${(v * rate).toFixed(0)}`;
                  }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(v) => fmt(v)}
                />
                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                {selectedStocks.map((symbol, i) => {
                  if (!stats?.[symbol]) return null;
                  const name = sectors[selectedSector]?.stocks.find((s) => s.symbol === symbol)?.name;
                  return (
                    <Line
                      key={symbol}
                      type="monotone"
                      dataKey={symbol}
                      stroke={STOCK_COLORS[i % STOCK_COLORS.length]}
                      strokeWidth={2}
                      name={name ? `${symbol} - ${name}` : symbol}
                      dot={false}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-96 flex items-center justify-center text-slate-400">
              {t('label_select_stocks', lang)}
            </div>
          )}
          </div>

          {/* Outliers panel */}
          {stats && Object.keys(stats).length > 0 && (() => {
            const outliers = selectedStocks
              .map((symbol, i) => {
                const s = stats[symbol];
                if (!s) return null;
                const deviation = ((s.current - s.average) / s.average) * 100;
                return { symbol, deviation, current: s.current, color: STOCK_COLORS[i % STOCK_COLORS.length] };
              })
              .filter(Boolean)
              .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation));

            return (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 w-44 flex-shrink-0">
                <h4 className="text-white font-semibold text-sm mb-3">vs. promedio</h4>
                <div className="space-y-4">
                  {outliers.map(({ symbol, deviation, current, color }) => {
                    const isHigh = deviation > 0;
                    const absDev = Math.abs(deviation);
                    return (
                      <div key={symbol} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold" style={{ color }}>{symbol}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${isHigh ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                            {isHigh ? '▲' : '▼'} {absDev.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs">{fmt(current)}</p>
                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${isHigh ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(absDev * 8, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-slate-600 text-xs mt-3 border-t border-slate-700 pt-2">precio actual vs. promedio del período</p>
              </div>
            );
          })()}
        </div>

        {/* News panel */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 mb-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-white font-semibold">{t('label_news', lang)}</h3>
            <div className="flex gap-1 flex-wrap items-center">
              {NEWS_AGE_OPTIONS.map(({ label, hours }) => (
                <button
                  key={label}
                  onClick={() => setNewsAgeFilter(hours)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    newsAgeFilter === hours ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {newsLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
              <RefreshCw size={14} className="animate-spin" /> Cargando noticias...
            </div>
          )}

          {!newsLoading && newsItems.length === 0 && (
            <p className="text-slate-600 text-sm py-2">
              Presiona "Actualizar" para cargar noticias de las acciones seleccionadas.
            </p>
          )}

          {!newsLoading && newsItems.length > 0 && (() => {
            const cutoff = newsAgeFilter ? Date.now() - newsAgeFilter * 3_600_000 : 0;
            const filtered = newsItems.filter((item) => {
              if (!newsAgeFilter || !item.pubDate) return true;
              return new Date(item.pubDate).getTime() >= cutoff;
            });
            return (
              <>
                <p className="text-slate-500 text-xs mb-3">{filtered.length} noticias · {selectedStocks.join(', ')}</p>
                {filtered.length === 0 ? (
                  <p className="text-slate-500 text-sm">No hay noticias en este período.</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {filtered.map((item, i) => (
                      <a
                        key={i}
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg p-3 transition-colors"
                      >
                        {item.image && (
                          <img
                            src={item.image}
                            alt=""
                            className="w-14 h-14 object-cover rounded flex-shrink-0"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-blue-400 text-xs font-bold">{item.symbol}</span>
                            <span className="text-slate-500 text-xs">{item.source}</span>
                            {item.pubDate && (
                              <span className="text-slate-600 text-xs">
                                · {new Date(item.pubDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <p className="text-white text-sm font-medium leading-snug">{item.title}</p>
                          {item.summary && <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{item.summary}</p>}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700 text-center">
          <p className="text-slate-400 text-sm">
            📊 Yahoo Finance API · ExchangeRate API · 1 USD = {rates?.MXN?.toFixed(2)} MXN · 1 USD = {rates?.EUR?.toFixed(4)} EUR · {currentTime.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
          </p>
        </div>

        {/* Manual */}
        <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700 mt-4">
          <h2 className="text-white text-lg font-bold mb-4">Manual de valores</h2>

          <div className="mb-5">
            <h3 className="text-blue-400 font-semibold mb-2">Precios y variación</h3>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">Precio Actual:</span> El último precio de cierre registrado para la acción en el mercado.</p>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">Promedio:</span> El precio promedio de la acción durante el período de tiempo seleccionado.</p>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">Cambio %:</span> La variación porcentual del precio entre el primer y el último dato del período seleccionado. Un valor positivo indica que la acción subió; negativo, que bajó.</p>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">Mín:</span> El precio más bajo registrado durante el período seleccionado.</p>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">Máx:</span> El precio más alto registrado durante el período seleccionado.</p>
          </div>

          <div className="mb-5">
            <h3 className="text-blue-400 font-semibold mb-2">Datos de Valoración (¿Precio Justo?)</h3>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">P/E (Precio/Ganancia):</span> Indica cuántos años de beneficios estás pagando al comprar la acción hoy. Un P/E alto puede significar que el mercado espera mucho crecimiento futuro; uno bajo puede indicar que la acción está barata o que la empresa tiene problemas.</p>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">P/B (Precio/Valor Contable):</span> Compara el valor de mercado con lo que la empresa posee físicamente. Un valor menor a 1 puede indicar que la acción cotiza por debajo de su valor real en libros.</p>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">EPS (Ganancias por Acción):</span> Es el beneficio neto repartido entre cada acción. Debe ser creciente a lo largo del tiempo; si cae, puede ser señal de que la empresa está perdiendo rentabilidad.</p>
          </div>

          <div className="mb-5">
            <h3 className="text-blue-400 font-semibold mb-2">Salud y Eficiencia Financiera</h3>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">ROE (Retorno sobre Capital):</span> Mide qué tan eficiente es la empresa usando el dinero de sus inversores para generar más dinero. Un ROE alto y sostenido es señal de una empresa bien gestionada.</p>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">D/E (Deuda/Patrimonio):</span> Compara la deuda total de la empresa con el capital de sus accionistas. Un valor alto indica que la empresa depende mucho del endeudamiento, lo cual puede ser riesgoso en sectores de infraestructura pesada como petróleo o manufactura.</p>
          </div>

          <div className="mb-5">
            <h3 className="text-blue-400 font-semibold mb-2">Rendimiento y Riesgo</h3>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">Div. Yield (Dividendo):</span> El porcentaje de rentabilidad extra que recibes en efectivo cada año solo por ser dueño de la acción. Por ejemplo, un Div. Yield de 3% significa que por cada $100 invertidos recibes $3 al año en dividendos.</p>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">Beta:</span> Mide la volatilidad de la acción comparada con el mercado general. Si es mayor a 1, la acción se mueve más bruscamente que el mercado; si es menor a 1, es más estable. Por ejemplo, una Beta de 1.5 significa que si el mercado sube 10%, la acción tiende a subir 15%.</p>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">Margen:</span> El margen de beneficio neto indica qué tanto dinero queda libre tras pagar todos los costos de operación y producción. Un margen del 20% significa que de cada $100 en ventas, $20 son ganancia neta.</p>
          </div>

          <div className="mb-5">
            <h3 className="text-blue-400 font-semibold mb-2">Monedas y tiempo</h3>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">USD / MXN / EUR:</span> Puedes ver todos los precios en dólares americanos, pesos mexicanos o euros. El tipo de cambio se obtiene automáticamente al cargar la app.</p>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">Hora ET:</span> Hora del Este de Estados Unidos, que es la zona horaria de la Bolsa de Nueva York (NYSE). El mercado abre a las 9:30 AM ET y cierra a las 4:00 PM ET de lunes a viernes.</p>
            <p className="text-slate-300 text-sm mb-1"><span className="text-white font-medium">Hora CDMX:</span> Hora local de la Ciudad de México. Normalmente es 1 hora menos que ET (por ejemplo, si en Nueva York son las 10:00 AM, en CDMX son las 9:00 AM).</p>
          </div>

          <div className="border-t border-slate-700 pt-4 text-center">
            <p className="text-slate-500 text-xs">Created on Kiro by Pablo Casas</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StockComparisonApp;









































