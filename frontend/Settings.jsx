import React, { useState } from 'react';
import { LANGUAGES, t } from './i18n';
import CommunityProfileSettings from './CommunityProfileSettings';
import AuthEmailPanel from './AuthEmailPanel';

export const ALL_CURRENCIES = [
  { code: 'USD', label: 'Dólar estadounidense', symbol: '$',   flag: '🇺🇸' },
  { code: 'EUR', label: 'Euro',                  symbol: '€',   flag: '🇪🇺' },
  { code: 'JPY', label: 'Yen japonés',           symbol: '¥',   flag: '🇯🇵' },
  { code: 'GBP', label: 'Libra esterlina',       symbol: '£',   flag: '🇬🇧' },
  { code: 'CNY', label: 'Yuan chino',            symbol: '¥',   flag: '🇨🇳' },
  { code: 'CAD', label: 'Dólar canadiense',      symbol: 'C$',  flag: '🇨🇦' },
  { code: 'AUD', label: 'Dólar australiano',     symbol: 'A$',  flag: '🇦🇺' },
  { code: 'CHF', label: 'Franco suizo',          symbol: 'Fr',  flag: '🇨🇭' },
  { code: 'HKD', label: 'Dólar de Hong Kong',   symbol: 'HK$', flag: '🇭🇰' },
  { code: 'SGD', label: 'Dólar de Singapur',    symbol: 'S$',  flag: '🇸🇬' },
  { code: 'MXN', label: 'Peso mexicano',         symbol: '$',   flag: '🇲🇽' },
  { code: 'BRL', label: 'Real brasileño',        symbol: 'R$',  flag: '🇧🇷' },
  { code: 'INR', label: 'Rupia india',           symbol: '₹',   flag: '🇮🇳' },
  { code: 'RUB', label: 'Rublo ruso',            symbol: '₽',   flag: '🇷🇺' },
  { code: 'KRW', label: 'Won surcoreano',        symbol: '₩',   flag: '🇰🇷' },
  { code: 'ZAR', label: 'Rand sudafricano',      symbol: 'R',   flag: '🇿🇦' },
  { code: 'TRY', label: 'Lira turca',            symbol: '₺',   flag: '🇹🇷' },
  { code: 'SEK', label: 'Corona sueca',          symbol: 'kr',  flag: '🇸🇪' },
  { code: 'NOK', label: 'Corona noruega',        symbol: 'kr',  flag: '🇳🇴' },
  { code: 'DKK', label: 'Corona danesa',         symbol: 'kr',  flag: '🇩🇰' },
  { code: 'THB', label: 'Baht tailandés',        symbol: '฿',   flag: '🇹🇭' },
  { code: 'MYR', label: 'Ringgit malayo',        symbol: 'RM',  flag: '🇲🇾' },
  { code: 'CLP', label: 'Peso chileno',          symbol: '$',   flag: '🇨🇱' },
  { code: 'COP', label: 'Peso colombiano',       symbol: '$',   flag: '🇨🇴' },
  { code: 'AED', label: 'Dírham de EAU',         symbol: 'د.إ', flag: '🇦🇪' },
];

export const TIMEZONES = [
  { tz: 'America/New_York',    label: 'Nueva York (ET)',       flag: '🇺🇸' },
  { tz: 'America/Chicago',     label: 'Chicago (CT)',          flag: '🇺🇸' },
  { tz: 'America/Denver',      label: 'Denver (MT)',           flag: '🇺🇸' },
  { tz: 'America/Los_Angeles', label: 'Los Ángeles (PT)',      flag: '🇺🇸' },
  { tz: 'America/Mexico_City', label: 'Ciudad de México',      flag: '🇲🇽' },
  { tz: 'America/Bogota',      label: 'Bogotá',                flag: '🇨🇴' },
  { tz: 'America/Lima',        label: 'Lima',                  flag: '🇵🇪' },
  { tz: 'America/Santiago',    label: 'Santiago',              flag: '🇨🇱' },
  { tz: 'America/Sao_Paulo',   label: 'São Paulo',             flag: '🇧🇷' },
  { tz: 'America/Buenos_Aires',label: 'Buenos Aires',          flag: '🇦🇷' },
  { tz: 'Europe/London',       label: 'Londres (GMT/BST)',     flag: '🇬🇧' },
  { tz: 'Europe/Paris',        label: 'París / Madrid (CET)',  flag: '🇫🇷' },
  { tz: 'Europe/Berlin',       label: 'Berlín (CET)',          flag: '🇩🇪' },
  { tz: 'Europe/Moscow',       label: 'Moscú (MSK)',           flag: '🇷🇺' },
  { tz: 'Asia/Dubai',          label: 'Dubái (GST)',           flag: '🇦🇪' },
  { tz: 'Asia/Kolkata',        label: 'India (IST)',           flag: '🇮🇳' },
  { tz: 'Asia/Bangkok',        label: 'Bangkok (ICT)',         flag: '🇹🇭' },
  { tz: 'Asia/Singapore',      label: 'Singapur (SGT)',        flag: '🇸🇬' },
  { tz: 'Asia/Shanghai',       label: 'Shanghai (CST)',        flag: '🇨🇳' },
  { tz: 'Asia/Tokyo',          label: 'Tokyo (JST)',           flag: '🇯🇵' },
  { tz: 'Asia/Seoul',          label: 'Seúl (KST)',            flag: '🇰🇷' },
  { tz: 'Asia/Hong_Kong',      label: 'Hong Kong (HKT)',       flag: '🇭🇰' },
  { tz: 'Australia/Sydney',    label: 'Sídney (AEST)',         flag: '🇦🇺' },
  { tz: 'Pacific/Auckland',    label: 'Auckland (NZST)',       flag: '🇳🇿' },
];

export default function Settings({
  enabledCurrencies, setEnabledCurrencies, currency, setCurrency,
  userTimezone, setUserTimezone, lang, setLang, maxStocks = 8, setMaxStocks,
  defaultTimeRange = '1month', setDefaultTimeRange,
  visibleTimeRanges, setVisibleTimeRanges,
  enabledFeatures = {}, setEnabledFeatures,
  tickerAutoScroll = true, setTickerAutoScroll,
  useCustomTicker = false, toggleUseCustomTicker,
  customTickerSymbols = [], addCustomTickerSymbol, removeCustomTickerSymbol,
  tickerInput = '', setTickerInput,
}) {
  const [tzSearch, setTzSearch] = useState('');

  // Calculate NYSE open/close in a given timezone
  const nyseHours = (tz) => {
    try {
      const base = new Date();
      // Set to a weekday at NYSE open (9:30 AM ET) and close (4:00 PM ET)
      const open  = new Date(base.toLocaleDateString('en-US', { timeZone: 'America/New_York' }) + ' 09:30:00');
      const close = new Date(base.toLocaleDateString('en-US', { timeZone: 'America/New_York' }) + ' 16:00:00');
      const fmt = (d) => d.toLocaleTimeString('es-MX', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
      return `${fmt(open)} – ${fmt(close)}`;
    } catch { return ''; }
  };

  const toggle = (code) => {
    if (code === 'USD') return;
    const next = enabledCurrencies.includes(code)
      ? enabledCurrencies.filter((c) => c !== code)
      : [...enabledCurrencies, code];
    if (next.length < 2) return;
    setEnabledCurrencies(next);
    if (!next.includes(currency)) setCurrency('USD');
    try { localStorage.setItem('enabledCurrencies', JSON.stringify(next)); } catch {}
  };

  const selectTz = (tz) => {
    setUserTimezone(tz);
    try { localStorage.setItem('userTimezone', tz); } catch {}
  };

  const filteredTz = TIMEZONES.filter((t) =>
    t.label.toLowerCase().includes(tzSearch.toLowerCase()) ||
    t.tz.toLowerCase().includes(tzSearch.toLowerCase())
  );

  const currentTz = TIMEZONES.find((t) => t.tz === userTimezone);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{t('settings_title', lang)}</h1>
          <p className="text-slate-400">{lang === 'es' ? 'Configura el comportamiento de la app.' : 'Configure app behavior.'}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLang('es');
            setEnabledCurrencies(['USD', 'MXN', 'EUR']);
            setCurrency('USD');
            setUserTimezone('America/New_York');
            if (setMaxStocks) setMaxStocks(8);
            if (setTickerAutoScroll) setTickerAutoScroll(true);
            if (setDefaultTimeRange) setDefaultTimeRange('1month');
            if (setEnabledFeatures) setEnabledFeatures({
              fundamentals: true, technicalIndicators: true, patternRecognition: true,
              backtesting: true, comparativeAnalysis: true, comparatorNews: true,
              bankAccounts: true, portfolioNews: true, transactionHistory: true, positions: true,
              portfolioChart: true, averageCard: true, investmentSimulator: true,
            });
            try {
              localStorage.setItem('lang', 'es');
              localStorage.setItem('enabledCurrencies', JSON.stringify(['USD', 'MXN', 'EUR']));
              localStorage.setItem('userTimezone', 'America/New_York');
              localStorage.setItem('maxStocks', '8');
              localStorage.removeItem('enabledFeatures');
              localStorage.removeItem('tickerAutoScroll');
              localStorage.removeItem('visibleTimeRanges');
              localStorage.removeItem('defaultTimeRange');
            } catch {}
          }}
          className="bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Reset to default
        </button>
      </div>

      {/* Language */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h2 className="text-white font-semibold mb-1">{t('settings_language', lang)}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          {LANGUAGES.map(({ code, label, flag }) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all text-left ${
                lang === code
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-blue-400'
              }`}
            >
              <span className="text-xl">{flag}</span>
              <span className="text-sm font-medium">{label}</span>
              {lang === code && <span className="ml-auto w-2 h-2 rounded-full bg-blue-500" />}
            </button>
          ))}
        </div>
      </div>

      <AuthEmailPanel lang={lang} />

      {/* Timezone */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h2 className="text-white font-semibold mb-1">{t('settings_timezone', lang)}</h2>
        <p className="text-slate-400 text-sm mb-3">
          {lang === 'es' ? 'Selecciona tu zona horaria. El reloj del comparador mostrará la hora en esta zona.' : 'Select your time zone. The comparator clock will show the time in this zone.'}
        </p>
        <div className="flex items-center gap-2 mb-3 bg-slate-700/50 rounded-lg px-3 py-2 border border-slate-600">
          <span className="text-lg">{currentTz?.flag ?? '🌍'}</span>
          <span className="text-white text-sm font-medium">{currentTz?.label ?? userTimezone}</span>
        </div>
        <input
          className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-3"
          placeholder={t('settings_tz_search', lang)}
          value={tzSearch}
          onChange={(e) => setTzSearch(e.target.value)}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
          {filteredTz.map(({ tz, label, flag }) => (
            <button
              key={tz}
              onClick={() => selectTz(tz)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                userTimezone === tz
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>{flag}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm">{label}</p>
                <p className={`text-xs ${userTimezone === tz ? 'text-blue-200' : 'text-slate-500'}`}>
                  NYSE: {nyseHours(tz)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Currencies */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h2 className="text-white font-semibold mb-1">{t('settings_currencies', lang)}</h2>
        <p className="text-slate-400 text-sm mb-4">
          {lang === 'es' ? 'Selecciona las monedas que aparecen al presionar el botón de tipo de cambio. USD siempre está incluido.' : 'Select the currencies shown when pressing the exchange rate button. USD is always included.'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_CURRENCIES.map(({ code, label, symbol, flag }) => {
            const enabled = enabledCurrencies.includes(code);
            const isUSD = code === 'USD';
            return (
              <button
                key={code}
                onClick={() => toggle(code)}
                disabled={isUSD}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                  enabled
                    ? 'bg-blue-600/20 border-blue-500 text-white'
                    : 'bg-slate-700/50 border-slate-600 text-slate-400'
                } ${isUSD ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-400 cursor-pointer'}`}
              >
                <span className="text-xl flex-shrink-0">{flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs">{code} <span className="text-slate-400 font-normal">{symbol}</span></p>
                  <p className="text-xs opacity-60 truncate">{label}</p>
                </div>
                <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
                  enabled ? 'bg-blue-500 border-blue-500' : 'border-slate-500'
                }`} />
              </button>
            );
          })}
        </div>
        <p className="text-slate-500 text-xs mt-4">
          {lang === 'es' ? `Rotación activa: ${enabledCurrencies.join(' → ')} → (vuelve a USD)` : `Active rotation: ${enabledCurrencies.join(' → ')} → (back to USD)`}
        </p>
      </div>

      <CommunityProfileSettings lang={lang} />

      {/* Max stocks */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h2 className="text-white font-semibold mb-1">
          {lang === 'es' ? 'Máximo de acciones simultáneas' : 'Maximum simultaneous stocks'}
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          {lang === 'es'
            ? 'Define cuántas acciones puedes tener seleccionadas a la vez en el Comparador. Rango: 4–20.'
            : 'Set how many stocks you can have selected at once in the Comparator. Range: 4–20.'}
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={4}
            max={20}
            step={1}
            value={maxStocks}
            onChange={e => setMaxStocks && setMaxStocks(parseInt(e.target.value, 10))}
            className="flex-1 accent-blue-500"
          />
          <span className="text-white font-bold text-lg w-8 text-center">{maxStocks}</span>
        </div>
        <div className="flex justify-between text-slate-500 text-xs mt-1">
          <span>4</span>
          <span>20</span>
        </div>

        {/* Default time range */}
        <div className="mt-5 pt-4 border-t border-slate-700">
          <p className="text-white text-sm font-medium mb-2">
            {lang === 'es' ? 'Escala de tiempo predeterminada' : 'Default time range'}
          </p>
          <p className="text-slate-400 text-xs mb-3">
            {lang === 'es' ? 'Se aplica al Comparador, Indicadores Técnicos, Patrones y Backtesting al cargar.' : 'Applied to Comparator, Technical Indicators, Patterns and Backtesting on load.'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              ['1hour','1h'],['6hours','6h'],['1day','24h'],['1week','1W'],['1month','1M'],
              ['3months','3M'],['6months','6M'],['1year','1Y'],['2years','2Y'],['3years','3Y'],
              ['5years','5Y'],['10years','10Y'],['15years','15Y'],['alltime','All'],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setDefaultTimeRange && setDefaultTimeRange(key)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${defaultTimeRange === key ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Visible time ranges */}
        <div className="mt-5 pt-4 border-t border-slate-700">
          <p className="text-white text-sm font-medium mb-1">
            {lang === 'es' ? 'Escalas de tiempo visibles' : 'Visible time ranges'}
          </p>
          <p className="text-slate-400 text-xs mb-3">
            {lang === 'es' ? 'Elige qué escalas aparecen en la barra del Comparador. Siempre debe haber al menos una.' : 'Choose which time ranges appear in the Comparator bar. At least one must remain.'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              ['1hour','1h'],['6hours','6h'],['1day','24h'],['1week','1W'],['1month','1M'],
              ['3months','3M'],['6months','6M'],['1year','1Y'],['2years','2Y'],['3years','3Y'],
              ['5years','5Y'],['10years','10Y'],['15years','15Y'],['alltime','All'],
            ].map(([key, label]) => {
              const active = !visibleTimeRanges || visibleTimeRanges.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (!setVisibleTimeRanges || !visibleTimeRanges) return;
                    const next = active
                      ? visibleTimeRanges.filter(k => k !== key)
                      : [...visibleTimeRanges, key];
                    if (next.length === 0) return; // keep at least one
                    setVisibleTimeRanges(next);
                  }}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors border ${active ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-700/50 border-slate-600 text-slate-500'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ticker auto-scroll + mode */}
        <div className="mt-5 pt-4 border-t border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">
                {lang === 'es' ? 'Banda de precios animada' : 'Animated price ticker'}
              </p>
              <p className="text-slate-400 text-xs mt-0.5">
                {lang === 'es'
                  ? 'La banda de precios se desplaza automáticamente. Desactívala para que sea estática.'
                  : 'The price ticker scrolls automatically. Disable it to make it static.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTickerAutoScroll && setTickerAutoScroll(!tickerAutoScroll)}
              className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ml-4 ${tickerAutoScroll ? 'bg-blue-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${tickerAutoScroll ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>

          <div>
            <p className="text-white text-sm font-medium mb-2">
              {lang === 'es' ? 'Acciones en la banda' : 'Ticker stocks'}
            </p>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => toggleUseCustomTicker && toggleUseCustomTicker(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!useCustomTicker ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {lang === 'es' ? 'Acciones seleccionadas' : 'Selected stocks'}
              </button>
              <button
                type="button"
                onClick={() => toggleUseCustomTicker && toggleUseCustomTicker(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${useCustomTicker ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
              >
                {lang === 'es' ? 'Personalizada' : 'Custom'}
              </button>
            </div>
            {useCustomTicker && (
              <div className="space-y-2">
                <div className="flex gap-1 flex-wrap">
                  {customTickerSymbols.map(sym => (
                    <span key={sym} className="flex items-center gap-1 bg-slate-700 text-slate-200 text-xs px-2 py-1 rounded">
                      {sym}
                      <button
                        type="button"
                        onClick={() => removeCustomTickerSymbol && removeCustomTickerSymbol(sym)}
                        className="text-slate-400 hover:text-red-400 ml-0.5"
                      >×</button>
                    </span>
                  ))}
                  {customTickerSymbols.length === 0 && (
                    <p className="text-slate-500 text-xs">{lang === 'es' ? 'Agrega símbolos abajo.' : 'Add symbols below.'}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <input
                    className="bg-slate-600 text-white rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 uppercase flex-1"
                    placeholder="AAPL, BTC-USD, ^GSPC…"
                    value={tickerInput}
                    onChange={e => setTickerInput && setTickerInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && addCustomTickerSymbol && addCustomTickerSymbol(tickerInput)}
                    maxLength={10}
                  />
                  <button
                    type="button"
                    onClick={() => addCustomTickerSymbol && addCustomTickerSymbol(tickerInput)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-semibold"
                  >+</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature toggles */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h2 className="text-white font-semibold mb-1">
          {lang === 'es' ? 'Funciones visibles' : 'Visible features'}
        </h2>
        <p className="text-slate-400 text-sm mb-4">
          {lang === 'es'
            ? 'Activa o desactiva secciones de la app. Las secciones desactivadas desaparecen completamente — puedes volver a activarlas aquí en cualquier momento. Los datos nunca se borran.'
            : 'Enable or disable sections of the app. Disabled sections disappear completely — you can re-enable them here at any time. Data is never deleted.'}
        </p>
        {[
          {
            group: lang === 'es' ? 'Comparador' : 'Comparator',
            items: [
              { key: 'fundamentals',        label: lang === 'es' ? 'Datos fundamentales' : 'Fundamental data' },
              { key: 'averageCard',         label: lang === 'es' ? 'Tarjeta de promedio' : 'Average card' },
              { key: 'technicalIndicators', label: lang === 'es' ? 'Indicadores técnicos' : 'Technical indicators' },
              { key: 'patternRecognition',  label: lang === 'es' ? 'Reconocimiento de patrones' : 'Pattern recognition' },
              { key: 'backtesting',         label: lang === 'es' ? 'Backtesting de estrategias' : 'Strategy backtesting' },
              { key: 'comparativeAnalysis', label: lang === 'es' ? 'Análisis comparativo' : 'Comparative analysis' },
              { key: 'comparatorNews',      label: lang === 'es' ? 'Noticias' : 'News' },
            ],
          },
          {
            group: lang === 'es' ? 'Portafolio' : 'Portfolio',
            items: [
              { key: 'portfolioChart',      label: lang === 'es' ? 'Gráfica de valor total' : 'Total value chart' },
              { key: 'investmentSimulator', label: lang === 'es' ? 'Simulador de inversión' : 'Investment simulator' },
              { key: 'positions',           label: lang === 'es' ? 'Posiciones' : 'Positions' },
              { key: 'transactionHistory',  label: lang === 'es' ? 'Historial de transacciones' : 'Transaction history' },
              { key: 'bankAccounts',        label: lang === 'es' ? 'Cuentas de banco' : 'Bank accounts' },
              { key: 'portfolioNews',       label: lang === 'es' ? 'Noticias' : 'News' },
            ],
          },
        ].map(({ group, items }) => (
          <div key={group} className="mb-4">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">{group}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map(({ key, label }) => {
                const enabled = enabledFeatures[key] !== false;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setEnabledFeatures && setEnabledFeatures({ ...enabledFeatures, [key]: !enabled })}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                      enabled
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-700/50 border-slate-600 text-slate-400'
                    }`}
                  >
                    <span>{label}</span>
                    <span className={`w-8 h-4 rounded-full relative transition-colors ${enabled ? 'bg-blue-500' : 'bg-slate-600'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${enabled ? 'left-4' : 'left-0.5'}`} />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Credits */}
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <h2 className="text-white font-semibold mb-3 text-sm">{lang === 'es' ? 'Fuentes de tipos de cambio' : 'Exchange rate sources'}</h2>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-green-400 text-xs mt-0.5">●</span>
            <div>
              <p className="text-slate-200 text-xs font-medium">ExchangeRate API ({lang === 'es' ? 'fuente principal' : 'primary source'})</p>
              <p className="text-slate-500 text-xs">{lang === 'es' ? '160+ monedas · Plan gratuito · 1,500 llamadas/mes' : '160+ currencies · Free plan · 1,500 calls/month'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-slate-500 text-xs mt-0.5">●</span>
            <div>
              <p className="text-slate-400 text-xs font-medium">Frankfurter (fallback)</p>
              <p className="text-slate-500 text-xs">{lang === 'es' ? 'Banco Central Europeo · Sin límites · Sin API key · frankfurter.app' : 'European Central Bank · No limits · No API key · frankfurter.app'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
