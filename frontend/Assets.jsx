import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react';
import { t } from './i18n';

const WORKER_BASE = 'https://proxy.stockcmp-proxy.workers.dev';

export default function Assets({ 
  currency = 'USD', 
  rates = {}, 
  lang = 'es',
  initialPortfolio,
  onPortfolioChange,
  comparatorStocks = []
}) {
  const [portfolio, setPortfolio] = useState({
    bankAccounts: [],
    deposits: [],
    transactions: [],
    holdings: {}
  });
  
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [bankForm, setBankForm] = useState({
    name: '',
    type: 'debit',
    balance: '',
    annualRate: '',
    interestRate: '',
    interestFrequency: 'annual',
    fees: []
  });
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositForm, setDepositForm] = useState({
    accountId: '',
    amount: '',
    type: 'deposit'
  });
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [buyForm, setBuyForm] = useState({
    symbol: '',
    shares: '',
    accountId: ''
  });
  const [prices, setPrices] = useState({});
  const [loadingPrices, setLoadingPrices] = useState(false);

  // Currency formatter
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
      setPortfolio(prev => ({
        ...prev,
        bankAccounts: initialPortfolio.bankAccounts || [],
        deposits: initialPortfolio.deposits || [],
        transactions: initialPortfolio.transactions || [],
        holdings: initialPortfolio.holdings || {}
      }));
    }
  }, [initialPortfolio]);

  // Save portfolio changes
  const savePortfolio = useCallback((newPortfolio) => {
    setPortfolio(newPortfolio);
    if (onPortfolioChange) {
      onPortfolioChange(newPortfolio);
    }
  }, [onPortfolioChange]);

  // Fetch stock prices
  const fetchPrices = useCallback(async () => {
    const symbols = Object.keys(portfolio.holdings || {});
    if (symbols.length === 0) return;

    setLoadingPrices(true);
    try {
      const promises = symbols.map(async (symbol) => {
        try {
          const response = await fetch(`${WORKER_BASE}/api/stock/${symbol}`);
          const data = await response.json();
          return { symbol, price: data.price || 0 };
        } catch (error) {
          console.error(`Error fetching price for ${symbol}:`, error);
          return { symbol, price: 0 };
        }
      });

      const results = await Promise.all(promises);
      const newPrices = {};
      results.forEach(({ symbol, price }) => {
        newPrices[symbol] = price;
      });
      setPrices(newPrices);
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      setLoadingPrices(false);
    }
  }, [portfolio.holdings]);

  // Fetch prices when holdings change
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Add or edit bank account
  const addBankAccount = () => {
    if (!bankForm.name.trim()) return;

    const account = {
      id: editingAccount?.id || Date.now().toString(),
      name: bankForm.name.trim(),
      type: bankForm.type,
      balance: parseFloat(bankForm.balance) || 0,
      annualRate: parseFloat(bankForm.annualRate) || 0,
      interestRate: bankForm.type === 'credit' ? (parseFloat(bankForm.interestRate) || 0) : 0,
      interestFrequency: bankForm.interestFrequency,
      fees: bankForm.fees || [],
      createdAt: editingAccount?.createdAt || new Date().toISOString()
    };

    const newPortfolio = { ...portfolio };
    
    if (editingAccount) {
      // Edit existing account
      const index = newPortfolio.bankAccounts.findIndex(a => a.id === editingAccount.id);
      if (index !== -1) {
        newPortfolio.bankAccounts[index] = account;
      }
    } else {
      // Add new account
      newPortfolio.bankAccounts = [...(newPortfolio.bankAccounts || []), account];
    }

    savePortfolio(newPortfolio);
    resetBankForm();
  };

  const resetBankForm = () => {
    setBankForm({
      name: '',
      type: 'debit',
      balance: '',
      annualRate: '',
      interestRate: '',
      interestFrequency: 'annual',
      fees: []
    });
    setShowBankForm(false);
    setEditingAccount(null);
  };

  const startEditingAccount = (account) => {
    setBankForm({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      annualRate: account.annualRate.toString(),
      interestRate: account.interestRate?.toString() || '',
      interestFrequency: account.interestFrequency || 'annual',
      fees: account.fees || []
    });
    setEditingAccount(account);
    setShowBankForm(true);
  };

  const deleteBankAccount = (accountId) => {
    if (!confirm(lang === 'es' ? '¿Eliminar esta cuenta?' : 'Delete this account?')) return;
    
    const newPortfolio = {
      ...portfolio,
      bankAccounts: portfolio.bankAccounts.filter(a => a.id !== accountId)
    };
    savePortfolio(newPortfolio);
  };

  // Handle stock purchase
  const handleBuyStock = async () => {
    if (!buyForm.symbol || !buyForm.shares || !buyForm.accountId) return;

    const symbol = buyForm.symbol.toUpperCase().trim();
    const shares = parseFloat(buyForm.shares);
    
    if (isNaN(shares) || shares <= 0) return;

    try {
      // Get current stock price
      const response = await fetch(`${WORKER_BASE}/api/stock/${symbol}`);
      const data = await response.json();
      
      if (!data.price || data.price <= 0) {
        alert(lang === 'es' ? 'No se pudo obtener el precio de la acción' : 'Could not get stock price');
        return;
      }

      const totalCost = shares * data.price;
      
      // Check if account has enough balance
      const account = portfolio.bankAccounts.find(a => a.id === buyForm.accountId);
      if (!account || account.balance < totalCost) {
        alert(lang === 'es' ? 'Saldo insuficiente en la cuenta' : 'Insufficient account balance');
        return;
      }

      const newPortfolio = { ...portfolio };
      
      // Update account balance
      const accountIndex = newPortfolio.bankAccounts.findIndex(a => a.id === buyForm.accountId);
      newPortfolio.bankAccounts[accountIndex].balance -= totalCost;
      
      // Update holdings
      if (!newPortfolio.holdings) newPortfolio.holdings = {};
      
      if (newPortfolio.holdings[symbol]) {
        // Add to existing holding
        const existing = newPortfolio.holdings[symbol];
        const totalShares = existing.shares + shares;
        const totalValue = (existing.shares * existing.avgCost) + totalCost;
        newPortfolio.holdings[symbol] = {
          shares: totalShares,
          avgCost: totalValue / totalShares
        };
      } else {
        // New holding
        newPortfolio.holdings[symbol] = {
          shares: shares,
          avgCost: data.price
        };
      }
      
      // Add transaction record
      const transaction = {
        id: Date.now().toString(),
        type: 'buy',
        symbol: symbol,
        shares: shares,
        price: data.price,
        total: totalCost,
        accountId: buyForm.accountId,
        date: new Date().toISOString()
      };
      
      newPortfolio.transactions = [...(newPortfolio.transactions || []), transaction];
      
      savePortfolio(newPortfolio);
      
      // Reset form
      setBuyForm({
        symbol: '',
        shares: '',
        accountId: ''
      });
      setShowBuyForm(false);
      
      // Update prices
      setPrices(prev => ({ ...prev, [symbol]: data.price }));
      
    } catch (error) {
      console.error('Error buying stock:', error);
      alert(lang === 'es' ? 'Error al comprar la acción' : 'Error buying stock');
    }
  };

  // Stock suggestion component
  const StockSuggest = ({ value, onChange, placeholder }) => {
    const [focused, setFocused] = useState(false);
    const suggestions = [...new Set([...(comparatorStocks || [])])];

    return (
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          placeholder={placeholder}
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
  };
  const handleDeposit = () => {
    if (!depositForm.accountId || !depositForm.amount) return;

    const amount = parseFloat(depositForm.amount);
    if (isNaN(amount) || amount === 0) return;

    const newPortfolio = { ...portfolio };
    
    // Update account balance
    const accountIndex = newPortfolio.bankAccounts.findIndex(a => a.id === depositForm.accountId);
    if (accountIndex !== -1) {
      if (depositForm.type === 'deposit') {
        newPortfolio.bankAccounts[accountIndex].balance += amount;
      } else {
        newPortfolio.bankAccounts[accountIndex].balance -= amount;
      }
    }

    // Add transaction record
    const transaction = {
      id: Date.now().toString(),
      type: depositForm.type,
      amount: Math.abs(amount),
      accountId: depositForm.accountId,
      date: new Date().toISOString(),
      description: depositForm.type === 'deposit' 
        ? (lang === 'es' ? 'Depósito' : 'Deposit')
        : (lang === 'es' ? 'Retiro' : 'Withdrawal')
    };

    newPortfolio.deposits = [...(newPortfolio.deposits || []), transaction];
    savePortfolio(newPortfolio);

    // Reset form
    setDepositForm({
      accountId: '',
      amount: '',
      type: 'deposit'
    });
    setShowDepositForm(false);
  };

  // Calculate totals
  const bankAccounts = portfolio.bankAccounts || [];
  const totalBalance = bankAccounts.reduce((sum, account) => sum + account.balance, 0);
  const positiveBalance = bankAccounts.reduce((sum, account) => sum + Math.max(0, account.balance), 0);
  const negativeBalance = bankAccounts.reduce((sum, account) => sum + Math.min(0, account.balance), 0);
  
  // Calculate stock values
  const holdings = portfolio.holdings || {};
  const stockValue = Object.entries(holdings).reduce((sum, [symbol, holding]) => {
    const currentPrice = prices[symbol] || holding.avgCost || 0;
    return sum + (holding.shares * currentPrice);
  }, 0);
  
  const totalAssets = totalBalance + stockValue;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              {lang === 'es' ? 'Activos' : 'Assets'}
            </h1>
            <p className="text-slate-400 text-sm">
              {lang === 'es' 
                ? 'Gestiona tus cuentas bancarias, depósitos y retiros'
                : 'Manage your bank accounts, deposits and withdrawals'
              }
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm mb-1">
              {lang === 'es' ? 'Activos Totales' : 'Total Assets'}
            </p>
            <p className={`text-3xl font-bold ${totalAssets >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtCurrency(totalAssets)}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-slate-300">
                {lang === 'es' ? 'Efectivo' : 'Cash'}: <span className="text-green-400 font-semibold">{fmtCurrency(positiveBalance)}</span>
              </span>
              <span className="text-slate-300">
                {lang === 'es' ? 'Acciones' : 'Stocks'}: <span className="text-blue-400 font-semibold">{fmtCurrency(stockValue)}</span>
              </span>
              {negativeBalance < 0 && (
                <span className="text-slate-300">
                  {lang === 'es' ? 'Deuda' : 'Debt'}: <span className="text-red-400 font-semibold">{fmtCurrency(Math.abs(negativeBalance))}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => setShowBankForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          {lang === 'es' ? 'Nueva Cuenta' : 'New Account'}
        </button>
        <button
          onClick={() => setShowDepositForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <DollarSign size={16} />
          {lang === 'es' ? 'Depósito/Retiro' : 'Deposit/Withdrawal'}
        </button>
        <button
          onClick={() => setShowBuyForm(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <ShoppingCart size={16} />
          {lang === 'es' ? 'Comprar Acciones' : 'Buy Stocks'}
        </button>
      </div>

      {/* Bank Accounts List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">
          {lang === 'es' ? 'Cuentas Bancarias' : 'Bank Accounts'}
        </h2>
        
        {bankAccounts.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700">
            <p className="text-slate-400 mb-4">
              {lang === 'es' 
                ? 'No tienes cuentas bancarias aún'
                : 'You don\'t have any bank accounts yet'
              }
            </p>
            <button
              onClick={() => setShowBankForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
            >
              {lang === 'es' ? 'Crear Primera Cuenta' : 'Create First Account'}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bankAccounts.map((account) => (
              <div key={account.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{account.name}</h3>
                    <p className="text-slate-400 text-sm capitalize">
                      {account.type === 'debit' 
                        ? (lang === 'es' ? 'Débito' : 'Debit')
                        : (lang === 'es' ? 'Crédito' : 'Credit')
                      }
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditingAccount(account)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteBankAccount(account.id)}
                      className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">
                      {lang === 'es' ? 'Balance' : 'Balance'}
                    </span>
                    <span className={`font-bold ${account.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmtCurrency(account.balance)}
                    </span>
                  </div>
                  
                  {account.annualRate > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">
                        {lang === 'es' ? 'Crecimiento' : 'Growth'}
                      </span>
                      <span className="text-blue-400 font-medium">
                        {account.annualRate.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  
                  {account.type === 'credit' && account.interestRate > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">
                        {lang === 'es' ? 'Interés' : 'Interest'}
                      </span>
                      <span className="text-red-400 font-medium">
                        {account.interestRate.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  
                  {account.fees && account.fees.length > 0 && (
                    <div className="text-xs text-slate-500">
                      {account.fees.length} {lang === 'es' ? 'comisiones' : 'fees'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stock Holdings */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">
          {lang === 'es' ? 'Acciones' : 'Stock Holdings'}
        </h2>
        
        {Object.keys(holdings).length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700">
            <p className="text-slate-400 mb-4">
              {lang === 'es' 
                ? 'No tienes acciones aún'
                : 'You don\'t have any stocks yet'
              }
            </p>
            <button
              onClick={() => setShowBuyForm(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold"
            >
              {lang === 'es' ? 'Comprar Primera Acción' : 'Buy First Stock'}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(holdings).map(([symbol, holding]) => {
              const currentPrice = prices[symbol] || holding.avgCost || 0;
              const currentValue = holding.shares * currentPrice;
              const totalCost = holding.shares * holding.avgCost;
              const gain = currentValue - totalCost;
              const gainPercent = totalCost > 0 ? (gain / totalCost) * 100 : 0;
              
              return (
                <div key={symbol} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{symbol}</h3>
                      <p className="text-slate-400 text-sm">
                        {holding.shares} {lang === 'es' ? 'acciones' : 'shares'}
                      </p>
                    </div>
                    {loadingPrices && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">
                        {lang === 'es' ? 'Precio Actual' : 'Current Price'}
                      </span>
                      <span className="text-white font-medium">
                        {fmtCurrency(currentPrice)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">
                        {lang === 'es' ? 'Precio Promedio' : 'Average Cost'}
                      </span>
                      <span className="text-slate-300 font-medium">
                        {fmtCurrency(holding.avgCost)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">
                        {lang === 'es' ? 'Valor Actual' : 'Current Value'}
                      </span>
                      <span className="text-white font-bold">
                        {fmtCurrency(currentValue)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">
                        {lang === 'es' ? 'Ganancia/Pérdida' : 'Gain/Loss'}
                      </span>
                      <div className="text-right">
                        <div className={`font-bold ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {fmtCurrency(gain)}
                        </div>
                        <div className={`text-xs ${gainPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bank Account Form Modal */}
      {showBankForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-600 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-3 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg">
                {editingAccount 
                  ? (lang === 'es' ? 'Editar Cuenta' : 'Edit Account')
                  : (lang === 'es' ? 'Nueva Cuenta Bancaria' : 'New Bank Account')
                }
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Nombre de la cuenta' : 'Account name'}
                </label>
                <input
                  type="text"
                  value={bankForm.name}
                  onChange={(e) => setBankForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={lang === 'es' ? 'Ej: Cuenta Principal' : 'Ex: Main Account'}
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Tipo de cuenta' : 'Account type'}
                </label>
                <select
                  value={bankForm.type}
                  onChange={(e) => setBankForm(prev => ({ 
                    ...prev, 
                    type: e.target.value,
                    interestRate: e.target.value === 'debit' ? '' : prev.interestRate
                  }))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="debit">{lang === 'es' ? 'Débito' : 'Debit'}</option>
                  <option value="credit">{lang === 'es' ? 'Crédito' : 'Credit'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Balance inicial' : 'Initial balance'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bankForm.balance}
                  onChange={(e) => setBankForm(prev => ({ ...prev, balance: e.target.value }))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Tasa de crecimiento anual (%)' : 'Annual growth rate (%)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bankForm.annualRate}
                  onChange={(e) => setBankForm(prev => ({ ...prev, annualRate: e.target.value }))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {bankForm.type === 'credit' && (
                <>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      {lang === 'es' ? 'Tasa de interés (%)' : 'Interest rate (%)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={bankForm.interestRate}
                      onChange={(e) => setBankForm(prev => ({ ...prev, interestRate: e.target.value }))}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      {lang === 'es' ? 'Frecuencia de interés' : 'Interest frequency'}
                    </label>
                    <select
                      value={bankForm.interestFrequency}
                      onChange={(e) => setBankForm(prev => ({ ...prev, interestFrequency: e.target.value }))}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="weekly">{lang === 'es' ? 'Semanal' : 'Weekly'}</option>
                      <option value="monthly">{lang === 'es' ? 'Mensual' : 'Monthly'}</option>
                      <option value="annual">{lang === 'es' ? 'Anual' : 'Annual'}</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetBankForm}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={addBankAccount}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  {editingAccount 
                    ? (lang === 'es' ? 'Guardar' : 'Save')
                    : (lang === 'es' ? 'Crear' : 'Create')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deposit/Withdrawal Form Modal */}
      {showDepositForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-600 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="bg-gradient-to-r from-green-700 to-green-500 px-6 py-3 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg">
                {lang === 'es' ? 'Depósito / Retiro' : 'Deposit / Withdrawal'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Cuenta' : 'Account'}
                </label>
                <select
                  value={depositForm.accountId}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{lang === 'es' ? 'Seleccionar cuenta' : 'Select account'}</option>
                  {bankAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({fmtCurrency(account.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Tipo' : 'Type'}
                </label>
                <select
                  value={depositForm.type}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="deposit">{lang === 'es' ? 'Depósito' : 'Deposit'}</option>
                  <option value="withdraw">{lang === 'es' ? 'Retiro' : 'Withdrawal'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Cantidad' : 'Amount'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDepositForm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={handleDeposit}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  {depositForm.type === 'deposit' 
                    ? (lang === 'es' ? 'Depositar' : 'Deposit')
                    : (lang === 'es' ? 'Retirar' : 'Withdraw')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buy Stock Form Modal */}
      {showBuyForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-600 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-6 py-3 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg">
                {lang === 'es' ? 'Comprar Acciones' : 'Buy Stocks'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Símbolo de la acción' : 'Stock symbol'}
                </label>
                <StockSuggest
                  value={buyForm.symbol}
                  onChange={(value) => setBuyForm(prev => ({ ...prev, symbol: value }))}
                  placeholder={lang === 'es' ? 'Ej: AAPL' : 'Ex: AAPL'}
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Número de acciones' : 'Number of shares'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={buyForm.shares}
                  onChange={(e) => setBuyForm(prev => ({ ...prev, shares: e.target.value }))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Pagar desde cuenta' : 'Pay from account'}
                </label>
                <select
                  value={buyForm.accountId}
                  onChange={(e) => setBuyForm(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">{lang === 'es' ? 'Seleccionar cuenta' : 'Select account'}</option>
                  {bankAccounts.filter(account => account.balance > 0).map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({fmtCurrency(account.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowBuyForm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={handleBuyStock}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  {lang === 'es' ? 'Comprar' : 'Buy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}