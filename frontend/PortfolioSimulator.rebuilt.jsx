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

  // Bank accounts - complete functionality
  const [bankAccounts, setBankAccounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bankAccounts') || '[]'); } catch { return []; }
  });
  const [showBankSection, setShowBankSection] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [newBank, setNewBank] = useState({ 
    name: '', 
    balance: '', 
    annualRate: '', // Growth rate (rendimiento/crecimiento)
    interestRate: '', // Interest rate (interés adicional)
    accountType: 'debit', // 'debit' | 'credit'
    growthFrequency: 'monthly', // 'monthly' | 'annual'
    interestFrequency: 'annual', // 'weekly' | 'monthly' | 'annual'
    fees: [] // Array of {name, amount, frequency}
  });
  
  // State for adding individual fees
  const [newFee, setNewFee] = useState({
    name: '',
    amount: '',
    frequency: 'monthly'
  });

  const saveBankAccounts = (accounts) => {
    setBankAccounts(accounts);
    try { localStorage.setItem('bankAccounts', JSON.stringify(accounts)); } catch {}
  };

  // Functions to manage fees
  const addFeeToNewBank = () => {
    const amount = parseFloat(newFee.amount);
    if (!newFee.name || isNaN(amount) || amount <= 0) return;
    
    const fee = {
      id: Date.now(),
      name: newFee.name,
      amount: toUSD(amount),
      frequency: newFee.frequency
    };
    
    setNewBank(prev => ({
      ...prev,
      fees: [...prev.fees, fee]
    }));
    
    setNewFee({
      name: '',
      amount: '',
      frequency: 'monthly'
    });
  };

  const removeFeeFromNewBank = (feeId) => {
    setNewBank(prev => ({
      ...prev,
      fees: prev.fees.filter(fee => fee.id !== feeId)
    }));
  };

  const addBankAccount = () => {
    const balance = parseFloat(newBank.balance);
    const rate = parseFloat(newBank.annualRate);
    const interestRate = parseFloat(newBank.interestRate);
    if (!newBank.name || isNaN(balance)) return;
    
    if (editingAccount) {
      // Update existing account
      const updatedAccounts = bankAccounts.map(account => 
        account.id === editingAccount.id 
          ? {
              ...account,
              name: newBank.name,
              balance: toUSD(balance),
              annualRate: isNaN(rate) ? 0 : rate,
              interestRate: isNaN(interestRate) ? 0 : interestRate,
              accountType: newBank.accountType,
              growthFrequency: newBank.growthFrequency,
              interestFrequency: newBank.interestFrequency,
              fees: newBank.fees || []
            }
          : account
      );
      saveBankAccounts(updatedAccounts);
      setEditingAccount(null);
    } else {
      // Add new account
      const account = {
        id: Date.now(),
        name: newBank.name,
        balance: toUSD(balance),
        annualRate: isNaN(rate) ? 0 : rate,
        interestRate: isNaN(interestRate) ? 0 : interestRate,
        accountType: newBank.accountType,
        growthFrequency: newBank.growthFrequency,
        interestFrequency: newBank.interestFrequency,
        fees: newBank.fees || []
      };
      saveBankAccounts([...bankAccounts, account]);
    }
    
    // Reset form
    setNewBank({ 
      name: '', 
      balance: '', 
      annualRate: '', 
      interestRate: '',
      accountType: 'debit',
      growthFrequency: 'monthly',
      interestFrequency: 'annual',
      fees: []
    });
    
    if (editingAccount) {
      setShowBankSection(false);
    }
  };

  const startEditingAccount = (account) => {
    setEditingAccount(account);
    setNewBank({
      name: account.name,
      balance: String(fromUSD(account.balance)),
      annualRate: String(account.annualRate || ''),
      interestRate: String(account.interestRate || ''),
      accountType: account.accountType || 'debit',
      growthFrequency: account.growthFrequency || 'monthly',
      interestFrequency: account.interestFrequency || 'annual',
      fees: account.fees || []
    });
    setShowBankSection(true);
  };

  const cancelEditing = () => {
    setEditingAccount(null);
    setNewBank({ 
      name: '', 
      balance: '', 
      annualRate: '', 
      interestRate: '',
      accountType: 'debit',
      growthFrequency: 'monthly',
      interestFrequency: 'annual',
      fees: []
    });
    setShowBankSection(false);
  };

  const removeBankAccount = (id) => saveBankAccounts(bankAccounts.filter(a => a.id !== id));

  const applyBankGrowth = () => {
    const updated = bankAccounts.map(a => {
      let newBalance = a.balance;
      
      // 1. Apply growth rate (rendimiento/crecimiento)
      if (a.annualRate && a.annualRate > 0) {
        let growthRate = 0;
        if (a.growthFrequency === 'annual') {
          growthRate = a.annualRate / 100;
        } else {
          growthRate = a.annualRate / 100 / 12;
        }
        const growthAmount = newBalance * growthRate;
        newBalance += growthAmount;
      }
      
      // 2. Apply interest rate (interés adicional)
      if (a.interestRate && a.interestRate > 0) {
        let interestRate = 0;
        const frequency = a.interestFrequency || 'annual';
        
        if (frequency === 'weekly') {
          interestRate = a.interestRate / 100 / 52;
        } else if (frequency === 'monthly') {
          interestRate = a.interestRate / 100 / 12;
        } else {
          interestRate = a.interestRate / 100;
        }
        
        const interest = newBalance * interestRate;
        newBalance += interest;
      }
      
      // 3. Calculate total fees
      let totalFees = 0;
      if (a.fees && Array.isArray(a.fees)) {
        totalFees = a.fees.reduce((sum, fee) => {
          let feeAmount = 0;
          if (fee.frequency === 'weekly') {
            feeAmount = fee.amount / 52;
          } else if (fee.frequency === 'annual') {
            feeAmount = fee.amount / 12;
          } else {
            feeAmount = fee.amount;
          }
          return sum + feeAmount;
        }, 0);
      }
      
      const finalBalance = newBalance - totalFees;
      return { ...a, balance: finalBalance };
    });
    saveBankAccounts(updated);
  };

  // Get total available cash from all bank accounts
  const getTotalAvailableCash = () => {
    return bankAccounts.reduce((total, account) => {
      if (account.accountType === 'debit') {
        return total + Math.max(0, account.balance);
      }
      return total;
    }, 0);
  };

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

  // Buy - deduct from bank accounts
  const handleBuy = async () => {
    setTradeError('');
    const sym = tradeSymbol.trim().toUpperCase();
    const shares = parseFloat(tradeShares);
    if (!sym || isNaN(shares) || shares <= 0) { 
      setTradeError(t('portfolio_symbol_required', lang)); 
      return; 
    }

    let price = prices[sym];
    if (!price) {
      // fetch price on demand
      try {
        const data = await fetch(`${WORKER_BASE}/api/stock/${encodeURIComponent(sym)}?interval=1d&range=5d`).then((r) => r.json());
        const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
        price = closes.filter(Boolean).pop() ?? null;
        if (price) setPrices((p) => ({ ...p, [sym]: price }));
      } catch {}
    }
    if (!price) { 
      setTradeError(t('portfolio_could_not_get_price', lang)); 
      return; 
    }

    const total = price * shares;
    const availableCash = getTotalAvailableCash();
    if (total > availableCash) { 
      setTradeError(`${t('portfolio_insufficient_funds', lang)} ${fmt(total)}`); 
      return; 
    }

    // Deduct from bank accounts (prioritize debit accounts)
    let remainingAmount = total;
    const updatedAccounts = [...bankAccounts];
    
    for (let i = 0; i < updatedAccounts.length && remainingAmount > 0; i++) {
      const account = updatedAccounts[i];
      if (account.accountType === 'debit' && account.balance > 0) {
        const deductAmount = Math.min(account.balance, remainingAmount);
        updatedAccounts[i] = { ...account, balance: account.balance - deductAmount };
        remainingAmount -= deductAmount;
      }
    }
    
    saveBankAccounts(updatedAccounts);

    const existing = portfolio.holdings[sym] ?? { shares: 0, avgCost: 0 };
    const newShares = existing.shares + shares;
    const newAvgCost = (existing.avgCost * existing.shares + price * shares) / newShares;

    const next = {
      ...portfolio,
      holdings: { ...portfolio.holdings, [sym]: { shares: newShares, avgCost: newAvgCost } },
      transactions: [...portfolio.transactions, {
        type: 'buy', symbol: sym, shares, price, total, date: new Date().toLocaleString('es-MX'),
      }],
    };
    updatePortfolio(next);
    setTradeSymbol('');
    setTradeShares('');
  };

  // Sell - deposit to first available debit account
  const handleSell = () => {
    setTradeError('');
    const sym = tradeSymbol.trim().toUpperCase();
    const shares = parseFloat(tradeShares);
    if (!sym || isNaN(shares) || shares <= 0) { 
      setTradeError(t('portfolio_symbol_required', lang)); 
      return; 
    }

    const holding = portfolio.holdings[sym];
    if (!holding || holding.shares < shares) { 
      setTradeError(`${t('portfolio_not_enough_shares', lang)} ${sym}`); 
      return; 
    }

    const price = prices[sym];
    if (!price) { 
      setTradeError(t('portfolio_update_prices_first', lang)); 
      return; 
    }

    const total = price * shares;
    const newShares = holding.shares - shares;
    const newHoldings = { ...portfolio.holdings };
    if (newShares <= 0) delete newHoldings[sym];
    else newHoldings[sym] = { ...holding, shares: newShares };

    // Deposit proceeds to first available debit account
    const updatedAccounts = [...bankAccounts];
    const debitAccount = updatedAccounts.find(acc => acc.accountType === 'debit');
    if (debitAccount) {
      const accountIndex = updatedAccounts.findIndex(acc => acc.id === debitAccount.id);
      updatedAccounts[accountIndex] = { 
        ...debitAccount, 
        balance: debitAccount.balance + total 
      };
      saveBankAccounts(updatedAccounts);
    }

    const next = {
      ...portfolio,
      holdings: newHoldings,
      transactions: [...portfolio.transactions, {
        type: 'sell', symbol: sym, shares, price, total, date: new Date().toLocaleString('es-MX'),
      }],
    };
    updatePortfolio(next);
    setTradeSymbol('');
    setTradeShares('');
  };

  // Deposit / withdraw to/from specific bank account
  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    const accountId = parseInt(selectedBankAccount);
    if (isNaN(amount) || amount <= 0 || !accountId) return;
    
    const amountUSD = toUSD(amount);
    const accountIndex = bankAccounts.findIndex(acc => acc.id === accountId);
    if (accountIndex === -1) return;
    
    const account = bankAccounts[accountIndex];
    const delta = depositMode === 'deposit' ? amountUSD : -amountUSD;
    
    // Update bank account balance (can go negative)
    const updatedAccounts = [...bankAccounts];
    updatedAccounts[accountIndex] = {
      ...account,
      balance: account.balance + delta
    };
    saveBankAccounts(updatedAccounts);
    
    // Record transaction
    const next = {
      ...portfolio,
      deposits: [...portfolio.deposits, { 
        type: depositMode, 
        amount: amountUSD, 
        date: new Date().toISOString(),
        bankAccount: account.name,
        bankAccountId: accountId
      }],
      transactions: [...portfolio.transactions, {
        type: depositMode, 
        amount: amountUSD, 
        date: new Date().toLocaleString('es-MX'),
        bankAccount: account.name
      }],
    };
    updatePortfolio(next);
    setDepositAmount('');
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

      {/* Trading and Banking Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Deposit / Withdraw to specific bank account */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">{lang === 'es' ? 'Depositar/Retirar' : 'Deposit/Withdraw'}</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setDepositMode('deposit')} className={`flex-1 py-1.5 rounded text-sm font-medium ${depositMode === 'deposit' ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{t('label_deposit', lang)}</button>
            <button onClick={() => setDepositMode('withdraw')} className={`flex-1 py-1.5 rounded text-sm font-medium ${depositMode === 'withdraw' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{t('label_withdraw', lang)}</button>
          </div>
          
          {/* Bank account selector */}
          <select
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
            value={selectedBankAccount}
            onChange={(e) => setSelectedBankAccount(e.target.value)}
          >
            <option value="">{lang === 'es' ? 'Seleccionar cuenta' : 'Select account'}</option>
            {bankAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} - {fmt(account.balance)} 
                {account.balance < 0 && ` (${lang === 'es' ? 'DEUDA' : 'DEBT'})`}
                ({account.accountType === 'debit' ? (lang === 'es' ? 'Débito' : 'Debit') : (lang === 'es' ? 'Crédito' : 'Credit')})
              </option>
            ))}
          </select>
          
          <input
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
            placeholder={`${lang === 'es' ? 'Cantidad en' : 'Amount in'} ${currency}`}
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
          <button 
            onClick={handleDeposit} 
            disabled={!selectedBankAccount}
            className={`w-full py-2 rounded text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed ${depositMode === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {depositMode === 'deposit' ? `+ ${t('label_deposit', lang)}` : `- ${t('label_withdraw', lang)}`}
          </button>
          <p className="text-slate-500 text-xs mt-2">{t('portfolio_deposited', lang)}: {fmt(totalDeposited)} · {t('portfolio_withdrawn', lang)}: {fmt(totalWithdrawn)}</p>
          <p className="text-slate-500 text-xs">{t('portfolio_dividends_received', lang)}: {fmt(portfolio.dividendsReceived)}</p>
        </div>

        {/* Buy / Sell */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <h3 className="text-white font-semibold mb-3">{t('portfolio_buy_sell', lang)}</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setTradeMode('buy')} className={`flex-1 py-1.5 rounded text-sm font-medium ${tradeMode === 'buy' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{t('label_buy', lang)}</button>
            <button onClick={() => setTradeMode('sell')} className={`flex-1 py-1.5 rounded text-sm font-medium ${tradeMode === 'sell' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{t('label_sell', lang)}</button>
          </div>
          <StockSuggest
            value={tradeSymbol}
            onChange={setTradeSymbol}
            placeholder={t('portfolio_symbol_placeholder', lang)}
            comparatorStocks={comparatorStocks}
            holdingSymbols={Object.keys(portfolio.holdings)}
            lang={lang}
          />
          <input
            className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
            placeholder={t('portfolio_shares_placeholder', lang)}
            type="number"
            value={tradeShares}
            onChange={(e) => setTradeShares(e.target.value)}
          />
          {tradeSymbol && prices[tradeSymbol] && (
            <p className="text-slate-400 text-xs mb-2">
              {t('portfolio_current_price_total', lang)}: {fmt(prices[tradeSymbol])} · {t('portfolio_total', lang)}: {fmt(prices[tradeSymbol] * (parseFloat(tradeShares) || 0))}
            </p>
          )}
          {tradeError && (
            <div className="mb-2">
              <p className="text-red-400 text-xs">{tradeError}</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {lang === 'es' ? 'Revisa el código en Acerca → Códigos.' : 'Check the symbol in About → Symbol Codes.'}
              </p>
            </div>
          )}
          <button
            onClick={tradeMode === 'buy' ? handleBuy : handleSell}
            className={`w-full py-2 rounded text-sm font-medium text-white ${tradeMode === 'buy' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
            {tradeMode === 'buy' ? t('label_buy', lang) : t('label_sell', lang)}
          </button>
        </div>

        {/* Bank Account Management */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">{lang === 'es' ? 'Cuentas Bancarias' : 'Bank Accounts'}</h3>
            <button
              onClick={() => setShowBankSection(!showBankSection)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-semibold"
            >
              {showBankSection ? (lang === 'es' ? 'Ocultar' : 'Hide') : (lang === 'es' ? 'Agregar' : 'Add')}
            </button>
          </div>

          {/* Bank accounts list */}
          <div className="space-y-2 mb-3">
            {bankAccounts.map(account => (
              <div key={account.id} className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white font-semibold text-sm">{account.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditingAccount(account)}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => removeBankAccount(account.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className={`text-lg font-bold ${account.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {fmt(account.balance)}
                </p>
                <div className="text-xs text-slate-400 mt-1">
                  <span>{account.accountType === 'debit' ? (lang === 'es' ? 'Débito' : 'Debit') : (lang === 'es' ? 'Crédito' : 'Credit')}</span>
                  {account.annualRate > 0 && <span> · {account.annualRate}% {lang === 'es' ? 'crecimiento' : 'growth'}</span>}
                  {account.interestRate > 0 && account.accountType === 'credit' && <span> · {account.interestRate}% {lang === 'es' ? 'interés' : 'interest'}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Add/Edit bank account form */}
          {showBankSection && (
            <div className="border-t border-slate-600 pt-3">
              <h4 className="text-white font-semibold mb-2 text-sm">
                {editingAccount ? (lang === 'es' ? 'Editar Cuenta' : 'Edit Account') : (lang === 'es' ? 'Nueva Cuenta' : 'New Account')}
              </h4>
              <input
                className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                placeholder={lang === 'es' ? 'Nombre de la cuenta' : 'Account name'}
                value={newBank.name}
                onChange={(e) => setNewBank(prev => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                placeholder={`${lang === 'es' ? 'Balance inicial en' : 'Initial balance in'} ${currency}`}
                type="number"
                value={newBank.balance}
                onChange={(e) => setNewBank(prev => ({ ...prev, balance: e.target.value }))}
              />
              <select
                className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                value={newBank.accountType}
                onChange={(e) => setNewBank(prev => ({ ...prev, accountType: e.target.value, interestRate: e.target.value === 'debit' ? '' : prev.interestRate }))}
              >
                <option value="debit">{lang === 'es' ? 'Cuenta de Débito' : 'Debit Account'}</option>
                <option value="credit">{lang === 'es' ? 'Cuenta de Crédito' : 'Credit Account'}</option>
              </select>
              <input
                className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                placeholder={`${lang === 'es' ? 'Tasa de crecimiento anual' : 'Annual growth rate'} (%)`}
                type="number"
                step="0.1"
                value={newBank.annualRate}
                onChange={(e) => setNewBank(prev => ({ ...prev, annualRate: e.target.value }))}
              />
              {newBank.accountType === 'credit' && (
                <input
                  className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                  placeholder={`${lang === 'es' ? 'Tasa de interés anual' : 'Annual interest rate'} (%)`}
                  type="number"
                  step="0.1"
                  value={newBank.interestRate}
                  onChange={(e) => setNewBank(prev => ({ ...prev, interestRate: e.target.value }))}
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={addBankAccount}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-semibold"
                >
                  {editingAccount ? (lang === 'es' ? 'Actualizar' : 'Update') : (lang === 'es' ? 'Agregar' : 'Add')}
                </button>
                {editingAccount && (
                  <button
                    onClick={cancelEditing}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 rounded text-sm font-semibold"
                  >
                    {lang === 'es' ? 'Cancelar' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Apply growth button */}
          {bankAccounts.length > 0 && (
            <button
              onClick={applyBankGrowth}
              className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm font-semibold"
            >
              {lang === 'es' ? 'Aplicar Crecimiento Mensual' : 'Apply Monthly Growth'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}