import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Plus, Minus, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';

const WORKER_BASE = '';

function loadPortfolio() {
  try { return JSON.parse(localStorage.getItem('portfolio') || 'null'); } catch { return null; }
}

function savePortfolio(p) {
  try { localStorage.setItem('portfolio', JSON.stringify(p)); } catch {}
}

const DEFAULT_PORTFOLIO = {
  cash: 0,
  holdings: {},   // { AAPL: { shares, avgCost } }
  transactions: [], // { date, type, symbol, shares, price, total }
  dividendsReceived: [],
};

export default function Portfolio({ enabledFeatures = {} }) {
  const [portfolio, setPortfolio] = useState(() => loadPortfolio() || DEFAULT_PORTFOLIO);
  const [prices, setPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [depositInput, setDepositInput] = useState('');
  const [tradeSymbol, setTradeSymbol] = useState('');
  const [tradeShares, setTradeShares] = useState('');
  const [tradeType, setTradeType] = useState('buy');
  const [tradeError, setTradeError] = useState('');
  const [tab, setTab] = useState('holdings');
  const [dividendYields, setDividendYields] = useState({});
  const [performanceRange, setPerformanceRange] = useState('1month');
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  const symbols = Object.keys(portfolio.holdings);

  // Persist on change
  useEffect(() => { savePortfolio(portfolio); }, [portfolio]);

  // Fetch current prices for all holdings
  const fetchPrices = async () => {
    if (!symbols.length) return;
    setLoadingPrices(true);
    const results = {};
    await Promise.all(symbols.map(async (sym) => {
      try {
        const res = await fetch(`${WORKER_BASE}/api/stock/${sym}?interval=1d&range=5d`);
        const data = await res.json();
        const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
        const last = closes.filter(Boolean).pop();
        if (last) results[sym] = last;
      } catch {}
    }));
    setPrices(results);
    setLoadingPrices(false);
  };

  // Fetch dividend yields from FMP
  const fetchDividends = async () => {
    if (!symbols.length) return;
    await Promise.all(symbols.map(async (sym) => {
      try {
        const res = await fetch(`${WORKER_BASE}/api/fmp/${sym}`);
        const data = await res.json();
        const dy = data?.ratios?.dividendYieldTTM ?? null;
        if (dy != null) setDividendYields((prev) => ({ ...prev, [sym]: dy }));
      } catch {}
    }));
  };

  useEffect(() => { fetchPrices(); fetchDividends(); }, [symbols.join(',')]);

  // Fetch portfolio performance data
  const fetchPerformanceData = async () => {
    if (!symbols.length) return;
    setLoadingPerformance(true);
    try {
      const rangeMap = {
        '3days': { interval: '1h', range: '5d' },
        '1week': { interval: '1h', range: '5d' },
        '2weeks': { interval: '1d', range: '10d' },
        '1month': { interval: '1d', range: '1mo' },
        '6weeks': { interval: '1d', range: '42d' },
        '2months': { interval: '1d', range: '2mo' },
        '3months': { interval: '1d', range: '3mo' },
        '4months': { interval: '1d', range: '4mo' },
        '6months': { interval: '1d', range: '6mo' },
        '9months': { interval: '1d', range: '9mo' },
        '1year': { interval: '1wk', range: '1y' },
        '18months': { interval: '1wk', range: '18mo' },
        '2years': { interval: '1wk', range: '2y' },
        '30months': { interval: '1mo', range: '30mo' },
        '3years': { interval: '1mo', range: '3y' },
        '4years': { interval: '1mo', range: '4y' },
        '5years': { interval: '1mo', range: '5y' },
        '7years': { interval: '1mo', range: '7y' },
        '10years': { interval: '3mo', range: '10y' },
        '12years': { interval: '3mo', range: '12y' },
        '15years': { interval: '3mo', range: '15y' },
        '20years': { interval: '3mo', range: '20y' },
        '25years': { interval: '3mo', range: '25y' },
      };
      const config = rangeMap[performanceRange] || rangeMap['1month'];
      
      const results = await Promise.all(
        symbols.map(async (sym) => {
          try {
            const res = await fetch(`${WORKER_BASE}/api/stock/${sym}?interval=${config.interval}&range=${config.range}`);
            const data = await res.json();
            const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
            const timestamps = data?.chart?.result?.[0]?.timestamp ?? [];
            
            if (closes.length < 2) return null;
            
            const startPrice = closes[0];
            const endPrice = closes[closes.length - 1];
            const change = ((endPrice - startPrice) / startPrice) * 100;
            const shares = portfolio.holdings[sym]?.shares || 0;
            const startValue = startPrice * shares;
            const endValue = endPrice * shares;
            const gain = endValue - startValue;
            
            return {
              symbol: sym,
              startPrice,
              endPrice,
              change,
              shares,
              startValue,
              endValue,
              gain
            };
          } catch {
            return null;
          }
        })
      );
      
      const validResults = results.filter(r => r !== null);
      const totalStartValue = validResults.reduce((sum, r) => sum + r.startValue, 0);
      const totalEndValue = validResults.reduce((sum, r) => sum + r.endValue, 0);
      const totalGain = totalEndValue - totalStartValue;
      const totalChange = totalStartValue > 0 ? (totalGain / totalStartValue) * 100 : 0;
      
      setPerformanceData({
        range: performanceRange,
        totalStartValue,
        totalEndValue,
        totalGain,
        totalChange,
        individual: validResults
      });
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoadingPerformance(false);
    }
  };

  useEffect(() => { fetchPerformanceData(); }, [performanceRange, symbols.join(',')]);

  // Apply quarterly dividends
  const collectDividends = () => {
    let totalDividend = 0;
    const received = [];
    symbols.forEach((sym) => {
      const dy = dividendYields[sym];
      const price = prices[sym];
      const shares = portfolio.holdings[sym]?.shares ?? 0;
      if (!dy || !price || !shares) return;
      const quarterly = (dy * price * shares) / 4;
      totalDividend += quarterly;
      received.push({ sym, amount: quarterly, shares, dy });
    });
    if (totalDividend <= 0) return;
    const entry = {
      date: new Date().toLocaleString('es-MX'),
      items: received,
      total: totalDividend,
    };
    setPortfolio((prev) => ({
      ...prev,
      cash: prev.cash + totalDividend,
      dividendsReceived: [entry, ...prev.dividendsReceived],
    }));
  };

  const deposit = () => {
    const amount = parseFloat(depositInput);
    if (isNaN(amount) || amount <= 0) return;
    setPortfolio((prev) => ({
      ...prev,
      cash: prev.cash + amount,
      transactions: [{ date: new Date().toLocaleString('es-MX'), type: 'deposit', symbol: '-', shares: 0, price: 0, total: amount }, ...prev.transactions],
    }));
    setDepositInput('');
  };

  const executeTrade = () => {
    setTradeError('');
    const sym = tradeSymbol.trim().toUpperCase();
    const shares = parseFloat(tradeShares);
    const price = prices[sym];

    if (!sym) return setTradeError('Ingresa un símbolo.');
    if (isNaN(shares) || shares <= 0) return setTradeError('Ingresa un número de acciones válido.');
    if (!price) return setTradeError(`No hay precio disponible para ${sym}. Asegúrate de que esté en tu portafolio o recarga precios.`);

    const total = shares * price;

    if (tradeType === 'buy') {
      if (total > portfolio.cash) return setTradeError(`Saldo insuficiente. Necesitas $${total.toFixed(2)}, tienes $${portfolio.cash.toFixed(2)}.`);
      const existing = portfolio.holdings[sym] ?? { shares: 0, avgCost: 0 };
      const newShares = existing.shares + shares;
      const newAvg = ((existing.shares * existing.avgCost) + total) / newShares;
      setPortfolio((prev) => ({
        ...prev,
        cash: prev.cash - total,
        holdings: { ...prev.holdings, [sym]: { shares: newShares, avgCost: newAvg } },
        transactions: [{ date: new Date().toLocaleString('es-MX'), type: 'buy', symbol: sym, shares, price, total }, ...prev.transactions],
      }));
    } else {
      const existing = portfolio.holdings[sym];
      if (!existing || existing.shares < shares) return setTradeError(`No tienes suficientes acciones de ${sym}.`);
      const newShares = existing.shares - shares;
      const newHoldings = { ...portfolio.holdings };
      if (newShares === 0) delete newHoldings[sym];
      else newHoldings[sym] = { ...existing, shares: newShares };
      setPortfolio((prev) => ({
        ...prev,
        cash: prev.cash + total,
        holdings: newHoldings,
        transactions: [{ date: new Date().toLocaleString('es-MX'), type: 'sell', symbol: sym, shares, price, total }, ...prev.transactions],
      }));
    }
    setTradeSymbol('');
    setTradeShares('');
  };

  const totalValue = symbols.reduce((sum, sym) => {
    const p = prices[sym] ?? portfolio.holdings[sym]?.avgCost ?? 0;
    return sum + p * (portfolio.holdings[sym]?.shares ?? 0);
  }, 0);

  const totalCost = symbols.reduce((sum, sym) => {
    const h = portfolio.holdings[sym];
    return sum + (h?.avgCost ?? 0) * (h?.shares ?? 0);
  }, 0);

  const totalPnL = totalValue - totalCost;
  const totalPnLPct = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/70 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-xs mb-1">Saldo disponible</p>
          <p className="text-2xl font-bold text-white">{fmt(portfolio.cash)}</p>
        </div>
        <div className="bg-slate-800/70 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-xs mb-1">Valor del portafolio</p>
          <p className="text-2xl font-bold text-white">{fmt(totalValue)}</p>
        </div>
        <div className="bg-slate-800/70 rounded-xl p-4 border border-slate-700">
          <p className="text-slate-400 text-xs mb-1">Total (cash + portafolio)</p>
          <p className="text-2xl font-bold text-white">{fmt(portfolio.cash + totalValue)}</p>
        </div>
        <div className={`rounded-xl p-4 border ${totalPnL >= 0 ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
          <p className="text-slate-400 text-xs mb-1">Ganancia / Pérdida</p>
          <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnL >= 0 ? '+' : ''}{fmt(totalPnL)}
          </p>
          <p className={`text-xs ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deposit */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">💰 Depositar fondos</h3>
          <div className="flex gap-2">
            <input
              className="bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none flex-1 focus:ring-1 focus:ring-green-500"
              placeholder="Cantidad en USD"
              type="number"
              value={depositInput}
              onChange={(e) => setDepositInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && deposit()}
            />
            <button onClick={deposit} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium">
              Depositar
            </button>
          </div>
        </div>

        {/* Trade */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">📈 Comprar / Vender</h3>
          <div className="flex gap-2 flex-wrap">
            <select
              className="bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none"
              value={tradeType}
              onChange={(e) => setTradeType(e.target.value)}
            >
              <option value="buy">Comprar</option>
              <option value="sell">Vender</option>
            </select>
            <input
              className="bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none w-24 uppercase focus:ring-1 focus:ring-blue-500"
              placeholder="Símbolo"
              value={tradeSymbol}
              onChange={(e) => setTradeSymbol(e.target.value.toUpperCase())}
              maxLength={10}
            />
            <input
              className="bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none w-24 focus:ring-1 focus:ring-blue-500"
              placeholder="Acciones"
              type="number"
              value={tradeShares}
              onChange={(e) => setTradeShares(e.target.value)}
            />
            <button onClick={executeTrade} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
              Ejecutar
            </button>
            <button onClick={fetchPrices} disabled={loadingPrices} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded text-sm">
              <RefreshCw size={14} className={loadingPrices ? 'animate-spin' : ''} />
            </button>
          </div>
          {tradeError && <p className="text-red-400 text-xs mt-2">{tradeError}</p>}
          {tradeSymbol && prices[tradeSymbol] && (
            <p className="text-slate-400 text-xs mt-1">
              Precio actual: <span className="text-white font-medium">{fmt(prices[tradeSymbol])}</span>
              {tradeShares && !isNaN(parseFloat(tradeShares)) && (
                <span> · Total: <span className="text-blue-300 font-medium">{fmt(parseFloat(tradeShares) * prices[tradeSymbol])}</span></span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700">
        <div className="flex border-b border-slate-700">
          {(enabledFeatures.portfolioPerformance !== false ? ['holdings', 'performance', 'portfolio-performance', 'transactions', 'dividends'] : ['holdings', 'performance', 'transactions', 'dividends']).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${tab === t ? 'text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'}`}
            >
              {t === 'holdings' ? '📊 Posiciones' : t === 'performance' ? '📈 Rendimiento' : t === 'portfolio-performance' ? '📈 Rendimiento Simple' : t === 'transactions' ? '📋 Historial' : '💵 Dividendos'}
            </button>
          ))}
          <div className="flex-1" />
          {(tab === 'performance' || tab === 'portfolio-performance') && (
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
            </select>
          )}
          {tab === 'dividends' && (
            <button onClick={collectDividends} className="m-2 bg-yellow-700 hover:bg-yellow-600 text-white px-3 py-1.5 rounded text-xs">
              Cobrar dividendos trimestrales
            </button>
          )}
        </div>

        <div className="p-4">
          {tab === 'holdings' && (
            symbols.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No tienes posiciones. Deposita fondos y compra tu primera acción.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 pr-4">Símbolo</th>
                    <th className="text-right py-2 px-3">Acciones</th>
                    <th className="text-right py-2 px-3">Costo prom.</th>
                    <th className="text-right py-2 px-3">Precio actual</th>
                    <th className="text-right py-2 px-3">Valor</th>
                    <th className="text-right py-2 px-3">G/P</th>
                    <th className="text-right py-2 pl-3">Div. Yield</th>
                  </tr>
                </thead>
                <tbody>
                  {symbols.map((sym) => {
                    const h = portfolio.holdings[sym];
                    const price = prices[sym] ?? h.avgCost;
                    const value = price * h.shares;
                    const cost = h.avgCost * h.shares;
                    const pnl = value - cost;
                    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                    const dy = dividendYields[sym];
                    return (
                      <tr key={sym} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-2 pr-4 font-bold text-white">{sym}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{h.shares.toFixed(4)}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{fmt(h.avgCost)}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{prices[sym] ? fmt(prices[sym]) : '—'}</td>
                        <td className="text-right py-2 px-3 text-white font-medium">{fmt(value)}</td>
                        <td className={`text-right py-2 px-3 font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pnl >= 0 ? '+' : ''}{fmt(pnl)} ({pnlPct.toFixed(1)}%)
                        </td>
                        <td className="text-right py-2 pl-3 text-slate-300">
                          {dy != null ? `${(dy * 100).toFixed(2)}%` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          )}

          {tab === 'performance' && (
            loadingPerformance ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="text-slate-400 text-sm mt-2">Cargando datos de rendimiento...</p>
              </div>
            ) : !performanceData ? (
              <p className="text-slate-500 text-sm text-center py-8">No hay datos de rendimiento disponibles.</p>
            ) : (
              <div className="space-y-4">
                {/* Resumen de rendimiento */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <p className="text-slate-400 text-xs mb-1">Valor inicial</p>
                    <p className="text-xl font-bold text-white">{fmt(performanceData.totalStartValue)}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                    <p className="text-slate-400 text-xs mb-1">Valor final</p>
                    <p className="text-xl font-bold text-white">{fmt(performanceData.totalEndValue)}</p>
                  </div>
                  <div className={`rounded-lg p-4 border ${performanceData.totalGain >= 0 ? 'bg-green-900/30 border-green-600' : 'bg-red-900/30 border-red-600'}`}>
                    <p className="text-slate-400 text-xs mb-1">Ganancia/Pérdida</p>
                    <p className={`text-xl font-bold ${performanceData.totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {performanceData.totalGain >= 0 ? '+' : ''}{fmt(performanceData.totalGain)}
                    </p>
                    <p className={`text-xs ${performanceData.totalChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {performanceData.totalChange >= 0 ? '+' : ''}{performanceData.totalChange.toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Tabla de rendimiento individual */}
                <h3 className="text-white font-semibold mb-3">Rendimiento por activo</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      <th className="text-left py-2 pr-4">Símbolo</th>
                      <th className="text-right py-2 px-3">Acciones</th>
                      <th className="text-right py-2 px-3">Precio inicial</th>
                      <th className="text-right py-2 px-3">Precio final</th>
                      <th className="text-right py-2 px-3">Ganancia/Pérdida</th>
                      <th className="text-right py-2 pl-3">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.individual.map((item) => (
                      <tr key={item.symbol} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-2 pr-4 font-bold text-white">{item.symbol}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{item.shares.toFixed(4)}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{fmt(item.startPrice)}</td>
                        <td className="text-right py-2 px-3 text-slate-200">{fmt(item.endPrice)}</td>
                        <td className={`text-right py-2 px-3 font-semibold ${item.gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.gain >= 0 ? '+' : ''}{fmt(item.gain)}
                        </td>
                        <td className={`text-right py-2 pl-3 font-semibold ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {tab === 'portfolio-performance' && (
            loadingPerformance ? (
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
          )}

          {tab === 'transactions' && (
            portfolio.transactions.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No hay transacciones aún.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 pr-4">Fecha</th>
                    <th className="text-left py-2 px-3">Tipo</th>
                    <th className="text-left py-2 px-3">Símbolo</th>
                    <th className="text-right py-2 px-3">Acciones</th>
                    <th className="text-right py-2 px-3">Precio</th>
                    <th className="text-right py-2 pl-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.transactions.map((t, i) => (
                    <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-2 pr-4 text-slate-400 text-xs">{t.date}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.type === 'buy' ? 'bg-green-900/50 text-green-400' : t.type === 'sell' ? 'bg-red-900/50 text-red-400' : 'bg-blue-900/50 text-blue-400'}`}>
                          {t.type === 'buy' ? 'Compra' : t.type === 'sell' ? 'Venta' : 'Depósito'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-white">{t.symbol}</td>
                      <td className="text-right py-2 px-3 text-slate-200">{t.shares > 0 ? t.shares.toFixed(4) : '—'}</td>
                      <td className="text-right py-2 px-3 text-slate-200">{t.price > 0 ? fmt(t.price) : '—'}</td>
                      <td className={`text-right py-2 pl-3 font-medium ${t.type === 'sell' || t.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                        {t.type === 'buy' ? '-' : '+'}{fmt(t.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {tab === 'dividends' && (
            portfolio.dividendsReceived.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm mb-2">No has cobrado dividendos aún.</p>
                <p className="text-slate-600 text-xs">Presiona "Cobrar dividendos trimestrales" para simular el cobro de dividendos de tus posiciones actuales.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {portfolio.dividendsReceived.map((d, i) => (
                  <div key={i} className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-yellow-400 font-semibold text-sm">💵 {fmt(d.total)}</span>
                      <span className="text-slate-500 text-xs">{d.date}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.items.map((item) => (
                        <span key={item.sym} className="text-xs text-slate-300 bg-slate-700 px-2 py-0.5 rounded">
                          {item.sym}: {fmt(item.amount)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
