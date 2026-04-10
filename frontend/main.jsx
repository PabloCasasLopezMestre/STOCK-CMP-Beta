import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import StockComparisonApp from './StockComparisonApp';
import PortfolioSimulator from './PortfolioSimulator';
import About from './About';
import Settings from './Settings';
import { t } from './i18n';

const WORKER_BASE = 'https://proxy.stockcmp-proxy.workers.dev';

export const CURRENCIES = [
  { code: 'USD', symbol: '$',  label: '$ USD' },
  { code: 'MXN', symbol: '$',  label: '$ MXN' },
  { code: 'EUR', symbol: '€',  label: '€ EUR' },
  { code: 'GBP', symbol: '£',  label: '£ GBP' },
  { code: 'JPY', symbol: '¥',  label: '¥ JPY' },
  { code: 'CHF', symbol: 'Fr', label: 'Fr CHF' },
];

function App() {
  const [tab, setTab] = useState('compare');
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

  const setLangPersist = (l) => {
    setLang(l);
    try { localStorage.setItem('lang', l); } catch {}
    // Set dir on document for RTL support
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  };

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
    setCurrency(next);
  };
  const currencyLabel = CURRENCIES.find((c) => c.code === currency)?.label ?? '$ USD';

  const sharedProps = { currency, setCurrency, nextCurrency, currencyLabel, rates, alerts, setAlerts, lang };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-700 px-4 py-2 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('compare')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'compare' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            {t('nav_compare', lang)}
          </button>
          <button
            onClick={() => setTab('portfolio')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'portfolio' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            {t('nav_portfolio', lang)}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'settings' ? 'bg-slate-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
          >
            {t('nav_settings', lang)}
          </button>
          <button
            onClick={() => setTab('about')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'about' ? 'bg-slate-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
          >
            {t('nav_about', lang)}
          </button>
        </div>
      </div>

      {tab === 'compare' && <StockComparisonApp {...sharedProps} userTimezone={userTimezone} />}
      {tab === 'portfolio' && (
        <div className="max-w-7xl mx-auto p-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-4 border border-slate-700">
            <h1 className="text-3xl font-bold text-white mb-1">{t('label_portfolio_title', lang)}</h1>
            <p className="text-slate-400 text-sm">Deposita dinero, compra y vende acciones, recibe dividendos</p>
          </div>
          <PortfolioSimulator {...sharedProps} />
        </div>
      )}
      {tab === 'about' && <About />}
      {tab === 'settings' && (
        <Settings
          enabledCurrencies={enabledCurrencies}
          setEnabledCurrencies={setEnabledCurrencies}
          currency={currency}
          setCurrency={setCurrency}
          userTimezone={userTimezone}
          setUserTimezone={setUserTimezone}
          lang={lang}
          setLang={setLangPersist}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
