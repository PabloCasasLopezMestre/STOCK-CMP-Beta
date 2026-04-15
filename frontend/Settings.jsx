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
  userTimezone, setUserTimezone, lang, setLang,
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
            try {
              localStorage.setItem('lang', 'es');
              localStorage.setItem('enabledCurrencies', JSON.stringify(['USD', 'MXN', 'EUR']));
              localStorage.setItem('userTimezone', 'America/New_York');
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
