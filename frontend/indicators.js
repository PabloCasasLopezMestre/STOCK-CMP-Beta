// Technical indicators calculated from price arrays

/**
 * Simple Moving Average
 */
export function sma(prices, period) {
  return prices.map((_, i) => {
    if (i < period - 1) return null;
    const slice = prices.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

/**
 * Exponential Moving Average
 */
export function ema(prices, period) {
  const k = 2 / (period + 1);
  const result = new Array(prices.length).fill(null);
  // Find first valid index
  let start = period - 1;
  result[start] = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = start + 1; i < prices.length; i++) {
    result[i] = prices[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

/**
 * RSI — Relative Strength Index (default period 14)
 */
export function rsi(prices, period = 14) {
  const result = new Array(prices.length).fill(null);
  if (prices.length < period + 1) return result;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

/**
 * MACD — Moving Average Convergence Divergence
 * Returns { macd, signal, histogram }
 */
export function macd(prices, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(prices, fast);
  const emaSlow = ema(prices, slow);
  const macdLine = prices.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i] - emaSlow[i] : null
  );

  // Signal line = EMA of MACD line (only over valid values)
  const validMacd = macdLine.map(v => v ?? 0);
  const signalLine = ema(validMacd, signal);
  // Null out signal where macd was null
  const firstValid = macdLine.findIndex(v => v != null);
  for (let i = 0; i < firstValid + signal - 1; i++) signalLine[i] = null;

  const histogram = macdLine.map((v, i) =>
    v != null && signalLine[i] != null ? v - signalLine[i] : null
  );

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Bollinger Bands (default period 20, stdDev 2)
 * Returns { upper, middle, lower }
 */
export function bollingerBands(prices, period = 20, stdDevMult = 2) {
  const middle = sma(prices, period);
  const upper = new Array(prices.length).fill(null);
  const lower = new Array(prices.length).fill(null);

  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    upper[i] = mean + stdDevMult * std;
    lower[i] = mean - stdDevMult * std;
  }

  return { upper, middle, lower };
}

/**
 * Stochastic Oscillator (%K, %D)
 */
export function stochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
  const kLine = closes.map((_, i) => {
    if (i < kPeriod - 1) return null;
    const sliceH = highs.slice(i - kPeriod + 1, i + 1);
    const sliceL = lows.slice(i - kPeriod + 1, i + 1);
    const highMax = Math.max(...sliceH);
    const lowMin = Math.min(...sliceL);
    if (highMax === lowMin) return 50;
    return ((closes[i] - lowMin) / (highMax - lowMin)) * 100;
  });

  const dLine = sma(kLine.map(v => v ?? 0), dPeriod).map((v, i) =>
    kLine[i] != null ? v : null
  );

  return { k: kLine, d: dLine };
}
