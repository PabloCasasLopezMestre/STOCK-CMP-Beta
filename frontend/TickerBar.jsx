import React, { useEffect, useState, useRef } from 'react';

const WORKER_BASE = 'https://proxy.stockcmp-proxy.workers.dev';

const DEFAULT_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'GLD', 'BTC-USD'];

export default function TickerBar({ selectedStocks = [], currency = 'USD', rates = {} }) {
  const symbols = selectedStocks.length > 0 ? selectedStocks : DEFAULT_SYMBOLS;
  const [tickers, setTickers] = useState([]);
  const intervalRef = useRef(null);

  const fetchTickers = async () => {
    const results = await Promise.all(
      symbols.map(async (sym) => {
        try {
          const data = await fetch(`${WORKER_BASE}/api/stock/${encodeURIComponent(sym)}?interval=1d&range=5d`).then(r => r.json());
          const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
          const valid = closes.filter(Boolean);
          if (valid.length < 2) return null;
          const current = valid[valid.length - 1];
          const prev = valid[valid.length - 2];
          const change = current - prev;
          const changePct = (change / prev) * 100;
          return { sym, current, change, changePct };
        } catch {
          return null;
        }
      })
    );
    setTickers(results.filter(Boolean));
  };

  useEffect(() => {
    fetchTickers();
    intervalRef.current = setInterval(fetchTickers, 60000); // refresh every minute
    return () => clearInterval(intervalRef.current);
  }, [symbols.join(',')]);

  const fmt = (v) => {
    if (v == null) return '—';
    const rate = currency === 'USD' ? 1 : (rates?.[currency] ?? 1);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v * rate);
  };

  if (tickers.length === 0) return null;

  return (
    <div className="sticky top-[52px] z-40 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 overflow-hidden">
      <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
        {tickers.map(({ sym, current, change, changePct }) => {
          const isUp = change >= 0;
          return (
            <div
              key={sym}
              className="flex items-center gap-2 px-4 py-1.5 border-r border-slate-700/50 shrink-0 min-w-[140px]"
            >
              <span className="text-white text-xs font-bold">{sym}</span>
              <span className="text-slate-200 text-xs">{fmt(current)}</span>
              <span className={`text-xs font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                {isUp ? '+' : ''}{changePct.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
