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

export default function Portfolio() {
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
          {['holdings', 'transactions', 'dividends'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${tab === t ? 'text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'}`}
            >
              {t === 'holdings' ? '📊 Posiciones' : t === 'transactions' ? '📋 Historial' : '💵 Dividendos'}
            </button>
          ))}
          <div className="flex-1" />
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
