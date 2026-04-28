import React, { useState, useEffect } from 'react';
import { t } from './i18n';

const DEFAULT_PORTFOLIO = {
  deposits: [],
  holdings: {},
  transactions: [],
  dividendsReceived: 0,
};

export default function PortfolioSimulator({ 
  currency = 'USD', 
  lang = 'es',
  rates = {},
  initialPortfolio,
  onPortfolioChange
}) {
  const [portfolio, setPortfolio] = useState(DEFAULT_PORTFOLIO);
  const [tab, setTab] = useState('portfolio-performance');

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

        {/* Tab Content */}
        <div className="p-4">
          <div className="text-center py-8">
            <h3 className="text-white text-lg mb-2">
              {lang === 'es' ? 'Componente Simplificado' : 'Simplified Component'}
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              {lang === 'es' 
                ? 'Esta es una versión simplificada para resolver el error de inicialización.'
                : 'This is a simplified version to resolve the initialization error.'
              }
            </p>
            <div className="bg-slate-700/50 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-slate-300 text-sm">
                <strong>{lang === 'es' ? 'Estado:' : 'Status:'}</strong> {lang === 'es' ? 'Funcionando' : 'Working'}
              </p>
              <p className="text-slate-300 text-sm mt-2">
                <strong>{lang === 'es' ? 'Moneda:' : 'Currency:'}</strong> {currency}
              </p>
              <p className="text-slate-300 text-sm mt-2">
                <strong>{lang === 'es' ? 'Idioma:' : 'Language:'}</strong> {lang}
              </p>
              <p className="text-slate-300 text-sm mt-2">
                <strong>{lang === 'es' ? 'Transacciones:' : 'Transactions:'}</strong> {portfolio.transactions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t('label_total_value', lang), value: fmtCurrency(0), color: 'text-white' },
          { label: lang === 'es' ? 'Cuentas bancarias' : 'Bank accounts', value: fmtCurrency(0), color: 'text-green-400' },
          { label: t('label_investments', lang), value: fmtCurrency(0), color: 'text-blue-400' },
          { label: t('label_total_return', lang), value: fmtCurrency(0), color: 'text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-800/70 rounded-lg p-4 border border-slate-700">
            <p className="text-slate-400 text-xs mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Simple message */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <h3 className="text-white font-semibold mb-3">
          {lang === 'es' ? 'Componente Temporal' : 'Temporary Component'}
        </h3>
        <p className="text-slate-400 text-sm">
          {lang === 'es' 
            ? 'Este es un componente simplificado para verificar que la aplicación carga correctamente. Una vez confirmado, restauraremos toda la funcionalidad paso a paso.'
            : 'This is a simplified component to verify the application loads correctly. Once confirmed, we will restore all functionality step by step.'
          }
        </p>
      </div>
    </div>
  );
}