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
  deposits: [],
  holdings: {},   // { AAPL: { shares, avgCost } }
  transactions: [],
  dividendsReceived: 0,
};

export default function PortfolioSimulator({ 
  currency = 'USD', 
  setCurrency, 
  nextCurrency, 
  currencyLabel = 'USD', 
  rates = {}, 
  alerts = [], 
  setAlerts, 
  lang = 'es', 
  onOpenCommunityIdea, 
  initialPortfolio, 
  onPortfolioChange, 
  refreshTrigger = 0, 
  showAlertsPanel = false, 
  setShowAlertsPanel, 
  comparatorStocks = [], 
  enabledFeatures = {}, 
  visibleTimeRanges = [], 
  defaultTimeRange = '1month', 
  accountCreated, 
  dataResetAt,
  // New props for Assets integration
  assetsPortfolio,
  onAssetsPortfolioChange
}) {
  // Safety check to ensure all required props are available
  if (!setCurrency || !setAlerts) {
    console.error('PortfolioSimulator: Missing required props');
    return <div className="text-red-400 p-4">Error: Missing required props</div>;
  }

  const [portfolio, setPortfolio] = useState(() => initialPortfolio || loadPortfolio() || DEFAULT_PORTFOLIO);
  const [prices, setPrices] = useState({});
  const [historicalPrices, setHistoricalPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  // Stocks-only mode state (similar to retrospective mode in Assets)
  const [stocksOnlyMode, setStocksOnlyMode] = useState(false);

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

  const [activeRange, setActiveRange] = useState(() => resolveInitialRange());
  const [chartData, setChartData] = useState([]);
  const [chartSymbols, setChartSymbols] = useState([]);
  const [showAverage, setShowAverage] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [compareRange, setCompareRange] = useState('1mo');

  // Total value chart Y axis
  const [yMin, setYMin] = useState('');
  const [yMax, setYMax] = useState('');
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

  // Calculate available time ranges based on account age
  const getAvailableTimeRanges = () => {
    if (!accountCreated && !dataResetAt) {
      // If no account creation date, show all options
      return [
        { value: '3days', labelEs: '3 Días', labelEn: '3 Days' },
        { value: '1week', labelEs: '1 Semana', labelEn: '1 Week' },
        { value: '2weeks', labelEs: '2 Semanas', labelEn: '2 Weeks' },
        { value: '1month', labelEs: '1 Mes', labelEn: '1 Month' },
        { value: '6weeks', labelEs: '6 Semanas', labelEn: '6 Weeks' },
        { value: '2months', labelEs: '2 Meses', labelEn: '2 Months' },
        { value: '3months', labelEs: '3 Meses', labelEn: '3 Months' },
        { value: '4months', labelEs: '4 Meses', labelEn: '4 Months' },
        { value: '6months', labelEs: '6 Meses', labelEn: '6 Months' },
        { value: '9months', labelEs: '9 Meses', labelEn: '9 Months' },
        { value: '1year', labelEs: '1 Año', labelEn: '1 Year' },
        { value: '18months', labelEs: '18 Meses', labelEn: '18 Months' },
        { value: '2years', labelEs: '2 Años', labelEn: '2 Years' },
        { value: '30months', labelEs: '30 Meses', labelEn: '30 Months' },
        { value: '3years', labelEs: '3 Años', labelEn: '3 Years' },
        { value: '4years', labelEs: '4 Años', labelEn: '4 Years' },
        { value: '5years', labelEs: '5 Años', labelEn: '5 Years' },
        { value: '7years', labelEs: '7 Años', labelEn: '7 Years' },
        { value: '10years', labelEs: '10 Años', labelEn: '10 Years' },
        { value: '12years', labelEs: '12 Años', labelEn: '12 Years' },
        { value: '15years', labelEs: '15 Años', labelEn: '15 Years' },
        { value: '20years', labelEs: '20 Años', labelEn: '20 Years' },
        { value: '25years', labelEs: '25 Años', labelEn: '25 Years' },
        { value: 'alltime', labelEs: 'Todo', labelEn: 'All Time' }
      ];
    }

    // Use dataResetAt if available, otherwise accountCreated
    const referenceDate = dataResetAt ? new Date(dataResetAt) : 
                          accountCreated ? new Date(accountCreated) : 
                          new Date(); // fallback to current date
    const now = new Date();
    const ageInMs = now - referenceDate;
    
    // If the reference date is invalid or in the future, return all options
    if (isNaN(referenceDate.getTime()) || ageInMs < 0) {
      return [
        { value: '3days', labelEs: '3 Días', labelEn: '3 Days' },
        { value: '1week', labelEs: '1 Semana', labelEn: '1 Week' },
        { value: '2weeks', labelEs: '2 Semanas', labelEn: '2 Weeks' },
        { value: '1month', labelEs: '1 Mes', labelEn: '1 Month' },
        { value: '6weeks', labelEs: '6 Semanas', labelEn: '6 Weeks' },
        { value: '2months', labelEs: '2 Meses', labelEn: '2 Months' },
        { value: '3months', labelEs: '3 Meses', labelEn: '3 Months' },
        { value: '4months', labelEs: '4 Meses', labelEn: '4 Months' },
        { value: '6months', labelEs: '6 Meses', labelEn: '6 Months' },
        { value: '9months', labelEs: '9 Meses', labelEn: '9 Months' },
        { value: '1year', labelEs: '1 Año', labelEn: '1 Year' },
        { value: '18months', labelEs: '18 Meses', labelEn: '18 Months' },
        { value: '2years', labelEs: '2 Años', labelEn: '2 Years' },
        { value: '30months', labelEs: '30 Meses', labelEn: '30 Months' },
        { value: '3years', labelEs: '3 Años', labelEn: '3 Years' },
        { value: '4years', labelEs: '4 Años', labelEn: '4 Years' },
        { value: '5years', labelEs: '5 Años', labelEn: '5 Years' },
        { value: '7years', labelEs: '7 Años', labelEn: '7 Years' },
        { value: '10years', labelEs: '10 Años', labelEn: '10 Years' },
        { value: '12years', labelEs: '12 Años', labelEn: '12 Years' },
        { value: '15years', labelEs: '15 Años', labelEn: '15 Years' },
        { value: '20years', labelEs: '20 Años', labelEn: '20 Years' },
        { value: '25years', labelEs: '25 Años', labelEn: '25 Years' },
        { value: 'alltime', labelEs: 'Todo', labelEn: 'All Time' }
      ];
    }
    
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

    const allRanges = [
      { value: '3days', labelEs: '3 Días', labelEn: '3 Days', minDays: 3 },
      { value: '1week', labelEs: '1 Semana', labelEn: '1 Week', minDays: 7 },
      { value: '2weeks', labelEs: '2 Semanas', labelEn: '2 Weeks', minDays: 14 },
      { value: '1month', labelEs: '1 Mes', labelEn: '1 Month', minDays: 30 },
      { value: '6weeks', labelEs: '6 Semanas', labelEn: '6 Weeks', minDays: 42 },
      { value: '2months', labelEs: '2 Meses', labelEn: '2 Months', minDays: 60 },
      { value: '3months', labelEs: '3 Meses', labelEn: '3 Months', minDays: 90 },
      { value: '4months', labelEs: '4 Meses', labelEn: '4 Months', minDays: 120 },
      { value: '6months', labelEs: '6 Meses', labelEn: '6 Months', minDays: 180 },
      { value: '9months', labelEs: '9 Meses', labelEn: '9 Months', minDays: 270 },
      { value: '1year', labelEs: '1 Año', labelEn: '1 Year', minDays: 365 },
      { value: '18months', labelEs: '18 Meses', labelEn: '18 Months', minDays: 540 },
      { value: '2years', labelEs: '2 Años', labelEn: '2 Years', minDays: 730 },
      { value: '30months', labelEs: '30 Meses', labelEn: '30 Months', minDays: 900 },
      { value: '3years', labelEs: '3 Años', labelEn: '3 Years', minDays: 1095 },
      { value: '4years', labelEs: '4 Años', labelEn: '4 Years', minDays: 1460 },
      { value: '5years', labelEs: '5 Años', labelEn: '5 Years', minDays: 1825 },
      { value: '7years', labelEs: '7 Años', labelEn: '7 Years', minDays: 2555 },
      { value: '10years', labelEs: '10 Años', labelEn: '10 Years', minDays: 3650 },
      { value: '12years', labelEs: '12 Años', labelEn: '12 Years', minDays: 4380 },
      { value: '15years', labelEs: '15 Años', labelEn: '15 Years', minDays: 5475 },
      { value: '20years', labelEs: '20 Años', labelEn: '20 Years', minDays: 7300 },
      { value: '25years', labelEs: '25 Años', labelEn: '25 Years', minDays: 9125 }
    ];

    // Filter ranges based on account age, always include "alltime" as the maximum
    const availableRanges = allRanges.filter(range => ageInDays >= range.minDays);
    
    // Always add "alltime" option at the end
    availableRanges.push({ value: 'alltime', labelEs: 'Todo el tiempo', labelEn: 'All Time' });
    
    return availableRanges;
  };

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

  // Fetch portfolio performance data (total portfolio including bank accounts)
  const fetchPortfolioPerformanceData = useCallback(async () => {
    if (portfolio.transactions.length === 0) {
      setPerformanceData({
        individual: [],
        totalStartValue: 0,
        totalEndValue: 0,
        totalGain: 0,
        totalChange: 0
      });
      setLoadingPerformance(false);
      return;
    }
    
    setLoadingPerformance(true);
    
    try {
      // Calculate current total value inside the function to avoid circular dependency
      const currentHoldingsValue = Object.entries(portfolio.holdings).reduce((sum, [sym, h]) => {
        return sum + h.shares * (prices[sym] ?? h.avgCost);
      }, 0);
      const currentBankBalance = 0; // No bank accounts in investment-only mode
      const currentTotalValue = currentBankBalance + currentHoldingsValue;
      
      // Use dataResetAt if available, otherwise accountCreated, otherwise first transaction
      const referenceDate = dataResetAt ? new Date(dataResetAt) : 
                           accountCreated ? new Date(accountCreated) : 
                           new Date(portfolio.transactions[0].date);
      
      const rangeMap = {
        '3days': 3, '1week': 7, '2weeks': 14, '1month': 30, '6weeks': 42,
        '2months': 60, '3months': 90, '4months': 120, '6months': 180, '9months': 270,
        '1year': 365, '18months': 540, '2years': 730, '30months': 900, '3years': 1095,
        '4years': 1460, '5years': 1825, '7years': 2555, '10years': 3650, '12years': 4380,
        '15years': 5475, '20years': 7300, '25years': 9125, 'alltime': null
      };
      
      const daysBack = rangeMap[performanceRange];
      const startDate = daysBack ? new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000)) : referenceDate;
      
      // Calculate portfolio value at start date and current value
      let startValue = 0;
      let currentValue = currentTotalValue; // Current total value (holdings + bank accounts)
      
      // For start value, we need to calculate what the portfolio was worth at the start date
      // This is complex because we need to track deposits, withdrawals, and asset values over time
      
      // Simple approach: use net deposits up to start date as start value
      const depositsUpToStart = portfolio.transactions
        .filter(tx => new Date(tx.date) <= startDate)
        .reduce((sum, tx) => {
          if (tx.type === 'deposit') return sum + tx.amount;
          if (tx.type === 'withdraw') return sum - tx.amount;
          return sum;
        }, 0);
      
      startValue = Math.max(0, depositsUpToStart);
      
      const totalGain = currentValue - startValue;
      const totalChange = startValue > 0 ? (totalGain / startValue) * 100 : 0;
      
      setPerformanceData({
        individual: [], // Portfolio performance doesn't break down by individual assets
        totalStartValue: startValue,
        totalEndValue: currentValue,
        totalGain,
        totalChange,
        isPortfolioPerformance: true // Flag to distinguish from stock performance
      });
    } catch (error) {
      console.error('Error calculating portfolio performance:', error);
      setPerformanceData({
        individual: [],
        totalStartValue: 0,
        totalEndValue: 0,
        totalGain: 0,
        totalChange: 0,
        isPortfolioPerformance: true
      });
    } finally {
      setLoadingPerformance(false);
    }
  }, [portfolio.transactions, portfolio.holdings, performanceRange, prices, dataResetAt, accountCreated]);

  // Fetch stock performance data (individual stocks)
  const fetchStockPerformanceData = useCallback(async () => {
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
      
      const promises = symbols.map(async (sym) => {
        try {
          // Use current price and average cost for a simple calculation if historical data fails
          const currentPrice = prices[sym];
          const holding = portfolio.holdings[sym];
          
          if (!currentPrice || !holding) {
            console.warn(`Missing data for ${sym}: price=${currentPrice}, holding=`, holding);
            return null;
          }
          
          // Try to get historical data first
          let startPrice = null;
          
          try {
            const intervalMap = {
              '3d': '1h', '5d': '1h', '14d': '1d', '1mo': '1d', '6w': '1d',
              '2mo': '1d', '3mo': '1d', '4mo': '1d', '6mo': '1d', '9mo': '1d',
              '1y': '1wk', '18mo': '1wk', '2y': '1wk', '30mo': '1mo', '3y': '1mo',
              '4y': '1mo', '5y': '1mo', '7y': '1mo', '10y': '3mo', '12y': '3mo',
              '15y': '3mo', '20y': '3mo', '25y': '3mo', 'max': '3mo'
            };
            const interval = intervalMap[range] || '1d';
            const url = `${WORKER_BASE}/api/stock/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`;
            
            const res = await fetch(url);
            if (res.ok) {
              const data = await res.json();
              const result = data?.chart?.result?.[0];
              if (result) {
                const closes = result.indicators?.quote?.[0]?.close || [];
                const validPrices = closes.filter(p => p != null);
                if (validPrices.length > 0) {
                  startPrice = validPrices[0];
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch historical data for ${sym}:`, error.message);
          }
          
          // If no historical data, use average cost as start price for basic calculation
          if (!startPrice) {
            startPrice = holding.avgCost;
            console.log(`Using avgCost as startPrice for ${sym}: ${startPrice}`);
          }
          
          const shares = holding.shares;
          const startValue = startPrice * shares;
          const endValue = currentPrice * shares;
          const gain = endValue - startValue;
          const change = startValue > 0 ? (gain / startValue) * 100 : 0;
          
          console.log(`Performance calculated for ${sym}:`, { 
            startPrice, 
            currentPrice, 
            shares, 
            startValue, 
            endValue, 
            gain, 
            change 
          });
          
          return {
            symbol: sym,
            shares,
            startPrice,
            endPrice: currentPrice,
            gain,
            change,
            startValue,
            endValue
          };
        } catch (error) {
          console.error(`Error calculating performance for ${sym}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(promises);
      const validResults = results.filter(r => r !== null);
      
      if (validResults.length === 0) {
        console.warn('No valid performance data found');
        // Create a basic performance data structure with zeros
        setPerformanceData({
          individual: [],
          totalStartValue: 0,
          totalEndValue: 0,
          totalGain: 0,
          totalChange: 0
        });
        setLoadingPerformance(false);
        return;
      }
      
      const totalStartValue = validResults.reduce((sum, r) => sum + r.startValue, 0);
      const totalEndValue = validResults.reduce((sum, r) => sum + r.endValue, 0);
      const totalGain = totalEndValue - totalStartValue;
      const totalChange = totalStartValue > 0 ? (totalGain / totalStartValue) * 100 : 0;
      
      console.log('Performance summary:', { totalStartValue, totalEndValue, totalGain, totalChange, validResults });
      
      setPerformanceData({
        individual: validResults,
        totalStartValue,
        totalEndValue,
        totalGain,
        totalChange
      });
    } catch (error) {
      console.error('Error fetching performance data:', error);
      // Set empty performance data instead of null to show the UI
      setPerformanceData({
        individual: [],
        totalStartValue: 0,
        totalEndValue: 0,
        totalGain: 0,
        totalChange: 0
      });
    } finally {
      setLoadingPerformance(false);
    }
  }, [portfolio.holdings, performanceRange, prices]);

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



  // Buy / sell
  const [tradeSymbol, setTradeSymbol] = useState('');
  const [tradeShares, setTradeShares] = useState('');
  const [tradeMode, setTradeMode] = useState('buy');
  const [selectedAccountId, setSelectedAccountId] = useState('');
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

  // Force re-render when language changes
  useEffect(() => {
    // This effect will trigger a re-render when lang changes
    console.log('Language changed to:', lang);
  }, [lang]);

  useEffect(() => {
    if (tab === 'portfolio-performance') {
      fetchPortfolioPerformanceData();
    } else if (tab === 'stock-performance') {
      fetchStockPerformanceData();
    }
  }, [tab, performanceRange, fetchPortfolioPerformanceData, fetchStockPerformanceData]);

  useEffect(() => { fetchPrices(); }, [JSON.stringify(Object.keys(portfolio.holdings))]);
  useEffect(() => { fetchAllNewsCounts(); }, [JSON.stringify(Object.keys(portfolio.holdings))]);

  // Fetch historical prices for comparison
  useEffect(() => { fetchHistoricalPrices(compareRange); }, [JSON.stringify(Object.keys(portfolio.holdings)), compareRange]);
  useEffect(() => { if (refreshTrigger > 0) { fetchPrices(); fetchHistoricalPrices(compareRange); } }, [refreshTrigger]);

  // Buy - deduct from Assets accounts or simulate in stocks-only mode
  const handleBuy = async () => {
    setTradeError('');
    const sym = tradeSymbol.trim().toUpperCase();
    const shares = parseFloat(tradeShares);
    if (!sym || isNaN(shares) || shares <= 0) { 
      setTradeError(t('portfolio_symbol_required', lang)); 
      return; 
    }

    // Validar cuenta seleccionada cuando NO está en modo stocks-only
    if (!stocksOnlyMode && (!selectedAccountId || !assetsPortfolio?.bankAccounts?.find(acc => acc.id === selectedAccountId))) {
      setTradeError(lang === 'es' ? 'Selecciona una cuenta para el pago' : 'Select an account for payment');
      return;
    }

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
    if (!price) { 
      setTradeError(t('portfolio_could_not_get_price', lang)); 
      return; 
    }

    const total = price * shares;
    
    // Always update Assets with stock holdings, but only deduct money if NOT in stocks-only mode
    if (onAssetsPortfolioChange && assetsPortfolio) {
      let updatedAssetsAccounts = [...(assetsPortfolio.bankAccounts || [])];
      
      // Only deduct money if NOT in stocks-only mode
      if (!stocksOnlyMode) {
        // Find the selected account
        const selectedAccount = updatedAssetsAccounts.find(acc => acc.id === selectedAccountId);
        if (!selectedAccount) {
          setTradeError(lang === 'es' ? 'Cuenta no encontrada' : 'Account not found');
          return;
        }

        // Check if account has sufficient funds/credit
        if (selectedAccount.type === 'debit' && selectedAccount.balance < total) {
          setTradeError(`${t('portfolio_insufficient_funds', lang)} ${fmt(total)}. ${lang === 'es' ? 'Disponible' : 'Available'}: ${fmt(selectedAccount.balance)}`);
          return;
        }

        // Deduct from the selected account
        const accountIndex = updatedAssetsAccounts.findIndex(acc => acc.id === selectedAccountId);
        updatedAssetsAccounts[accountIndex] = {
          ...selectedAccount,
          balance: selectedAccount.balance - total
        };
      }
      
      // Always add the stock to Assets holdings (regardless of mode)
      const updatedAssetsPortfolio = {
        ...assetsPortfolio,
        bankAccounts: updatedAssetsAccounts,
        // Add the stock to Assets holdings
        holdings: {
          ...assetsPortfolio.holdings,
          [sym]: {
            shares: (assetsPortfolio.holdings?.[sym]?.shares || 0) + shares,
            avgCost: assetsPortfolio.holdings?.[sym] 
              ? ((assetsPortfolio.holdings[sym].avgCost * assetsPortfolio.holdings[sym].shares) + (price * shares)) / ((assetsPortfolio.holdings[sym].shares || 0) + shares)
              : price
          }
        },
        transactions: [...(assetsPortfolio.transactions || []), {
          id: Date.now().toString(),
          type: stocksOnlyMode ? 'stock_purchase_free' : 'stock_purchase',
          symbol: sym,
          shares: shares,
          price: price,
          total: total,
          accountId: stocksOnlyMode ? null : selectedAccountId,
          date: new Date().toISOString(),
          description: stocksOnlyMode 
            ? `${lang === 'es' ? 'Compra gratuita desde Portafolio (Solo Acciones)' : 'Free purchase from Portfolio (Stocks Only)'}: ${shares} ${sym} @ ${fmt(price)}`
            : `${lang === 'es' ? 'Compra de acciones desde Portafolio' : 'Stock purchase from Portfolio'}: ${shares} ${sym} @ ${fmt(price)}`
        }]
      };
      
      onAssetsPortfolioChange(updatedAssetsPortfolio);
    }

    // Also update Portfolio holdings for display in positions
    const existing = portfolio.holdings[sym] ?? { shares: 0, avgCost: 0 };
    const newShares = existing.shares + shares;
    const newAvgCost = (existing.avgCost * existing.shares + price * shares) / newShares;

    const next = {
      ...portfolio,
      holdings: { ...portfolio.holdings, [sym]: { shares: newShares, avgCost: newAvgCost } },
      transactions: [...portfolio.transactions, {
        type: stocksOnlyMode ? 'buy_free' : 'buy', 
        symbol: sym, 
        shares, 
        price, 
        total, 
        accountId: stocksOnlyMode ? null : selectedAccountId,
        date: new Date().toLocaleString('es-MX'),
        isFree: stocksOnlyMode
      }],
    };
    updatePortfolio(next);
    
    // Clear form
    setTradeSymbol('');
    setTradeShares('');
    setSelectedAccountId('');
    
    // Show success message
    const successMessage = stocksOnlyMode 
      ? `${lang === 'es' ? '✅ Compra simulada exitosa' : '✅ Simulated purchase successful'}: ${shares} ${sym}`
      : `${lang === 'es' ? '✅ Compra exitosa' : '✅ Purchase successful'}: ${shares} ${sym} - ${lang === 'es' ? 'Ve a Assets para ver los cambios' : 'Check Assets to see changes'}`;
    
    // Clear any previous error and show success
    setTradeError('');
    setTimeout(() => {
      alert(successMessage);
    }, 100);
  };

  // Sell - deposit to Assets accounts or simulate in stocks-only mode
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

    // In stocks-only mode, don't deposit to accounts
    if (!stocksOnlyMode) {
      // Deposit proceeds to first available Assets debit account
      const assetsAccounts = assetsPortfolio?.bankAccounts || [];
      const debitAccount = assetsAccounts.find(acc => acc.type === 'debit');
      if (debitAccount && onAssetsPortfolioChange && assetsPortfolio) {
        const updatedAssetsAccounts = [...assetsAccounts];
        const accountIndex = updatedAssetsAccounts.findIndex(acc => acc.id === debitAccount.id);
        updatedAssetsAccounts[accountIndex] = { 
          ...debitAccount, 
          balance: debitAccount.balance + total 
        };
        
        // Update Assets portfolio with account balances AND stock holdings
        const updatedAssetsPortfolio = {
          ...assetsPortfolio,
          bankAccounts: updatedAssetsAccounts,
          // Update stock holdings in Assets
          holdings: {
            ...assetsPortfolio.holdings,
            [sym]: newShares <= 0 
              ? undefined // Remove if no shares left
              : {
                  shares: (assetsPortfolio.holdings?.[sym]?.shares || 0) - shares,
                  avgCost: assetsPortfolio.holdings?.[sym]?.avgCost || price
                }
          },
          transactions: [...(assetsPortfolio.transactions || []), {
            id: Date.now().toString(),
            type: 'stock_sale',
            symbol: sym,
            shares: shares,
            price: price,
            total: total,
            date: new Date().toISOString(),
            description: `${lang === 'es' ? 'Venta de acciones desde Portafolio' : 'Stock sale from Portfolio'}: ${shares} ${sym} @ ${fmt(price)}`
          }]
        };
        
        // Clean up undefined holdings
        if (updatedAssetsPortfolio.holdings[sym] === undefined) {
          delete updatedAssetsPortfolio.holdings[sym];
        }
        
        onAssetsPortfolioChange(updatedAssetsPortfolio);
      }
    }

    const next = {
      ...portfolio,
      holdings: newHoldings,
      transactions: [...portfolio.transactions, {
        type: stocksOnlyMode ? 'sell_simulation' : 'sell', 
        symbol: sym, 
        shares, 
        price, 
        total, 
        date: new Date().toLocaleString('es-MX'),
        isSimulation: stocksOnlyMode
      }],
    };
    updatePortfolio(next);
    setTradeSymbol('');
    setTradeShares('');
  };

  // Dividend - deposit to Assets accounts or simulate in stocks-only mode
  const handleDividend = () => {
    const sym = divSymbol.trim().toUpperCase();
    const amountInput = parseFloat(divAmount);
    if (!sym || isNaN(amountInput) || amountInput <= 0) return;
    const amount = toUSD(amountInput); // convert from selected currency to USD
    const holding = portfolio.holdings[sym];
    const shares = holding?.shares ?? 0;
    const total = amount * shares;
    
    // In stocks-only mode, don't deposit to accounts
    if (!stocksOnlyMode) {
      // Deposit dividend to first available Assets debit account
      const assetsAccounts = assetsPortfolio?.bankAccounts || [];
      const debitAccount = assetsAccounts.find(acc => acc.type === 'debit');
      if (debitAccount && onAssetsPortfolioChange && assetsPortfolio) {
        const updatedAssetsAccounts = [...assetsAccounts];
        const accountIndex = updatedAssetsAccounts.findIndex(acc => acc.id === debitAccount.id);
        updatedAssetsAccounts[accountIndex] = { 
          ...debitAccount, 
          balance: debitAccount.balance + total 
        };
        
        // Update Assets portfolio
        const updatedAssetsPortfolio = {
          ...assetsPortfolio,
          bankAccounts: updatedAssetsAccounts,
          transactions: [...(assetsPortfolio.transactions || []), {
            id: Date.now().toString(),
            type: 'dividend_received',
            symbol: sym,
            amount: amount,
            shares: shares,
            total: total,
            date: new Date().toISOString(),
            description: `${lang === 'es' ? 'Dividendo recibido desde Portafolio' : 'Dividend received from Portfolio'}: ${shares} ${sym} × ${fmt(amount)}`
          }]
        };
        onAssetsPortfolioChange(updatedAssetsPortfolio);
      }
    }
    
    const next = {
      ...portfolio,
      dividendsReceived: portfolio.dividendsReceived + total,
      transactions: [...portfolio.transactions, {
        type: stocksOnlyMode ? 'dividend_simulation' : 'dividend', 
        symbol: sym, 
        amount, 
        shares, 
        total, 
        date: new Date().toLocaleString('es-MX'),
        isSimulation: stocksOnlyMode
      }],
    };
    updatePortfolio(next);
    setDivSymbol('');
    setDivAmount('');
  };

  // Portfolio value - now shows only investment values (no bank accounts)
  const holdingsValue = Object.entries(portfolio.holdings).reduce((sum, [sym, h]) => {
    return sum + h.shares * (prices[sym] ?? h.avgCost);
  }, 0);
  
  // Total value is now just holdings value (investments only)
  const totalValue = holdingsValue;
  
  // Calculate deposits/withdrawals from transactions (for return calculation)
  const totalDeposited = portfolio.deposits.filter((d) => d.type === 'deposit').reduce((s, d) => s + d.amount, 0);
  const totalWithdrawn = portfolio.deposits.filter((d) => d.type === 'withdraw').reduce((s, d) => s + d.amount, 0);
  const netDeposited = totalDeposited - totalWithdrawn;
  
  // For investment-only return calculation, use cost basis instead of net deposited
  const totalCostBasis = Object.entries(portfolio.holdings).reduce((sum, [sym, h]) => {
    return sum + h.shares * h.avgCost;
  }, 0);
  
  const totalReturn = totalValue - totalCostBasis;
  const totalReturnPct = totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0;

  // Gains breakdown - now focuses only on investment gains
  const unrealizedProfit = Object.entries(portfolio.holdings).reduce((sum, [sym, h]) => {
    const currentPrice = prices[sym] ?? h.avgCost;
    return sum + h.shares * (currentPrice - h.avgCost);
  }, 0);
  
  const realizedProfit = portfolio.transactions
    .filter((tx) => tx.type === 'sell' || tx.type === 'sell_simulation')
    .reduce((sum, tx) => {
      return sum + tx.total;
    }, 0) - portfolio.transactions
    .filter((tx) => tx.type === 'sell' || tx.type === 'sell_simulation')
    .reduce((sum, tx) => sum + tx.shares * (portfolio.holdings[tx.symbol]?.avgCost ?? tx.price), 0);
    
  const dividendProfit = portfolio.dividendsReceived;
  
  // Total profit is now just investment-related gains
  const totalProfit = unrealizedProfit + dividendProfit;

  const fmt = fmtCurrency;

  return (
    <div className="space-y-4">
      
      {/* COMPRA/VENTA DE ACCIONES - SECCIÓN PRINCIPAL */}
      <div className="bg-gradient-to-r from-slate-800/50 to-blue-900/30 rounded-xl p-4 border border-blue-500/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-lg">{lang === 'es' ? 'Comprar/Vender Acciones' : 'Buy/Sell Stocks'}</h3>
          
          {/* Toggle Simple para Modo Solo Acciones */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">{lang === 'es' ? 'Solo Acciones:' : 'Stocks Only:'}</span>
            <button
              onClick={() => setStocksOnlyMode(!stocksOnlyMode)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                stocksOnlyMode 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-600 text-slate-300'
              }`}
            >
              {stocksOnlyMode ? (lang === 'es' ? 'SÍ' : 'YES') : (lang === 'es' ? 'NO' : 'NO')}
            </button>
          </div>
        </div>

        {stocksOnlyMode && (
          <div className="mb-4 bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-2">
            <p className="text-purple-400 text-xs">
              {lang === 'es' 
                ? 'Modo Solo Acciones: Las operaciones no afectan las cuentas bancarias de Activos'
                : 'Stocks Only Mode: Operations do not affect Assets bank accounts'
              }
            </p>
          </div>
        )}

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
        
        {/* Selector de cuenta bancaria cuando NO está en modo stocks-only */}
        {!stocksOnlyMode && tradeMode === 'buy' && assetsPortfolio?.bankAccounts?.length > 0 && (
          <select
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
          >
            <option value="">{lang === 'es' ? 'Seleccionar cuenta para pago' : 'Select account for payment'}</option>
            {assetsPortfolio.bankAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} - {fmt(acc.balance)} {acc.type === 'credit' && acc.balance < 0 ? `(${lang === 'es' ? 'crédito usado' : 'credit used'})` : ''}
              </option>
            ))}
          </select>
        )}
        
        {tradeSymbol && prices[tradeSymbol] && (
          <p className="text-slate-400 text-xs mb-2">
            {t('portfolio_current_price_total', lang)}: {fmt(prices[tradeSymbol])} · {t('portfolio_total', lang)}: {fmt(prices[tradeSymbol] * (parseFloat(tradeShares) || 0))}
          </p>
        )}
        
        {!stocksOnlyMode && tradeMode === 'buy' && selectedAccountId && assetsPortfolio?.bankAccounts && (
          <p className="text-slate-400 text-xs mb-2">
            {lang === 'es' ? 'Cuenta seleccionada' : 'Selected account'}: {assetsPortfolio.bankAccounts.find(acc => acc.id === selectedAccountId)?.name || ''}
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
          {stocksOnlyMode && ` (${lang === 'es' ? 'Simulación' : 'Simulation'})`}
        </button>
      </div>

      {/* Alertas de Precios */}
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

      {/* Performance Section - Single Container */}
      {enabledFeatures.portfolioPerformance !== false && (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700">
        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {['portfolio-performance', 'stock-performance'].map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${tab === tabKey ? 'text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'}`}
            >
              {tabKey === 'portfolio-performance' ? (lang === 'es' ? 'Rendimiento del Portafolio' : 'Portfolio Performance') : 
               tabKey === 'stock-performance' ? (lang === 'es' ? 'Rendimiento de Acciones' : 'Stock Performance') : ''}
            </button>
          ))}
          <div className="flex-1" />
          {(tab === 'portfolio-performance' || tab === 'stock-performance') && (
            <div className="flex items-center gap-2 m-2">
              <select
                value={performanceRange}
                onChange={(e) => setPerformanceRange(e.target.value)}
                className="bg-slate-700 text-white px-3 py-1.5 rounded text-xs outline-none"
              >
                {tab === 'portfolio-performance' ? (
                  // Portfolio performance uses filtered time ranges based on account age
                  getAvailableTimeRanges().map(range => (
                    <option key={range.value} value={range.value}>
                      {lang === 'es' ? range.labelEs : range.labelEn}
                    </option>
                  ))
                ) : (
                  // Stock performance uses all time ranges
                  <>
                    <option value="3days">{lang === 'es' ? '3 Días' : '3 Days'}</option>
                    <option value="1week">{lang === 'es' ? '1 Semana' : '1 Week'}</option>
                    <option value="2weeks">{lang === 'es' ? '2 Semanas' : '2 Weeks'}</option>
                    <option value="1month">{lang === 'es' ? '1 Mes' : '1 Month'}</option>
                    <option value="6weeks">{lang === 'es' ? '6 Semanas' : '6 Weeks'}</option>
                    <option value="2months">{lang === 'es' ? '2 Meses' : '2 Months'}</option>
                    <option value="3months">{lang === 'es' ? '3 Meses' : '3 Months'}</option>
                    <option value="4months">{lang === 'es' ? '4 Meses' : '4 Months'}</option>
                    <option value="6months">{lang === 'es' ? '6 Meses' : '6 Months'}</option>
                    <option value="9months">{lang === 'es' ? '9 Meses' : '9 Months'}</option>
                    <option value="1year">{lang === 'es' ? '1 Año' : '1 Year'}</option>
                    <option value="18months">{lang === 'es' ? '18 Meses' : '18 Months'}</option>
                    <option value="2years">{lang === 'es' ? '2 Años' : '2 Years'}</option>
                    <option value="30months">{lang === 'es' ? '30 Meses' : '30 Months'}</option>
                    <option value="3years">{lang === 'es' ? '3 Años' : '3 Years'}</option>
                    <option value="4years">{lang === 'es' ? '4 Años' : '4 Years'}</option>
                    <option value="5years">{lang === 'es' ? '5 Años' : '5 Years'}</option>
                    <option value="7years">{lang === 'es' ? '7 Años' : '7 Years'}</option>
                    <option value="10years">{lang === 'es' ? '10 Años' : '10 Years'}</option>
                    <option value="12years">{lang === 'es' ? '12 Años' : '12 Years'}</option>
                    <option value="15years">{lang === 'es' ? '15 Años' : '15 Years'}</option>
                    <option value="20years">{lang === 'es' ? '20 Años' : '20 Years'}</option>
                    <option value="25years">{lang === 'es' ? '25 Años' : '25 Years'}</option>
                    <option value="alltime">{lang === 'es' ? 'Todo' : 'All Time'}</option>
                  </>
                )}
              </select>
              {Object.keys(portfolio.holdings).length === 0 && (
                <button
                  onClick={() => {
                    // Add sample portfolio data for testing
                    const samplePortfolio = {
                      ...portfolio,
                      holdings: {
                        'AAPL': { shares: 10, avgCost: 150 },
                        'MSFT': { shares: 5, avgCost: 300 },
                        'GOOGL': { shares: 2, avgCost: 2500 }
                      },
                      deposits: [{ type: 'deposit', amount: 10000, date: new Date().toISOString() }],
                      transactions: [
                        { type: 'deposit', amount: 10000, date: new Date().toLocaleString('es-MX') },
                        { type: 'buy', symbol: 'AAPL', shares: 10, price: 150, total: 1500, date: new Date().toLocaleString('es-MX') },
                        { type: 'buy', symbol: 'MSFT', shares: 5, price: 300, total: 1500, date: new Date().toLocaleString('es-MX') },
                        { type: 'buy', symbol: 'GOOGL', shares: 2, price: 2500, total: 5000, date: new Date().toLocaleString('es-MX') }
                      ]
                    };
                    updatePortfolio(samplePortfolio);
                    
                    // Add sample bank accounts
                    const sampleBankAccounts = [
                      {
                        id: Date.now(),
                        name: 'BBVA Checking',
                        balance: 1000,
                        annualRate: 0.5, // Low growth rate for checking account
                        interestRate: 0, // No interest for debit accounts
                        accountType: 'debit',
                        growthFrequency: 'monthly',
                        interestFrequency: 'annual',
                        fees: [
                          { id: Date.now() + 10, name: 'Mantenimiento', amount: 15, frequency: 'monthly' },
                          { id: Date.now() + 11, name: 'Transferencias', amount: 2, frequency: 'weekly' }
                        ]
                      },
                      {
                        id: Date.now() + 1,
                        name: 'Nu Savings',
                        balance: 5000,
                        annualRate: 4.0, // Higher growth rate for savings
                        interestRate: 0, // No interest for debit accounts
                        accountType: 'debit',
                        growthFrequency: 'annual',
                        interestFrequency: 'annual',
                        fees: [
                          { id: Date.now() + 12, name: 'Comisión anual', amount: 50, frequency: 'annual' }
                        ]
                      },
                      {
                        id: Date.now() + 2,
                        name: 'Credit Card Debt',
                        balance: -2500, // Negative balance (debt)
                        annualRate: 0, // No growth for debt
                        interestRate: 50.0, // High 50% interest rate for credit accounts only
                        accountType: 'credit',
                        growthFrequency: 'monthly',
                        interestFrequency: 'weekly', // Weekly compounding for credit card
                        fees: [
                          { id: Date.now() + 13, name: 'Anualidad', amount: 120, frequency: 'annual' },
                          { id: Date.now() + 14, name: 'Comisión por uso', amount: 5, frequency: 'monthly' }
                        ]
                      }
                    ];
                    // Sample bank accounts would be handled by Assets component
                    // saveBankAccounts(sampleBankAccounts);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-semibold"
                >
                  {lang === 'es' ? 'Datos de prueba' : 'Sample data'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {loadingPerformance ? (
            <p className="text-slate-500 text-sm text-center py-8">{lang === 'es' ? 'Cargando datos de rendimiento...' : 'Loading performance data...'}</p>
          ) : performanceData ? (
            <div className="space-y-4">
            {/* Resumen de rendimiento simple */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">
                  {tab === 'portfolio-performance' 
                    ? (lang === 'es' ? 'Crecimiento Total del Portafolio' : 'Total Portfolio Growth')
                    : (lang === 'es' ? 'Crecimiento Total de Acciones' : 'Total Stock Growth')
                  }
                </h3>
                <p className="text-2xl font-bold text-blue-400">
                  {fmt(performanceData.totalGain)}
                </p>
                <p className={`text-sm ${performanceData.totalChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {performanceData.totalChange >= 0 ? '+' : ''}{performanceData.totalChange.toFixed(2)}%
                </p>
                {performanceData.totalStartValue === 0 && tab === 'stock-performance' && (
                  <p className="text-xs text-amber-400 mt-1">
                    {lang === 'es' ? 'Basado en precio de compra promedio' : 'Based on average purchase price'}
                  </p>
                )}
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-2">
                  {tab === 'portfolio-performance' 
                    ? (lang === 'es' ? 'Valor Total del Portafolio' : 'Total Portfolio Value')
                    : (lang === 'es' ? 'Valor de las Acciones' : 'Stock Value')
                  }
                </h3>
                <p className="text-2xl font-bold text-white">
                  {fmt(performanceData.totalEndValue)}
                </p>
                <p className="text-sm text-slate-400">
                  {lang === 'es' ? 'Desde' : 'From'}: {fmt(performanceData.totalStartValue)}
                </p>
              </div>
            </div>

            {/* Rendimiento por activo - solo para stock performance */}
            {tab === 'stock-performance' && performanceData.individual && performanceData.individual.length > 0 ? (
              <div>
                <h3 className="text-white font-semibold mb-3">{lang === 'es' ? 'Rendimiento por Activo' : 'Performance by Asset'}</h3>
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
                          <span className="text-slate-400">{lang === 'es' ? 'Ganancia' : 'Gain'}:</span>
                          <span className={item.gain >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {item.gain >= 0 ? '+' : ''}{fmt(item.gain)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{lang === 'es' ? 'Valor' : 'Value'}:</span>
                          <span className="text-white">{fmt(item.endPrice * item.shares)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">{lang === 'es' ? 'Acciones' : 'Shares'}:</span>
                          <span className="text-slate-200">{item.shares.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : tab === 'portfolio-performance' ? (
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">{lang === 'es' ? 'Información del Portafolio' : 'Portfolio Information'}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === 'es' ? 'Período analizado:' : 'Period analyzed:'}</span>
                    <span className="text-white">
                      {getAvailableTimeRanges().find(r => r.value === performanceRange)?.[lang === 'es' ? 'labelEs' : 'labelEn'] || performanceRange}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === 'es' ? 'Incluye:' : 'Includes:'}</span>
                    <span className="text-white">{lang === 'es' ? 'Acciones + Cuentas bancarias' : 'Stocks + Bank accounts'}</span>
                  </div>
                  {(accountCreated || dataResetAt) && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">{lang === 'es' ? 'Edad del portafolio:' : 'Portfolio age:'}</span>
                      <span className="text-green-400">
                        {(() => {
                          const refDate = dataResetAt ? new Date(dataResetAt) : new Date(accountCreated);
                          const ageMs = Date.now() - refDate.getTime();
                          const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
                          const hours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                          return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm mb-2">
                  {lang === 'es' ? 'No hay posiciones en el portafolio' : 'No positions in portfolio'}
                </p>
                <p className="text-slate-500 text-xs">
                  {lang === 'es' ? 'Compra algunas acciones para ver el rendimiento' : 'Buy some stocks to see performance'}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400 text-sm mb-2">
              {lang === 'es' ? 'No hay datos de rendimiento disponibles' : 'No performance data available'}
            </p>
            <p className="text-slate-500 text-xs">
              {tab === 'portfolio-performance' 
                ? (lang === 'es' ? 'Realiza algunas transacciones para comenzar' : 'Make some transactions to get started')
                : (lang === 'es' ? 'Agrega algunas acciones a tu portafolio para comenzar' : 'Add some stocks to your portfolio to get started')
              }
            </p>
          </div>
        )
        }
        </div>
        </div>
      )}

      {/* Summary - investment-focused */}
      {tab !== 'portfolio-performance' && (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: t('label_investments', lang), value: fmt(holdingsValue), color: 'text-blue-400' },
          { label: t('label_total_return', lang), value: `${totalReturn >= 0 ? '+' : ''}${fmt(totalReturn)} (${totalReturnPct.toFixed(2)}%)`, color: totalReturn >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: lang === 'es' ? 'Costo Base' : 'Cost Basis', value: fmt(totalCostBasis), color: 'text-slate-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800/70 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>
      )}

      {/* Gains breakdown - investment-focused */}
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
            <p className="text-slate-500 text-xs mt-1">{lang === 'es' ? 'Dividendos + acciones' : 'Dividends + stocks'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">

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

      {/* Portfolio Total Value Chart - Investment focused */}
      {enabledFeatures.portfolioChart !== false && portfolio.transactions.length > 0 && (() => {
        let costBasis = {};
        const allPoints = [];

        portfolio.transactions.forEach((tx) => {
          if (tx.type === 'buy' || tx.type === 'buy_simulation') {
            costBasis[tx.symbol] = (costBasis[tx.symbol] ?? 0) + tx.total;
          } else if (tx.type === 'sell' || tx.type === 'sell_simulation') {
            const prev = costBasis[tx.symbol] ?? 0;
            const sharesLeft = (portfolio.holdings[tx.symbol]?.shares ?? 0);
            const totalShares = sharesLeft + tx.shares;
            costBasis[tx.symbol] = Math.max(0, prev * (sharesLeft / Math.max(totalShares, 0.0001)));
          }
          
          const investedValue = Object.values(costBasis).reduce((s, v) => s + v, 0);
          const total = investedValue; // Only investment value, no bank accounts
          
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

        return (
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-white font-semibold">{lang === 'es' ? 'Valor de Inversiones' : 'Investment Value'}</h3>
                <div className="bg-green-900/50 border border-green-500/40 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-green-400 text-xs">{lang === 'es' ? 'Valor Actual' : 'Current Value'}</p>
                  <p className="text-white font-bold text-sm">{fmt(holdingsValue)}</p>
                </div>
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
                <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2} dot={false} name="Valor de Inversiones" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })()}



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
          <p className="text-slate-600 text-sm">{t('portfolio_enter_symbol_news', lang)}</p>
        )}
      </div>
      )}

    </div>
  );
}
