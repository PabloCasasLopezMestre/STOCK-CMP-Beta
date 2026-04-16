import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import StockComparisonApp from './StockComparisonApp';
import PortfolioSimulator from './PortfolioSimulator';
import Community from './Community';
import About from './About';
import Settings, { ALL_CURRENCIES } from './Settings';
import { t } from './i18n';
import * as syncService from './syncService';
import TickerBar from './TickerBar';
import { getSupabase } from './supabaseClient';

const WORKER_BASE = 'https://proxy.stockcmp-proxy.workers.dev';

// Mapa completo de símbolos para el botón de moneda
const CURRENCY_SYMBOLS = {
  USD: '$', MXN: '$', CAD: 'C$', AUD: 'A$', HKD: 'HK$', SGD: 'S$',
  BRL: 'R$', CLP: '$', COP: '$', EUR: '€', GBP: '£', JPY: '¥',
  CNY: '¥', CHF: 'Fr', INR: '₹', RUB: '₽', KRW: '₩', ZAR: 'R',
  TRY: '₺', SEK: 'kr', NOK: 'kr', DKK: 'kr', THB: '฿', MYR: 'RM',
  AED: 'د.إ',
};

export const CURRENCIES = ALL_CURRENCIES;

function App() {
  const [tab, setTab] = useState('compare');
  const [communityPrefill, setCommunityPrefill] = useState(null);
  const consumeCommunityPrefill = useCallback(() => setCommunityPrefill(null), []);
  const openCommunityIdea = useCallback((tickers) => {
    setCommunityPrefill({
      openModal: true,
      tickers: Array.isArray(tickers) ? tickers : [tickers],
    });
    setTab('community');
  }, []);
  const [currency, setCurrency] = useState('USD');
  const [rates, setRates] = useState({
    MXN: 20.5, EUR: 0.92, GBP: 0.79, JPY: 149.5, CHF: 0.90,
    CNY: 7.24, CAD: 1.36, AUD: 1.53, HKD: 7.82, SGD: 1.34,
    BRL: 4.97, INR: 83.1, RUB: 90.0, KRW: 1325, ZAR: 18.6,
    TRY: 32.1, SEK: 10.4, NOK: 10.6, DKK: 6.89, THB: 35.1,
    MYR: 4.72, CLP: 950, COP: 3950, AED: 3.67,
  });
  const [alerts, setAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('priceAlerts') || '[]'); } catch { return []; }
  });
  const [enabledCurrencies, setEnabledCurrencies] = useState(() => {
    try {
      const saved = localStorage.getItem('enabledCurrencies');
      return saved ? JSON.parse(saved) : ['USD', 'MXN', 'EUR'];
    } catch { return ['USD', 'MXN', 'EUR']; }
  });
  const [userTimezone, setUserTimezone] = useState(() => {
    try {
      return localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
    } catch { return 'America/New_York'; }
  });
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('lang') || 'es'; } catch { return 'es'; }
  });

  // Portfolio state lifted from PortfolioSimulator so syncService can seed it
  const [initialPortfolio, setInitialPortfolio] = useState(null);

  // Task 6.1 — initSync on mount, apply data to React state
  useEffect(() => {
    syncService.initSync().then((data) => {
      if (!data) return;
      if (data.portfolio) setInitialPortfolio(data.portfolio);
      if (data.alerts) setAlerts(data.alerts);
      if (data.preferences) {
        const { currency: c, lang: l, timezone, enabledCurrencies: ec } = data.preferences;
        if (c) setCurrency(c);
        if (l) {
          setLang(l);
          document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
        }
        if (timezone) setUserTimezone(timezone);
        if (ec && Array.isArray(ec)) setEnabledCurrencies(ec);
      }
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Task 6.2 — wrapped setters that also call syncXxx

  // Preferences ref keeps latest values for building the full preferences object
  const prefsRef = useRef({ currency: 'USD', lang: 'es', timezone: userTimezone, enabledCurrencies });

  const syncPrefs = useCallback((patch) => {
    const next = { ...prefsRef.current, ...patch };
    prefsRef.current = next;
    syncService.syncPreferences(next).catch(() => {});
  }, []);

  const setCurrencySync = useCallback((c) => {
    setCurrency(c);
    syncPrefs({ currency: c });
  }, [syncPrefs]);

  const setEnabledCurrenciesSync = useCallback((ec) => {
    setEnabledCurrencies(ec);
    syncPrefs({ enabledCurrencies: ec });
  }, [syncPrefs]);

  const setUserTimezoneSync = useCallback((tz) => {
    setUserTimezone(tz);
    syncPrefs({ timezone: tz });
  }, [syncPrefs]);

  const setAlertsSync = useCallback((next) => {
    setAlerts(next);
    const resolved = typeof next === 'function' ? next([]) : next;
    syncService.syncAlerts(resolved).catch(() => {});
  }, []);

  const onPortfolioChange = useCallback((next) => {
    syncService.syncPortfolio(next).catch(() => {});
  }, []);

  const setLangPersist = (l) => {
    setLang(l);
    try { localStorage.setItem('lang', l); } catch {}
    // Set dir on document for RTL support
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    syncPrefs({ lang: l });
  };

  // Keep prefsRef in sync with state changes from initSync
  useEffect(() => { prefsRef.current = { ...prefsRef.current, currency }; }, [currency]);
  useEffect(() => { prefsRef.current = { ...prefsRef.current, lang }; }, [lang]);
  useEffect(() => { prefsRef.current = { ...prefsRef.current, timezone: userTimezone }; }, [userTimezone]);
  useEffect(() => { prefsRef.current = { ...prefsRef.current, enabledCurrencies }; }, [enabledCurrencies]);

  useEffect(() => {
    fetch(`${WORKER_BASE}/api/exchange-rate`)
      .then((r) => r.json())
      .then((data) => {
        if (data.rates) {
          const next = { ...rates };
          enabledCurrencies.forEach((code) => {
            if (data.rates[code]) next[code] = data.rates[code];
          });
          setRates(next);
        }
      })
      .catch(() => {});
  }, [enabledCurrencies]);

  const currencyIdx = enabledCurrencies.indexOf(currency);
  const nextCurrency = () => {
    const next = enabledCurrencies[(currencyIdx + 1) % enabledCurrencies.length];
    setCurrencySync(next);
  };
  const currencyEntry = ALL_CURRENCIES.find((c) => c.code === currency);
  const symbol = CURRENCY_SYMBOLS[currency] ?? currencyEntry?.symbol ?? '$';
  const currencyLabel = `${symbol} ${currency}`;

  const sharedProps = { currency, setCurrency: setCurrencySync, nextCurrency, currencyLabel, rates, alerts, setAlerts: setAlertsSync, lang };

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);
  const [tickerSymbols, setTickerSymbols] = useState([]);
  const [maxStocks, setMaxStocks] = useState(() => {
    try { return parseInt(localStorage.getItem('maxStocks') || '8', 10); } catch { return 8; }
  });
  const setMaxStocksPersist = (v) => {
    setMaxStocks(v);
    try { localStorage.setItem('maxStocks', String(v)); } catch {}
  };

  const DEFAULT_FEATURES = {
    fundamentals: true, technicalIndicators: true, patternRecognition: true,
    backtesting: true, comparativeAnalysis: true, comparatorNews: true,
    bankAccounts: true, portfolioNews: true, transactionHistory: true, positions: true,
    portfolioChart: true,
  };
  const [enabledFeatures, setEnabledFeatures] = useState(() => {
    try {
      const saved = localStorage.getItem('enabledFeatures');
      return saved ? { ...DEFAULT_FEATURES, ...JSON.parse(saved) } : DEFAULT_FEATURES;
    } catch { return DEFAULT_FEATURES; }
  });
  const setEnabledFeaturesPersist = (next) => {
    setEnabledFeatures(next);
    try { localStorage.setItem('enabledFeatures', JSON.stringify(next)); } catch {}
  };

  // Welcome popup + visitor counter
  const [showWelcome, setShowWelcome] = useState(false);
  const [visitorStats, setVisitorStats] = useState({ total: null, today: null });

  useEffect(() => {
    // Only show once per browser session
    if (sessionStorage.getItem('welcomeShown')) return;
    sessionStorage.setItem('welcomeShown', '1');

    const supabase = getSupabase();
    if (!supabase) { setShowWelcome(true); return; }

    const today = new Date().toISOString().slice(0, 10);

    // Increment total
    supabase.rpc
      ? supabase
          .from('visitor_stats')
          .upsert({ id: 'global', total_visits: 1, updated_at: new Date().toISOString() }, { onConflict: 'id', ignoreDuplicates: false })
          .then(() => {})
          .catch(() => {})
      : null;

    // Upsert total via raw update (increment)
    supabase
      .from('visitor_stats')
      .select('total_visits')
      .eq('id', 'global')
      .single()
      .then(({ data }) => {
        const newTotal = (data?.total_visits ?? 0) + 1;
        supabase.from('visitor_stats').upsert({ id: 'global', total_visits: newTotal, updated_at: new Date().toISOString() }).then(() => {});
        return newTotal;
      })
      .then((total) => {
        // Upsert today's count
        supabase
          .from('visitor_daily')
          .select('visits')
          .eq('day', today)
          .single()
          .then(({ data: dayData }) => {
            const newDay = (dayData?.visits ?? 0) + 1;
            supabase.from('visitor_daily').upsert({ day: today, visits: newDay }).then(() => {});
            setVisitorStats({ total, today: newDay });
            setShowWelcome(true);
          })
          .catch(() => { setVisitorStats({ total, today: null }); setShowWelcome(true); });
      })
      .catch(() => { setShowWelcome(true); });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="sticky top-0 z-50">
      <div className="bg-slate-900/90 backdrop-blur border-b border-slate-700 px-3 py-2">
        {/* Row 1: main tabs */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setTab('compare')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'compare' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {t('nav_compare', lang)}
            </button>
            <button
              onClick={() => setTab('portfolio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'portfolio' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {t('nav_portfolio', lang)}
            </button>
            <button
              onClick={() => setTab('community')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'community' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {t('nav_community', lang)}
            </button>
            <a
              href="https://buymeacoffee.com/pablocasas"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-900 transition-colors"
            >
              {lang === 'es' ? 'Contribuir' : 'Contribute'}
            </a>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setTab('settings')}
              className={`p-1.5 rounded-lg transition-colors ${tab === 'settings' ? 'bg-slate-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
              title={t('nav_settings', lang)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button
              onClick={() => setTab('about')}
              className={`p-1.5 rounded-lg text-sm font-bold transition-colors ${tab === 'about' ? 'bg-slate-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
              title={t('nav_about', lang)}
            >
              ?
            </button>
          </div>
        </div>

        {/* Row 2: currency + update + alerts (only on compare/portfolio) */}
        {(tab === 'compare' || tab === 'portfolio') && (
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={nextCurrency}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-semibold"
            >
              {currencyLabel}
            </button>
            <button
              onClick={() => setRefreshTrigger(r => r + 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
              {lang === 'es' ? 'Actualizar' : 'Update'}
            </button>
            {tab === 'portfolio' && (
              <button
                onClick={() => setShowAlertsPanel(p => !p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${showAlertsPanel ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {lang === 'es' ? 'Alertas' : 'Alerts'}
              </button>
            )}
          </div>
        )}
      </div>
      <TickerBar selectedStocks={tickerSymbols} currency={currency} rates={rates} />
      </div>

      {tab === 'compare' && (
        <StockComparisonApp {...sharedProps} userTimezone={userTimezone} onOpenCommunityIdea={openCommunityIdea} refreshTrigger={refreshTrigger} onSelectedStocksChange={setTickerSymbols} maxStocks={maxStocks} enabledFeatures={enabledFeatures} />
      )}
      {tab === 'portfolio' && (
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-4 border border-slate-700">
            <h1 className="text-3xl font-bold text-white mb-1">{t('label_portfolio_title', lang)}</h1>
            <p className="text-slate-400 text-sm">{lang === 'es' ? 'Deposita dinero, compra y vende acciones, recibe dividendos' : 'Deposit money, buy and sell stocks, receive dividends'}</p>
          </div>
          <PortfolioSimulator {...sharedProps} onOpenCommunityIdea={openCommunityIdea} initialPortfolio={initialPortfolio} onPortfolioChange={onPortfolioChange} refreshTrigger={refreshTrigger} showAlertsPanel={showAlertsPanel} setShowAlertsPanel={setShowAlertsPanel} comparatorStocks={tickerSymbols} enabledFeatures={enabledFeatures} />
        </div>
      )}
      {tab === 'community' && (
        <Community lang={lang} prefill={communityPrefill} onPrefillConsumed={consumeCommunityPrefill} />
      )}
      {tab === 'about' && <About lang={lang} />}
      {tab === 'settings' && (
        <Settings
          enabledCurrencies={enabledCurrencies}
          setEnabledCurrencies={setEnabledCurrenciesSync}
          currency={currency}
          setCurrency={setCurrencySync}
          userTimezone={userTimezone}
          setUserTimezone={setUserTimezoneSync}
          lang={lang}
          setLang={setLangPersist}
          maxStocks={maxStocks}
          setMaxStocks={setMaxStocksPersist}
          enabledFeatures={enabledFeatures}
          setEnabledFeatures={setEnabledFeaturesPersist}
        />
      )}

      {/* Welcome / share popup */}
      {showWelcome && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-600 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-3">
              <p className="text-white font-bold text-lg">STCK-CMP Beta</p>
            </div>
            <div className="px-6 py-4">
              {/* Language selector */}
              <div className="mb-4">
                <p className="text-slate-400 text-xs text-center mb-2">Select your language · Selecciona tu idioma</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setLangPersist('en'); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${lang === 'en' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => { setLangPersist('es'); }}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${lang === 'es' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'}`}
                  >
                    Español
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm leading-relaxed mb-4">
                <div className="border-l-2 border-amber-500 pl-3 space-y-2">
                  <p className="text-amber-300 font-semibold text-xs uppercase tracking-wide">A note on our current data</p>
                  <p className="text-slate-300 text-xs">STCK-CMP is an independent platform in early stages of development. Stock prices are delayed by 15 minutes and certain features may have limited functionality.</p>
                  <p className="text-slate-300 text-xs">If you find value in what STCK-CMP offers, consider supporting us — your contribution enables better data and infrastructure.</p>
                </div>
                <div className="border-l-2 border-amber-500 pl-3 space-y-2">
                  <p className="text-amber-300 font-semibold text-xs uppercase tracking-wide">Una nota sobre nuestros datos</p>
                  <p className="text-slate-300 text-xs">STCK-CMP es una plataforma independiente en etapa temprana. Los precios presentan un retraso de 15 minutos y algunas funciones pueden tener disponibilidad limitada.</p>
                  <p className="text-slate-300 text-xs">Si encuentras valor en lo que STCK-CMP ofrece, considera apoyarnos — tu contribución nos permite mejorar.</p>
                </div>
              </div>
              <a
                href="https://buymeacoffee.com/pablocasas"
                target="_blank"
                rel="noreferrer"
                className="block w-full text-center bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2 rounded-xl text-sm mb-3"
              >
                Support the project · Apoyar el proyecto
              </a>
              <button
                onClick={() => setShowWelcome(false)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-xl text-sm font-semibold"
              >
                Got it · Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
