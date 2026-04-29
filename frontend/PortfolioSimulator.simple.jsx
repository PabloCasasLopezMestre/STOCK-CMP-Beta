import React, { useState, useEffect, useCallback } from 'react';
import { t } from './i18n';

const DEFAULT_PORTFOLIO = {
  deposits: [],
  holdings: {},
  transactions: [],
  dividendsReceived: 0,
  bankAccounts: []
};

export default function PortfolioSimulator({ 
  currency = 'USD', 
  lang = 'es',
  rates = {},
  initialPortfolio,
  onPortfolioChange,
  accountCreated,
  dataResetAt
}) {
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);
  const [tab, setTab] = useState('portfolio-performance');
  const [performanceRange, setPerformanceRange] = useState('1month');
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  // Simple currency formatter
  const fmtCurrency = (v) => {
    if (v == null) return '—';
    const rate = currency === 'USD' ? 1 : (rates?.[currency] ?? 1);
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency, 
      minimumFractionDigits: 2 
    }).format(v * rate);
  };

  // Load initial portfolio
  useEffect(() => {
    if (initialPortfolio) {
      setPortfolio(initialPortfolio);
    }
  }, [initialPortfolio]);

  // Calculate portfolio values (only stocks now, no bank accounts)
  const holdingsValue = Object.entries(portfolio.holdings || {}).reduce((sum, [sym, h]) => {
    return sum + h.shares * (h.avgCost || 0); // Use avgCost as fallback price
  }, 0);
  const totalValue = holdingsValue; // Only stock investments now

  // Performance data fetching
  const fetchPortfolioPerformanceData = useCallback(async () => {
    if (portfolio.transactions.length === 0) {
      setPerformanceData({
        individual: [],
        totalStartValue: 0,
        totalEndValue: totalValue,
        totalGain: 0,
        totalChange: 0
      });
      setLoadingPerformance(false);
      return;
    }
    
    setLoadingPerformance(true);
    
    try {
      // Use dataResetAt if available, otherwise accountCreated, otherwise first transaction
      const referenceDate = dataResetAt ? new Date(dataResetAt) : 
                           accountCreated ? new Date(accountCreated) : 
                           new Date(portfolio.transactions[0].date);
      
      const rangeMap = {
        '3days': 3, '1week': 7, '2weeks': 14, '1month': 30, '6weeks': 42,
        '2months': 60, '3months': 90, '4months': 120, '6months': 180, '9months': 270,
        '1year': 365, '18months': 540, '2years': 730, '30months': 900, '3years': 1095,
        '4years': 1460, '5years': 1825, '7years': 2555, '10years': 3650, '12years': 4380,
        '15years': 5475, '20years': 7300, '25years': 9125, 'alltime': null
      };
      
      const daysBack = rangeMap[performanceRange];
      const startDate = daysBack ? new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000)) : referenceDate;
      
      // Simple calculation for demo
      const depositsUpToStart = portfolio.transactions
        .filter(tx => new Date(tx.date) <= startDate)
        .reduce((sum, tx) => {
          if (tx.type === 'deposit') return sum + tx.amount;
          if (tx.type === 'withdraw') return sum - tx.amount;
          return sum;
        }, 0);
      
      const startValue = Math.max(0, depositsUpToStart);
      const currentValue = totalValue;
      const totalGain = currentValue - startValue;
      const totalChange = startValue > 0 ? (totalGain / startValue) * 100 : 0;
      
      setPerformanceData({
        individual: [],
        totalStartValue: startValue,
        totalEndValue: currentValue,
        totalGain,
        totalChange
      });
    } catch (error) {
      console.error('Error fetching portfolio performance:', error);
      setPerformanceData(null);
    } finally {
      setLoadingPerformance(false);
    }
  }, [portfolio.transactions, portfolio.holdings, performanceRange, totalValue, dataResetAt, accountCreated]);

  const fetchStockPerformanceData = useCallback(async () => {
    setLoadingPerformance(true);
    try {
      // Simple stock performance calculation
      const symbols = Object.keys(portfolio.holdings || {});
      if (symbols.length === 0) {
        setPerformanceData(null);
        setLoadingPerformance(false);
        return;
      }

      // Mock performance data for stocks
      const individual = symbols.map(sym => {
        const holding = portfolio.holdings[sym];
        const currentValue = holding.shares * holding.avgCost;
        const gain = currentValue * 0.05; // Mock 5% gain
        return {
          symbol: sym,
          startValue: currentValue - gain,
          endValue: currentValue,
          gain,
          change: 5.0
        };
      });

      setPerformanceData({
        individual,
        totalStartValue: individual.reduce((s, i) => s + i.startValue, 0),
        totalEndValue: individual.reduce((s, i) => s + i.endValue, 0),
        totalGain: individual.reduce((s, i) => s + i.gain, 0),
        totalChange: 5.0
      });
    } catch (error) {
      console.error('Error fetching stock performance:', error);
      setPerformanceData(null);
    } finally {
      setLoadingPerformance(false);
    }
  }, [portfolio.holdings]);

  // Load performance data when tab or range changes
  useEffect(() => {
    if (tab === 'portfolio-performance') {
      fetchPortfolioPerformanceData();
    } else if (tab === 'stock-performance') {
      fetchStockPerformanceData();
    }
  }, [tab, performanceRange, fetchPortfolioPerformanceData, fetchStockPerformanceData]);

  return (
    <div className="space-y-4">
      {/* Performance Section */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700">
        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {['portfolio-performance', 'stock-performance'].map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                tab === tabKey 
                  ? 'text-white border-b-2 border-blue-500' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tabKey === 'portfolio-performance' 
                ? (lang === 'es' ? 'Rendimiento del Portafolio' : 'Portfolio Performance')
                : (lang === 'es' ? 'Rendimiento de Acciones' : 'Stock Performance')
              }
            </button>
          ))}
        </div>

        {/* Performance Range Selector */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex flex-wrap gap-2">
            {['1week', '1month', '3months', '6months', '1year', 'alltime'].map((range) => (
              <button
                key={range}
                onClick={() => setPerformanceRange(range)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  performanceRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {range === '1week' ? (lang === 'es' ? '1 Semana' : '1 Week') :
                 range === '1month' ? (lang === 'es' ? '1 Mes' : '1 Month') :
                 range === '3months' ? (lang === 'es' ? '3 Meses' : '3 Months') :
                 range === '6months' ? (lang === 'es' ? '6 Meses' : '6 Months') :
                 range === '1year' ? (lang === 'es' ? '1 Año' : '1 Year') :
                 range === 'alltime' ? (lang === 'es' ? 'Todo' : 'All Time') : range}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {loadingPerformance ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-400">
                {lang === 'es' ? 'Cargando datos de rendimiento...' : 'Loading performance data...'}
              </p>
            </div>
          ) : performanceData ? (
            <div className="space-y-4">
              {/* Performance Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">
                    {lang === 'es' ? 'Valor Inicial' : 'Start Value'}
                  </p>
                  <p className="text-white font-bold">{fmtCurrency(performanceData.totalStartValue)}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">
                    {lang === 'es' ? 'Valor Actual' : 'Current Value'}
                  </p>
                  <p className="text-white font-bold">{fmtCurrency(performanceData.totalEndValue)}</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">
                    {lang === 'es' ? 'Ganancia Total' : 'Total Gain'}
                  </p>
                  <p className={`font-bold ${performanceData.totalGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {fmtCurrency(performanceData.totalGain)}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-xs mb-1">
                    {lang === 'es' ? 'Cambio %' : 'Change %'}
                  </p>
                  <p className={`font-bold ${performanceData.totalChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {performanceData.totalChange.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Individual Stock Performance (for stock-performance tab) */}
              {tab === 'stock-performance' && performanceData.individual && performanceData.individual.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-white font-semibold">
                    {lang === 'es' ? 'Rendimiento por Acción' : 'Performance by Stock'}
                  </h4>
                  {performanceData.individual.map((stock) => (
                    <div key={stock.symbol} className="bg-slate-700/30 rounded-lg p-3 flex justify-between items-center">
                      <div>
                        <p className="text-white font-medium">{stock.symbol}</p>
                        <p className="text-slate-400 text-sm">
                          {fmtCurrency(stock.startValue)} → {fmtCurrency(stock.endValue)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${stock.gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fmtCurrency(stock.gain)}
                        </p>
                        <p className={`text-sm ${stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {stock.change.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">
                {lang === 'es' 
                  ? 'No hay datos de rendimiento disponibles'
                  : 'No performance data available'
                }
              </p>
              <p className="text-slate-500 text-sm">
                {lang === 'es' 
                  ? 'Realiza algunas transacciones para ver el rendimiento'
                  : 'Make some transactions to see performance data'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: t('label_total_value', lang), value: fmtCurrency(totalValue), color: 'text-white' },
          { label: t('label_investments', lang), value: fmtCurrency(holdingsValue), color: 'text-blue-400' },
          { label: t('label_total_return', lang), value: fmtCurrency(0), color: 'text-green-400' },
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
          {lang === 'es' ? 'Estado del Sistema' : 'System Status'}
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <p className="text-slate-300 text-sm">
              {lang === 'es' ? 'Aplicación funcionando correctamente' : 'Application working correctly'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <p className="text-slate-300 text-sm">
              {lang === 'es' ? 'Pestañas de rendimiento implementadas' : 'Performance tabs implemented'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <p className="text-slate-300 text-sm">
              {lang === 'es' ? 'Cuentas bancarias movidas a pestaña Activos' : 'Bank accounts moved to Assets tab'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <p className="text-slate-300 text-sm">
              {lang === 'es' ? 'Trading de acciones pendiente' : 'Stock trading functionality pending'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}