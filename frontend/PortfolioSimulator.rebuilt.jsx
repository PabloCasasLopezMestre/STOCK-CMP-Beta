import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TrendingUp, TrendingDown, Plus, Minus, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { t } from './i18n';

const WORKER_BASE = 'https://proxy.stockcmp-proxy.workers.dev';

const DEFAULT_PORTFOLIO = {
  deposits: [],
  holdings: {},
  transactions: [],
  dividendsReceived: 0,
};

// Mini dropdown that suggests stocks from the comparator
function StockSuggest({ value, onChange, placeholder, comparatorStocks, holdingSymbols, lang }) {
  const [focused, setFocused] = useState(false);
  const suggestions = [...new Set([...(comparatorStocks || [])])];

  return (
    <div className="relative mb-2">
      <input
        className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 uppercase"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value.toUpperCase())}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        maxLength={10}
      />
      {focused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-20 bg-slate-800 border border-slate-600 rounded-lg mt-0.5 overflow-hidden shadow-lg">
          {suggestions.map(sym => (
            <button
              key={sym}
              type="button"
              onMouseDown={() => onChange(sym)}
              className="w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700 font-mono"
            >
              {sym}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function loadPortfolio() {
  try { return JSON.parse(localStorage.getItem('portfolio') || 'null'); } catch { return null; }
}

function savePortfolio(p) {
  try { localStorage.setItem('portfolio', JSON.stringify(p)); } catch {}
}

export default function PortfolioSimulator({ 
  currency = 'USD', 
  setCurrency, 
  nextCurrency, 
  currencyLabel = 'USD', 
  rates = {}, 
  alerts = [], 
  setAlerts, 
  lang = 'es', 
  onOpenCommunityIdea, 
  initialPortfolio, 
  onPortfolioChange, 
  refreshTrigger = 0, 
  showAlertsPanel = false, 
  setShowAlertsPanel, 
  comparatorStocks = [], 
  enabledFeatures = {}, 
  visibleTimeRanges = [], 
  defaultTimeRange = '1month', 
  accountCreated, 
  dataResetAt 
}) {
  // Safety check to ensure all required props are available
  if (!setCurrency || !setAlerts) {
    console.error('PortfolioSimulator: Missing required props');
    return <div className="text-red-400 p-4">Error: Missing required props</div>;
  }

  const [portfolio, setPortfolio] = useState(() => initialPortfolio || loadPortfolio() || DEFAULT_PORTFOLIO);
  const [prices, setPrices] = useState({});
  
  // Performance state - simplified to avoid circular dependencies
  const [tab, setTab] = useState('portfolio-performance');
  const [performanceRange, setPerformanceRange] = useState('1month');
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  // Bank accounts - simplified
  const [bankAccounts, setBankAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bankAccounts') || '[]'); } catch { return []; }
  });

  // Trading state
  const [tradeSymbol, setTradeSymbol] = useState('');
  const [tradeShares, setTradeShares] = useState('');
  const [tradeMode, setTradeMode] = useState('buy');
  const [tradeError, setTradeError] = useState('');

  // Deposit/withdraw state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMode, setDepositMode] = useState('deposit');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');

  // Seed portfolio from Supabase when initialPortfolio prop arrives after async initSync
  const seededRef = useRef(false);
  useEffect(() => {
    if (initialPortfolio && !seededRef.current) {
      seededRef.current = true;
      setPortfolio(initialPortfolio);
      savePortfolio(initialPortfolio);
    }
  }, [initialPortfolio]);

  // Simple currency formatter
  const fmtCurrency = (v) => {
    if (v == null) return '—';
    const rate = currency === 'USD' ? 1 : (rates?.[currency] ?? 1);
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency, minimumFractionDigits: 2 }).format(v * rate);
  };

  // Convert user input (in selected currency) to USD for storage
  const toUSD = (amount) => {
    if (currency === 'USD') return amount;
    const rate = rates?.[currency] ?? 1;
    return amount / rate;
  };

  // Convert USD to selected currency for display in inputs
  const fromUSD = (amount) => {
    if (currency === 'USD') return amount;
    const rate = rates?.[currency] ?? 1;
    return amount * rate;
  };

  const updatePortfolio = useCallback((next) => {
    setPortfolio(next);
    savePortfolio(next);
    if (onPortfolioChange) onPortfolioChange(next);
  }, [onPortfolioChange]);

  // Fetch current prices for all holdings - simplified
  const fetchPrices = useCallback(async () => {
    const symbols = Object.keys(portfolio.holdings);
    if (!symbols.length) return;
    
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
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  }, [portfolio.holdings]);

  // Calculate available time ranges based on account age - simplified
  const getAvailableTimeRanges = () => {
    return [
      { value: '3days', labelEs: '3 Días', labelEn: '3 Days' },
      { value: '1week', labelEs: '1 Semana', labelEn: '1 Week' },
      { value: '2weeks', labelEs: '2 Semanas', labelEn: '2 Weeks' },
      { value: '1month', labelEs: '1 Mes', labelEn: '1 Month' },
      { value: '6weeks', labelEs: '6 Semanas', labelEn: '6 Weeks' },
      { value: '2months', labelEs: '2 Meses', labelEn: '2 Months' },
      { value: '3months', labelEs: '3 Meses', labelEn: '3 Months' },
      { value: 'alltime', labelEs: 'Todo', labelEn: 'All Time' }
    ];
  };

  // Simple performance calculation - no circular dependencies
  const calculateSimplePerformance = () => {
    if (tab === 'portfolio-performance') {
      // Simple portfolio performance
      const totalDeposited = portfolio.deposits.filter((d) => d.type === 'deposit').reduce((s, d) => s + d.amount, 0);
      const totalWithdrawn = portfolio.deposits.filter((d) => d.type === 'withdraw').reduce((s, d) => s + d.amount, 0);
      const netDeposited = totalDeposited - totalWithdrawn;
      
      const holdingsValue = Object.entries(portfolio.holdings).reduce((sum, [sym, h]) => {
        return sum + h.shares * (prices[sym] ?? h.avgCost);
      }, 0);
      
      const totalBankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0);
      const totalValue = totalBankBalance + holdingsValue;
      const totalGain = totalValue - netDeposited;
      const totalChange = netDeposited > 0 ? (totalGain / netDeposited) * 100 : 0;
      
      return {
        individual: [],
        totalStartValue: netDeposited,
        totalEndValue: totalValue,
        totalGain,
        totalChange,
        isPortfolioPerformance: true
      };
    } else {
      // Simple stock performance
      const symbols = Object.keys(portfolio.holdings);
      if (!symbols.length) {
        return {
          individual: [],
          totalStartValue: 0,
          totalEndValue: 0,
          totalGain: 0,
          totalChange: 0
        };
      }
      
      const individual = symbols.map(sym => {
        const holding = portfolio.holdings[sym];
        const currentPrice = prices[sym] ?? holding.avgCost;
        const startValue = holding.avgCost * holding.shares;
        const endValue = currentPrice * holding.shares;
        const gain = endValue - startValue;
        const change = startValue > 0 ? (gain / startValue) * 100 : 0;
        
        return {
          symbol: sym,
          shares: holding.shares,
          startPrice: holding.avgCost,
          endPrice: currentPrice,
          gain,
          change,
          startValue,
          endValue
        };
      });
      
      const totalStartValue = individual.reduce((sum, r) => sum + r.startValue, 0);
      const totalEndValue = individual.reduce((sum, r) => sum + r.endValue, 0);
      const totalGain = totalEndValue - totalStartValue;
      const totalChange = totalStartValue > 0 ? (totalGain / totalStartValue) * 100 : 0;
      
      return {
        individual,
        totalStartValue,
        totalEndValue,
        totalGain,
        totalChange
      };
    }
  };

  // Update performance data when tab or range changes
  useEffect(() => {
    setLoadingPerformance(true);
    setTimeout(() => {
      const data = calculateSimplePerformance();
      setPerformanceData(data);
      setLoadingPerformance(false);
    }, 100);
  }, [tab, performanceRange, portfolio, prices, bankAccounts]);

  // Fetch prices when holdings change
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Portfolio calculations
  const holdingsValue = Object.entries(portfolio.holdings).reduce((sum, [sym, h]) => {
    return sum + h.shares * (prices[sym] ?? h.avgCost);
  }, 0);
  const totalBankBalance = bankAccounts.reduce((s, a) => s + a.balance, 0);
  const totalValue = totalBankBalance + holdingsValue;
  const totalDeposited = portfolio.deposits.filter((d) => d.type === 'deposit').reduce((s, d) => s + d.amount, 0);
  const totalWithdrawn = portfolio.deposits.filter((d) => d.type === 'withdraw').reduce((s, d) => s + d.amount, 0);
  const netDeposited = totalDeposited - totalWithdrawn;
  const totalReturn = totalValue - netDeposited;
  const totalReturnPct = netDeposited > 0 ? (totalReturn / netDeposited) * 100 : 0;

  const fmt = fmtCurrency;

  return (
    <div className="space-y-4">
      {/* Performance Section */}
      {enabledFeatures.portfolioPerformance !== false && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {['portfolio-performance', 'stock-performance'].map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${tab === tabKey ? 'text-white border-b-2 border-blue-500' : 'text-slate-400 hover:text-white'}`}
              >
                {tabKey === 'portfolio-performance' ? (lang === 'es' ? 'Rendimiento del Portafolio' : 'Portfolio Performance') : 
                 tabKey === 'stock-performance' ? (lang === 'es' ? 'Rendimiento de Acciones' : 'Stock Performance') : ''}
              </button>
            ))}
            <div className="flex-1" />
            <div className="flex items-center gap-2 m-2">
              <select
                value={performanceRange}
                onChange={(e) => setPerformanceRange(e.target.value)}
                className="bg-slate-700 text-white px-3 py-1.5 rounded text-xs outline-none"
              >
                {getAvailableTimeRanges().map(range => (
                  <option key={range.value} value={range.value}>
                    {lang === 'es' ? range.labelEs : range.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {loadingPerformance ? (
              <p className="text-slate-500 text-sm text-center py-8">{lang === 'es' ? 'Cargando datos de rendimiento...' : 'Loading performance data...'}</p>
            ) : performanceData ? (
              <div className="space-y-4">
                {/* Performance summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2">
                      {tab === 'portfolio-performance' 
                        ? (lang === 'es' ? 'Crecimiento Total del Portafolio' : 'Total Portfolio Growth')
                        : (lang === 'es' ? 'Crecimiento Total de Acciones' : 'Total Stock Growth')
                      }
                    </h3>
                    <p className="text-2xl font-bold text-blue-400">
                      {fmt(performanceData.totalGain)}
                    </p>
                    <p className={`text-sm ${performanceData.totalChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {performanceData.totalChange >= 0 ? '+' : ''}{performanceData.totalChange.toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2">
                      {tab === 'portfolio-performance' 
                        ? (lang === 'es' ? 'Valor Total del Portafolio' : 'Total Portfolio Value')
                        : (lang === 'es' ? 'Valor de las Acciones' : 'Stock Value')
                      }
                    </h3>
                    <p className="text-2xl font-bold text-white">
                      {fmt(performanceData.totalEndValue)}
                    </p>
                    <p className="text-sm text-slate-400">
                      {lang === 'es' ? 'Desde' : 'From'}: {fmt(performanceData.totalStartValue)}
                    </p>
                  </div>
                </div>

                {/* Individual stock performance */}
                {tab === 'stock-performance' && performanceData.individual && performanceData.individual.length > 0 && (
                  <div>
                    <h3 className="text-white font-semibold mb-3">{lang === 'es' ? 'Rendimiento por Activo' : 'Performance by Asset'}</h3>
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
                              <span className="text-slate-400">{lang === 'es' ? 'Ganancia' : 'Gain'}:</span>
                              <span className={item.gain >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {item.gain >= 0 ? '+' : ''}{fmt(item.gain)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{lang === 'es' ? 'Valor' : 'Value'}:</span>
                              <span className="text-white">{fmt(item.endPrice * item.shares)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">{lang === 'es' ? 'Acciones' : 'Shares'}:</span>
                              <span className="text-slate-200">{item.shares.toFixed(4)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm mb-2">
                  {lang === 'es' ? 'No hay datos de rendimiento disponibles' : 'No performance data available'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('label_total_value', lang), value: fmt(totalValue), color: 'text-white' },
          { label: lang === 'es' ? 'Cuentas bancarias' : 'Bank accounts', value: fmt(totalBankBalance), color: 'text-green-400' },
          { label: t('label_investments', lang), value: fmt(holdingsValue), color: 'text-blue-400' },
          { label: t('label_total_return', lang), value: `${totalReturn >= 0 ? '+' : ''}${fmt(totalReturn)} (${totalReturnPct.toFixed(2)}%)`, color: totalReturn >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800/70 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Status message */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-white font-semibold mb-3">
          {lang === 'es' ? 'Componente Reconstruido' : 'Rebuilt Component'}
        </h3>
        <p className="text-slate-400 text-sm">
          {lang === 'es' 
            ? 'Esta es una versión reconstruida del PortfolioSimulator con funcionalidad básica de rendimiento. Funciona sin errores de dependencias circulares.'
            : 'This is a rebuilt version of PortfolioSimulator with basic performance functionality. It works without circular dependency errors.'
          }
        </p>
      </div>
    </div>
  );
}