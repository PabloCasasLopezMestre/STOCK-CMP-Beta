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
import { rsi, macd, bollingerBands, stochastic, ema } from './indicators';
import { detectPatterns } from './patterns';
import { runBacktest, STRATEGIES } from './backtest';

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
  '1hour':   { label: '1h',    label_es: '1 Hora',   interval: '2m',  range: '1h',  intraday: true },
  '6hours':  { label: '6h',    label_es: '6 Horas',  interval: '5m',  range: '1d',  intraday: true, trimHours: 6 },
  '1day':    { label: '24h',   label_es: '24 Horas', interval: '5m',  range: '1d',  intraday: true },
  '1week':   { label: '1W',    label_es: '1 Semana', interval: '1h',  range: '5d',  intraday: false },
  '1month':  { label: '1M',    label_es: '1 Mes',    interval: '1d',  range: '1mo', intraday: false },
  '3months': { label: '3M',    label_es: '3 Meses',  interval: '1d',  range: '3mo', intraday: false },
  '6months': { label: '6M',    label_es: '6 Meses',  interval: '1d',  range: '6mo', intraday: false },
  '1year':   { label: '1Y',    label_es: '1 Año',    interval: '1wk', range: '1y',  intraday: false },
  '2years':  { label: '2Y',    label_es: '2 Años',   interval: '1wk', range: '2y',  intraday: false },
  '3years':  { label: '3Y',    label_es: '3 Años',   interval: '1mo', range: '3y',  intraday: false },
  '5years':  { label: '5Y',    label_es: '5 Años',   interval: '1mo', range: '5y',  intraday: false },
  '10years': { label: '10Y',   label_es: '10 Años',  interval: '3mo', range: '10y', intraday: false },
  '15years': { label: '15Y',   label_es: '15 Años',  interval: '3mo', range: '15y', intraday: false },
  'alltime': { label: 'All',   label_es: 'Todo',     interval: '3mo', range: 'max', intraday: false },
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

const StockComparisonApp = ({ currency, setCurrency, nextCurrency, currencyLabel, rates, alerts, setAlerts, userTimezone = 'America/New_York', lang = 'es', onOpenCommunityIdea, refreshTrigger, onSelectedStocksChange }) => {
  const exchangeRate = rates?.MXN ?? 20.5;
  const exchangeRateEUR = rates?.EUR ?? 0.92;
  const [sectors, setSectors] = useState(loadSectors);
  const [selectedSectors, setSelectedSectors] = useState(() => {
    const keys = Object.keys(loadSectors());
    return new Set([keys[0]]);
  });
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

  // Technical indicators state
  const [indicatorSymbols, setIndicatorSymbols] = useState(new Set());
  const [indicatorDataMap, setIndicatorDataMap] = useState({});
  const [activeIndicator, setActiveIndicator] = useState('rsi');
  const INDICATORS = [
    { id: 'rsi',      label: 'RSI (14)' },
    { id: 'macd',     label: 'MACD' },
    { id: 'bollinger',label: 'Bollinger' },
    { id: 'stoch',    label: lang === 'es' ? 'Estocástico' : 'Stochastic' },
  ];

  // Pattern recognition state
  const [patternSymbols, setPatternSymbols] = useState(new Set());
  const [patternsMap, setPatternsMap] = useState({}); // keyed by symbol

  // Backtest state
  const [backtestSymbols, setBacktestSymbols] = useState(new Set());
  const [backtestResults, setBacktestResults] = useState({}); // keyed by symbol
  const [backtestStrategy, setBacktestStrategy] = useState('rsi_oversold');
  const [backtestCapital, setBacktestCapital] = useState('10000');
  const NEWS_AGE_OPTIONS = [
    { label: '1h',    hours: 1 },
    { label: '6h',    hours: 6 },
    { label: '24h',   hours: 24 },
    { label: '48h',   hours: 48 },
    { label: lang === 'es' ? '7 días' : '7 days', hours: 168 },
    { label: lang === 'es' ? 'Todo'   : 'All',    hours: null },
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
            body: `${a.symbol} is ${a.condition === 'above' ? 'above' : 'below'} $${a.price} · Current price: $${a.currentPrice.toFixed(2)}`,
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
          let timestamps = result.timestamp ?? [];
          if (!timestamps.length) return null;
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
  useEffect(() => { if (refreshTrigger > 0) fetchStockData(); }, [refreshTrigger]);
  useEffect(() => { if (onSelectedStocksChange) onSelectedStocksChange(selectedStocks); }, [selectedStocks]);

  // Calculate technical indicators for a given symbol from stockData
  const calcIndicators = (symbol) => {
    const prices = stockData.map(d => d[symbol]).filter(v => v != null);
    const dates  = stockData.filter(d => d[symbol] != null).map(d => d.date);
    if (prices.length < 20) return null;

    const rsiVals      = rsi(prices, 14);
    const macdVals     = prices.length >= 35 ? macd(prices, 12, 26, 9) : macd(prices, 5, 13, 4);
    const bollVals     = bollingerBands(prices, 20, 2);
    const ema20        = ema(prices, 20);
    const ema50        = ema(prices, 50);

    // For stochastic we approximate high/low from price (since we only have close)
    const stochVals    = stochastic(prices, prices, prices, 14, 3);

    return { prices, dates, rsi: rsiVals, macd: macdVals, bollinger: bollVals, ema20, ema50, stoch: stochVals };
  };

  const handleShowIndicators = (symbol) => {
    setIndicatorSymbols(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  // Recalculate when stockData changes
  useEffect(() => {
    if (indicatorSymbols.size > 0 && stockData.length > 0) {
      const newMap = {};
      indicatorSymbols.forEach(sym => {
        newMap[sym] = calcIndicators(sym);
      });
      setIndicatorDataMap(newMap);
    }
    if (patternSymbols.size > 0 && stockData.length > 0) {
      const newMap = {};
      patternSymbols.forEach(sym => {
        const prices = stockData.map(d => d[sym]).filter(v => v != null);
        newMap[sym] = detectPatterns(prices);
      });
      setPatternsMap(newMap);
    }
  }, [stockData]);

  // Pattern recognition handler
  const handleShowPatterns = (symbol) => {
    setPatternSymbols(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) { next.delete(symbol); } else { next.add(symbol); }
      return next;
    });
    const prices = stockData.map(d => d[symbol]).filter(v => v != null);
    setPatternsMap(prev => {
      const next = { ...prev };
      if (next[symbol]) { delete next[symbol]; } else { next[symbol] = detectPatterns(prices); }
      return next;
    });
  };

  // Backtest handler
  const handleRunBacktest = () => {
    const capitalInput = parseFloat(backtestCapital) || 10000;
    const capitalUSD = currency === 'USD' ? capitalInput : capitalInput / (rates?.[currency] ?? 1);
    const newResults = {};
    backtestSymbols.forEach(symbol => {
      const prices = stockData.map(d => d[symbol]).filter(v => v != null);
      const dates  = stockData.filter(d => d[symbol] != null).map(d => d.date);
      newResults[symbol] = runBacktest(prices, dates, backtestStrategy, capitalUSD);
    });
    setBacktestResults(newResults);
  };

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
    setSelectedSectors(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      // Remove selectedStocks that don't belong to any selected sector
      const validSymbols = new Set(
        [...next].flatMap(k => (sectors[k]?.stocks || []).map(s => s.symbol))
      );
      setSelectedStocks(prev => {
        const filtered = prev.filter(s => validSymbols.has(s));
        return filtered.length > 0 ? filtered : [sectors[key]?.stocks[0]?.symbol].filter(Boolean);
      });
      return next;
    });
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
    setSelectedSectors(prev => {
      const s = new Set(prev);
      s.delete(key);
      if (s.size === 0) s.add(firstKey);
      return s;
    });
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
    if (selectedSectors.has(key)) {
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
    setSelectedSectors(new Set([key]));
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
              <h1 className="text-3xl font-bold text-white mb-1">STCK-CMP <span className="text-sm font-normal text-slate-400">Beta</span></h1>
              <p className="text-slate-400 text-sm">{lang === 'es' ? 'Datos en tiempo real' : 'Real-time data'} · Yahoo Finance · ExchangeRate API</p>
            </div>
          </div>
        </div>

        {/* Triggered alerts banner */}
        {triggeredAlerts.length > 0 && (
          <div className="bg-red-900/60 border border-red-500 rounded-xl p-3 mb-4 flex flex-wrap gap-2 items-center">
            <span className="text-red-300 font-bold text-sm">{t('portfolio_alert_active', lang).replace('🚨 ', '')}:</span>
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
            <h3 className="text-white font-semibold mb-3">{t('portfolio_price_alerts', lang)}</h3>
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
                <option value="above">{t('portfolio_alert_rises_above', lang)}</option>
                <option value="below">{t('portfolio_alert_falls_below', lang)}</option>
              </select>
              <input
                className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-28"
                placeholder="Price USD"
                type="number"
                value={newAlert.price}
                onChange={(e) => setNewAlert({ ...newAlert, price: e.target.value })}
              />
              <button onClick={addAlert} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm">
                {t('portfolio_alert_add', lang)}
              </button>
            </div>
            {alerts.length === 0 ? (
              <p className="text-slate-500 text-sm">{t('portfolio_no_alerts', lang)}</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((a) => {
                  const triggered = triggeredAlerts.find((t) => t.id === a.id);
                  return (
                    <div key={a.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${triggered ? 'bg-red-900/40 border border-red-600' : 'bg-slate-700/50'}`}>
                      <span className="text-white text-sm font-bold">{a.symbol}</span>
                      <span className="text-slate-300 text-sm">{a.condition === 'above' ? t('portfolio_alert_rises_above', lang) : t('portfolio_alert_falls_below', lang)} <span className="text-white font-semibold">${a.price}</span></span>
                      {triggered && <span className="text-red-400 text-xs font-bold">{t('portfolio_alert_active', lang)}</span>}
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
              <p className="text-slate-400 text-xs mt-1">
                {lang === 'es'
                  ? 'Si el símbolo no aparece, revisa el manual de códigos en Acerca → Códigos.'
                  : 'If the symbol does not appear, check the symbol guide in About → Symbol Codes.'}
              </p>
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
              <Plus size={16} /> {t('btn_add_sector', lang)}
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
                      selectedSectors.has(key) ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
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
            {[...new Map(
              [...selectedSectors].flatMap(key => (sectors[key]?.stocks || []).map(s => [s.symbol, s]))
            ).values()].map((stock) => (
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
            {Object.entries(TIME_RANGES).map(([key, { label, label_es }]) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === key ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {lang === 'es' ? label_es : label}
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
              const name = [...selectedSectors].flatMap(k => sectors[k]?.stocks || []).find((s) => s.symbol === symbol)?.name || symbol;
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
                    {onOpenCommunityIdea && (
                      <button
                        type="button"
                        onClick={() => onOpenCommunityIdea(symbol)}
                        className="w-full mt-3 pt-3 border-t border-slate-600 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {t('community_new_idea', lang)} · {symbol}
                      </button>
                    )}
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
                      <h3 className="text-lg font-bold text-blue-300">{t('portfolio_average', lang)}</h3>
                      <p className="text-xs text-slate-400">{validStats.length} {t('label_companies', lang).toLowerCase()}</p>
                    </div>
                    <TrendIcon change={avgChange} />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-slate-400 text-xs">{t('label_current_price', lang)}</p>
                      <p className="text-xl font-bold text-white">{fmt(avgCurrent)}</p>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">{t('portfolio_average', lang)}</p>
                        <p className="text-sm text-slate-200">{fmt(avgAverage)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs">{t('label_change_pct', lang)}</p>
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
                    <th className="text-left py-2 pr-4">{t('label_companies', lang)}</th>
                    <th className="text-right py-2 px-3" title="Price / Earnings TTM">P/E</th>
                    <th className="text-right py-2 px-3" title="P/E Forward">P/E Fwd</th>
                    <th className="text-right py-2 px-3" title="Price / Book Value">P/B</th>
                    <th className="text-right py-2 px-3" title="Price / Sales TTM">P/S</th>
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
            <p className="text-slate-500 text-xs mt-2">{lang === 'es' ? 'Fuente: Yahoo Finance · Beta > 1 = más volátil que el mercado' : 'Source: Yahoo Finance · Beta > 1 = more volatile than the market'}</p>
          </div>
        )}

        {/* Chart + Outliers panel */}
        <div className="flex gap-4 mb-4 items-start">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-xl font-bold text-white">
              {t('label_comparison', lang)} · {lang === 'es' ? TIME_RANGES[timeRange].label_es : TIME_RANGES[timeRange].label}
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
                  const name = [...selectedSectors].flatMap(k => sectors[k]?.stocks || []).find((s) => s.symbol === symbol)?.name;
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
                <h4 className="text-white font-semibold text-sm mb-3">{t('label_average', lang)}</h4>
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
                <p className="text-slate-600 text-xs mt-3 border-t border-slate-700 pt-2">{t('label_current_price', lang)} vs. {t('label_average', lang)}</p>
              </div>
            );
          })()}
        </div>

        {/* Technical Indicators Panel */}
        {stats && Object.keys(stats).length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 mb-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-white font-semibold">{t('label_technical_indicators', lang)}</h3>
              <div className="flex gap-1 flex-wrap">
                {selectedStocks.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleShowIndicators(sym)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                      indicatorSymbols.has(sym) ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {indicatorSymbols.size > 0 && Object.keys(indicatorDataMap).length > 0 && (
              <>
                {/* Indicator selector */}
                <div className="flex gap-1 mb-4 flex-wrap">
                  {INDICATORS.map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() => setActiveIndicator(id)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        activeIndicator === id ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {[...indicatorSymbols].map(sym => {
                  const indicatorData = indicatorDataMap[sym];
                  if (!indicatorData) return null;
                  return (
                    <div key={sym}>
                      <div className="text-slate-300 text-xs font-semibold mb-2 mt-3 border-b border-slate-700 pb-1">{sym}</div>

                      {/* RSI */}
                      {activeIndicator === 'rsi' && (() => {
                        const data = indicatorData.dates.map((date, i) => ({
                          date,
                          rsi: indicatorData.rsi[i] != null ? +indicatorData.rsi[i].toFixed(2) : null,
                        })).filter(d => d.rsi != null);
                        const last = data[data.length - 1]?.rsi;
                        const signal = last > 70 ? t('label_overbought', lang) : last < 30 ? t('label_oversold', lang) : t('label_neutral', lang);
                        return (
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-slate-400 text-xs">{lang === 'es' ? 'RSI actual' : 'Current RSI'}: <span className="text-white font-bold">{last?.toFixed(1)}</span></span>
                              <span className="text-slate-300 text-xs">{signal}</span>
                              <span className="text-slate-500 text-xs">· &gt;70 {t('label_overbought', lang).toLowerCase()} · &lt;30 {t('label_oversold', lang).toLowerCase()}</span>
                            </div>
                            <ResponsiveContainer width="100%" height={180}>
                              <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} labelStyle={{ color: '#e2e8f0' }} itemStyle={{ color: '#e2e8f0' }} />
                                <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" strokeWidth={2} dot={false} name="RSI" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })()}

                      {/* MACD */}
                      {activeIndicator === 'macd' && (() => {
                        const data = indicatorData.dates.map((date, i) => ({
                          date,
                          macd:      indicatorData.macd.macd[i] != null ? +indicatorData.macd.macd[i].toFixed(4) : null,
                          signal:    indicatorData.macd.signal[i] != null ? +indicatorData.macd.signal[i].toFixed(4) : null,
                          histogram: indicatorData.macd.histogram[i] != null ? +indicatorData.macd.histogram[i].toFixed(4) : null,
                        })).filter(d => d.macd != null);
                        const last = data[data.length - 1];
                        const crossSignal = last?.macd > last?.signal ? `${lang === 'es' ? 'Alcista' : 'Bullish'} (MACD > Signal)` : `${lang === 'es' ? 'Bajista' : 'Bearish'} (MACD < Signal)`;
                        if (!data.length) return <p key="no-macd" className="text-slate-500 text-sm">{lang === 'es' ? 'Se necesitan al menos 35 puntos para MACD. Usa un rango más largo.' : 'At least 35 data points needed for MACD. Use a longer time range.'}</p>;
                        return (
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-slate-400 text-xs">MACD: <span className="text-white font-bold">{last?.macd?.toFixed(3)}</span></span>
                              <span className="text-slate-400 text-xs">Signal: <span className="text-white font-bold">{last?.signal?.toFixed(3)}</span></span>
                              <span className="text-slate-300 text-xs">{crossSignal}</span>
                            </div>
                            <ResponsiveContainer width="100%" height={180}>
                              <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} labelStyle={{ color: '#e2e8f0' }} itemStyle={{ color: '#e2e8f0' }} />
                                <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} dot={false} name="MACD" />
                                <Line type="monotone" dataKey="signal" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Signal" strokeDasharray="4 2" />
                                <Line type="monotone" dataKey="histogram" stroke="#10b981" strokeWidth={1} dot={false} name="Histograma" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })()}

                      {/* Bollinger Bands */}
                      {activeIndicator === 'bollinger' && (() => {
                        const data = indicatorData.dates.map((date, i) => ({
                          date,
                          price:  +indicatorData.prices[i].toFixed(2),
                          upper:  indicatorData.bollinger.upper[i] != null ? +indicatorData.bollinger.upper[i].toFixed(2) : null,
                          middle: indicatorData.bollinger.middle[i] != null ? +indicatorData.bollinger.middle[i].toFixed(2) : null,
                          lower:  indicatorData.bollinger.lower[i] != null ? +indicatorData.bollinger.lower[i].toFixed(2) : null,
                        })).filter(d => d.upper != null);
                        const last = data[data.length - 1];
                        const pct = last ? ((last.price - last.lower) / (last.upper - last.lower) * 100).toFixed(0) : null;
                        const signal = pct > 80 ? `${lang === 'es' ? 'Cerca del límite superior' : 'Near upper band'}` : pct < 20 ? `${lang === 'es' ? 'Cerca del límite inferior' : 'Near lower band'}` : `${lang === 'es' ? 'Dentro de las bandas' : 'Within bands'}`;
                        return (
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-slate-400 text-xs">%B: <span className="text-white font-bold">{pct}%</span></span>
                              <span className="text-slate-300 text-xs">{signal}</span>
                              <span className="text-slate-500 text-xs">· {lang === 'es' ? 'Banda superior' : 'Upper band'}: {fmt(last?.upper)} · {lang === 'es' ? 'Inferior' : 'Lower'}: {fmt(last?.lower)}</span>
                            </div>
                            <ResponsiveContainer width="100%" height={220}>
                              <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}`} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} labelStyle={{ color: '#e2e8f0' }} itemStyle={{ color: '#e2e8f0' }} formatter={v => fmt(v)} />
                                <Line type="monotone" dataKey="upper"  stroke="#ef4444" strokeWidth={1} dot={false} name={lang === 'es' ? 'Banda sup.' : 'Upper band'} strokeDasharray="4 2" />
                                <Line type="monotone" dataKey="middle" stroke="#94a3b8" strokeWidth={1} dot={false} name={lang === 'es' ? 'Media (20)' : 'Middle (20)'} strokeDasharray="4 2" />
                                <Line type="monotone" dataKey="lower"  stroke="#3b82f6" strokeWidth={1} dot={false} name={lang === 'es' ? 'Banda inf.' : 'Lower band'} strokeDasharray="4 2" />
                                <Line type="monotone" dataKey="price"  stroke="#10b981" strokeWidth={2} dot={false} name={lang === 'es' ? 'Precio' : 'Price'} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })()}

                      {/* Stochastic */}
                      {activeIndicator === 'stoch' && (() => {
                        const data = indicatorData.dates.map((date, i) => ({
                          date,
                          k: indicatorData.stoch.k[i] != null ? +indicatorData.stoch.k[i].toFixed(2) : null,
                          d: indicatorData.stoch.d[i] != null ? +indicatorData.stoch.d[i].toFixed(2) : null,
                        })).filter(d => d.k != null);
                        const last = data[data.length - 1];
                        const signal = last?.k > 80 ? t('label_overbought', lang) : last?.k < 20 ? t('label_oversold', lang) : t('label_neutral', lang);
                        return (
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-slate-400 text-xs">%K: <span className="text-white font-bold">{last?.k?.toFixed(1)}</span></span>
                              <span className="text-slate-400 text-xs">%D: <span className="text-white font-bold">{last?.d?.toFixed(1)}</span></span>
                              <span className="text-slate-300 text-xs">{signal}</span>
                              <span className="text-slate-500 text-xs">· &gt;80 {t('label_overbought', lang).toLowerCase()} · &lt;20 {t('label_oversold', lang).toLowerCase()}</span>
                            </div>
                            <ResponsiveContainer width="100%" height={180}>
                              <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <YAxis domain={[0, 100]} stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} labelStyle={{ color: '#e2e8f0' }} itemStyle={{ color: '#e2e8f0' }} />
                                <Line type="monotone" dataKey="k" stroke="#f59e0b" strokeWidth={2} dot={false} name="%K" />
                                <Line type="monotone" dataKey="d" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="%D" strokeDasharray="4 2" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </>
            )}

            {indicatorSymbols.size === 0 && (
              <p className="text-slate-500 text-sm">{t('label_select_stock_indicators', lang)}</p>
            )}
          </div>
        )}

        {/* Pattern Recognition Panel */}
        {stats && Object.keys(stats).length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 mb-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-white font-semibold">{t('label_pattern_recognition', lang)}</h3>
              <div className="flex gap-1 flex-wrap">
                {selectedStocks.map((sym) => (
                  <button key={sym} onClick={() => handleShowPatterns(sym)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${patternSymbols.has(sym) ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {sym}
                  </button>
                ))}
              </div>
            </div>
            {patternSymbols.size === 0 && <p className="text-slate-500 text-sm">{t('label_select_stock_patterns', lang)}</p>}
            {patternSymbols.size > 0 && Object.keys(patternsMap).length > 0 && (
              <div className="space-y-4">
                {[...patternSymbols].map(sym => {
                  const symPatterns = patternsMap[sym] || [];
                  return (
                    <div key={sym}>
                      <p className="text-slate-300 text-xs font-bold mb-2 border-b border-slate-700 pb-1">{sym}</p>
                      {symPatterns.length === 0 ? (
                        <p className="text-slate-400 text-sm">{t('label_no_patterns_detected', lang)}</p>
                      ) : (
                        <div className="space-y-2">
                          {symPatterns.map((p, i) => {
                            const patternNames = {
                              'Doble Techo': lang === 'es' ? 'Doble Techo' : 'Double Top',
                              'Doble Suelo': lang === 'es' ? 'Doble Suelo' : 'Double Bottom',
                              'Cabeza y Hombros': lang === 'es' ? 'Cabeza y Hombros' : 'Head and Shoulders',
                              'Cabeza y Hombros Invertido': lang === 'es' ? 'Cabeza y Hombros Invertido' : 'Inverse Head and Shoulders',
                              'Cuña Alcista': lang === 'es' ? 'Cuña Alcista' : 'Rising Wedge',
                              'Cuña Bajista': lang === 'es' ? 'Cuña Bajista' : 'Falling Wedge',
                            };
                            const isBullish = p.signal === 'alcista';
                            const reliabilityColor = p.reliability >= 70 ? 'text-green-400' : p.reliability >= 50 ? 'text-yellow-400' : 'text-orange-400';
                            const reliabilityLabel = p.reliability >= 70 ? (lang === 'es' ? 'Alta' : 'High') : p.reliability >= 50 ? (lang === 'es' ? 'Media' : 'Medium') : (lang === 'es' ? 'Baja' : 'Low');
                            return (
                              <div key={i} className={`rounded-lg px-4 py-3 border ${isBullish ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-white font-semibold text-sm">{patternNames[p.pattern] || p.pattern}</p>
                                  <span className={`text-xs font-bold px-2 py-1 rounded ${isBullish ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
                                    {isBullish ? `▲ ${lang === 'es' ? 'Alcista' : 'Bullish'}` : `▼ ${lang === 'es' ? 'Bajista' : 'Bearish'}`}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                                  <div><span className="text-slate-500">{lang === 'es' ? 'Confiabilidad' : 'Reliability'}: </span><span className={`font-semibold ${reliabilityColor}`}>{p.reliability}% ({reliabilityLabel})</span></div>
                                  {p.targetPrice && <div><span className="text-slate-500">{lang === 'es' ? 'Precio objetivo' : 'Target'}: </span><span className="text-white font-semibold">{fmt(p.targetPrice)}</span></div>}
                                  {p.stopLoss && <div><span className="text-slate-500">Stop loss: </span><span className="text-red-300 font-semibold">{fmt(p.stopLoss)}</span></div>}
                                  <div><span className="text-slate-500">{lang === 'es' ? 'Precio actual' : 'Current'}: </span><span className="text-white">{fmt(p.currentPrice)}</span></div>
                                  <div><span className="text-slate-500">{lang === 'es' ? 'Estado' : 'Status'}: </span><span className={isBullish ? 'text-green-400' : 'text-red-400'}>{isBullish ? (lang === 'es' ? 'Señal de compra' : 'Buy signal') : (lang === 'es' ? 'Señal de venta' : 'Sell signal')}</span></div>
                                  <div><span className="text-slate-500">{lang === 'es' ? 'Puntos' : 'Points'}: </span><span className="text-slate-300">{p.dataPoints}</span></div>
                                </div>
                                {p.targetPrice && (
                                  <div className="mt-2 flex gap-2 flex-wrap">
                                    <button
                                      onClick={() => {
                                        setAlerts(prev => [...prev, { id: Date.now(), symbol: sym, condition: isBullish ? 'above' : 'below', price: p.targetPrice }]);
                                        if (Notification.permission === 'default') Notification.requestPermission();
                                      }}
                                      className="text-xs bg-amber-700/50 hover:bg-amber-600/60 text-amber-200 px-2 py-1 rounded border border-amber-600/40"
                                    >
                                      {lang === 'es' ? `Alerta: objetivo ${fmt(p.targetPrice)}` : `Alert: target ${fmt(p.targetPrice)}`}
                                    </button>
                                    {p.stopLoss && (
                                      <button
                                        onClick={() => {
                                          setAlerts(prev => [...prev, { id: Date.now() + 1, symbol: sym, condition: 'below', price: p.stopLoss }]);
                                          if (Notification.permission === 'default') Notification.requestPermission();
                                        }}
                                        className="text-xs bg-red-900/40 hover:bg-red-800/50 text-red-300 px-2 py-1 rounded border border-red-700/40"
                                      >
                                        {lang === 'es' ? `Alerta: stop loss ${fmt(p.stopLoss)}` : `Alert: stop loss ${fmt(p.stopLoss)}`}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <p className="text-slate-500 text-xs mt-2">{t('label_patterns_disclaimer', lang)}</p>
              </div>
            )}
          </div>
        )}

        {/* Backtesting Panel */}
        {stats && Object.keys(stats).length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 mb-4">
            <h3 className="text-white font-semibold mb-3">{t('label_backtesting', lang)}</h3>
            <div className="flex flex-wrap gap-3 mb-4 items-end">
              <div>
                <p className="text-slate-400 text-xs mb-1">{t('label_symbol', lang)}</p>
                <div className="flex gap-1">
                  {selectedStocks.map((sym) => (
                    <button key={sym} onClick={() => setBacktestSymbols(prev => { const n = new Set(prev); n.has(sym) ? n.delete(sym) : n.add(sym); return n; })}
                      className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${backtestSymbols.has(sym) ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">{t('label_strategy', lang)}</p>
                <select
                  className="bg-slate-700 text-white rounded px-3 py-1.5 text-xs outline-none"
                  value={backtestStrategy}
                  onChange={(e) => setBacktestStrategy(e.target.value)}
                >
                  {STRATEGIES.map(s => <option key={s.id} value={s.id}>{lang === 'es' ? s.name_es : s.name}</option>)}
                </select>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">{t('label_initial_capital', lang)} ({currency})</p>
                <input
                  className="bg-slate-700 text-white rounded px-3 py-1.5 text-xs outline-none w-28"
                  type="number" value={backtestCapital}
                  onChange={(e) => setBacktestCapital(e.target.value)}
                />
              </div>
              <button
                onClick={() => backtestSymbols.size > 0 && handleRunBacktest()}
                disabled={backtestSymbols.size === 0}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-xs font-semibold"
              >
                {t('btn_search', lang)}
              </button>
            </div>
            {STRATEGIES.find(s => s.id === backtestStrategy) && (
              <p className="text-slate-500 text-xs mb-3">{lang === 'es' ? STRATEGIES.find(s => s.id === backtestStrategy)?.description_es : STRATEGIES.find(s => s.id === backtestStrategy)?.description}</p>
            )}
            {backtestSymbols.size > 0 && Object.values(backtestResults).some(r => r === null) && (
              <p className="text-amber-300 text-sm mt-2">{lang === 'es' ? 'Se necesitan al menos 50 puntos de datos. Selecciona un rango de tiempo más largo (3 meses o más).' : 'At least 50 data points required. Select a longer time range (3 months or more).'}</p>
            )}
            {Object.keys(backtestResults).length > 0 && (
              <div className="space-y-6">
                {Object.entries(backtestResults).map(([sym, result]) => (
                  <div key={sym}>
                    <p className="text-slate-300 text-xs font-bold mb-2 border-b border-slate-700 pb-1">{sym}</p>
                    {result === null ? (
                      <p className="text-amber-300 text-sm">{lang === 'es' ? 'Datos insuficientes.' : 'Insufficient data.'}</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                          {[
                            { label: lang === 'es' ? 'Retorno total' : 'Total return', value: `${result.metrics.totalReturn > 0 ? '+' : ''}${result.metrics.totalReturn}%`, color: result.metrics.totalReturn >= 0 ? 'text-green-400' : 'text-red-400' },
                            { label: 'Buy & Hold', value: `${result.metrics.buyHoldReturn > 0 ? '+' : ''}${result.metrics.buyHoldReturn}%`, color: result.metrics.buyHoldReturn >= 0 ? 'text-green-400' : 'text-red-400' },
                            { label: 'Win Rate', value: `${result.metrics.winRate}%`, color: 'text-blue-400' },
                            { label: 'Max Drawdown', value: `-${result.metrics.maxDrawdown}%`, color: 'text-orange-400' },
                            { label: t('label_final_capital', lang), value: fmt(result.metrics.finalValue), color: 'text-white' },
                            { label: t('label_trades', lang), value: result.metrics.totalTrades, color: 'text-white' },
                            { label: t('label_avg_pnl', lang), value: `${result.metrics.avgPnl > 0 ? '+' : ''}${result.metrics.avgPnl}%`, color: result.metrics.avgPnl >= 0 ? 'text-green-400' : 'text-red-400' },
                            { label: t('label_initial_capital', lang), value: fmt(result.metrics.initialCapital), color: 'text-slate-400' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="bg-slate-700/50 rounded-lg p-3">
                              <p className="text-slate-400 text-xs mb-1">{label}</p>
                              <p className={`font-bold text-sm ${color}`}>{value}</p>
                            </div>
                          ))}
                        </div>
                        {result.equity.length > 0 && (
                          <ResponsiveContainer width="100%" height={160}>
                            <LineChart data={result.equity}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(1)}K`} />
                              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} labelStyle={{ color: '#e2e8f0' }} itemStyle={{ color: '#e2e8f0' }} formatter={v => [`${v.toLocaleString()}`, 'Capital']} />
                              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} name="Capital" />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                      </>
                    )}
                  </div>
                ))}
                <p className="text-slate-500 text-xs">{lang === 'es' ? 'Resultados históricos no garantizan rendimientos futuros. Solo con fines educativos.' : 'Historical results do not guarantee future returns. For educational purposes only.'}</p>
              </div>
            )}
            {backtestSymbols.size === 0 && <p className="text-slate-500 text-sm">{t('label_select_stock_backtest', lang)}</p>}
          </div>
        )}

        {/* Analysis Panel — using existing data */}
        {stats && Object.keys(stats).length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 mb-4">
            <h3 className="text-white font-semibold mb-4">{t('label_comparative_analysis', lang)}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700 text-xs">
                    <th className="text-left py-2 pr-4">{t('label_companies', lang)}</th>
                    <th className="text-right py-2 px-3">{t('label_current_price', lang)}</th>
                    <th className="text-right py-2 px-3">{t('label_change_pct', lang)}</th>
                    <th className="text-right py-2 px-3">{t('label_volatility', lang)}</th>
                    <th className="text-right py-2 px-3">{t('label_range_pct', lang)}</th>
                    <th className="text-right py-2 px-3">{t('label_vs_average', lang)}</th>
                    <th className="text-right py-2 px-3">P/E</th>
                    <th className="text-right py-2 px-3">Beta</th>
                    <th className="text-right py-2 pl-3">{t('label_rsi_signal', lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStocks.map((symbol) => {
                    const s = stats[symbol];
                    const f = fundamentals[symbol];
                    if (!s) return null;
                    const range = ((s.max - s.min) / s.min * 100).toFixed(1);
                    const vsAvg = ((s.current - s.average) / s.average * 100).toFixed(1);
                    // Volatility: std dev of prices
                    const prices = stockData.map(d => d[symbol]).filter(v => v != null);
                    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
                    const stdDev = Math.sqrt(prices.reduce((sum, v) => sum + (v - mean) ** 2, 0) / prices.length);
                    const volatility = ((stdDev / mean) * 100).toFixed(1);
                    // RSI signal
                    const rsiVals = rsi(prices, 14);
                    const lastRsi = rsiVals.filter(v => v != null).pop();
                    const rsiSignal = lastRsi > 70 ? `${lang === 'es' ? 'SC' : 'OB'}` : lastRsi < 30 ? `${lang === 'es' ? 'SV' : 'OS'}` : 'N';
                    return (
                      <tr key={symbol} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-2 pr-4 font-bold text-white">{symbol}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{fmt(s.current)}</td>
                        <td className={`text-right py-2 px-3 font-semibold ${s.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%
                        </td>
                        <td className="text-right py-2 px-3 text-slate-200">{volatility}%</td>
                        <td className="text-right py-2 px-3 text-slate-200">{range}%</td>
                        <td className={`text-right py-2 px-3 font-semibold ${parseFloat(vsAvg) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {parseFloat(vsAvg) >= 0 ? '+' : ''}{vsAvg}%
                        </td>
                        <td className="text-right py-2 px-3 text-slate-200">{f?.trailingPE ? f.trailingPE.toFixed(1) : '—'}</td>
                        <td className={`text-right py-2 px-3 ${f?.beta != null ? (f.beta > 1 ? 'text-orange-400' : 'text-green-400') : 'text-slate-200'}`}>
                          {f?.beta != null ? f.beta.toFixed(2) : '—'}
                        </td>
                        <td className={`text-right py-2 pl-3 text-xs font-semibold ${lastRsi > 70 ? 'text-red-400' : lastRsi < 30 ? 'text-green-400' : 'text-slate-300'}`}>{lastRsi ? `${rsiSignal} (${lastRsi.toFixed(0)})` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-slate-500 text-xs mt-2">{t('label_rsi_legend', lang)}</p>
          </div>
        )}

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
              <RefreshCw size={14} className="animate-spin" /> {t('portfolio_loading_news', lang)}
            </div>
          )}

          {!newsLoading && newsItems.length === 0 && (
            <p className="text-slate-600 text-sm py-2">
              {t('label_press_update_news', lang)}
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
                <p className="text-slate-500 text-xs mb-3">{filtered.length} {t('portfolio_news', lang)} · {selectedStocks.join(', ')}</p>
                {filtered.length === 0 ? (
                  <p className="text-slate-500 text-sm">{t('portfolio_no_news_in_period', lang)}</p>
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
            Yahoo Finance API · ExchangeRate API · 1 USD = {rates?.MXN?.toFixed(2)} MXN · 1 USD = {rates?.EUR?.toFixed(4)} EUR · {currentTime.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
          </p>
        </div>

      </div>
    </div>
  );
};

export default StockComparisonApp;









































