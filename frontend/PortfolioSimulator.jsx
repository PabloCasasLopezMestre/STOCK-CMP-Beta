import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, Plus, Minus, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { t } from './i18n';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const WORKER_BASE = 'https://proxy.stockcmp-proxy.workers.dev';

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

export default function PortfolioSimulator({ currency, setCurrency, nextCurrency, currencyLabel, rates, alerts, setAlerts, lang = 'es', onOpenCommunityIdea, initialPortfolio, onPortfolioChange, refreshTrigger, showAlertsPanel, setShowAlertsPanel }) {
  const [portfolio, setPortfolio] = useState(() => initialPortfolio || loadPortfolio() || DEFAULT_PORTFOLIO);
  const [prices, setPrices] = useState({});
  const [historicalPrices, setHistoricalPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

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

  // Chart state
  const CHART_RANGES = [
    { label: lang === 'es' ? '1 Hora'   : '1 Hour',    interval: '2m',  range: '1h'  },
    { label: lang === 'es' ? '6 Horas'  : '6 Hours',   interval: '5m',  range: '1d', trimHours: 6 },
    { label: lang === 'es' ? '24 Horas' : '24 Hours',  interval: '5m',  range: '1d'  },
    { label: lang === 'es' ? '1 Semana' : '1 Week',    interval: '1h',  range: '5d'  },
    { label: lang === 'es' ? '1 Mes'    : '1 Month',   interval: '1d',  range: '1mo' },
    { label: lang === 'es' ? '3 Meses'  : '3 Months',  interval: '1d',  range: '3mo' },
    { label: lang === 'es' ? '6 Meses'  : '6 Months',  interval: '1d',  range: '6mo' },
    { label: lang === 'es' ? '1 Año'    : '1 Year',    interval: '1wk', range: '1y'  },
    { label: lang === 'es' ? '2 Años'   : '2 Years',   interval: '1wk', range: '2y'  },
    { label: lang === 'es' ? '3 Años'   : '3 Years',   interval: '1mo', range: '3y'  },
    { label: lang === 'es' ? '5 Años'   : '5 Years',   interval: '1mo', range: '5y'  },
    { label: lang === 'es' ? '10 Años'  : '10 Years',  interval: '3mo', range: '10y' },
    { label: lang === 'es' ? '15 Años'  : '15 Years',  interval: '3mo', range: '15y' },
  ];
  const CHART_COLORS = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];

  const [activeRange, setActiveRange] = useState('1 Mes');
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

  const fetchChartData = useCallback(async (symbols, rangeLabel) => {
    if (!symbols.length) { setChartData([]); return; }
    setLoadingChart(true);
    const cfg = CHART_RANGES.find((r) => r.label === rangeLabel) ?? CHART_RANGES[1];
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

  const handleChartRangeChange = (label) => {
    setActiveRange(label);
    fetchChartData(chartSymbols, label);
    fetchHistoricalPrices(CHART_RANGES.find((r) => r.label === label)?.range ?? '1mo');
  };

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

  const updatePortfolio = (next) => {
    setPortfolio(next);
    savePortfolio(next);
    if (onPortfolioChange) onPortfolioChange(next);
  };

  // Fetch current prices for all holdings
  const fetchPrices = async () => {
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
  };

  useEffect(() => { fetchPrices(); }, [JSON.stringify(Object.keys(portfolio.holdings))]);
  useEffect(() => { if (refreshTrigger > 0) { fetchPrices(); fetchHistoricalPrices(compareRange); } }, [refreshTrigger]);
  useEffect(() => { fetchAllNewsCounts(); }, [JSON.stringify(Object.keys(portfolio.holdings))]);

  // Fetch historical prices for comparison
  const fetchHistoricalPrices = async (range) => {
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
  };

  useEffect(() => { fetchHistoricalPrices(compareRange); }, [JSON.stringify(Object.keys(portfolio.holdings)), compareRange]);

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
  const unrealizedGain = Object.entries(portfolio.holdings).reduce((sum, [sym, h]) => {
    const currentPrice = prices[sym] ?? h.avgCost;
    return sum + h.shares * (currentPrice - h.avgCost);
  }, 0);
  const realizedGain = portfolio.transactions
    .filter((tx) => tx.type === 'sell')
    .reduce((sum, tx) => {
      return sum + tx.total;
    }, 0) - portfolio.transactions
    .filter((tx) => tx.type === 'sell')
    .reduce((sum, tx) => sum + tx.shares * (portfolio.holdings[tx.symbol]?.avgCost ?? tx.price), 0);
  const dividendGain = portfolio.dividendsReceived;
  const totalGain = unrealizedGain + dividendGain;

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

      {/* Summary */}
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

      {/* Gains breakdown */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-white font-semibold mb-3">{t('portfolio_gains_summary', lang)}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/30">
            <p className="text-slate-400 text-xs mb-1">{t('portfolio_dividend_gains', lang)}</p>
            <p className={`text-2xl font-bold ${dividendGain >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
              {dividendGain >= 0 ? '+' : ''}{fmt(dividendGain)}
            </p>
            <p className="text-slate-500 text-xs mt-1">{t('portfolio_dividends_accumulated', lang)}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/30">
            <p className="text-slate-400 text-xs mb-1">{t('portfolio_stock_value_gain', lang)}</p>
            <p className={`text-2xl font-bold ${unrealizedGain >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {unrealizedGain >= 0 ? '+' : ''}{fmt(unrealizedGain)}
            </p>
            <p className="text-slate-500 text-xs mt-1">{t('portfolio_current_vs_avg', lang)}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-green-500/30">
            <p className="text-slate-400 text-xs mb-1">{t('portfolio_total_gain', lang)}</p>
            <p className={`text-2xl font-bold ${totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalGain >= 0 ? '+' : ''}{fmt(totalGain)}
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
          <input
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2 uppercase"
            placeholder={t('portfolio_symbol_placeholder', lang)}
            value={tradeSymbol}
            onChange={(e) => setTradeSymbol(e.target.value.toUpperCase())}
            maxLength={10}
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
          {tradeError && <p className="text-red-400 text-xs mb-2">{tradeError}</p>}
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
          <input
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2 uppercase"
            placeholder={t('portfolio_symbol_placeholder', lang).replace('AAPL', 'KO')}
            value={divSymbol}
            onChange={(e) => { setDivSymbol(e.target.value.toUpperCase()); setDivInfo(null); }}
            maxLength={10}
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
      {Object.keys(portfolio.holdings).length > 0 && (
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
              {CHART_RANGES.map(({ label }) => (
                <button key={label} onClick={() => handleChartRangeChange(label)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${activeRange === label ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  {label}
                </button>
              ))}
              <button onClick={() => fetchChartData(chartSymbols, activeRange)} disabled={loadingChart}
                className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center gap-1">
                <RefreshCw size={10} className={loadingChart ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Symbol toggles */}
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
      {portfolio.transactions.length > 0 && (() => {
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

      {/* News section */}
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

      {/* Transaction history */}
      {portfolio.transactions.length > 0 && (
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
