import React, { useEffect, useState, useRef } from 'react';

const WORKER_BASE = 'https://proxy.stockcmp-proxy.workers.dev';

const DEFAULT_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'GLD', 'BTC-USD'];

export default function TickerBar({ selectedStocks = [], currency = 'USD', rates = {}, autoScroll = true }) {
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
    intervalRef.current = setInterval(fetchTickers, 60000);
    return () => clearInterval(intervalRef.current);
  }, [symbols.join(',')]);

  const fmt = (v) => {
    if (v == null) return '—';
    const rate = currency === 'USD' ? 1 : (rates?.[currency] ?? 1);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v * rate);
  };

  if (tickers.length === 0) return null;

  const itemWidth = 160; // px per item approx
  const totalWidth = tickers.length * itemWidth;
  const duration = Math.max(10, tickers.length * 3); // seconds

  const TickerItem = ({ sym, current, change, changePct, idx }) => {
    const isUp = change >= 0;
    return (
      <div
        key={`${sym}-${idx}`}
        className="flex items-center gap-2 px-4 py-1.5 border-r border-slate-700/50 shrink-0"
        style={{ minWidth: `${itemWidth}px` }}
      >
        <span className="text-white text-xs font-bold">{sym}</span>
        <span className="text-slate-200 text-xs">{fmt(current)}</span>
        <span className={`text-xs font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '+' : ''}{changePct.toFixed(2)}%
        </span>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/95 border-b border-slate-700/50 overflow-hidden">
      {autoScroll ? (
        <>
          <style>{`
            @keyframes ticker-scroll {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .ticker-track {
              display: flex;
              width: max-content;
              animation: ticker-scroll ${duration}s linear infinite;
            }
            .ticker-track:hover {
              animation-play-state: paused;
            }
          `}</style>
          <div className="ticker-track">
            {/* Duplicate for seamless loop */}
            {[...tickers, ...tickers].map(({ sym, current, change, changePct }, idx) => (
              <TickerItem key={`${sym}-${idx}`} sym={sym} current={current} change={change} changePct={changePct} idx={idx} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
          {tickers.map(({ sym, current, change, changePct }, idx) => (
            <TickerItem key={`${sym}-${idx}`} sym={sym} current={current} change={change} changePct={changePct} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
}
