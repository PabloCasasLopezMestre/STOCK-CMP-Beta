/**
 * Basic backtesting engine
 * Tests a strategy on historical price data and returns performance metrics
 */

import { rsi, macd, ema, sma } from './indicators.js';

/**
 * Strategies available
 */
export const STRATEGIES = [
  {
    id: 'rsi_oversold',
    name: 'RSI Oversold/Overbought',
    name_es: 'RSI Sobrevendido/Sobrecomprado',
    description: 'Buy when RSI < 30, sell when RSI > 70',
    description_es: 'Compra cuando RSI < 30, vende cuando RSI > 70',
  },
  {
    id: 'macd_cross',
    name: 'MACD Crossover',
    name_es: 'Cruce MACD',
    description: 'Buy when MACD crosses above Signal, sell when it crosses below',
    description_es: 'Compra cuando MACD cruza por encima de Signal, vende cuando cruza por debajo',
  },
  {
    id: 'ema_cross',
    name: 'EMA 20/50 Crossover',
    name_es: 'Cruce EMA 20/50',
    description: 'Buy when EMA20 crosses above EMA50, sell when it crosses below',
    description_es: 'Compra cuando EMA20 cruza por encima de EMA50, vende cuando cruza por debajo',
  },
  {
    id: 'buy_hold',
    name: 'Buy & Hold',
    name_es: 'Buy & Hold',
    description: 'Buy at the start and hold until the end (benchmark)',
    description_es: 'Compra al inicio y mantiene hasta el final (referencia)',
  },
];

/**
 * Run a backtest for a given strategy on price data
 * @param {number[]} prices - array of closing prices
 * @param {string[]} dates  - array of date labels
 * @param {string}   strategyId
 * @param {number}   initialCapital
 * @returns {{ trades, equity, metrics }}
 */
export function runBacktest(prices, dates, strategyId, initialCapital = 10000) {
  if (!prices || prices.length < 50) return null;

  let signals = new Array(prices.length).fill(0); // 1=buy, -1=sell, 0=hold

  if (strategyId === 'rsi_oversold') {
    const rsiVals = rsi(prices, 14);
    for (let i = 1; i < prices.length; i++) {
      if (rsiVals[i] != null && rsiVals[i - 1] != null) {
        if (rsiVals[i - 1] >= 30 && rsiVals[i] < 30) signals[i] = 1;  // buy
        if (rsiVals[i - 1] <= 70 && rsiVals[i] > 70) signals[i] = -1; // sell
      }
    }
  } else if (strategyId === 'macd_cross') {
    const { macd: macdLine, signal: signalLine } = macd(prices, 12, 26, 9);
    for (let i = 1; i < prices.length; i++) {
      if (macdLine[i] != null && signalLine[i] != null && macdLine[i - 1] != null && signalLine[i - 1] != null) {
        if (macdLine[i - 1] < signalLine[i - 1] && macdLine[i] >= signalLine[i]) signals[i] = 1;
        if (macdLine[i - 1] > signalLine[i - 1] && macdLine[i] <= signalLine[i]) signals[i] = -1;
      }
    }
  } else if (strategyId === 'ema_cross') {
    const ema20 = ema(prices, 20);
    const ema50 = ema(prices, 50);
    for (let i = 1; i < prices.length; i++) {
      if (ema20[i] != null && ema50[i] != null && ema20[i - 1] != null && ema50[i - 1] != null) {
        if (ema20[i - 1] < ema50[i - 1] && ema20[i] >= ema50[i]) signals[i] = 1;
        if (ema20[i - 1] > ema50[i - 1] && ema20[i] <= ema50[i]) signals[i] = -1;
      }
    }
  } else if (strategyId === 'buy_hold') {
    signals[0] = 1;
    signals[prices.length - 1] = -1;
  }

  // Simulate trades
  let cash = initialCapital;
  let shares = 0;
  let inPosition = false;
  const trades = [];
  const equity = [];
  let buyPrice = 0;

  for (let i = 0; i < prices.length; i++) {
    const price = prices[i];

    if (signals[i] === 1 && !inPosition) {
      shares = cash / price;
      cash = 0;
      inPosition = true;
      buyPrice = price;
      trades.push({ type: 'buy', date: dates[i], price, shares });
    } else if (signals[i] === -1 && inPosition) {
      cash = shares * price;
      const pnl = (price - buyPrice) / buyPrice * 100;
      trades.push({ type: 'sell', date: dates[i], price, shares, pnl: +pnl.toFixed(2) });
      shares = 0;
      inPosition = false;
    }

    const portfolioValue = cash + shares * price;
    equity.push({ date: dates[i], value: +portfolioValue.toFixed(2) });
  }

  // Close open position at end
  if (inPosition) {
    cash = shares * prices[prices.length - 1];
    shares = 0;
  }

  const finalValue = cash;
  const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;
  const buyHoldReturn = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;

  const sellTrades = trades.filter(t => t.type === 'sell');
  const winTrades  = sellTrades.filter(t => t.pnl > 0);
  const winRate    = sellTrades.length > 0 ? (winTrades.length / sellTrades.length) * 100 : 0;
  const avgPnl     = sellTrades.length > 0 ? sellTrades.reduce((s, t) => s + t.pnl, 0) / sellTrades.length : 0;

  // Max drawdown
  let peak = initialCapital, maxDrawdown = 0;
  for (const e of equity) {
    if (e.value > peak) peak = e.value;
    const dd = (peak - e.value) / peak * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  return {
    trades,
    equity,
    metrics: {
      initialCapital,
      finalValue: +finalValue.toFixed(2),
      totalReturn: +totalReturn.toFixed(2),
      buyHoldReturn: +buyHoldReturn.toFixed(2),
      totalTrades: sellTrades.length,
      winRate: +winRate.toFixed(1),
      avgPnl: +avgPnl.toFixed(2),
      maxDrawdown: +maxDrawdown.toFixed(2),
    },
  };
}
