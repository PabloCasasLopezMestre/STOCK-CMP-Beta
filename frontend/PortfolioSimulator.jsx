import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, Plus, Minus, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
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

export default function PortfolioSimulator({ currency, setCurrency, nextCurrency, currencyLabel, rates, alerts, setAlerts }) {
  const [portfolio, setPortfolio] = useState(() => loadPortfolio() || DEFAULT_PORTFOLIO);
  const [prices, setPrices] = useState({});
  const [historicalPrices, setHistoricalPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  // Alerts panel
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [newAlert, setNewAlert] = useState({ symbol: '', condition: 'above', price: '' });
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);

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
    setAlerts((prev) => [...prev, alert]);
    localStorage.setItem('priceAlerts', JSON.stringify([...(alerts ?? []), alert]));
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
    { label: '1 Hora',   interval: '2m',  range: '1h'  },
    { label: '6 Horas',  interval: '5m',  range: '1d', trimHours: 6 },
    { label: '24 Horas', interval: '5m',  range: '1d'  },
    { label: '1 Semana', interval: '1h',  range: '5d'  },
    { label: '1 Mes',    interval: '1d',  range: '1mo' },
    { label: '3 Meses',  interval: '1d',  range: '3mo' },
    { label: '6 Meses',  interval: '1d',  range: '6mo' },
    { label: '1 Año',    interval: '1wk', range: '1y'  },
    { label: '2 Años',   interval: '1wk', range: '2y'  },
    { label: '3 Años',   interval: '1mo', range: '3y'  },
    { label: '5 Años',   interval: '1mo', range: '5y'  },
    { label: '10 Años',  interval: '3mo', range: '10y' },
    { label: '15 Años',  interval: '3mo', range: '15y' },
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
    { label: '1 hora',   hours: 1 },
    { label: '6 horas',  hours: 6 },
    { label: '24 horas', hours: 24 },
    { label: '48 horas', hours: 48 },
    { label: '7 días',   hours: 168 },
    { label: 'Todo',     hours: null },
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
        setNewsError('No se encontraron noticias para este símbolo.');
        setNewsItems([]);
      } else {
        setNewsItems(data.items);
        // Update count for this symbol
        setNewsCounts((prev) => ({ ...prev, [symbol]: data.items.length }));
      }
    } catch {
      setNewsError('Error al cargar noticias.');
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
  const [divAmount, setDivAmount] = useState('');

  const updatePortfolio = (next) => {
    setPortfolio(next);
    savePortfolio(next);
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
    if (depositMode === 'withdraw' && amount > portfolio.cash) return;
    const delta = depositMode === 'deposit' ? amount : -amount;
    const next = {
      ...portfolio,
      cash: portfolio.cash + delta,
      deposits: [...portfolio.deposits, { type: depositMode, amount, date: new Date().toISOString() }],
      transactions: [...portfolio.transactions, {
        type: depositMode, amount, date: new Date().toLocaleString('es-MX'),
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
    if (!sym || isNaN(shares) || shares <= 0) { setTradeError('Símbolo y cantidad requeridos'); return; }

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
    if (!price) { setTradeError('No se pudo obtener el precio'); return; }

    const total = price * shares;
    if (total > portfolio.cash) { setTradeError(`Fondos insuficientes. Necesitas $${total.toFixed(2)}`); return; }

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
    if (!sym || isNaN(shares) || shares <= 0) { setTradeError('Símbolo y cantidad requeridos'); return; }

    const holding = portfolio.holdings[sym];
    if (!holding || holding.shares < shares) { setTradeError(`No tienes suficientes acciones de ${sym}`); return; }

    const price = prices[sym];
    if (!price) { setTradeError('Actualiza los precios primero'); return; }

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
    const amount = parseFloat(divAmount);
    if (!sym || isNaN(amount) || amount <= 0) return;
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
    .filter((t) => t.type === 'sell')
    .reduce((sum, t) => {
      // realized = sell price - avg cost at time of sale (approximated from transaction)
      return sum + t.total;
    }, 0) - portfolio.transactions
    .filter((t) => t.type === 'sell')
    .reduce((sum, t) => sum + t.shares * (portfolio.holdings[t.symbol]?.avgCost ?? t.price), 0);
  const dividendGain = portfolio.dividendsReceived;
  const totalGain = unrealizedGain + dividendGain;

  const fmt = fmtCurrency;

  return (
    <div className="space-y-4">

      {/* Portfolio header bar */}
      <div className="flex flex-wrap gap-2 items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-700">
        <div className="flex gap-2">
          <button
            onClick={nextCurrency}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            {currencyLabel}
          </button>
          <button
            onClick={() => { fetchPrices(); fetchHistoricalPrices(compareRange); }}
            disabled={loadingPrices || loadingHistorical}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"
          >
            <RefreshCw size={14} className={(loadingPrices || loadingHistorical) ? 'animate-spin' : ''} /> Actualizar precios
          </button>
          <button
            onClick={() => { setShowAlertPanel(!showAlertPanel); if (Notification.permission === 'default') Notification.requestPermission(); }}
            className={`relative px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1 transition-colors ${triggeredAlerts.length > 0 ? 'bg-red-600 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'} text-white`}
          >
            🔔 Alertas
            {alerts?.length > 0 && <span className="bg-white text-slate-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{alerts.length}</span>}
          </button>
        </div>
        <p className="text-slate-400 text-xs">1 USD = {rates?.MXN?.toFixed(2)} MXN · 1 USD = {rates?.EUR?.toFixed(4)} EUR</p>
      </div>

      {/* Triggered alerts banner */}
      {triggeredAlerts.length > 0 && (
        <div className="bg-red-900/60 border border-red-500 rounded-xl p-3 flex flex-wrap gap-2 items-center">
          <span className="text-red-300 font-bold text-sm">🚨 Alerta:</span>
          {triggeredAlerts.map((a) => (
            <span key={a.id} className="bg-red-800 text-white text-xs px-3 py-1 rounded-full">
              {a.symbol} {a.condition === 'above' ? '▲' : '▼'} ${a.price} · actual: ${a.currentPrice?.toFixed(2)}
            </span>
          ))}
        </div>
      )}

      {/* Alert panel */}
      {showAlertPanel && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">🔔 Alertas de precio</h3>
          <div className="flex gap-2 flex-wrap mb-4">
            <input className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none w-24 uppercase" placeholder="Símbolo" value={newAlert.symbol} onChange={(e) => setNewAlert({ ...newAlert, symbol: e.target.value.toUpperCase() })} maxLength={10} />
            <select className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none" value={newAlert.condition} onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value })}>
              <option value="above">Sube de</option>
              <option value="below">Baja de</option>
            </select>
            <input className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none w-28" placeholder="Precio USD" type="number" value={newAlert.price} onChange={(e) => setNewAlert({ ...newAlert, price: e.target.value })} />
            <button onClick={addAlert} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm">+ Agregar</button>
          </div>
          {!alerts?.length ? (
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
          { label: 'Valor Total', value: fmt(totalValue), color: 'text-white' },
          { label: 'Efectivo', value: fmt(portfolio.cash), color: 'text-green-400' },
          { label: 'Inversiones', value: fmt(holdingsValue), color: 'text-blue-400' },
          { label: 'Retorno Total', value: `${totalReturn >= 0 ? '+' : ''}${fmt(totalReturn)} (${totalReturnPct.toFixed(2)}%)`, color: totalReturn >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800/70 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Gains breakdown */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-white font-semibold mb-3">Resumen de Ganancias</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/30">
            <p className="text-slate-400 text-xs mb-1">Ganancias por Dividendos</p>
            <p className={`text-2xl font-bold ${dividendGain >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
              {dividendGain >= 0 ? '+' : ''}{fmt(dividendGain)}
            </p>
            <p className="text-slate-500 text-xs mt-1">Dividendos cobrados acumulados</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/30">
            <p className="text-slate-400 text-xs mb-1">Ganancia por Valor de Acciones</p>
            <p className={`text-2xl font-bold ${unrealizedGain >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {unrealizedGain >= 0 ? '+' : ''}{fmt(unrealizedGain)}
            </p>
            <p className="text-slate-500 text-xs mt-1">Precio actual vs. costo promedio</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-green-500/30">
            <p className="text-slate-400 text-xs mb-1">Ganancia Total</p>
            <p className={`text-2xl font-bold ${totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalGain >= 0 ? '+' : ''}{fmt(totalGain)}
            </p>
            <p className="text-slate-500 text-xs mt-1">Dividendos + valor de acciones</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Deposit / Withdraw */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">Cuenta Bancaria</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setDepositMode('deposit')} className={`flex-1 py-1.5 rounded text-sm font-medium ${depositMode === 'deposit' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Depositar</button>
            <button onClick={() => setDepositMode('withdraw')} className={`flex-1 py-1.5 rounded text-sm font-medium ${depositMode === 'withdraw' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Retirar</button>
          </div>
          <input
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
            placeholder="Cantidad en USD"
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <button onClick={handleDeposit} className={`w-full py-2 rounded text-sm font-medium text-white ${depositMode === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {depositMode === 'deposit' ? '+ Depositar' : '- Retirar'}
          </button>
          <p className="text-slate-500 text-xs mt-2">Depositado: {fmt(totalDeposited)} · Retirado: {fmt(totalWithdrawn)}</p>
          <p className="text-slate-500 text-xs">Dividendos recibidos: {fmt(portfolio.dividendsReceived)}</p>
        </div>

        {/* Buy / Sell */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">Comprar / Vender</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setTradeMode('buy')} className={`flex-1 py-1.5 rounded text-sm font-medium ${tradeMode === 'buy' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Comprar</button>
            <button onClick={() => setTradeMode('sell')} className={`flex-1 py-1.5 rounded text-sm font-medium ${tradeMode === 'sell' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300'}`}>Vender</button>
          </div>
          <input
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2 uppercase"
            placeholder="Símbolo (ej. AAPL)"
            value={tradeSymbol}
            onChange={(e) => setTradeSymbol(e.target.value.toUpperCase())}
            maxLength={10}
          />
          <input
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
            placeholder="Número de acciones"
            type="number"
            value={tradeShares}
            onChange={(e) => setTradeShares(e.target.value)}
          />
          {tradeSymbol && prices[tradeSymbol] && (
            <p className="text-slate-400 text-xs mb-2">
              Precio actual: {fmt(prices[tradeSymbol])} · Total: {fmt(prices[tradeSymbol] * (parseFloat(tradeShares) || 0))}
            </p>
          )}
          {tradeError && <p className="text-red-400 text-xs mb-2">{tradeError}</p>}
          <button
            onClick={tradeMode === 'buy' ? handleBuy : handleSell}
            className={`w-full py-2 rounded text-sm font-medium text-white ${tradeMode === 'buy' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
            {tradeMode === 'buy' ? 'Comprar' : 'Vender'}
          </button>
        </div>

        {/* Dividends */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">Registrar Dividendo</h3>
          <p className="text-slate-400 text-xs mb-3">Ingresa el dividendo por acción y se calculará automáticamente según tus acciones.</p>
          <input
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2 uppercase"
            placeholder="Símbolo (ej. KO)"
            value={divSymbol}
            onChange={(e) => setDivSymbol(e.target.value.toUpperCase())}
            maxLength={10}
          />
          <input
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
            placeholder="Dividendo por acción (USD)"
            type="number"
            value={divAmount}
            onChange={(e) => setDivAmount(e.target.value)}
          />
          {divSymbol && portfolio.holdings[divSymbol] && (
            <p className="text-slate-400 text-xs mb-2">
              Tienes {portfolio.holdings[divSymbol].shares} acciones · Total: {fmt((parseFloat(divAmount) || 0) * portfolio.holdings[divSymbol].shares)}
            </p>
          )}
          <button onClick={handleDividend} className="w-full py-2 rounded text-sm font-medium text-white bg-purple-600 hover:bg-purple-700">
            Registrar Dividendo
          </button>
        </div>
      </div>

      {/* Holdings */}
      {Object.keys(portfolio.holdings).length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-white font-semibold">Posiciones</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 text-xs">Comparar vs:</span>
              {[
                { label: '1 Hora',   value: '1h'  },
                { label: '6 Horas',  value: '6h'  },
                { label: '24 Horas', value: '1d'  },
                { label: '1 Semana', value: '1wk' },
                { label: '1 Mes',    value: '1mo' },
                { label: '3 Meses',  value: '3mo' },
                { label: '6 Meses',  value: '6mo' },
                { label: '1 Año',    value: '1y'  },
                { label: '2 Años',   value: '2y'  },
                { label: '3 Años',   value: '3y'  },
                { label: '5 Años',   value: '5y'  },
                { label: '10 Años',  value: '10y' },
                { label: '15 Años',  value: '15y' },
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
                <RefreshCw size={12} className={(loadingPrices || loadingHistorical) ? 'animate-spin' : ''} /> Actualizar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700 text-xs">
                  <th className="text-left py-2 pr-4">Símbolo</th>
                  <th className="text-right py-2 px-3">Acciones</th>
                  <th className="text-right py-2 px-3">Comprado a</th>
                  <th className="text-right py-2 px-3">Precio hace {compareRange}</th>
                  <th className="text-right py-2 px-3">Precio Actual</th>
                  <th className="text-right py-2 px-3">G/P vs compra</th>
                  <th className="text-right py-2 pl-3">G/P en período</th>
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
          <p className="text-slate-400 text-sm mb-1">📊 Hay dos gráficas disponibles en esta sección:</p>
          <p className="text-slate-500 text-xs mb-1">
            <span className="text-slate-300 font-medium">Gráfica del Portafolio</span> — aparece cuando tienes al menos una acción comprada.
          </p>
          <p className="text-slate-500 text-xs">
            <span className="text-slate-300 font-medium">Valor Total del Portafolio</span> — aparece cuando tienes al menos una transacción registrada (depósito, compra, venta o dividendo).
          </p>
        </div>
      )}

      {/* Portfolio Chart */}
      {Object.keys(portfolio.holdings).length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-white font-semibold">Gráfica del Portafolio</h3>
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
              Promedio
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
              Selecciona acciones para ver la gráfica
            </div>
          )}
        </div>
      )}

      {/* Portfolio Total Value Chart */}
      {portfolio.transactions.length > 0 && (() => {
        let cash = 0;
        let costBasis = {};
        const allPoints = [];

        portfolio.transactions.forEach((t) => {
          if (t.type === 'deposit') cash += t.amount;
          else if (t.type === 'withdraw') cash -= t.amount;
          else if (t.type === 'buy') {
            cash -= t.total;
            costBasis[t.symbol] = (costBasis[t.symbol] ?? 0) + t.total;
          } else if (t.type === 'sell') {
            cash += t.total;
            const prev = costBasis[t.symbol] ?? 0;
            const sharesLeft = (portfolio.holdings[t.symbol]?.shares ?? 0);
            const totalShares = sharesLeft + t.shares;
            costBasis[t.symbol] = Math.max(0, prev * (sharesLeft / Math.max(totalShares, 0.0001)));
          } else if (t.type === 'dividend') {
            cash += t.total;
          }
          const investedValue = Object.values(costBasis).reduce((s, v) => s + v, 0);
          const total = includeCash ? cash + investedValue : investedValue;
          // Use isoDate if available (new transactions), otherwise try to parse the locale string
          const ts = t.isoDate
            ? new Date(t.isoDate).getTime()
            : (() => {
                // Try direct parse first
                const d = new Date(t.date);
                if (!isNaN(d.getTime())) return d.getTime();
                // Fallback: parse "D/M/YYYY, HH:MM:SS" (es-MX locale format)
                const m = t.date.match(/(\d+)\/(\d+)\/(\d{4})/);
                if (m) return new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`).getTime();
                return Date.now();
              })();
          allPoints.push({ date: t.date, valor: parseFloat(Math.max(0, total).toFixed(2)), ts });
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
                <h3 className="text-white font-semibold">Valor Total del Portafolio</h3>
                <div className="bg-green-900/50 border border-green-500/40 rounded-lg px-3 py-1.5 text-center">
                  <p className="text-green-400 text-xs">Valor Actual</p>
                  <p className="text-white font-bold text-sm">{fmt(includeCash ? totalValue : holdingsValue)}</p>
                </div>
                <button
                  onClick={() => setIncludeCash(!includeCash)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${includeCash ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                >
                  {includeCash ? 'Con efectivo' : 'Sin efectivo'}
                </button>
              </div>
              <div className="flex gap-1 flex-wrap items-center">
                <button
                  onClick={() => { fetchPrices(); fetchHistoricalPrices(compareRange); }}
                  disabled={loadingPrices || loadingHistorical}
                  className="px-2 py-1 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50 flex items-center gap-1"
                  title="Actualizar precios"
                >
                  <RefreshCw size={11} className={(loadingPrices || loadingHistorical) ? 'animate-spin' : ''} /> Actualizar
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

      {/* News section */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-white font-semibold mb-3">📰 Noticias</h3>
        <div className="flex gap-2 mb-4">
          <input
            className="bg-slate-700 text-white rounded px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500 w-28 uppercase"
            placeholder="Símbolo"
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
            Buscar
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
            <RefreshCw size={14} className="animate-spin" /> Cargando noticias...
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
                {filteredNewsItems.length} de {newsItems.length} noticias
              </span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {filteredNewsItems.length === 0 ? (
                <p className="text-slate-500 text-sm">No hay noticias en este período.</p>
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
          <p className="text-slate-600 text-sm">Ingresa un símbolo para ver noticias.</p>
        )}
      </div>

      {/* Transaction history */}
      {portfolio.transactions.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">Historial de Transacciones</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {[...portfolio.transactions].reverse().map((t, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-700/50">
                <span className="text-slate-400">{t.date}</span>
                <span className={`font-semibold px-2 py-0.5 rounded ${
                  t.type === 'buy' ? 'bg-blue-900/50 text-blue-300' :
                  t.type === 'sell' ? 'bg-orange-900/50 text-orange-300' :
                  t.type === 'dividend' ? 'bg-purple-900/50 text-purple-300' :
                  t.type === 'deposit' ? 'bg-green-900/50 text-green-300' :
                  'bg-red-900/50 text-red-300'
                }`}>
                  {t.type === 'buy' ? `Compra ${t.symbol}` :
                   t.type === 'sell' ? `Venta ${t.symbol}` :
                   t.type === 'dividend' ? `Dividendo ${t.symbol}` :
                   t.type === 'deposit' ? 'Depósito' : 'Retiro'}
                </span>
                <span className="text-white font-medium">
                  {t.type === 'buy' || t.type === 'sell' ? `${t.shares} acc. @ ${fmt(t.price)}` :
                   t.type === 'dividend' ? `${t.shares} acc. × ${fmt(t.amount)}` : ''}
                </span>
                <span className={`font-bold ${t.type === 'sell' || t.type === 'deposit' || t.type === 'dividend' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'sell' || t.type === 'deposit' || t.type === 'dividend' ? '+' : '-'}{fmt(t.total ?? t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
