import React, { useState, useEffect, useCallback } from 'react';
import { realTimeApi } from './realTimeApi';

const AI_TRADER_STORAGE_KEY = 'aiTraderData';
const AI_SETTINGS_STORAGE_KEY = 'aiTraderSettings';

// AI Trading strategies
const TRADING_STRATEGIES = {
  conservative: {
    name: { es: 'Conservador', en: 'Conservative' },
    description: { es: 'Estrategia de bajo riesgo con diversificación', en: 'Low-risk strategy with diversification' },
    maxPositionSize: 0.15, // Max 15% per stock
    stopLoss: 0.05, // 5% stop loss
    takeProfit: 0.10, // 10% take profit
    tradingFrequency: 300000, // 5 minutes
  },
  aggressive: {
    name: { es: 'Agresivo', en: 'Aggressive' },
    description: { es: 'Estrategia de alto riesgo y alta recompensa', en: 'High-risk, high-reward strategy' },
    maxPositionSize: 0.25, // Max 25% per stock
    stopLoss: 0.08, // 8% stop loss
    takeProfit: 0.15, // 15% take profit
    tradingFrequency: 120000, // 2 minutes
  },
  balanced: {
    name: { es: 'Balanceado', en: 'Balanced' },
    description: { es: 'Estrategia equilibrada entre riesgo y recompensa', en: 'Balanced risk-reward strategy' },
    maxPositionSize: 0.20, // Max 20% per stock
    stopLoss: 0.06, // 6% stop loss
    takeProfit: 0.12, // 12% take profit
    tradingFrequency: 180000, // 3 minutes
  }
};

const DEFAULT_WATCHLIST = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'];

// AI-selected watchlist based on market cap, volume, and volatility
const AI_SELECTED_WATCHLIST = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX',
  'BRK-B', 'UNH', 'JNJ', 'V', 'PG', 'JPM', 'HD', 'MA',
  'AVGO', 'PFE', 'ABBV', 'KO', 'PEP', 'COST', 'TMO', 'MRK'
];

// Technical indicators calculations
const calculateSMA = (prices, period) => {
  if (prices.length < period) return null;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
};

const calculateEMA = (prices, period) => {
  if (prices.length < period) return null;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  return ema;
};

const calculateRSI = (prices, period = 14) => {
  if (prices.length < period + 1) return null;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const calculateMACD = (prices) => {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  if (!ema12 || !ema26) return null;
  
  const macd = ema12 - ema26;
  return { macd, signal: calculateEMA([macd], 9) };
};

const calculateBollingerBands = (prices, period = 20, stdDev = 2) => {
  if (prices.length < period) return null;
  
  const sma = calculateSMA(prices, period);
  const recentPrices = prices.slice(-period);
  const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    upper: sma + (standardDeviation * stdDev),
    middle: sma,
    lower: sma - (standardDeviation * stdDev)
  };
};

// Pattern recognition
const detectPatterns = (prices, volumes) => {
  const patterns = [];
  
  if (prices.length < 5) return patterns;
  
  const recent = prices.slice(-5);
  const recentVolumes = volumes.slice(-5);
  
  // Bullish patterns
  if (recent[4] > recent[3] && recent[3] > recent[2] && recentVolumes[4] > recentVolumes[3]) {
    patterns.push({ type: 'bullish_momentum', strength: 0.7 });
  }
  
  // Bearish patterns
  if (recent[4] < recent[3] && recent[3] < recent[2] && recentVolumes[4] > recentVolumes[3]) {
    patterns.push({ type: 'bearish_momentum', strength: 0.7 });
  }
  
  // Reversal patterns
  const lowest = Math.min(...recent.slice(0, 4));
  if (recent[4] > lowest * 1.02 && recent[3] === lowest) {
    patterns.push({ type: 'hammer_reversal', strength: 0.6 });
  }
  
  return patterns;
};

// Advanced backtesting
const backtestStrategy = (historicalData, strategy) => {
  let capital = 10000;
  let position = null;
  let trades = [];
  
  for (let i = 20; i < historicalData.length; i++) {
    const currentData = historicalData.slice(0, i + 1);
    const prices = currentData.map(d => d.price);
    const volumes = currentData.map(d => d.volume);
    
    const indicators = {
      rsi: calculateRSI(prices),
      sma20: calculateSMA(prices, 20),
      sma50: calculateSMA(prices, 50),
      bollinger: calculateBollingerBands(prices),
      patterns: detectPatterns(prices, volumes)
    };
    
    const signal = generateAdvancedSignal(indicators, prices[i], strategy);
    
    if (signal === 'buy' && !position && capital > prices[i]) {
      const shares = Math.floor(capital * 0.2 / prices[i]);
      position = { shares, price: prices[i], entry: i };
      capital -= shares * prices[i];
    } else if (signal === 'sell' && position) {
      const profit = (prices[i] - position.price) * position.shares;
      capital += position.shares * prices[i];
      trades.push({ profit, duration: i - position.entry });
      position = null;
    }
  }
  
  const winRate = trades.filter(t => t.profit > 0).length / trades.length;
  const totalReturn = ((capital - 10000) / 10000) * 100;
  
  return { winRate, totalReturn, totalTrades: trades.length };
};

// Advanced signal generation
const generateAdvancedSignal = (indicators, currentPrice, strategy) => {
  const { rsi, sma20, sma50, bollinger, patterns } = indicators;
  
  if (!rsi || !sma20 || !sma50 || !bollinger) return 'hold';
  
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  // RSI signals
  if (rsi < 30) bullishSignals += 2; // Oversold
  if (rsi > 70) bearishSignals += 2; // Overbought
  
  // Moving average signals
  if (currentPrice > sma20 && sma20 > sma50) bullishSignals += 1;
  if (currentPrice < sma20 && sma20 < sma50) bearishSignals += 1;
  
  // Bollinger bands
  if (currentPrice < bollinger.lower) bullishSignals += 1;
  if (currentPrice > bollinger.upper) bearishSignals += 1;
  
  // Pattern signals
  patterns.forEach(pattern => {
    if (pattern.type.includes('bullish')) bullishSignals += pattern.strength;
    if (pattern.type.includes('bearish')) bearishSignals += pattern.strength;
  });
  
  // Strategy-specific thresholds
  const threshold = strategy === 'aggressive' ? 1.5 : strategy === 'conservative' ? 3 : 2;
  
  if (bullishSignals >= threshold && bullishSignals > bearishSignals) return 'buy';
  if (bearishSignals >= threshold && bearishSignals > bullishSignals) return 'sell';
  
  return 'hold';
};

export default function AITrader({ lang = 'es', currency = 'USD', rates = {} }) {
  const [isActive, setIsActive] = useState(false);
  const [portfolio, setPortfolio] = useState({
    cash: 10000,
    positions: {},
    transactions: [],
    totalValue: 10000,
    totalReturn: 0,
    totalReturnPercent: 0
  });
  
  const [settings, setSettings] = useState({
    strategy: 'balanced',
    initialCash: 10000,
    watchlistType: 'user', // 'user' or 'ai'
    userWatchlist: DEFAULT_WATCHLIST,
    riskLevel: 0.02,
    maxPositions: 5,
    useAdvancedAnalysis: true,
    backtestPeriod: 30 // days
  });
  
  const [aiStatus, setAiStatus] = useState({
    lastAction: null,
    nextActionIn: 0,
    isAnalyzing: false,
    currentPrices: {},
    performance: {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0
    }
  });

  // Load saved data
  useEffect(() => {
    try {
      const savedPortfolio = localStorage.getItem(AI_TRADER_STORAGE_KEY);
      const savedSettings = localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
      
      if (savedPortfolio) {
        setPortfolio(JSON.parse(savedPortfolio));
      }
      
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading AI trader data:', error);
    }
  }, []);

  // Initialize portfolio with correct initial cash on first load
  useEffect(() => {
    if (portfolio.cash === 10000 && portfolio.totalValue === 10000 && Object.keys(portfolio.positions).length === 0) {
      // This looks like a default portfolio, update it with current settings
      if (settings.initialCash !== 10000) {
        setPortfolio(prev => ({
          ...prev,
          cash: settings.initialCash,
          totalValue: settings.initialCash
        }));
      }
    }
  }, [settings.initialCash, portfolio.cash, portfolio.totalValue, portfolio.positions]);

  // Save data when it changes
  useEffect(() => {
    try {
      localStorage.setItem(AI_TRADER_STORAGE_KEY, JSON.stringify(portfolio));
    } catch (error) {
      console.error('Error saving portfolio:', error);
    }
  }, [portfolio]);

  useEffect(() => {
    try {
      localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);

  // AI Trading Logic with advanced analysis
  const analyzeMarket = useCallback(async () => {
    if (!isActive) return;

    setAiStatus(prev => ({ ...prev, isAnalyzing: true }));

    try {
      // Get current watchlist
      const currentWatchlist = settings.watchlistType === 'ai' 
        ? AI_SELECTED_WATCHLIST 
        : settings.userWatchlist;

      // Get current prices for watchlist
      const pricePromises = currentWatchlist.map(symbol => 
        realTimeApi.getRealTimePrice(symbol)
      );
      
      const priceResults = await Promise.allSettled(pricePromises);
      const currentPrices = {};
      
      priceResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          currentPrices[currentWatchlist[index]] = result.value;
        }
      });

      setAiStatus(prev => ({ ...prev, currentPrices }));

      // Advanced AI decision making with technical analysis
      const strategy = TRADING_STRATEGIES[settings.strategy];
      const decisions = await makeAdvancedTradeDecisions(currentPrices, portfolio, strategy, settings);
      
      // Execute trades
      if (decisions.length > 0) {
        executeTrades(decisions);
      }

    } catch (error) {
      console.error('AI analysis error:', error);
    } finally {
      setAiStatus(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, [isActive, settings, portfolio]);

  // Advanced AI decision making with technical analysis
  const makeAdvancedTradeDecisions = async (prices, currentPortfolio, strategy, traderSettings) => {
    const decisions = [];
    
    for (const [symbol, priceData] of Object.entries(prices)) {
      if (!priceData || !priceData.price) continue;
      
      const currentPrice = priceData.price;
      const position = currentPortfolio.positions[symbol];
      
      // Get historical data (simulated for demo)
      const historicalPrices = generateMockHistoricalData(currentPrice, 50);
      const historicalVolumes = historicalPrices.map(() => Math.random() * 1000000 + 500000);
      
      // Calculate technical indicators
      const indicators = {
        rsi: calculateRSI(historicalPrices),
        sma20: calculateSMA(historicalPrices, 20),
        sma50: calculateSMA(historicalPrices, 50),
        ema12: calculateEMA(historicalPrices, 12),
        ema26: calculateEMA(historicalPrices, 26),
        bollinger: calculateBollingerBands(historicalPrices),
        patterns: detectPatterns(historicalPrices, historicalVolumes)
      };
      
      // Sell logic (if we have a position)
      if (position) {
        const currentValue = position.shares * currentPrice;
        const returnPercent = (currentValue - position.totalCost) / position.totalCost;
        
        // Advanced sell signals
        const sellSignal = generateAdvancedSignal(indicators, currentPrice, traderSettings.strategy);
        
        if (sellSignal === 'sell' || 
            returnPercent >= strategy.takeProfit || 
            returnPercent <= -strategy.stopLoss) {
          
          decisions.push({
            type: 'sell',
            symbol,
            shares: position.shares,
            price: currentPrice,
            reason: sellSignal === 'sell' ? 'technical_signal' : 
                   (returnPercent >= strategy.takeProfit ? 'take_profit' : 'stop_loss'),
            indicators: indicators
          });
        }
      }
      
      // Buy logic (if we don't have a position)
      else {
        const positionCount = Object.keys(currentPortfolio.positions).length;
        
        if (positionCount < traderSettings.maxPositions) {
          const buySignal = generateAdvancedSignal(indicators, currentPrice, traderSettings.strategy);
          
          if (buySignal === 'buy') {
            // Backtest this specific setup
            const backtestResult = backtestStrategy(
              generateMockHistoricalData(currentPrice, 100).map((price, i) => ({
                price,
                volume: historicalVolumes[i] || 1000000
              })),
              traderSettings.strategy
            );
            
            // Only buy if backtest shows positive results
            if (backtestResult.winRate > 0.5 && backtestResult.totalReturn > 0) {
              const maxInvestment = currentPortfolio.cash * strategy.maxPositionSize;
              const shares = Math.floor(maxInvestment / currentPrice);
              
              if (shares > 0 && shares * currentPrice <= currentPortfolio.cash) {
                decisions.push({
                  type: 'buy',
                  symbol,
                  shares,
                  price: currentPrice,
                  reason: 'advanced_technical_analysis',
                  indicators: indicators,
                  backtest: backtestResult
                });
              }
            }
          }
        }
      }
    }
    
    return decisions;
  };

  // Generate mock historical data for demo purposes
  const generateMockHistoricalData = (currentPrice, periods) => {
    const data = [];
    let price = currentPrice * 0.95; // Start 5% lower
    
    for (let i = 0; i < periods; i++) {
      const change = (Math.random() - 0.5) * 0.04; // ±2% random change
      price = price * (1 + change);
      data.push(price);
    }
    
    // Ensure last price is close to current
    data[data.length - 1] = currentPrice;
    return data;
  };

  // Execute trading decisions
  const executeTrades = (decisions) => {
    let newPortfolio = { ...portfolio };
    const newTransactions = [...portfolio.transactions];
    
    decisions.forEach(decision => {
      const { type, symbol, shares, price, reason } = decision;
      const totalCost = shares * price;
      
      if (type === 'buy' && newPortfolio.cash >= totalCost) {
        // Execute buy
        newPortfolio.cash -= totalCost;
        newPortfolio.positions[symbol] = {
          shares,
          avgPrice: price,
          totalCost,
          purchaseDate: new Date().toISOString()
        };
        
        newTransactions.push({
          id: Date.now() + Math.random(),
          type: 'buy',
          symbol,
          shares,
          price,
          total: totalCost,
          date: new Date().toISOString(),
          reason,
          aiTrade: true
        });
        
        setAiStatus(prev => ({
          ...prev,
          lastAction: { 
            type: 'buy', 
            symbol, 
            shares, 
            price, 
            reason,
            indicators: decision.indicators,
            backtest: decision.backtest
          },
          performance: {
            ...prev.performance,
            totalTrades: prev.performance.totalTrades + 1
          }
        }));
      }
      
      else if (type === 'sell' && newPortfolio.positions[symbol]) {
        // Execute sell
        const position = newPortfolio.positions[symbol];
        const saleValue = shares * price;
        const profit = saleValue - position.totalCost;
        
        newPortfolio.cash += saleValue;
        delete newPortfolio.positions[symbol];
        
        newTransactions.push({
          id: Date.now() + Math.random(),
          type: 'sell',
          symbol,
          shares,
          price,
          total: saleValue,
          profit,
          date: new Date().toISOString(),
          reason,
          aiTrade: true
        });
        
        setAiStatus(prev => ({
          ...prev,
          lastAction: { 
            type: 'sell', 
            symbol, 
            shares, 
            price, 
            profit, 
            reason,
            indicators: decision.indicators
          },
          performance: {
            ...prev.performance,
            totalTrades: prev.performance.totalTrades + 1,
            winningTrades: profit > 0 ? prev.performance.winningTrades + 1 : prev.performance.winningTrades,
            losingTrades: profit <= 0 ? prev.performance.losingTrades + 1 : prev.performance.losingTrades,
            winRate: ((profit > 0 ? prev.performance.winningTrades + 1 : prev.performance.winningTrades) / (prev.performance.totalTrades + 1)) * 100
          }
        }));
      }
    });
    
    // Calculate total portfolio value
    const positionsValue = Object.entries(newPortfolio.positions).reduce((total, [symbol, position]) => {
      const currentPrice = aiStatus.currentPrices[symbol]?.price || position.avgPrice;
      return total + (position.shares * currentPrice);
    }, 0);
    
    newPortfolio.totalValue = newPortfolio.cash + positionsValue;
    newPortfolio.totalReturn = newPortfolio.totalValue - settings.initialCash;
    newPortfolio.totalReturnPercent = (newPortfolio.totalReturn / settings.initialCash) * 100;
    newPortfolio.transactions = newTransactions;
    
    setPortfolio(newPortfolio);
  };

  // AI Trading Timer
  useEffect(() => {
    let interval;
    
    if (isActive) {
      const strategy = TRADING_STRATEGIES[settings.strategy];
      interval = setInterval(analyzeMarket, strategy.tradingFrequency);
      
      // Countdown timer
      const countdownInterval = setInterval(() => {
        setAiStatus(prev => ({
          ...prev,
          nextActionIn: Math.max(0, prev.nextActionIn - 1000)
        }));
      }, 1000);
      
      // Reset countdown when analysis starts
      setAiStatus(prev => ({ ...prev, nextActionIn: strategy.tradingFrequency }));
      
      return () => {
        clearInterval(interval);
        clearInterval(countdownInterval);
      };
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, analyzeMarket, settings.strategy]);

  const resetPortfolio = () => {
    if (confirm(lang === 'es' ? '¿Estás seguro de que quieres resetear el portafolio de AI?' : 'Are you sure you want to reset the AI portfolio?')) {
      const newPortfolio = {
        cash: settings.initialCash,
        positions: {},
        transactions: [],
        totalValue: settings.initialCash,
        totalReturn: 0,
        totalReturnPercent: 0
      };
      
      setPortfolio(newPortfolio);
      
      setAiStatus(prev => ({
        ...prev,
        lastAction: null,
        performance: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0
        }
      }));
    }
  };

  const formatCurrency = (amount) => {
    const converted = currency === 'USD' ? amount : amount * (rates[currency] || 1);
    const symbol = currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : currency);
    return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
              {lang === 'es' ? 'Modo AI Trading' : 'AI Trading Mode'}
              <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            </h1>
            <p className="text-slate-400 text-sm">
              {lang === 'es' 
                ? 'El AI hace trading automático con su propio portafolio'
                : 'AI performs automatic trading with its own portfolio'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsActive(!isActive)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                isActive 
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isActive 
                ? (lang === 'es' ? 'Detener AI' : 'Stop AI')
                : (lang === 'es' ? 'Iniciar AI' : 'Start AI')
              }
            </button>
            <button
              onClick={resetPortfolio}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
            >
              {lang === 'es' ? 'Reset' : 'Reset'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
                {lang === 'es' ? 'Valor Total' : 'Total Value'}
              </p>
              <p className="text-white text-xl font-bold mt-1">{formatCurrency(portfolio.totalValue)}</p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
                {lang === 'es' ? 'Ganancia/Pérdida' : 'P&L'}
              </p>
              <p className={`text-xl font-bold mt-1 ${portfolio.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(portfolio.totalReturn)}
              </p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
                {lang === 'es' ? 'Retorno %' : 'Return %'}
              </p>
              <p className={`text-xl font-bold mt-1 ${portfolio.totalReturnPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {portfolio.totalReturnPercent.toFixed(2)}%
              </p>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
                {lang === 'es' ? 'Efectivo' : 'Cash'}
              </p>
              <p className="text-white text-xl font-bold mt-1">{formatCurrency(portfolio.cash)}</p>
            </div>
          </div>

          {/* Current Positions */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-white font-semibold mb-4">
              {lang === 'es' ? 'Posiciones Actuales' : 'Current Positions'}
            </h2>
            
            {Object.keys(portfolio.positions).length === 0 ? (
              <p className="text-slate-400 text-center py-8">
                {lang === 'es' ? 'No hay posiciones activas' : 'No active positions'}
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(portfolio.positions).map(([symbol, position]) => {
                  const currentPrice = aiStatus.currentPrices[symbol]?.price || position.avgPrice;
                  const currentValue = position.shares * currentPrice;
                  const profit = currentValue - position.totalCost;
                  const profitPercent = (profit / position.totalCost) * 100;
                  
                  return (
                    <div key={symbol} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div>
                        <p className="text-white font-semibold">{symbol}</p>
                        <p className="text-slate-400 text-sm">
                          {position.shares} {lang === 'es' ? 'acciones' : 'shares'} @ {formatCurrency(position.avgPrice)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">{formatCurrency(currentValue)}</p>
                        <p className={`text-sm ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit)} ({profitPercent.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* AI Status & Settings */}
        <div className="space-y-6">
          {/* AI Status */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              {lang === 'es' ? 'Estado del AI' : 'AI Status'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
                  {lang === 'es' ? 'Estado' : 'Status'}
                </p>
                <p className={`text-sm font-semibold ${isActive ? 'text-green-400' : 'text-red-400'}`}>
                  {isActive 
                    ? (aiStatus.isAnalyzing 
                        ? (lang === 'es' ? 'Analizando mercado...' : 'Analyzing market...')
                        : (lang === 'es' ? 'Activo' : 'Active'))
                    : (lang === 'es' ? 'Inactivo' : 'Inactive')
                  }
                </p>
              </div>
              
              {isActive && (
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
                    {lang === 'es' ? 'Próxima Acción' : 'Next Action'}
                  </p>
                  <p className="text-white text-sm font-semibold">
                    {formatTime(aiStatus.nextActionIn)}
                  </p>
                </div>
              )}
              
              {aiStatus.lastAction && (
                <div>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">
                    {lang === 'es' ? 'Última Acción' : 'Last Action'}
                  </p>
                  <p className="text-white text-sm">
                    {aiStatus.lastAction.type.toUpperCase()} {aiStatus.lastAction.symbol}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {aiStatus.lastAction.shares} @ {formatCurrency(aiStatus.lastAction.price)}
                  </p>
                  {aiStatus.lastAction.reason && (
                    <p className="text-slate-500 text-xs">
                      {lang === 'es' ? 'Razón:' : 'Reason:'} {aiStatus.lastAction.reason.replace(/_/g, ' ')}
                    </p>
                  )}
                  {aiStatus.lastAction.indicators && settings.useAdvancedAnalysis && (
                    <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs">
                      <p className="text-slate-400 font-medium mb-1">
                        {lang === 'es' ? 'Indicadores:' : 'Indicators:'}
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {aiStatus.lastAction.indicators.rsi && (
                          <div>RSI: {aiStatus.lastAction.indicators.rsi.toFixed(1)}</div>
                        )}
                        {aiStatus.lastAction.indicators.patterns?.length > 0 && (
                          <div>Patrones: {aiStatus.lastAction.indicators.patterns.length}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Performance Stats */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-white font-semibold mb-4">
              {lang === 'es' ? 'Estadísticas' : 'Performance'}
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">
                  {lang === 'es' ? 'Total Trades' : 'Total Trades'}
                </span>
                <span className="text-white font-semibold">{aiStatus.performance.totalTrades}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">
                  {lang === 'es' ? 'Ganadores' : 'Winners'}
                </span>
                <span className="text-green-400 font-semibold">{aiStatus.performance.winningTrades}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">
                  {lang === 'es' ? 'Perdedores' : 'Losers'}
                </span>
                <span className="text-red-400 font-semibold">{aiStatus.performance.losingTrades}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">
                  {lang === 'es' ? 'Tasa de Éxito' : 'Win Rate'}
                </span>
                <span className="text-white font-semibold">{aiStatus.performance.winRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Strategy Settings */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <h2 className="text-white font-semibold mb-4">
              {lang === 'es' ? 'Configuración' : 'Settings'}
            </h2>
            
            {/* Initial Cash Setting */}
            <div className="mb-6">
              <label className="block text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">
                {lang === 'es' ? 'Capital Inicial' : 'Initial Capital'}
              </label>
              
              {/* Quick presets */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[5000, 10000, 25000, 50000, 100000, 250000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setSettings(prev => ({ ...prev, initialCash: amount }))}
                    disabled={isActive}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      settings.initialCash === amount
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    ${amount.toLocaleString()}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1000"
                  max="1000000"
                  step="1000"
                  value={settings.initialCash}
                  onChange={(e) => {
                    const newCash = parseInt(e.target.value) || 10000;
                    setSettings(prev => ({ ...prev, initialCash: newCash }));
                  }}
                  disabled={isActive}
                  className="flex-1 bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
                <span className="text-slate-400 text-sm">{currency}</span>
              </div>
              <p className="text-slate-500 text-xs mt-1">
                {lang === 'es' 
                  ? 'Rango: $1,000 - $1,000,000'
                  : 'Range: $1,000 - $1,000,000'}
              </p>
              {isActive && (
                <p className="text-yellow-400 text-xs mt-1">
                  {lang === 'es' 
                    ? 'Detén el AI para cambiar el capital'
                    : 'Stop AI to change capital'}
                </p>
              )}
            </div>

            {/* Watchlist Type Selection */}
            <div className="mb-6">
              <label className="block text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">
                {lang === 'es' ? 'Lista de Acciones' : 'Stock Watchlist'}
              </label>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => setSettings(prev => ({ ...prev, watchlistType: 'user' }))}
                  disabled={isActive}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    settings.watchlistType === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {lang === 'es' ? 'Elegida por Usuario' : 'User Selected'}
                </button>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, watchlistType: 'ai' }))}
                  disabled={isActive}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    settings.watchlistType === 'ai'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {lang === 'es' ? 'Elegida por AI' : 'AI Selected'}
                </button>
              </div>
              
              <div className="text-xs text-slate-400 mb-2">
                {settings.watchlistType === 'user' 
                  ? (lang === 'es' 
                      ? `Lista actual: ${(settings.userWatchlist || []).slice(0, 4).join(', ')}${(settings.userWatchlist || []).length > 4 ? '...' : ''}`
                      : `Current list: ${(settings.userWatchlist || []).slice(0, 4).join(', ')}${(settings.userWatchlist || []).length > 4 ? '...' : ''}`)
                  : (lang === 'es'
                      ? `AI usa 24 acciones optimizadas por capitalización y volatilidad`
                      : `AI uses 24 stocks optimized by market cap and volatility`)
                }
              </div>
              
              {/* Custom watchlist input for user mode */}
              {settings.watchlistType === 'user' && !isActive && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={lang === 'es' ? 'Agregar símbolo (ej: AAPL)' : 'Add symbol (e.g. AAPL)'}
                    className="w-full bg-slate-700 text-white rounded px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const symbol = e.target.value.toUpperCase().trim();
                        if (symbol && !(settings.userWatchlist || []).includes(symbol)) {
                          setSettings(prev => ({
                            ...prev,
                            userWatchlist: [...(prev.userWatchlist || []), symbol]
                          }));
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-1">
                    {(settings.userWatchlist || []).map(symbol => (
                      <span key={symbol} className="flex items-center gap-1 bg-slate-600 text-slate-200 text-xs px-2 py-1 rounded">
                        {symbol}
                        <button
                          onClick={() => setSettings(prev => ({
                            ...prev,
                            userWatchlist: (prev.userWatchlist || []).filter(s => s !== symbol)
                          }))}
                          className="text-slate-400 hover:text-red-400"
                        >×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI watchlist display */}
              {settings.watchlistType === 'ai' && (
                <div className="space-y-2">
                  <p className="text-slate-400 text-xs font-medium">
                    {lang === 'es' ? 'Lista optimizada del AI:' : 'AI optimized list:'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {AI_SELECTED_WATCHLIST.map(symbol => (
                      <span key={symbol} className="bg-purple-600 text-white text-xs px-2 py-1 rounded font-medium">
                        {symbol}
                      </span>
                    ))}
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    {lang === 'es' 
                      ? 'Seleccionadas por capitalización de mercado, volumen y volatilidad óptima para trading automático.'
                      : 'Selected by market cap, volume and optimal volatility for automated trading.'}
                  </p>
                </div>
              )}
            </div>

            {/* Advanced Analysis Toggle */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-slate-400 text-xs font-medium uppercase tracking-wide">
                    {lang === 'es' ? 'Análisis Avanzado' : 'Advanced Analysis'}
                  </label>
                  <p className="text-slate-500 text-xs mt-1">
                    {lang === 'es' 
                      ? 'Indicadores técnicos, patrones y backtesting'
                      : 'Technical indicators, patterns & backtesting'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, useAdvancedAnalysis: !prev.useAdvancedAnalysis }))}
                  disabled={isActive}
                  className={`w-12 h-6 rounded-full relative transition-colors shrink-0 ml-4 ${
                    settings.useAdvancedAnalysis ? 'bg-green-500' : 'bg-slate-600'
                  } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                    settings.useAdvancedAnalysis ? 'left-6' : 'left-0.5'
                  }`} />
                </button>
              </div>
              
              {settings.useAdvancedAnalysis && (
                <div className="mt-3 p-3 bg-slate-700/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-green-400">RSI & MACD</div>
                    <div className="text-green-400">Bollinger Bands</div>
                    <div className="text-green-400">Moving Averages</div>
                    <div className="text-green-400">Pattern Recognition</div>
                    <div className="text-green-400">Strategy Backtesting</div>
                    <div className="text-green-400">Volume Analysis</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Strategy Selection */}
            <div className="mb-4">
              <label className="block text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">
                {lang === 'es' ? 'Estrategia de Trading' : 'Trading Strategy'}
              </label>
            </div>
            
            <div className="space-y-3">
              {Object.entries(TRADING_STRATEGIES).map(([key, strategy]) => (
                <button
                  key={key}
                  onClick={() => setSettings(prev => ({ ...prev, strategy: key }))}
                  disabled={isActive}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    settings.strategy === key
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-blue-400'
                  } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <p className="font-semibold text-sm">{strategy.name[lang]}</p>
                  <p className="text-xs opacity-75">{strategy.description[lang]}</p>
                </button>
              ))}
            </div>
            
            {/* Apply Settings Button */}
            {!isActive && (portfolio.cash !== settings.initialCash || Object.keys(portfolio.positions).length > 0) && (
              <button
                onClick={() => {
                  if (confirm(lang === 'es' 
                    ? '¿Aplicar nueva configuración? Esto reseteará el portafolio.'
                    : 'Apply new settings? This will reset the portfolio.')) {
                    resetPortfolio();
                  }
                }}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                {lang === 'es' ? 'Aplicar Configuración' : 'Apply Settings'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}