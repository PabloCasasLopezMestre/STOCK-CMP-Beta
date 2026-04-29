import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, DollarSign, TrendingUp, TrendingDown, ShoppingCart, History, BarChart3, Home } from 'lucide-react';
import { t } from './i18n';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const WORKER_BASE = 'https://proxy.stockcmp-proxy.workers.dev';

// Stock suggestion component (moved outside to prevent re-renders)
const StockSuggest = ({ value, onChange, placeholder, comparatorStocks = [] }) => {
  const [focused, setFocused] = useState(false);
  // Combine comparator stocks with popular symbols
  const popularSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
  const suggestions = [...new Set([...popularSymbols, ...comparatorStocks])];

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
        <div className="absolute top-full left-0 right-0 z-20 bg-slate-800 border border-slate-600 rounded-lg mt-0.5 overflow-hidden shadow-lg max-h-40 overflow-y-auto">
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
    holdings: {},
    physicalAssets: [] // New: for cars, houses, land, etc.
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
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetForm, setAssetForm] = useState({
    name: '',
    type: 'house', // house, car, land, other
    purchasePrice: '',
    currentValue: '',
    paymentMethod: 'cash', // cash, installments_with_down, installments_no_down, installments_no_interest, installments_with_interest
    downPayment: '',
    installments: '',
    interestRate: '',
    interestAfterMonths: '',
    accountId: ''
  });
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [showAssetsChart, setShowAssetsChart] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
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
        holdings: initialPortfolio.holdings || {},
        physicalAssets: initialPortfolio.physicalAssets || []
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
          const url = `${WORKER_BASE}/api/stock/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Error ${response.status} para ${symbol}`);
          const data = await response.json();
          
          if (!data.chart?.result?.[0]) {
            console.warn(`No data for ${symbol}`);
            return { symbol, price: 0 };
          }
          
          const result = data.chart.result[0];
          const closes = result.indicators?.quote?.[0]?.close ?? [];
          const price = closes.filter(Boolean).pop() || 0;
          return { symbol, price };
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
      // Get current stock price using the same method as StockComparisonApp
      console.log(`Fetching price for symbol: ${symbol}`);
      const url = `${WORKER_BASE}/api/stock/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
      const response = await fetch(url);
      
      console.log(`API response status for ${symbol}:`, response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error for ${symbol}:`, errorText);
        alert(lang === 'es' 
          ? `Error del servidor (${response.status}): No se pudo obtener el precio`
          : `Server error (${response.status}): Could not get price`
        );
        return;
      }
      
      const data = await response.json();
      console.log(`API data for ${symbol}:`, data);
      
      if (!data.chart?.result?.[0]) {
        alert(lang === 'es' 
          ? `No se encontraron datos para ${symbol}. Verifica que el símbolo sea correcto.`
          : `No data found for ${symbol}. Please verify the symbol is correct.`
        );
        return;
      }
      
      // Extract price using the same method as StockComparisonApp
      const result = data.chart.result[0];
      const closes = result.indicators?.quote?.[0]?.close ?? [];
      const price = closes.filter(Boolean).pop();
      
      if (!price || price <= 0) {
        alert(lang === 'es' 
          ? `No se encontró precio válido para ${symbol}. El símbolo puede no estar disponible.`
          : `No valid price found for ${symbol}. The symbol may not be available.`
        );
        return;
      }

      console.log(`Price for ${symbol}:`, price);
      const totalCost = shares * price;
      
      // Check if account has enough balance or credit limit
      const account = portfolio.bankAccounts.find(a => a.id === buyForm.accountId);
      if (!account) {
        alert(lang === 'es' ? 'Cuenta no encontrada' : 'Account not found');
        return;
      }

      // For credit accounts, allow negative balance (debt)
      // For debit accounts, require positive balance
      if (account.type === 'debit' && account.balance < totalCost) {
        alert(lang === 'es' ? 'Saldo insuficiente en cuenta de débito' : 'Insufficient balance in debit account');
        return;
      }
      
      // For credit accounts, we allow going into debt (no limit check for now)
      // In a real system, you'd check against a credit limit

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
          avgCost: price
        };
      }
      
      // Add transaction record
      const transaction = {
        id: Date.now().toString(),
        type: 'buy',
        symbol: symbol,
        shares: shares,
        price: price,
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
      setPrices(prev => ({ ...prev, [symbol]: price }));
      
      // Show success message
      alert(lang === 'es' 
        ? `¡Compra exitosa! ${shares} acciones de ${symbol} por ${fmtCurrency(totalCost)}`
        : `Purchase successful! ${shares} shares of ${symbol} for ${fmtCurrency(totalCost)}`
      );
      
    } catch (error) {
      console.error('Error buying stock:', error);
      alert(lang === 'es' 
        ? `Error al comprar la acción: ${error.message}`
        : `Error buying stock: ${error.message}`
      );
    }
  };

  // Handle physical asset registration
  const handleAddPhysicalAsset = () => {
    if (!assetForm.name || !assetForm.purchasePrice || !assetForm.currentValue) return;

    const purchasePrice = parseFloat(assetForm.purchasePrice);
    const currentValue = parseFloat(assetForm.currentValue);
    
    if (isNaN(purchasePrice) || isNaN(currentValue)) return;

    const newPortfolio = { ...portfolio };
    
    // Calculate payment details based on method
    let paymentDetails = {};
    
    if (assetForm.paymentMethod === 'cash') {
      // Cash payment - deduct full amount from account
      const accountIndex = newPortfolio.bankAccounts.findIndex(a => a.id === assetForm.accountId);
      if (accountIndex !== -1) {
        if (newPortfolio.bankAccounts[accountIndex].type === 'debit' && 
            newPortfolio.bankAccounts[accountIndex].balance < purchasePrice) {
          alert(lang === 'es' ? 'Saldo insuficiente para pago en efectivo' : 'Insufficient balance for cash payment');
          return;
        }
        newPortfolio.bankAccounts[accountIndex].balance -= purchasePrice;
      }
      paymentDetails = { method: 'cash', totalPaid: purchasePrice };
    } else {
      // Installment payments
      const downPayment = parseFloat(assetForm.downPayment) || 0;
      const installments = parseInt(assetForm.installments) || 1;
      const interestRate = parseFloat(assetForm.interestRate) || 0;
      const interestAfterMonths = parseInt(assetForm.interestAfterMonths) || 0;
      
      // Deduct down payment if any
      if (downPayment > 0) {
        const accountIndex = newPortfolio.bankAccounts.findIndex(a => a.id === assetForm.accountId);
        if (accountIndex !== -1) {
          if (newPortfolio.bankAccounts[accountIndex].type === 'debit' && 
              newPortfolio.bankAccounts[accountIndex].balance < downPayment) {
            alert(lang === 'es' ? 'Saldo insuficiente para el enganche' : 'Insufficient balance for down payment');
            return;
          }
          newPortfolio.bankAccounts[accountIndex].balance -= downPayment;
        }
      }
      
      paymentDetails = {
        method: assetForm.paymentMethod,
        totalPrice: purchasePrice,
        downPayment,
        remainingAmount: purchasePrice - downPayment,
        installments,
        interestRate,
        interestAfterMonths,
        monthlyPayment: (purchasePrice - downPayment) / installments,
        paidInstallments: 0,
        accountId: assetForm.accountId
      };
    }

    const asset = {
      id: editingAsset?.id || Date.now().toString(),
      name: assetForm.name.trim(),
      type: assetForm.type,
      purchasePrice,
      currentValue,
      purchaseDate: editingAsset?.purchaseDate || new Date().toISOString(),
      paymentDetails,
      createdAt: editingAsset?.createdAt || new Date().toISOString()
    };

    if (editingAsset) {
      // Edit existing asset
      const index = newPortfolio.physicalAssets.findIndex(a => a.id === editingAsset.id);
      if (index !== -1) {
        newPortfolio.physicalAssets[index] = asset;
      }
    } else {
      // Add new asset
      newPortfolio.physicalAssets = [...(newPortfolio.physicalAssets || []), asset];
    }

    // Add transaction record
    const transaction = {
      id: Date.now().toString() + '_asset',
      type: editingAsset ? 'asset_update' : 'asset_purchase',
      assetId: asset.id,
      assetName: asset.name,
      amount: editingAsset ? 0 : (assetForm.paymentMethod === 'cash' ? purchasePrice : downPayment),
      date: new Date().toISOString(),
      description: editingAsset 
        ? `${lang === 'es' ? 'Actualización de' : 'Update of'} ${asset.name}`
        : `${lang === 'es' ? 'Compra de' : 'Purchase of'} ${asset.name}`
    };

    newPortfolio.transactions = [...(newPortfolio.transactions || []), transaction];
    
    savePortfolio(newPortfolio);
    resetAssetForm();
  };

  const resetAssetForm = () => {
    setAssetForm({
      name: '',
      type: 'house',
      purchasePrice: '',
      currentValue: '',
      paymentMethod: 'cash',
      downPayment: '',
      installments: '',
      interestRate: '',
      interestAfterMonths: '',
      accountId: ''
    });
    setShowAssetForm(false);
    setEditingAsset(null);
  };

  const startEditingAsset = (asset) => {
    setAssetForm({
      name: asset.name,
      type: asset.type,
      purchasePrice: asset.purchasePrice.toString(),
      currentValue: asset.currentValue.toString(),
      paymentMethod: asset.paymentDetails.method,
      downPayment: asset.paymentDetails.downPayment?.toString() || '',
      installments: asset.paymentDetails.installments?.toString() || '',
      interestRate: asset.paymentDetails.interestRate?.toString() || '',
      interestAfterMonths: asset.paymentDetails.interestAfterMonths?.toString() || '',
      accountId: asset.paymentDetails.accountId || ''
    });
    setEditingAsset(asset);
    setShowAssetForm(true);
  };

  const deletePhysicalAsset = (assetId) => {
    if (!confirm(lang === 'es' ? '¿Eliminar este activo?' : 'Delete this asset?')) return;
    
    const newPortfolio = {
      ...portfolio,
      physicalAssets: portfolio.physicalAssets.filter(a => a.id !== assetId)
    };
    savePortfolio(newPortfolio);
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
  
  // Calculate available credit for credit accounts
  const availableCredit = bankAccounts
    .filter(account => account.type === 'credit' && account.balance < 0)
    .reduce((sum, account) => sum + Math.abs(account.balance), 0);
  
  // Calculate stock values
  const holdings = portfolio.holdings || {};
  const stockValue = Object.entries(holdings).reduce((sum, [symbol, holding]) => {
    const currentPrice = prices[symbol] || holding.avgCost || 0;
    return sum + (holding.shares * currentPrice);
  }, 0);
  
  // Calculate physical assets value
  const physicalAssets = portfolio.physicalAssets || [];
  const physicalAssetsValue = physicalAssets.reduce((sum, asset) => sum + asset.currentValue, 0);
  
  const totalAssets = totalBalance + stockValue + physicalAssetsValue;

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
                ? 'Registra y administra tu patrimonio financiero de manera integral'
                : 'Register and manage your financial assets comprehensively'
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
              <span className="text-slate-300">
                {lang === 'es' ? 'Activos Físicos' : 'Physical Assets'}: <span className="text-purple-400 font-semibold">{fmtCurrency(physicalAssetsValue)}</span>
              </span>
              {negativeBalance < 0 && (
                <span className="text-slate-300">
                  {lang === 'es' ? 'Deuda' : 'Debt'}: <span className="text-red-400 font-semibold">{fmtCurrency(Math.abs(negativeBalance))}</span>
                </span>
              )}
              {availableCredit > 0 && (
                <span className="text-slate-300">
                  {lang === 'es' ? 'Crédito usado' : 'Credit used'}: <span className="text-orange-400 font-semibold">{fmtCurrency(availableCredit)}</span>
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
          {lang === 'es' ? 'Registra Nueva Cuenta' : 'Register New Account'}
        </button>
        <button
          onClick={() => setShowDepositForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <DollarSign size={16} />
          {lang === 'es' ? 'Registra Depósito/Retiro' : 'Register Deposit/Withdrawal'}
        </button>
        <button
          onClick={() => setShowBuyForm(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <ShoppingCart size={16} />
          {lang === 'es' ? 'Registra Compra de Acciones' : 'Register Stock Purchase'}
        </button>
        <button
          onClick={() => setShowAssetForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <Home size={16} />
          {lang === 'es' ? 'Registra Activo Físico' : 'Register Physical Asset'}
        </button>
        <button
          onClick={() => setShowTransactionHistory(true)}
          className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <History size={16} />
          {lang === 'es' ? 'Historial de Transacciones' : 'Transaction History'}
        </button>
        <button
          onClick={() => setShowAssetsChart(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
        >
          <BarChart3 size={16} />
          {lang === 'es' ? 'Gráfica de Activos' : 'Assets Chart'}
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
              {lang === 'es' ? 'Registra Primera Cuenta' : 'Register First Account'}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bankAccounts.map((account) => (
              <div key={account.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold">{account.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="text-slate-400 text-sm capitalize">
                        {account.type === 'debit' 
                          ? (lang === 'es' ? 'Débito' : 'Debit')
                          : (lang === 'es' ? 'Crédito' : 'Credit')
                        }
                      </p>
                      {account.type === 'credit' && account.balance < 0 && (
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded">
                          {lang === 'es' ? 'En deuda' : 'In debt'}
                        </span>
                      )}
                    </div>
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
              {lang === 'es' ? 'Registra Primera Compra' : 'Register First Purchase'}
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

      {/* Physical Assets */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">
          {lang === 'es' ? 'Activos Físicos' : 'Physical Assets'}
        </h2>
        
        {physicalAssets.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl p-8 text-center border border-slate-700">
            <p className="text-slate-400 mb-4">
              {lang === 'es' 
                ? 'No tienes activos físicos registrados aún'
                : 'You don\'t have any physical assets registered yet'
              }
            </p>
            <button
              onClick={() => setShowAssetForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold"
            >
              {lang === 'es' ? 'Registra Primer Activo' : 'Register First Asset'}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {physicalAssets.map((asset) => {
              const gain = asset.currentValue - asset.purchasePrice;
              const gainPercent = asset.purchasePrice > 0 ? (gain / asset.purchasePrice) * 100 : 0;
              
              const assetTypeLabels = {
                house: lang === 'es' ? 'Casa' : 'House',
                car: lang === 'es' ? 'Automóvil' : 'Car',
                land: lang === 'es' ? 'Terreno' : 'Land',
                other: lang === 'es' ? 'Otro' : 'Other'
              };
              
              return (
                <div key={asset.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{asset.name}</h3>
                      <p className="text-slate-400 text-sm">
                        {assetTypeLabels[asset.type]}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEditingAsset(asset)}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => deletePhysicalAsset(asset.id)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">
                        {lang === 'es' ? 'Precio de Compra' : 'Purchase Price'}
                      </span>
                      <span className="text-slate-300 font-medium">
                        {fmtCurrency(asset.purchasePrice)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">
                        {lang === 'es' ? 'Valor Actual' : 'Current Value'}
                      </span>
                      <span className="text-white font-bold">
                        {fmtCurrency(asset.currentValue)}
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
                    
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">
                        {lang === 'es' ? 'Método de Pago' : 'Payment Method'}
                      </span>
                      <span className="text-slate-300 text-sm">
                        {asset.paymentDetails.method === 'cash' 
                          ? (lang === 'es' ? 'Efectivo' : 'Cash')
                          : (lang === 'es' ? 'A plazos' : 'Installments')
                        }
                      </span>
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
                  : (lang === 'es' ? 'Registra Nueva Cuenta Bancaria' : 'Register New Bank Account')
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
                    : (lang === 'es' ? 'Registrar' : 'Register')
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
                {lang === 'es' ? 'Registra Depósito / Retiro' : 'Register Deposit / Withdrawal'}
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
                    ? (lang === 'es' ? 'Registrar Depósito' : 'Register Deposit')
                    : (lang === 'es' ? 'Registrar Retiro' : 'Register Withdrawal')
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
                {lang === 'es' ? 'Registra Compra de Acciones' : 'Register Stock Purchase'}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Símbolo de la acción' : 'Stock symbol'}
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <StockSuggest
                      value={buyForm.symbol}
                      onChange={(value) => setBuyForm(prev => ({ ...prev, symbol: value }))}
                      placeholder={lang === 'es' ? 'Ej: AAPL' : 'Ex: AAPL'}
                      comparatorStocks={comparatorStocks}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!buyForm.symbol) return;
                      try {
                        const url = `${WORKER_BASE}/api/stock/${encodeURIComponent(buyForm.symbol.toUpperCase())}?interval=1d&range=5d`;
                        const response = await fetch(url);
                        if (!response.ok) {
                          alert(lang === 'es' ? `Error ${response.status}` : `Error ${response.status}`);
                          return;
                        }
                        const data = await response.json();
                        if (!data.chart?.result?.[0]) {
                          alert(lang === 'es' ? 'No se encontraron datos' : 'No data found');
                          return;
                        }
                        const result = data.chart.result[0];
                        const closes = result.indicators?.quote?.[0]?.close ?? [];
                        const price = closes.filter(Boolean).pop();
                        if (price) {
                          alert(`${buyForm.symbol.toUpperCase()}: ${fmtCurrency(price)}`);
                        } else {
                          alert(lang === 'es' ? 'Precio no disponible' : 'Price not available');
                        }
                      } catch (error) {
                        console.error('Price check error:', error);
                        alert(lang === 'es' ? 'Error al obtener precio' : 'Error fetching price');
                      }
                    }}
                    className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm transition-colors"
                  >
                    {lang === 'es' ? 'Precio' : 'Price'}
                  </button>
                </div>
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
                  {bankAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({fmtCurrency(account.balance)}) 
                      {account.type === 'credit' && account.balance < 0 && 
                        ` - ${lang === 'es' ? 'Crédito disponible' : 'Credit available'}`
                      }
                    </option>
                  ))}
                </select>
                <p className="text-slate-500 text-xs mt-1">
                  {lang === 'es' 
                    ? 'Las cuentas de crédito pueden ir en deuda. Las de débito requieren saldo positivo.'
                    : 'Credit accounts can go into debt. Debit accounts require positive balance.'
                  }
                </p>
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
                  {lang === 'es' ? 'Registrar Compra' : 'Register Purchase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Physical Asset Form Modal */}
      {showAssetForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-600 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 px-6 py-3 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg">
                {editingAsset 
                  ? (lang === 'es' ? 'Editar Activo Físico' : 'Edit Physical Asset')
                  : (lang === 'es' ? 'Registra Activo Físico' : 'Register Physical Asset')
                }
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Nombre del activo' : 'Asset name'}
                </label>
                <input
                  type="text"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={lang === 'es' ? 'Ej: Casa en Polanco' : 'Ex: House in Downtown'}
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Tipo de activo' : 'Asset type'}
                </label>
                <select
                  value={assetForm.type}
                  onChange={(e) => setAssetForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="house">{lang === 'es' ? 'Casa' : 'House'}</option>
                  <option value="car">{lang === 'es' ? 'Automóvil' : 'Car'}</option>
                  <option value="land">{lang === 'es' ? 'Terreno' : 'Land'}</option>
                  <option value="other">{lang === 'es' ? 'Otro' : 'Other'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    {lang === 'es' ? 'Precio de compra' : 'Purchase price'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={assetForm.purchasePrice}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, purchasePrice: e.target.value }))}
                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    {lang === 'es' ? 'Valor actual' : 'Current value'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={assetForm.currentValue}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, currentValue: e.target.value }))}
                    className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {lang === 'es' ? 'Método de pago' : 'Payment method'}
                </label>
                <select
                  value={assetForm.paymentMethod}
                  onChange={(e) => setAssetForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">{lang === 'es' ? 'Efectivo' : 'Cash'}</option>
                  <option value="installments_with_down">{lang === 'es' ? 'A meses con enganche' : 'Installments with down payment'}</option>
                  <option value="installments_no_down">{lang === 'es' ? 'A meses sin enganche' : 'Installments without down payment'}</option>
                  <option value="installments_no_interest">{lang === 'es' ? 'A meses sin intereses' : 'Installments without interest'}</option>
                  <option value="installments_with_interest">{lang === 'es' ? 'A meses con intereses después de X meses' : 'Installments with interest after X months'}</option>
                </select>
              </div>

              {assetForm.paymentMethod !== 'cash' && (
                <>
                  {(assetForm.paymentMethod === 'installments_with_down') && (
                    <div>
                      <label className="block text-slate-300 text-sm font-medium mb-2">
                        {lang === 'es' ? 'Enganche' : 'Down payment'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={assetForm.downPayment}
                        onChange={(e) => setAssetForm(prev => ({ ...prev, downPayment: e.target.value }))}
                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      {lang === 'es' ? 'Número de mensualidades' : 'Number of installments'}
                    </label>
                    <input
                      type="number"
                      value={assetForm.installments}
                      onChange={(e) => setAssetForm(prev => ({ ...prev, installments: e.target.value }))}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12"
                    />
                  </div>

                  {assetForm.paymentMethod === 'installments_with_interest' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                          {lang === 'es' ? 'Tasa de interés anual (%)' : 'Annual interest rate (%)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={assetForm.interestRate}
                          onChange={(e) => setAssetForm(prev => ({ ...prev, interestRate: e.target.value }))}
                          className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="15.00"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                          {lang === 'es' ? 'Intereses a partir del mes' : 'Interest starts after month'}
                        </label>
                        <input
                          type="number"
                          value={assetForm.interestAfterMonths}
                          onChange={(e) => setAssetForm(prev => ({ ...prev, interestAfterMonths: e.target.value }))}
                          className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="6"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      {lang === 'es' ? 'Cuenta para pagos' : 'Account for payments'}
                    </label>
                    <select
                      value={assetForm.accountId}
                      onChange={(e) => setAssetForm(prev => ({ ...prev, accountId: e.target.value }))}
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
                </>
              )}

              {assetForm.paymentMethod === 'cash' && (
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    {lang === 'es' ? 'Cuenta para pago' : 'Account for payment'}
                  </label>
                  <select
                    value={assetForm.accountId}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, accountId: e.target.value }))}
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
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetAssetForm}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  {lang === 'es' ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  onClick={handleAddPhysicalAsset}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  {editingAsset 
                    ? (lang === 'es' ? 'Guardar' : 'Save')
                    : (lang === 'es' ? 'Registrar Activo' : 'Register Asset')
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {showTransactionHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-600 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-slate-700 to-slate-500 px-6 py-3 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg">
                {lang === 'es' ? 'Historial de Transacciones' : 'Transaction History'}
              </h3>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {portfolio.transactions && portfolio.transactions.length > 0 ? (
                <div className="space-y-3">
                  {portfolio.transactions
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((transaction) => (
                    <div key={transaction.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">{transaction.description}</p>
                          <p className="text-slate-400 text-sm">
                            {new Date(transaction.date).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}
                          </p>
                          {transaction.symbol && (
                            <p className="text-slate-300 text-sm">
                              {transaction.symbol} - {transaction.shares} {lang === 'es' ? 'acciones' : 'shares'}
                            </p>
                          )}
                          {transaction.assetName && (
                            <p className="text-slate-300 text-sm">{transaction.assetName}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            transaction.type === 'deposit' || transaction.type === 'buy' || transaction.type === 'asset_purchase'
                              ? 'text-red-400' 
                              : transaction.type === 'withdraw' 
                              ? 'text-green-400'
                              : 'text-slate-300'
                          }`}>
                            {transaction.amount ? fmtCurrency(transaction.amount) : '—'}
                          </p>
                          <p className="text-slate-400 text-xs capitalize">
                            {transaction.type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">
                    {lang === 'es' ? 'No hay transacciones registradas' : 'No transactions recorded'}
                  </p>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowTransactionHistory(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  {lang === 'es' ? 'Cerrar' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assets Chart Modal */}
      {showAssetsChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-900 border border-slate-600 rounded-2xl w-full max-w-6xl shadow-2xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-teal-700 to-teal-500 px-6 py-3 rounded-t-2xl">
              <h3 className="text-white font-bold text-lg">
                {lang === 'es' ? 'Gráfica de Valor de Activos' : 'Assets Value Chart'}
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-sm">{lang === 'es' ? 'Efectivo' : 'Cash'}</p>
                  <p className="text-green-400 font-bold text-lg">{fmtCurrency(positiveBalance)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-sm">{lang === 'es' ? 'Acciones' : 'Stocks'}</p>
                  <p className="text-blue-400 font-bold text-lg">{fmtCurrency(stockValue)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-sm">{lang === 'es' ? 'Activos Físicos' : 'Physical Assets'}</p>
                  <p className="text-purple-400 font-bold text-lg">{fmtCurrency(physicalAssetsValue)}</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-slate-400 text-sm">{lang === 'es' ? 'Total' : 'Total'}</p>
                  <p className="text-white font-bold text-lg">{fmtCurrency(totalAssets)}</p>
                </div>
              </div>
              
              <div className="h-80 bg-slate-800/30 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { name: lang === 'es' ? 'Efectivo' : 'Cash', value: positiveBalance },
                    { name: lang === 'es' ? 'Acciones' : 'Stocks', value: stockValue },
                    { name: lang === 'es' ? 'Activos Físicos' : 'Physical Assets', value: physicalAssetsValue }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [fmtCurrency(value), '']}
                    />
                    <Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowAssetsChart(false)}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  {lang === 'es' ? 'Cerrar' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}