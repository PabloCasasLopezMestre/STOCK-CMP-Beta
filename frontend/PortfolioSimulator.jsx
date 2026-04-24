import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TrendingUp, TrendingDown, Plus, Minus, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { t } from './i18n';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const WORKER_BASE = 'https://proxy.stockcmp-proxy.workers.dev';
const STOCK_COLORS = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const CHART_COLORS = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];

// Chart ranges — labels are translated at render time using the key
const CHART_RANGES = [
  { key: '1hour',   labelEs: '1 Hora',   labelEn: '1 Hour',    interval: '2m',  range: '1h',  trimHours: 1 },
  { key: '6hours',  labelEs: '6 Horas',  labelEn: '6 Hours',   interval: '5m',  range: '1d',  trimHours: 6 },
  { key: '1day',    labelEs: '24 Horas', labelEn: '24 Hours',  interval: '5m',  range: '1d'  },
  { key: '1week',   labelEs: '1 Semana', labelEn: '1 Week',    interval: '1h',  range: '5d'  },
  { key: '1month',  labelEs: '1 Mes',    labelEn: '1 Month',   interval: '1d',  range: '1mo' },
  { key: '3months', labelEs: '3 Meses',  labelEn: '3 Months',  interval: '1d',  range: '3mo' },
  { key: '6months', labelEs: '6 Meses',  labelEn: '6 Months',  interval: '1d',  range: '6mo' },
  { key: '1year',   labelEs: '1 Año',    labelEn: '1 Year',    interval: '1wk', range: '1y'  },
  { key: '2years',  labelEs: '2 Años',   labelEn: '2 Years',   interval: '1wk', range: '2y'  },
  { key: '3years',  labelEs: '3 Años',   labelEn: '3 Years',   interval: '1mo', range: '3y'  },
  { key: '5years',  labelEs: '5 Años',   labelEn: '5 Years',   interval: '1mo', range: '5y'  },
  { key: '10years', labelEs: '10 Años',  labelEn: '10 Years',  interval: '3mo', range: '10y' },
  { key: '15years', labelEs: '15 Años',  labelEn: '15 Years',  interval: '3mo', range: '15y' },
  { key: 'alltime', labelEs: 'Todo',     labelEn: 'All',       interval: '1mo', range: 'max' },
];

// Mini dropdown that suggests stocks from the comparator
function StockSuggest({ value, onChange, placeholder, comparatorStocks, holdingSymbols, lang }) {
  const [focused, setFocused] = useState(false);
  const suggestions = [...new Set([...(comparatorStocks || [])])];

  return (
    <div className="relative mb-2">
      <input
        className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 uppercase"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value.toUpperCase())}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        maxLength={10}
      />
      {focused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-20 bg-slate-800 border border-slate-600 rounded-lg mt-0.5 overflow-hidden shadow-lg">
          {suggestions.map(sym => (
            <button
              key={sym}
              type="button"
              onMouseDown={() => onChange(sym)}
              className="w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700 font-mono"
            >
              {sym}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function loadPortfolio() {
  try { return JSON.parse(localStorage.getItem('portfolio') || 'null'); } catch { return null; }
}

function savePortfolio(p) {
  try { localStorage.setItem('portfolio', JSON.stringify(p)); } catch {}
}

const DEFAULT_PORTFOLIO = {
  cash: 0,
  deposits: [],
  holdings: {},   // { AAPL: { shares, avgCost } }
  transactions: [],
  dividendsReceived: 0,
};

export default function PortfolioSimulator({ currency, setCurrency, nextCurrency, currencyLabel, rates, alerts, setAlerts, lang = 'es', onOpenCommunityIdea, initialPortfolio, onPortfolioChange, refreshTrigger, showAlertsPanel, setShowAlertsPanel, comparatorStocks = [], enabledFeatures = {}, visibleTimeRanges = [], defaultTimeRange = '1month' }) {
  const [portfolio, setPortfolio] = useState(() => initialPortfolio || loadPortfolio() || DEFAULT_PORTFOLIO);
  const [prices, setPrices] = useState({});
  const [historicalPrices, setHistoricalPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  // Performance state
  const [tab, setTab] = useState('portfolio-performance');
  const [performanceRange, setPerformanceRange] = useState('1month');
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  // Alerts panel
  const [newAlert, setNewAlert] = useState({ symbol: '', condition: 'above', price: '' });
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);

  // Seed portfolio from Supabase when initialPortfolio prop arrives after async initSync
  const seededRef = useRef(false);
  useEffect(() => {
    if (initialPortfolio && !seededRef.current) {
      seededRef.current = true;
      setPortfolio(initialPortfolio);
      savePortfolio(initialPortfolio);
    }
  }, [initialPortfolio]);

  // Check alerts against current prices every time prices update
  useEffect(() => {
    if (!alerts?.length || !Object.keys(prices).length) return;
    const fired = alerts.filter((a) => {
      const p = prices[a.symbol];
      if (!p) return false;
      return a.condition === 'above' ? p >= a.price : p <= a.price;
    }).map((a) => ({ ...a, currentPrice: prices[a.symbol] }));
    setTriggeredAlerts(fired);
    if (fired.length && Notification.permission === 'granted') {
      fired.forEach((a) => new Notification(`STOCK-CMP: ${a.symbol}`, {
        body: `${a.symbol} ${a.condition === 'above' ? '▲' : '▼'} $${a.price} · Actual: $${a.currentPrice.toFixed(2)}`,
      }));
    }
  }, [prices, alerts]);

  const addAlert = () => {
    const price = parseFloat(newAlert.price);
    if (!newAlert.symbol || isNaN(price) || price <= 0) return;
    const alert = { id: Date.now(), symbol: newAlert.symbol.toUpperCase(), condition: newAlert.condition, price };
    const next = [...(alerts ?? []), alert];
    setAlerts(next);
    localStorage.setItem('priceAlerts', JSON.stringify(next));
    setNewAlert({ symbol: '', condition: 'above', price: '' });
    if (Notification.permission === 'default') Notification.requestPermission();
  };

  const removeAlert = (id) => {
    const next = alerts.filter((a) => a.id !== id);
    setAlerts(next);
    localStorage.setItem('priceAlerts', JSON.stringify(next));
  };

  // Chart state — CHART_RANGES and CHART_COLORS are module-level constants above

  const resolveInitialRange = () => {
    if (visibleTimeRanges?.includes(defaultTimeRange)) return defaultTimeRange;
    if (visibleTimeRanges?.length) return visibleTimeRanges[0];
    return '1month';
  };

  const [activeRange, setActiveRange] = useState(resolveInitialRange);
  const [chartData, setChartData] = useState([]);
  const [chartSymbols, setChartSymbols] = useState([]);
  const [showAverage, setShowAverage] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [compareRange, setCompareRange] = useState('1mo');

  // Total value chart Y axis
  const [yMin, setYMin] = useState('');
  const [yMax, setYMax] = useState('');
  const [includeCash, setIncludeCash] = useState(true);
  const [totalChartRange, setTotalChartRange] = useState('Todo');
  const [totalChartFilter, setTotalChartFilter] = useState('todo');

  // News
  const [newsSymbol, setNewsSymbol] = useState('');
  const [newsItems, setNewsItems] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [newsError, setNewsError] = useState(null);
  const [newsCounts, setNewsCounts] = useState({});
  const [loadingNewsCounts, setLoadingNewsCounts] = useState(false);
  const [newsAgeFilter, setNewsAgeFilter] = useState(48); // hours, null = all

  const NEWS_AGE_OPTIONS = [
    { label: lang === 'es' ? '1 hora'   : '1 hour',   hours: 1 },
    { label: lang === 'es' ? '6 horas'  : '6 hours',  hours: 6 },
    { label: lang === 'es' ? '24 horas' : '24 hours', hours: 24 },
    { label: lang === 'es' ? '48 horas' : '48 hours', hours: 48 },
    { label: lang === 'es' ? '7 días'   : '7 days',   hours: 168 },
    { label: lang === 'es' ? 'Todo'     : 'All',      hours: null },
  ];

  const filteredNewsItems = newsAgeFilter == null
    ? newsItems
    : newsItems.filter((item) => {
        if (!item.pubDate) return true;
        const age = (Date.now() - new Date(item.pubDate).getTime()) / 3_600_000;
        return age <= newsAgeFilter;
      });

  const fetchNews = async (sym) => {
    const symbol = (sym || newsSymbol).trim().toUpperCase();
    if (!symbol) return;
    setLoadingNews(true);
    setNewsError(null);
    try {
      const res = await fetch(`${WORKER_BASE}/api/news/${symbol}`);
      const data = await res.json();
      if (!data.items?.length) {
        setNewsError(t('portfolio_news_not_found', lang));
        setNewsItems([]);
      } else {
        setNewsItems(data.items);
        // Update count for this symbol
        setNewsCounts((prev) => ({ ...prev, [symbol]: data.items.length }));
      }
    } catch {
      setNewsError(t('portfolio_news_error', lang));
      setNewsItems([]);
    } finally {
      setLoadingNews(false);
    }
  };

  // Fetch news counts for all holdings
  const fetchAllNewsCounts = useCallback(async () => {
    const symbols = Object.keys(portfolio.holdings);
    if (!symbols.length) return;
    setLoadingNewsCounts(true);
    try {
      const results = await Promise.all(
        symbols.map((sym) =>
          fetch(`${WORKER_BASE}/api/news/${sym}`)
            .then((r) => r.json())
            .then((data) => ({ sym, count: data.items?.length ?? 0 }))
            .catch(() => ({ sym, count: 0 }))
        )
      );
      const counts = {};
      results.forEach(({ sym, count }) => { counts[sym] = count; });
      setNewsCounts(counts);
    } finally {
      setLoadingNewsCounts(false);
    }
  }, [portfolio.holdings]);

  const fetchChartData = useCallback(async (symbols, rangeKey) => {
    if (!symbols.length) { setChartData([]); return; }
    setLoadingChart(true);
    const cfg = CHART_RANGES.find((r) => r.key === rangeKey) ?? CHART_RANGES[4];
    try {
      const results = await Promise.all(
        symbols.map((sym) =>
          fetch(`${WORKER_BASE}/api/stock/${encodeURIComponent(sym)}?interval=${cfg.interval}&range=${cfg.range}`)
            .then((r) => r.json())
            .then((data) => {
              const result = data?.chart?.result?.[0];
              if (!result) return null;
              const timestamps = result.timestamp ?? [];
              const closes = result.indicators?.quote?.[0]?.close ?? [];
              return {
                sym,
                points: timestamps.map((ts, i) => ({
                  date: new Date(ts * 1000).toLocaleDateString('es-MX'),
                  price: closes[i] ?? null,
                })).filter((p) => p.price != null),
              };
            })
            .catch(() => null)
        )
      );
      const valid = results.filter(Boolean);
      if (!valid.length) { setChartData([]); return; }
      const base = valid.reduce((a, b) => a.points.length >= b.points.length ? a : b).points;
      const merged = base.map((item, i) => {
        const point = { date: item.date };
        valid.forEach((r) => { point[r.sym] = r.points[i]?.price ?? null; });
        const vals = valid.map((r) => point[r.sym]).filter((v) => v != null);
        point['Promedio'] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        return point;
      });
      setChartData(merged);
    } finally {
      setLoadingChart(false);
    }
  }, []);

  // Init chart symbols from holdings (only when holdings change)
  const prevHoldingsKey = useRef('');
  useEffect(() => {
    const key = JSON.stringify(Object.keys(portfolio.holdings).sort());
    if (key === prevHoldingsKey.current) return;
    prevHoldingsKey.current = key;
    const syms = Object.keys(portfolio.holdings);
    setChartSymbols(syms);
    if (syms.length) fetchChartData(syms, activeRange);
  }, [portfolio.holdings, fetchChartData]);

  const visibleChartRanges = useMemo(
    () => CHART_RANGES.filter((r) => !visibleTimeRanges || visibleTimeRanges.includes(r.key)),
    [visibleTimeRanges]
  );

  const fetchHistoricalPrices = useCallback(async (range) => {
    const symbols = Object.keys(portfolio.holdings);
    if (!symbols.length) return;
    setLoadingHistorical(true);
    const rangeMap = {
      '1h':  { interval: '2m',  range: '1h'  },
      '6h':  { interval: '5m',  range: '1d'  },
      '1d':  { interval: '5m',  range: '1d'  },
      '1wk': { interval: '1d',  range: '5d'  },
      '1mo': { interval: '1d',  range: '1mo' },
      '3mo': { interval: '1d',  range: '3mo' },
      '6mo': { interval: '1d',  range: '6mo' },
      '1y':  { interval: '1wk', range: '1y'  },
      '2y':  { interval: '1wk', range: '2y'  },
      '3y':  { interval: '1mo', range: '3y'  },
      '5y':  { interval: '1mo', range: '5y'  },
      '10y': { interval: '3mo', range: '10y' },
      '15y': { interval: '3mo', range: '15y' },
    };
    const { interval, range: r } = rangeMap[range] ?? rangeMap['1mo'];
    try {
      const results = await Promise.all(
        symbols.map((sym) =>
          fetch(`${WORKER_BASE}/api/stock/${sym}?interval=${interval}&range=${r}`)
            .then((res) => res.json())
            .then((data) => {
              const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
              const first = closes.find(Boolean) ?? null;
              return { sym, price: first };
            })
            .catch(() => ({ sym, price: null }))
        )
      );
      const map = {};
      results.forEach(({ sym, price }) => { map[sym] = price; });
      setHistoricalPrices(map);
    } finally {
      setLoadingHistorical(false);
    }
  }, [portfolio.holdings]);

  // Fetch performance data for portfolio
  const fetchPerformanceData = useCallback(async () => {
    const symbols = Object.keys(portfolio.holdings);
    if (!symbols.length) {
      setPerformanceData(null);
      setLoadingPerformance(false);
      return;
    }
    
    setLoadingPerformance(true);
    try {
      const rangeMap = {
        '3days': '3d', '1week': '5d', '2weeks': '14d', '1month': '1mo', '6weeks': '6w',
        '2months': '2mo', '3months': '3mo', '4months': '4mo', '6months': '6mo', '9months': '9mo',
        '1year': '1y', '18months': '18mo', '2years': '2y', '30months': '30mo', '3years': '3y',
        '4years': '4y', '5years': '5y', '7years': '7y', '10years': '10y', '12years': '12y',
        '15years': '15y', '20years': '20y', '25years': '25y', 'alltime': 'max'
      };
      
      const range = rangeMap[performanceRange] || '1mo';
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      
      if (range === '3d') startDate.setDate(startDate.getDate() - 3);
      else if (range === '5d') startDate.setDate(startDate.getDate() - 5);
      else if (range === '14d') startDate.setDate(startDate.getDate() - 14);
      else if (range === '6w') startDate.setDate(startDate.getDate() - 42);
      else if (range === '18mo') startDate.setFullYear(startDate.getFullYear() - 1.5);
      else if (range === '30mo') startDate.setFullYear(startDate.getFullYear() - 2.5);
      else if (range === 'max') startDate.setFullYear(startDate.getFullYear() - 30);
      else if (range.includes('mo')) startDate.setMonth(startDate.getMonth() - parseInt(range));
      else startDate.setFullYear(startDate.getFullYear() - parseInt(range));
      
      const promises = symbols.map(async (sym) => {
        const url = `${WORKER_BASE}/api/historical/${sym}?period=${range}&interval=1d`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (!data.results || !data.results.length) return null;
        
        const startPrice = data.results[0].close;
        const endPrice = data.results[data.results.length - 1].close;
        const shares = portfolio.holdings[sym].shares;
        const startValue = startPrice * shares;
        const endValue = endPrice * shares;
        const gain = endValue - startValue;
        const change = startValue > 0 ? (gain / startValue) * 100 : 0;
        
        return {
          symbol: sym,
          shares,
          startPrice,
          endPrice,
          gain,
          change,
          startValue,
          endValue
        };
      });
      
      const results = await Promise.all(promises);
      const validResults = results.filter(r => r !== null);
      
      const totalStartValue = validResults.reduce((sum, r) => sum + r.startValue, 0);
      const totalEndValue = validResults.reduce((sum, r) => sum + r.endValue, 0);
      const totalGain = totalEndValue - totalStartValue;
      const totalChange = totalStartValue > 0 ? (totalGain / totalStartValue) * 100 : 0;
      
      setPerformanceData({
        individual: validResults,
        totalStartValue,
        totalEndValue,
        totalGain,
        totalChange
      });
    } catch (error) {
      console.error('Error fetching performance data:', error);
      setPerformanceData(null);
    } finally {
      setLoadingPerformance(false);
    }
  }, [portfolio.holdings, performanceRange]);

  useEffect(() => {
    const next = visibleTimeRanges?.includes(defaultTimeRange) ? defaultTimeRange : visibleChartRanges?.[0]?.key ?? '1month';
    if (next !== activeRange) {
      setActiveRange(next);
      fetchChartData(chartSymbols, next);
      fetchHistoricalPrices(CHART_RANGES.find((r) => r.key === next)?.range ?? '1mo');
    }
  }, [visibleTimeRanges, defaultTimeRange, visibleChartRanges, activeRange, chartSymbols, fetchChartData, fetchHistoricalPrices]);

  const handleChartRangeChange = (key) => {
    setActiveRange(key);
    fetchChartData(chartSymbols, key);
    fetchHistoricalPrices(CHART_RANGES.find((r) => r.key === key)?.range ?? '1mo');
  };

  const rangePerformance = useMemo(() => {
    if (!chartData.length) return [];
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    return chartSymbols.map((sym) => {
      const start = first[sym];
      const end = last[sym];
      if (start == null || end == null || start === 0) return null;
      const pct = ((end - start) / start) * 100;
      const diff = end - start;
      return { sym, pct, diff };
    }).filter(Boolean);
  }, [chartData, chartSymbols]);

  const toggleChartSymbol = (sym) => {
    const next = chartSymbols.includes(sym)
      ? chartSymbols.filter((s) => s !== sym)
      : [...chartSymbols, sym];
    setChartSymbols(next);
    fetchChartData(next, activeRange);
  };

  const fmtCurrency = (v) => {
    if (v == null) return '—';
    const rate = currency === 'USD' ? 1 : (rates?.[currency] ?? 1);
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(v * rate);
  };

  // Convert user input (in selected currency) to USD for storage
  const toUSD = (amount) => {
    if (currency === 'USD') return amount;
    const rate = rates?.[currency] ?? 1;
    return amount / rate;
  };

  // Convert USD to selected currency for display in inputs
  const fromUSD = (amount) => {
    if (currency === 'USD') return amount;
    const rate = rates?.[currency] ?? 1;
    return amount * rate;
  };

  // Deposit / withdraw
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMode, setDepositMode] = useState('deposit'); // 'deposit' | 'withdraw'

  // Buy / sell
  const [tradeSymbol, setTradeSymbol] = useState('');
  const [tradeShares, setTradeShares] = useState('');
  const [tradeMode, setTradeMode] = useState('buy');
  const [tradeError, setTradeError] = useState('');

  // Dividend simulation
  const [divSymbol, setDivSymbol] = useState('');

  // Investment simulator
  const [simEntries, setSimEntries] = useState([]); // [{sym, amount, date}]
  const [simSymbols, setSimSymbols] = useState('');
  const [simAmount, setSimAmount] = useState('');
  const [simDate, setSimDate] = useState('');
  const [simEndDate, setSimEndDate] = useState('');
  const [simResults, setSimResults] = useState({}); // keyed by sym+date
  const [simChartData, setSimChartData] = useState([]); // [{date, SYM: value, ...}]
  const [simLoading, setSimLoading] = useState(false);

  const runSimulation = async () => {
    if (!simEntries.length) return;
    setSimLoading(true);
    const results = {};
    const chartSeries = {}; // sym -> [{ts, value}]
    const endDateTs = simEndDate ? new Date(simEndDate).getTime() / 1000 : Date.now() / 1000;

    await Promise.all(simEntries.map(async (entry) => {
      const key = `${entry.sym}_${entry.date}`;
      try {
        const data = await fetch(`${WORKER_BASE}/api/stock/${encodeURIComponent(entry.sym)}?interval=1d&range=max`).then(r => r.json());
        const result = data?.chart?.result?.[0];
        if (!result) return;
        const timestamps = result.timestamp ?? [];
        const closes = result.indicators?.quote?.[0]?.close ?? [];
        const purchaseTs = new Date(entry.date).getTime() / 1000;
        let startIdx = timestamps.findIndex(t => t >= purchaseTs);
        if (startIdx < 0) startIdx = 0;
        // Find end index
        const endDateTs = entry.endDate ? new Date(entry.endDate).getTime() / 1000 : Date.now() / 1000;
        let endIdx = timestamps.length - 1;
        if (entry.endDate) {
          const ei = timestamps.findLastIndex ? timestamps.findLastIndex(t => t <= endDateTs) : [...timestamps].reverse().findIndex(t => t <= endDateTs);
          if (ei >= 0) endIdx = timestamps.findLastIndex ? ei : timestamps.length - 1 - ei;
        }
        const startPrice = closes[startIdx];
        const endPrice = closes[endIdx];
        if (!startPrice || !endPrice) return;
        const amountUSD = entry.currency === 'USD' ? parseFloat(entry.amount) : parseFloat(entry.amount) / (rates?.[entry.currency] ?? 1);
        const shares = amountUSD / startPrice;
        const currentValue = shares * endPrice;
        const profit = currentValue - amountUSD;
        const profitPct = (profit / amountUSD) * 100;
        const startDate = new Date(timestamps[startIdx] * 1000).toLocaleDateString();
        const endDate = new Date(timestamps[endIdx] * 1000).toLocaleDateString();
        results[key] = { startPrice, endPrice, shares, amountUSD, currentValue, profit, profitPct, startDate, endDate };

        // Build chart series: normalized to % gain from start
        const sliced = timestamps.slice(startIdx, endIdx + 1);
        const slicedCloses = closes.slice(startIdx, endIdx + 1);
        chartSeries[entry.sym] = sliced.map((ts, i) => ({
          ts,
          date: new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
          pct: slicedCloses[i] != null ? ((slicedCloses[i] - startPrice) / startPrice) * 100 : null,
        })).filter(p => p.pct != null);
      } catch {}
    }));

    // Merge chart series by date and carry forward the last known value so the tooltip shows all symbols consistently
    const allDates = [...new Set(Object.values(chartSeries).flatMap(s => s.map(p => p.date)))].sort((a, b) => new Date(a) - new Date(b));
    const pointers = Object.fromEntries(Object.keys(chartSeries).map((sym) => [sym, 0]));
    const merged = allDates.map((date) => {
      const point = { date };
      Object.entries(chartSeries).forEach(([sym, series]) => {
        let pointer = pointers[sym];
        while (pointer < series.length && new Date(series[pointer].date) <= new Date(date)) {
          pointer += 1;
        }
        pointers[sym] = pointer;
        const idx = pointer - 1;
        if (idx >= 0) {
          point[sym] = parseFloat(series[idx].pct.toFixed(2));
        }
      });
      return point;
    });

    setSimResults(results);
    setSimChartData(merged);
    setSimLoading(false);
  };

  const addSimEntry = () => {
    const symbols = simSymbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
    if (!symbols.length || !simAmount || !simDate) return;
    const newEntries = symbols.map(sym => ({ sym, amount: simAmount, date: simDate, endDate: simEndDate }));
    setSimEntries(prev => [...prev, ...newEntries]);
    setSimSymbols('');
    setSimAmount('');
    setSimDate('');
    setSimEndDate('');
  };

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bankAccounts') || '[]'); } catch { return []; }
  });
  const [showBankSection, setShowBankSection] = useState(false);
  const [newBank, setNewBank] = useState({ name: '', balance: '', annualRate: '', fee: '', feeType: 'monthly' });

  const saveBankAccounts = (accounts) => {
    setBankAccounts(accounts);
    try { localStorage.setItem('bankAccounts', JSON.stringify(accounts)); } catch {}
  };

  const addBankAccount = () => {
    const balance = parseFloat(newBank.balance);
    const rate = parseFloat(newBank.annualRate);
    const fee = parseFloat(newBank.fee) || 0;
    if (!newBank.name || isNaN(balance) || balance < 0) return;
    const account = {
      id: Date.now(),
      name: newBank.name,
      balance: toUSD(balance),
      annualRate: isNaN(rate) ? 0 : rate,
      fee: toUSD(fee),
      feeType: newBank.feeType,
    };
    saveBankAccounts([...bankAccounts, account]);
    setNewBank({ name: '', balance: '', annualRate: '', fee: '', feeType: 'monthly' });
  };

  const removeBankAccount = (id) => saveBankAccounts(bankAccounts.filter(a => a.id !== id));

  const applyBankGrowth = () => {
    const updated = bankAccounts.map(a => {
      const monthlyRate = a.annualRate / 100 / 12;
      const interest = a.balance * monthlyRate;
      const feeUSD = a.feeType === 'monthly' ? a.fee : a.fee / 12;
      return { ...a, balance: Math.max(0, a.balance + interest - feeUSD) };
    });
    saveBankAccounts(updated);
  };

  const totalBankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0);
  const [divAmount, setDivAmount] = useState('');
  const [divLoading, setDivLoading] = useState(false);
  const [divInfo, setDivInfo] = useState(null); // { annual, quarterly, yield }

  const fetchDividendInfo = async () => {
    const sym = divSymbol.trim().toUpperCase();
    if (!sym) return;
    setDivLoading(true);
    setDivInfo(null);
    try {
      const data = await fetch(`${WORKER_BASE}/api/fundamentals/${encodeURIComponent(sym)}`).then(r => r.json());
      const sd = data?.quoteSummary?.result?.[0]?.summaryDetail;
      const annual = sd?.dividendRate?.raw ?? sd?.trailingAnnualDividendRate?.raw ?? null;
      const yld = sd?.dividendYield?.raw ?? sd?.trailingAnnualDividendYield?.raw ?? null;
      if (annual) {
        const quarterly = +(annual / 4).toFixed(4);
        setDivInfo({ annual: +annual.toFixed(4), quarterly, yield: yld ? (yld * 100).toFixed(2) : null });
        setDivAmount(String(quarterly));
      } else {
        setDivInfo({ annual: null });
      }
    } catch {
      setDivInfo({ annual: null });
    } finally {
      setDivLoading(false);
    }
  };

  const updatePortfolio = useCallback((next) => {
    setPortfolio(next);
    savePortfolio(next);
    if (onPortfolioChange) onPortfolioChange(next);
  }, [onPortfolioChange]);

  // Fetch current prices for all holdings
  const fetchPrices = useCallback(async () => {
    const symbols = Object.keys(portfolio.holdings);
    if (!symbols.length) return;
    setLoadingPrices(true);
    try {
      const results = await Promise.all(
        symbols.map((sym) =>
          fetch(`${WORKER_BASE}/api/stock/${encodeURIComponent(sym)}?interval=1d&range=5d`)
            .then((r) => r.json())
            .then((data) => {
              const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
              const price = closes.filter(Boolean).pop() ?? null;
              return { sym, price };
            })
            .catch(() => ({ sym, price: null }))
        )
      );
      const map = {};
      results.forEach(({ sym, price }) => { map[sym] = price; });
      setPrices(map);
    } catch {} finally {
      setLoadingPrices(false);
    }
  }, [portfolio.holdings]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  useEffect(() => { fetchPrices(); }, [JSON.stringify(Object.keys(portfolio.holdings))]);
  useEffect(() => { fetchAllNewsCounts(); }, [JSON.stringify(Object.keys(portfolio.holdings))]);

  // Fetch historical prices for comparison
  useEffect(() => { fetchHistoricalPrices(compareRange); }, [JSON.stringify(Object.keys(portfolio.holdings)), compareRange]);
  useEffect(() => { if (refreshTrigger > 0) { fetchPrices(); fetchHistoricalPrices(compareRange); } }, [refreshTrigger]);

  // Deposit / withdraw
  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) return;
    const amountUSD = toUSD(amount);
    if (depositMode === 'withdraw' && amountUSD > portfolio.cash) return;
    const delta = depositMode === 'deposit' ? amountUSD : -amountUSD;
    const next = {
      ...portfolio,
      cash: portfolio.cash + delta,
      deposits: [...portfolio.deposits, { type: depositMode, amount: amountUSD, date: new Date().toISOString() }],
      transactions: [...portfolio.transactions, {
        type: depositMode, amount: amountUSD, date: new Date().toLocaleString('es-MX'),
      }],
    };
    updatePortfolio(next);
    setDepositAmount('');
  };

  // Buy
  const handleBuy = async () => {
    setTradeError('');
    const sym = tradeSymbol.trim().toUpperCase();
    const shares = parseFloat(tradeShares);
    if (!sym || isNaN(shares) || shares <= 0) { setTradeError(t('portfolio_symbol_required', lang)); return; }

    let price = prices[sym];
    if (!price) {
      // fetch price on demand
      try {
        const data = await fetch(`${WORKER_BASE}/api/stock/${encodeURIComponent(sym)}?interval=1d&range=5d`).then((r) => r.json());
        const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
        price = closes.filter(Boolean).pop() ?? null;
        if (price) setPrices((p) => ({ ...p, [sym]: price }));
      } catch {}
    }
    if (!price) { setTradeError(t('portfolio_could_not_get_price', lang)); return; }

    const total = price * shares;
    if (total > portfolio.cash) { setTradeError(`${t('portfolio_insufficient_funds', lang)} ${fmt(total)}`); return; }

    const existing = portfolio.holdings[sym] ?? { shares: 0, avgCost: 0 };
    const newShares = existing.shares + shares;
    const newAvgCost = (existing.avgCost * existing.shares + price * shares) / newShares;

    const next = {
      ...portfolio,
      cash: portfolio.cash - total,
      holdings: { ...portfolio.holdings, [sym]: { shares: newShares, avgCost: newAvgCost } },
      transactions: [...portfolio.transactions, {
        type: 'buy', symbol: sym, shares, price, total, date: new Date().toLocaleString('es-MX'),
      }],
    };
    updatePortfolio(next);
    setTradeSymbol('');
    setTradeShares('');
  };

  // Sell
  const handleSell = () => {
    setTradeError('');
    const sym = tradeSymbol.trim().toUpperCase();
    const shares = parseFloat(tradeShares);
    if (!sym || isNaN(shares) || shares <= 0) { setTradeError(t('portfolio_symbol_required', lang)); return; }

    const holding = portfolio.holdings[sym];
    if (!holding || holding.shares < shares) { setTradeError(`${t('portfolio_not_enough_shares', lang)} ${sym}`); return; }

    const price = prices[sym];
    if (!price) { setTradeError(t('portfolio_update_prices_first', lang)); return; }

    const total = price * shares;
    const newShares = holding.shares - shares;
    const newHoldings = { ...portfolio.holdings };
    if (newShares <= 0) delete newHoldings[sym];
    else newHoldings[sym] = { ...holding, shares: newShares };

    const next = {
      ...portfolio,
      cash: portfolio.cash + total,
      holdings: newHoldings,
      transactions: [...portfolio.transactions, {
        type: 'sell', symbol: sym, shares, price, total, date: new Date().toLocaleString('es-MX'),
      }],
    };
    updatePortfolio(next);
    setTradeSymbol('');
    setTradeShares('');
  };

  // Dividend
  const handleDividend = () => {
    const sym = divSymbol.trim().toUpperCase();
    const amountInput = parseFloat(divAmount);
    if (!sym || isNaN(amountInput) || amountInput <= 0) return;
    const amount = toUSD(amountInput); // convert from selected currency to USD
    const holding = portfolio.holdings[sym];
    const shares = holding?.shares ?? 0;
    const total = amount * shares;
    const next = {
      ...portfolio,
      cash: portfolio.cash + total,
      dividendsReceived: portfolio.dividendsReceived + total,
      transactions: [...portfolio.transactions, {
        type: 'dividend', symbol: sym, amount, shares, total, date: new Date().toLocaleString('es-MX'),
      }],
    };
    updatePortfolio(next);
    setDivSymbol('');
    setDivAmount('');
  };

  // Portfolio value
  const holdingsValue = Object.entries(portfolio.holdings).reduce((sum, [sym, h]) => {
    return sum + h.shares * (prices[sym] ?? h.avgCost);
  }, 0);
  const totalValue = portfolio.cash + holdingsValue;
  const totalDeposited = portfolio.deposits.filter((d) => d.type === 'deposit').reduce((s, d) => s + d.amount, 0);
  const totalWithdrawn = portfolio.deposits.filter((d) => d.type === 'withdraw').reduce((s, d) => s + d.amount, 0);
  const netDeposited = totalDeposited - totalWithdrawn;
  const totalReturn = totalValue - netDeposited;
  const totalReturnPct = netDeposited > 0 ? (totalReturn / netDeposited) * 100 : 0;

  // Gains breakdown
  const unrealizedProfit = Object.entries(portfolio.holdings).reduce((sum, [sym, h]) => {
    const currentPrice = prices[sym] ?? h.avgCost;
    return sum + h.shares * (currentPrice - h.avgCost);
  }, 0);
  const realizedProfit = portfolio.transactions
    .filter((tx) => tx.type === 'sell')
    .reduce((sum, tx) => {
      return sum + tx.total;
    }, 0) - portfolio.transactions
    .filter((tx) => tx.type === 'sell')
    .reduce((sum, tx) => sum + tx.shares * (portfolio.holdings[tx.symbol]?.avgCost ?? tx.price), 0);
  const dividendProfit = portfolio.dividendsReceived;
  const totalProfit = unrealizedProfit + dividendProfit;

  const fmt = fmtCurrency;

  return (
    <div className="space-y-4">

      {/* Triggered alerts banner */}
      {triggeredAlerts.length > 0 && (
        <div className="bg-red-900/60 border border-red-500 rounded-xl p-3 flex flex-wrap gap-2 items-center">
          <span className="text-red-300 font-bold text-sm">{lang === 'es' ? 'Alerta:' : 'Alert:'}</span>
          {triggeredAlerts.map((a) => (
            <span key={a.id} className="bg-red-800 text-white text-xs px-3 py-1 rounded-full">
              {a.symbol} {a.condition === 'above' ? '▲' : '▼'} ${a.price} · actual: ${a.currentPrice?.toFixed(2)}
            </span>
          ))}
        </div>
      )}

      {/* Alert panel — controlled by navbar */}
      {showAlertsPanel && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">{t('portfolio_price_alerts', lang)}</h3>
          <div className="flex gap-2 flex-wrap mb-4">
            <input className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none w-24 uppercase" placeholder={t('label_symbol', lang)} value={newAlert.symbol} onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value.toUpperCase() })} maxLength={10} />
            <select className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none" value={newAlert.condition} onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value })}>
              <option value="above">{t('portfolio_alert_rises_above', lang)}</option>
              <option value="below">{t('portfolio_alert_falls_below', lang)}</option>
            </select>
            <input className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none w-28" placeholder={`Price ${currency}`} type="number" value={newAlert.price} onChange={(e) => setNewAlert({ ...newAlert, price: e.target.value })} />
            <button onClick={addAlert} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm">{t('portfolio_alert_add', lang)}</button>
          </div>
          {!alerts?.length ? (
            <p className="text-slate-500 text-sm">{t('portfolio_no_alerts', lang)}</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => {
                const triggered = triggeredAlerts.find((t) => t.id === a.id);
                return (
                  <div key={a.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${triggered ? 'bg-red-900/40 border border-red-600' : 'bg-slate-700/50'}`}>
                    <span className="text-white text-sm font-bold">{a.symbol}</span>
                    <span className="text-slate-300 text-sm">{a.condition === 'above' ? t('portfolio_alert_rises_above', lang) : t('portfolio_alert_falls_below', lang)} <span className="text-white font-semibold">${a.price}</span></span>
                    {triggered && <span className="text-red-400 text-xs font-bold">{t('portfolio_alert_active', lang).replace('🚨 ', '')}</span>}
                    <button onClick={() => removeAlert(a.id)} className="text-slate-500 hover:text-red-400">✕</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Performance Section - Single Container */}
      {enabledFeatures.portfolioPerformance !== false && (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700">
        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {['portfolio-performance'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${tab === t ? 'text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'}`}
            >
              {t === 'portfolio-performance' ? 'Rendimiento' : ''}
            </button>
          ))}
          <div className="flex-1" />
          {(tab === 'portfolio-performance') && (
            <select
              value={performanceRange}
              onChange={(e) => setPerformanceRange(e.target.value)}
              className="m-2 bg-slate-700 text-white px-3 py-1.5 rounded text-xs outline-none"
            >
              <option value="3days">3 Días</option>
              <option value="1week">1 Semana</option>
              <option value="2weeks">2 Semanas</option>
              <option value="1month">1 Mes</option>
              <option value="6weeks">6 Semanas</option>
              <option value="2months">2 Meses</option>
              <option value="3months">3 Meses</option>
              <option value="4months">4 Meses</option>
              <option value="6months">6 Meses</option>
              <option value="9months">9 Meses</option>
              <option value="1year">1 Año</option>
              <option value="18months">18 Meses</option>
              <option value="2years">2 Años</option>
              <option value="30months">30 Meses</option>
              <option value="3years">3 Años</option>
              <option value="4years">4 Años</option>
              <option value="5years">5 Años</option>
              <option value="7years">7 Años</option>
              <option value="10years">10 Años</option>
              <option value="12years">12 Años</option>
              <option value="15years">15 Años</option>
              <option value="20years">20 Años</option>
              <option value="25years">25 Años</option>
              <option value="alltime">Todo</option>
            </select>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {loadingPerformance ? (
            <p className="text-slate-500 text-sm text-center py-8">Cargando datos de rendimiento...</p>
          ) : performanceData ? (
            <div className="space-y-4">
            {/* Resumen de rendimiento simple */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Crecimiento Total</h3>
                <p className="text-2xl font-bold text-blue-400">
                  {fmt(performanceData.totalEndValue - performanceData.totalStartValue)}
                </p>
                <p className={`text-sm ${performanceData.totalChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {performanceData.totalChange >= 0 ? '+' : ''}{performanceData.totalChange.toFixed(2)}%
                </p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">Valor del Portafolio</h3>
                <p className="text-2xl font-bold text-white">
                  {fmt(performanceData.totalEndValue)}
                </p>
                <p className="text-sm text-slate-400">
                  Desde: {fmt(performanceData.totalStartValue)}
                </p>
              </div>
            </div>

            {/* Rendimiento por activo - solo números */}
            <div>
              <h3 className="text-white font-semibold mb-3">Rendimiento por Activo</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {performanceData.individual.map((item) => (
                  <div key={item.symbol} className="bg-slate-700/50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-bold">{item.symbol}</span>
                      <span className={`text-sm font-semibold ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Ganancia:</span>
                        <span className={item.gain >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {item.gain >= 0 ? '+' : ''}{fmt(item.gain)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Valor:</span>
                        <span className="text-white">{fmt(item.endPrice * item.shares)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Acciones:</span>
                        <span className="text-slate-200">{item.shares.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-8">No hay datos de rendimiento disponibles.</p>
        )
        }
        </div>
        </div>
      )}

      {/* Summary - only show when not on performance tab */}
      {tab !== 'portfolio-performance' && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('label_total_value', lang), value: fmt(totalValue), color: 'text-white' },
          { label: t('label_cash', lang), value: fmt(portfolio.cash), color: 'text-green-400' },
          { label: t('label_investments', lang), value: fmt(holdingsValue), color: 'text-blue-400' },
          { label: t('label_total_return', lang), value: `${totalReturn >= 0 ? '+' : ''}${fmt(totalReturn)} (${totalReturnPct.toFixed(2)}%)`, color: totalReturn >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800/70 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      )}

      {/* Gains breakdown */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-white font-semibold mb-3">{t('portfolio_gains_summary', lang)}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/30">
            <p className="text-slate-400 text-xs mb-1">{t('portfolio_dividend_gains', lang)}</p>
            <p className={`text-2xl font-bold ${dividendProfit >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
              {dividendProfit >= 0 ? '+' : ''}{fmt(dividendProfit)}
            </p>
            <p className="text-slate-500 text-xs mt-1">{t('portfolio_dividends_accumulated', lang)}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/30">
            <p className="text-slate-400 text-xs mb-1">{t('portfolio_stock_value_gain', lang)}</p>
            <p className={`text-2xl font-bold ${unrealizedProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {unrealizedProfit >= 0 ? '+' : ''}{fmt(unrealizedProfit)}
            </p>
            <p className="text-slate-500 text-xs mt-1">{t('portfolio_current_vs_avg', lang)}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-green-500/30">
            <p className="text-slate-400 text-xs mb-1">{t('portfolio_total_gain', lang)}</p>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalProfit >= 0 ? '+' : ''}{fmt(totalProfit)}
            </p>
            <p className="text-slate-500 text-xs mt-1">{t('portfolio_dividends_plus_stocks', lang)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Deposit / Withdraw */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">{t('portfolio_bank_account', lang)}</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setDepositMode('deposit')} className={`flex-1 py-1.5 rounded text-sm font-medium ${depositMode === 'deposit' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{t('label_deposit', lang)}</button>
            <button onClick={() => setDepositMode('withdraw')} className={`flex-1 py-1.5 rounded text-sm font-medium ${depositMode === 'withdraw' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{t('label_withdraw', lang)}</button>
          </div>
          <input
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
            placeholder={`${lang === 'es' ? 'Cantidad en' : 'Amount in'} ${currency}`}
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <button onClick={handleDeposit} className={`w-full py-2 rounded text-sm font-medium text-white ${depositMode === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {depositMode === 'deposit' ? `+ ${t('label_deposit', lang)}` : `- ${t('label_withdraw', lang)}`}
          </button>
          <p className="text-slate-500 text-xs mt-2">{t('portfolio_deposited', lang)}: {fmt(totalDeposited)} · {t('portfolio_withdrawn', lang)}: {fmt(totalWithdrawn)}</p>
          <p className="text-slate-500 text-xs">{t('portfolio_dividends_received', lang)}: {fmt(portfolio.dividendsReceived)}</p>
        </div>

        {/* Buy / Sell */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">{t('portfolio_buy_sell', lang)}</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setTradeMode('buy')} className={`flex-1 py-1.5 rounded text-sm font-medium ${tradeMode === 'buy' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{t('label_buy', lang)}</button>
            <button onClick={() => setTradeMode('sell')} className={`flex-1 py-1.5 rounded text-sm font-medium ${tradeMode === 'sell' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{t('label_sell', lang)}</button>
          </div>
          <StockSuggest
            value={tradeSymbol}
            onChange={setTradeSymbol}
            placeholder={t('portfolio_symbol_placeholder', lang)}
            comparatorStocks={comparatorStocks}
            holdingSymbols={Object.keys(portfolio.holdings)}
            lang={lang}
          />
          <input
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
            placeholder={t('portfolio_shares_placeholder', lang)}
            type="number"
            value={tradeShares}
            onChange={(e) => setTradeShares(e.target.value)}
          />
          {tradeSymbol && prices[tradeSymbol] && (
            <p className="text-slate-400 text-xs mb-2">
              {t('portfolio_current_price_total', lang)}: {fmt(prices[tradeSymbol])} · {t('portfolio_total', lang)}: {fmt(prices[tradeSymbol] * (parseFloat(tradeShares) || 0))}
            </p>
          )}
          {tradeError && (
            <div className="mb-2">
              <p className="text-red-400 text-xs">{tradeError}</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {lang === 'es' ? 'Revisa el código en Acerca → Códigos.' : 'Check the symbol in About → Symbol Codes.'}
              </p>
            </div>
          )}
          <button
            onClick={tradeMode === 'buy' ? handleBuy : handleSell}
            className={`w-full py-2 rounded text-sm font-medium text-white ${tradeMode === 'buy' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
            {tradeMode === 'buy' ? t('label_buy', lang) : t('label_sell', lang)}
          </button>
        </div>

        {/* Dividends */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">{t('portfolio_record_dividend', lang)}</h3>
          <p className="text-slate-400 text-xs mb-3">{t('portfolio_dividend_hint', lang)}</p>
          <StockSuggest
            value={divSymbol}
            onChange={(v) => { setDivSymbol(v); setDivInfo(null); }}
            placeholder={t('portfolio_symbol_placeholder', lang).replace('AAPL', 'KO')}
            comparatorStocks={comparatorStocks}
            holdingSymbols={Object.keys(portfolio.holdings)}
            lang={lang}
          />
          <button
            type="button"
            onClick={fetchDividendInfo}
            disabled={divLoading || !divSymbol.trim()}
            className="w-full mb-2 py-1.5 rounded text-xs font-semibold bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white flex items-center justify-center gap-1"
          >
            <RefreshCw size={12} className={divLoading ? 'animate-spin' : ''} />
            {lang === 'es' ? 'Auto-rellenar dividendo' : 'Auto-fill dividend'}
          </button>
          {divInfo && divInfo.annual === null && (
            <p className="text-amber-300 text-xs mb-2">{lang === 'es' ? 'No se encontró dividendo para este símbolo.' : 'No dividend found for this symbol.'}</p>
          )}
          {divInfo && divInfo.annual !== null && (
            <div className="bg-slate-700/50 rounded-lg px-3 py-2 mb-2 text-xs text-slate-300">
              <span className="text-white font-semibold">{lang === 'es' ? 'Anual' : 'Annual'}: {fmt(divInfo.annual)}</span>
              {' · '}
              <span>{lang === 'es' ? 'Trimestral' : 'Quarterly'}: {fmt(divInfo.quarterly)}</span>
              {divInfo.yield && <span className="text-green-400"> · Yield: {divInfo.yield}%</span>}
            </div>
          )}
          <input
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
            placeholder={`${lang === 'es' ? 'Dividendo por acción' : 'Dividend per share'} (${currency})`}
            type="number"
            value={divAmount}
            onChange={(e) => setDivAmount(e.target.value)}
          />
          {divSymbol && portfolio.holdings[divSymbol] && (
            <p className="text-slate-400 text-xs mb-2">
              {portfolio.holdings[divSymbol].shares} {t('portfolio_shares_count', lang)} · {t('portfolio_total', lang)}: {fmt(toUSD(parseFloat(divAmount) || 0) * portfolio.holdings[divSymbol].shares)}
            </p>
          )}
          <button onClick={handleDividend} className="w-full py-2 rounded text-sm font-medium text-white bg-purple-600 hover:bg-purple-700">
            {t('portfolio_record_dividend', lang)}
          </button>
        </div>
      </div>

      {/* Holdings */}
      {enabledFeatures.positions !== false && Object.keys(portfolio.holdings).length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-white font-semibold">{t('portfolio_positions', lang)}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 text-xs">{t('portfolio_compare_vs', lang)}</span>
              {[
                { label: lang === 'es' ? '1 Hora'   : '1h',   value: '1h'  },
                { label: lang === 'es' ? '6 Horas'  : '6h',   value: '6h'  },
                { label: lang === 'es' ? '24 Horas' : '24h',  value: '1d'  },
                { label: lang === 'es' ? '1 Semana' : '1W',   value: '1wk' },
                { label: lang === 'es' ? '1 Mes'    : '1M',   value: '1mo' },
                { label: lang === 'es' ? '3 Meses'  : '3M',   value: '3mo' },
                { label: lang === 'es' ? '6 Meses'  : '6M',   value: '6mo' },
                { label: lang === 'es' ? '1 Año'    : '1Y',   value: '1y'  },
                { label: lang === 'es' ? '2 Años'   : '2Y',   value: '2y'  },
                { label: lang === 'es' ? '3 Años'   : '3Y',   value: '3y'  },
                { label: lang === 'es' ? '5 Años'   : '5Y',   value: '5y'  },
                { label: lang === 'es' ? '10 Años'  : '10Y',  value: '10y' },
                { label: lang === 'es' ? '15 Años'  : '15Y',  value: '15y' },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setCompareRange(value)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${compareRange === value ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                  {label}
                </button>
              ))}
              <button onClick={() => { fetchPrices(); fetchHistoricalPrices(compareRange); }} disabled={loadingPrices || loadingHistorical} className="text-slate-400 hover:text-white text-xs flex items-center gap-1 ml-1">
                <RefreshCw size={12} className={(loadingPrices || loadingHistorical) ? 'animate-spin' : ''} /> {t('portfolio_update', lang)}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700 text-xs">
                  <th className="text-left py-2 pr-4">{t('label_symbol', lang)}</th>
                  {onOpenCommunityIdea && (
                    <th className="text-center py-2 px-2 w-24">{t('community_share_idea', lang)}</th>
                  )}
                  <th className="text-right py-2 px-3">{t('portfolio_shares_count', lang)}</th>
                  <th className="text-right py-2 px-3">{t('label_avg_cost', lang)}</th>
                  <th className="text-right py-2 px-3">{t('label_price_period_ago', lang)} {compareRange}</th>
                  <th className="text-right py-2 px-3">{t('label_current_price', lang)}</th>
                  <th className="text-right py-2 px-3">{t('label_gp_vs_buy', lang)}</th>
                  <th className="text-right py-2 pl-3">{t('label_gp_period', lang)}</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(portfolio.holdings).map(([sym, h]) => {
                  const currentPrice = prices[sym] ?? h.avgCost;
                  const histPrice = historicalPrices[sym];
                  const value = h.shares * currentPrice;
                  const cost = h.shares * h.avgCost;
                  const gpVsCompra = value - cost;
                  const gpVsCompraPct = cost > 0 ? (gpVsCompra / cost) * 100 : 0;
                  const gpPeriod = histPrice ? h.shares * (currentPrice - histPrice) : null;
                  const gpPeriodPct = histPrice ? ((currentPrice - histPrice) / histPrice) * 100 : null;
                  return (
                    <tr key={sym} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-2 pr-4 font-bold text-white">{sym}</td>
                      {onOpenCommunityIdea && (
                        <td className="text-center py-2 px-2">
                          <button
                            type="button"
                            onClick={() => onOpenCommunityIdea(sym)}
                            className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                          >
                            {t('community_share_idea', lang)}
                          </button>
                        </td>
                      )}
                      <td className="text-right py-2 px-3 text-slate-200">{h.shares.toFixed(4)}</td>
                      <td className="text-right py-2 px-3 text-slate-200">{fmt(h.avgCost)}</td>
                      <td className="text-right py-2 px-3 text-slate-400">{histPrice ? fmt(histPrice) : '—'}</td>
                      <td className="text-right py-2 px-3 text-slate-200">{prices[sym] ? fmt(prices[sym]) : '—'}</td>
                      <td className={`text-right py-2 px-3 font-semibold ${gpVsCompra >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {gpVsCompra >= 0 ? '+' : ''}{fmt(gpVsCompra)}<br/>
                        <span className="text-xs">({gpVsCompraPct >= 0 ? '+' : ''}{gpVsCompraPct.toFixed(1)}%)</span>
                      </td>
                      <td className={`text-right py-2 pl-3 font-semibold ${gpPeriod == null ? 'text-slate-500' : gpPeriod >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {gpPeriod == null ? '—' : <>{gpPeriod >= 0 ? '+' : ''}{fmt(gpPeriod)}<br/><span className="text-xs">({gpPeriodPct >= 0 ? '+' : ''}{gpPeriodPct.toFixed(1)}%)</span></>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts hint — only when no holdings AND no transactions */}
      {Object.keys(portfolio.holdings).length === 0 && portfolio.transactions.length === 0 && (
        <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50 text-center">
          <p className="text-slate-400 text-sm mb-1">{t('portfolio_charts_hint', lang)}</p>
          <p className="text-slate-500 text-xs mb-1">
            <span className="text-slate-300 font-medium">{t('portfolio_chart_hint_portfolio', lang)}</span> — {t('portfolio_chart_hint_portfolio_desc', lang)}
          </p>
          <p className="text-slate-500 text-xs">
            <span className="text-slate-300 font-medium">{t('portfolio_chart_hint_total', lang)}</span> — {t('portfolio_chart_hint_total_desc', lang)}
          </p>
        </div>
      )}

      {/* Portfolio Chart */}
      {Object.keys(portfolio.holdings).length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-white font-semibold">{t('portfolio_chart_title', lang)}</h3>
            <div className="flex gap-1 flex-wrap">
              {visibleChartRanges.map(({ key, labelEs, labelEn }) => (
                <button key={key} onClick={() => handleChartRangeChange(key)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${activeRange === key ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  {lang === 'es' ? labelEs : labelEn}
                </button>
              ))}
              <button onClick={() => fetchChartData(chartSymbols, activeRange)} disabled={loadingChart}
                className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-1">
                <RefreshCw size={10} className={loadingChart ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          {rangePerformance.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2 text-slate-300 text-xs">
              {rangePerformance.map(({ sym, pct, diff }) => (
                <div key={sym} className="rounded-lg bg-slate-800/80 border border-slate-700 px-3 py-2">
                  <div className="font-semibold text-white">{sym}</div>
                  <div>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}% · {fmtCurrency(diff)}</div>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mb-3">
            {Object.keys(portfolio.holdings).map((sym, i) => (
              <button key={sym} onClick={() => toggleChartSymbol(sym)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors border ${chartSymbols.includes(sym) ? 'text-white border-transparent' : 'bg-transparent text-slate-400 border-slate-600'}`}
                style={chartSymbols.includes(sym) ? { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] } : {}}>
                {sym}
              </button>
            ))}
            <button onClick={() => setShowAverage(!showAverage)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors border ${showAverage ? 'bg-white text-slate-900 border-transparent' : 'bg-transparent text-slate-400 border-slate-600'}`}>
              {t('portfolio_average', lang)}
            </button>
          </div>

          {loadingChart ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="text-blue-400 animate-spin" size={32} />
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }}
                  tickFormatter={(v) => {
                    const rate = currency === 'USD' ? 1 : (rates?.[currency] ?? 1);
                    return `${(v * rate).toFixed(0)}`;
                  }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(v) => fmtCurrency(v)}
                />
                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                {chartSymbols.map((sym, i) => (
                  <Line key={sym} type="monotone" dataKey={sym}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2} dot={false} connectNulls />
                ))}
                {showAverage && (
                  <Line key="Promedio" type="monotone" dataKey="Promedio"
                    stroke="#ffffff" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
              {t('portfolio_chart_hint_portfolio', lang)}
            </div>
          )}
        </div>
      )}

      {/* Portfolio Total Value Chart */}
      {enabledFeatures.portfolioChart !== false && portfolio.transactions.length > 0 && (() => {
        let cash = 0;
        let costBasis = {};
        const allPoints = [];

        portfolio.transactions.forEach((tx) => {
          if (tx.type === 'deposit') cash += tx.amount;
          else if (tx.type === 'withdraw') cash -= tx.amount;
          else if (tx.type === 'buy') {
            cash -= tx.total;
            costBasis[tx.symbol] = (costBasis[tx.symbol] ?? 0) + tx.total;
          } else if (tx.type === 'sell') {
            cash += tx.total;
            const prev = costBasis[tx.symbol] ?? 0;
            const sharesLeft = (portfolio.holdings[tx.symbol]?.shares ?? 0);
            const totalShares = sharesLeft + tx.shares;
            costBasis[tx.symbol] = Math.max(0, prev * (sharesLeft / Math.max(totalShares, 0.0001)));
          } else if (tx.type === 'dividend') {
            cash += tx.total;
          }
          const investedValue = Object.values(costBasis).reduce((s, v) => s + v, 0);
          const total = includeCash ? cash + investedValue : investedValue;
          const ts = tx.isoDate
            ? new Date(tx.isoDate).getTime()
            : (() => {
                const d = new Date(tx.date);
                if (!isNaN(d.getTime())) return d.getTime();
                const m = tx.date.match(/(\d+)\/(\d+)\/(\d{4})/);
                if (m) return new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`).getTime();
                return Date.now();
              })();
          allPoints.push({ date: tx.date, valor: parseFloat(Math.max(0, total).toFixed(2)), ts });
        });

        let points = allPoints;
        if (points.length === 1) {
          points = [{ date: points[0].date, valor: 0 }, ...points];
        }
        const lastVal = points[points.length - 1]?.valor ?? 0;

        return (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-white font-semibold">{t('portfolio_total_value_chart', lang)}</h3>
                <div className="bg-green-900/50 border border-green-500/40 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-green-400 text-xs">{t('portfolio_current_value', lang)}</p>
                  <p className="text-white font-bold text-sm">{fmt(includeCash ? totalValue : holdingsValue)}</p>
                </div>
                <button
                  onClick={() => setIncludeCash(!includeCash)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${includeCash ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                >
                  {includeCash ? t('portfolio_with_cash', lang) : t('portfolio_without_cash', lang)}
                </button>
              </div>
              <div className="flex gap-1 flex-wrap items-center">
                <button
                  onClick={() => { fetchPrices(); fetchHistoricalPrices(compareRange); }}
                  disabled={loadingPrices || loadingHistorical}
                  className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 flex items-center gap-1"
                  title={t('portfolio_update_prices', lang)}
                >
                  <RefreshCw size={11} className={(loadingPrices || loadingHistorical) ? 'animate-spin' : ''} /> {t('portfolio_update', lang)}
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={points} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} width={75} tickCount={5}
                  tickFormatter={(v) => {
                    const rate = currency === 'USD' ? 1 : (rates?.[currency] ?? 1);
                    const val = v * rate;
                    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
                    if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
                    return val.toFixed(2);
                  }}
                  domain={[yMin !== '' ? parseFloat(yMin) : 0, yMax !== '' ? parseFloat(yMax) : 'auto']}
                />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} labelStyle={{ color: '#e2e8f0' }} formatter={(v) => [fmt(v), 'Valor']} />
                <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2} dot={false} name="Valor Total" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}

      
      {/* Bank Accounts Section */}
      {enabledFeatures.bankAccounts !== false && (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">{lang === 'es' ? 'Cuentas Bancarias' : 'Bank Accounts'}</h3>
          <div className="flex items-center gap-2">
            {bankAccounts.length > 0 && (
              <span className="text-slate-400 text-xs">{lang === 'es' ? 'Total' : 'Total'}: <span className="text-white font-semibold">{fmt(totalBankBalance)}</span></span>
            )}
            <button
              type="button"
              onClick={() => setShowBankSection(p => !p)}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1 rounded-lg"
            >
              {showBankSection ? (lang === 'es' ? 'Ocultar' : 'Hide') : (lang === 'es' ? 'Gestionar' : 'Manage')}
            </button>
          </div>
        </div>

        {/* Existing accounts */}
        {bankAccounts.length > 0 && (
          <div className="space-y-2 mb-3">
            {bankAccounts.map(a => {
              const annualInterest = a.balance * (a.annualRate / 100);
              const monthlyFee = a.feeType === 'monthly' ? a.fee : a.fee / 12;
              return (
                <div key={a.id} className="bg-slate-700/50 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{a.name}</p>
                    <p className="text-slate-400 text-xs">
                      {fmt(a.balance)} · {a.annualRate}% {lang === 'es' ? 'anual' : 'annual'}
                      {a.fee > 0 && ` · ${lang === 'es' ? 'Cobro' : 'Fee'}: ${fmt(a.fee)}/${a.feeType === 'monthly' ? (lang === 'es' ? 'mes' : 'mo') : (lang === 'es' ? 'año' : 'yr')}`}
                    </p>
                    <p className="text-green-400 text-xs">{lang === 'es' ? 'Interés anual' : 'Annual interest'}: {fmt(annualInterest)} · {lang === 'es' ? 'Cobro mensual' : 'Monthly fee'}: {fmt(monthlyFee)}</p>
                  </div>
                  <button onClick={() => removeBankAccount(a.id)} className="text-slate-500 hover:text-red-400 text-xs shrink-0">✕</button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={applyBankGrowth}
              className="w-full py-1.5 rounded text-xs font-semibold bg-blue-700 hover:bg-blue-600 text-white"
            >
              {lang === 'es' ? 'Aplicar crecimiento mensual' : 'Apply monthly growth'}
            </button>
          </div>
        )}

        {/* Add new account form */}
        {showBankSection && (
          <div className="space-y-2 border-t border-slate-700 pt-3">
            <input
              className="w-full bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
              placeholder={lang === 'es' ? 'Nombre de la cuenta (ej. BBVA, Nu)' : 'Account name (e.g. Chase, Nu)'}
              value={newBank.name}
              onChange={e => setNewBank(p => ({ ...p, name: e.target.value }))}
            />
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={`${lang === 'es' ? 'Saldo' : 'Balance'} (${currency})`}
                type="number"
                value={newBank.balance}
                onChange={e => setNewBank(p => ({ ...p, balance: e.target.value }))}
              />
              <input
                className="w-24 bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={lang === 'es' ? 'Tasa %' : 'Rate %'}
                type="number"
                value={newBank.annualRate}
                onChange={e => setNewBank(p => ({ ...p, annualRate: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={`${lang === 'es' ? 'Cobro' : 'Fee'} (${currency})`}
                type="number"
                value={newBank.fee}
                onChange={e => setNewBank(p => ({ ...p, fee: e.target.value }))}
              />
              <select
                className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none"
                value={newBank.feeType}
                onChange={e => setNewBank(p => ({ ...p, feeType: e.target.value }))}
              >
                <option value="monthly">{lang === 'es' ? 'Mensual' : 'Monthly'}</option>
                <option value="annual">{lang === 'es' ? 'Anual' : 'Annual'}</option>
              </select>
            </div>
            <button
              type="button"
              onClick={addBankAccount}
              disabled={!newBank.name || !newBank.balance}
              className="w-full py-1.5 rounded text-sm font-semibold bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white"
            >
              {lang === 'es' ? '+ Agregar cuenta' : '+ Add account'}
            </button>
          </div>
        )}

        {bankAccounts.length === 0 && !showBankSection && (
          <p className="text-slate-500 text-sm">{lang === 'es' ? 'Agrega cuentas bancarias para rastrear su crecimiento.' : 'Add bank accounts to track their growth.'}</p>
        )}
      </div>
      )}

      {/* News section */}
      {enabledFeatures.portfolioNews !== false && (
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-white font-semibold mb-3">{t('portfolio_news', lang)}</h3>
        <div className="flex gap-2 mb-4">
          <input
            className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-28 uppercase"
            placeholder={t('label_symbol', lang)}
            value={newsSymbol}
            onChange={(e) => setNewsSymbol(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && fetchNews()}
            maxLength={10}
          />
          <button
            onClick={() => fetchNews()}
            disabled={loadingNews || !newsSymbol.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={loadingNews ? 'animate-spin' : ''} />
            {t('portfolio_news_search', lang)}
          </button>
          {Object.keys(portfolio.holdings).length > 0 && (
            <div className="flex gap-1 flex-wrap items-center">
              {loadingNewsCounts && <RefreshCw size={12} className="animate-spin text-slate-500" />}
              {Object.keys(portfolio.holdings).map((sym) => {
                const count = newsCounts[sym];
                const hasNews = count > 0;
                return (
                  <button
                    key={sym}
                    onClick={() => { setNewsSymbol(sym); fetchNews(sym); }}
                    className={`relative text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                      newsSymbol === sym
                        ? 'bg-blue-600 text-white'
                        : hasNews
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    {sym}
                    {count != null && (
                      <span className={`text-xs font-bold px-1 rounded-full ${
                        hasNews ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-400'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              <button
                onClick={fetchAllNewsCounts}
                disabled={loadingNewsCounts}
                className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 ml-1"
                title="Actualizar conteos"
              >
                <RefreshCw size={11} className={loadingNewsCounts ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>

        {loadingNews && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <RefreshCw size={14} className="animate-spin" /> {t('portfolio_loading_news', lang)}
          </div>
        )}
        {newsError && <p className="text-slate-500 text-sm">{newsError}</p>}
        {newsItems.length > 0 && (
          <>
            {/* Age filter */}
            <div className="flex gap-1 flex-wrap mb-3">
              {NEWS_AGE_OPTIONS.map(({ label, hours }) => (
                <button
                  key={label}
                  onClick={() => setNewsAgeFilter(hours)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    newsAgeFilter === hours
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="text-slate-500 text-xs self-center ml-1">
                {filteredNewsItems.length} / {newsItems.length}
              </span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {filteredNewsItems.length === 0 ? (
                <p className="text-slate-500 text-sm">{t('portfolio_no_news_in_period', lang)}</p>
              ) : (
                filteredNewsItems.map((item, i) => (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-slate-700/50 hover:bg-slate-700 rounded-lg p-3 transition-colors"
                  >
                    <div className="flex gap-3">
                      {item.image && (
                        <img
                          src={item.image}
                          alt=""
                          className="w-16 h-16 object-cover rounded flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-snug mb-1">{item.title}</p>
                        {item.summary && <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{item.summary}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-slate-500 text-xs">{item.source}</span>
                          {item.pubDate && <span className="text-slate-600 text-xs">· {new Date(item.pubDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                        </div>
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>
          </>
        )}
        {!loadingNews && !newsError && newsItems.length === 0 && (
          <p className="text-slate-600 text-sm">{t('portfolio_enter_symbol_news')}, lang</p>
        )}
      </div>
      )}

      {/* Transaction history */}
      {enabledFeatures.transactionHistory !== false && portfolio.transactions.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">{t('portfolio_transaction_history', lang)}</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {[...portfolio.transactions].reverse().map((tx, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-700/50">
                <span className="text-slate-400">{tx.date}</span>
                <span className={`font-semibold px-2 py-0.5 rounded ${
                  tx.type === 'buy' ? 'bg-blue-900/50 text-blue-300' :
                  tx.type === 'sell' ? 'bg-orange-900/50 text-orange-300' :
                  tx.type === 'dividend' ? 'bg-purple-900/50 text-purple-300' :
                  tx.type === 'deposit' ? 'bg-green-900/50 text-green-300' :
                  'bg-red-900/50 text-red-300'
                }`}>
                  {tx.type === 'buy' ? `${t('label_buy', lang)} ${tx.symbol}` :
                   tx.type === 'sell' ? `${t('label_sell', lang)} ${tx.symbol}` :
                   tx.type === 'dividend' ? `${t('portfolio_record_dividend', lang)} ${tx.symbol}` :
                   tx.type === 'deposit' ? t('label_deposit', lang) : t('label_withdraw', lang)}
                </span>
                <span className="text-white font-medium">
                  {tx.type === 'buy' || tx.type === 'sell' ? `${tx.shares} ${t('portfolio_shares_count', lang)} @ ${fmt(tx.price)}` :
                   tx.type === 'dividend' ? `${tx.shares} ${t('portfolio_shares_count', lang)} × ${fmt(tx.amount)}` : ''}
                </span>
                <span className={`font-bold ${tx.type === 'sell' || tx.type === 'deposit' || tx.type === 'dividend' ? 'text-green-400' : 'text-red-400'}`}>
                  {tx.type === 'sell' || tx.type === 'deposit' || tx.type === 'dividend' ? '+' : '-'}{fmt(tx.total ?? tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
