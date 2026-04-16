import React, { useEffect, useState, useRef } from 'react';

const WORKER_BASE = 'https://proxy.stockcmp-proxy.workers.dev';

const DEFAULT_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'GLD', 'BTC-USD'];

export default function TickerBar({ selectedStocks = [], currency = 'USD', rates = {}, autoScroll = true }) {
  const symbols = selectedStocks.length > 0 ? selectedStocks : DEFAULT_SYMBOLS;
  const [tickers, setTickers] = useState([]);
  const intervalRef = useRef(null);
  const scrollRef = useRef(null);
  const animRef = useRef(null);
  const posRef = useRef(0);

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

  // Auto-scroll animation
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;

    const el = scrollRef.current;
    const speed = 0.5; // px per frame

    const animate = () => {
      if (!el) return;
      posRef.current += speed;
      // Reset when first copy scrolled fully out
      if (posRef.current >= el.scrollWidth / 2) {
        posRef.current = 0;
      }
      el.scrollLeft = posRef.current;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [autoScroll, tickers]);

  const fmt = (v) => {
    if (v == null) return '—';
    const rate = currency === 'USD' ? 1 : (rates?.[currency] ?? 1);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v * rate);
  };

  if (tickers.length === 0) return null;

  // Duplicate tickers for seamless loop
  const items = autoScroll ? [...tickers, ...tickers] : tickers;

  return (
    <div className="bg-slate-900/95 border-b border-slate-700/50 overflow-hidden">
      <div
        ref={scrollRef}
        className="flex items-center gap-0 overflow-x-auto scrollbar-none"
        style={{ scrollBehavior: 'auto' }}
        onMouseEnter={() => { if (animRef.current) cancelAnimationFrame(animRef.current); }}
        onMouseLeave={() => {
          if (!autoScroll) return;
          const el = scrollRef.current;
          const speed = 0.5;
          const animate = () => {
            if (!el) return;
            posRef.current += speed;
            if (posRef.current >= el.scrollWidth / 2) posRef.current = 0;
            el.scrollLeft = posRef.current;
            animRef.current = requestAnimationFrame(animate);
          };
          animRef.current = requestAnimationFrame(animate);
        }}
      >
        {items.map(({ sym, current, change, changePct }, idx) => {
          const isUp = change >= 0;
          return (
            <div
              key={`${sym}-${idx}`}
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
