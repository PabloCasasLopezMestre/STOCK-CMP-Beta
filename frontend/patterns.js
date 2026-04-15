/**
 * Automatic chart pattern detection
 * Works on an array of closing prices
 * Returns: pattern, signal, reliability, targetPrice, stopLoss, detectedAt (index), dataPoints
 */

function findPivots(prices, window = 3) {
  const pivots = [];
  for (let i = window; i < prices.length - window; i++) {
    const slice = prices.slice(i - window, i + window + 1);
    const max = Math.max(...slice);
    const min = Math.min(...slice);
    if (prices[i] === max) pivots.push({ i, price: prices[i], type: 'high' });
    else if (prices[i] === min) pivots.push({ i, price: prices[i], type: 'low' });
  }
  return pivots;
}

function pct(a, b) { return Math.abs(a - b) / b; }

/** Reliability score 0-100 based on pattern symmetry and depth */
function calcReliability(base, symmetry, depth) {
  return Math.min(100, Math.round(base + symmetry * 20 + depth * 30));
}

function detectDoubleTop(prices, tolerance = 0.04) {
  const pivots = findPivots(prices, 3);
  const highs = pivots.filter(p => p.type === 'high');
  const results = [];
  const currentPrice = prices[prices.length - 1];
  for (let i = 0; i < highs.length - 1; i++) {
    const h1 = highs[i], h2 = highs[i + 1];
    if (pct(h1.price, h2.price) < tolerance && h2.i - h1.i > 5) {
      const between = prices.slice(h1.i, h2.i);
      const trough = Math.min(...between);
      const depth = (h1.price - trough) / h1.price;
      if (depth > 0.03) {
        const symmetry = 1 - pct(h1.price, h2.price) / tolerance;
        const reliability = calcReliability(50, symmetry, depth * 10);
        const neckline = trough;
        const targetPrice = +(neckline - (h1.price - neckline)).toFixed(2);
        const stopLoss = +(Math.max(h1.price, h2.price) * 1.01).toFixed(2);
        results.push({
          pattern: 'Doble Techo', signal: 'bajista',
          reliability, targetPrice, stopLoss,
          neckline: +neckline.toFixed(2), currentPrice: +currentPrice.toFixed(2),
          detectedAt: h2.i, dataPoints: prices.length,
        });
      }
    }
  }
  return results;
}

function detectDoubleBottom(prices, tolerance = 0.04) {
  const pivots = findPivots(prices, 3);
  const lows = pivots.filter(p => p.type === 'low');
  const results = [];
  const currentPrice = prices[prices.length - 1];
  for (let i = 0; i < lows.length - 1; i++) {
    const l1 = lows[i], l2 = lows[i + 1];
    if (pct(l1.price, l2.price) < tolerance && l2.i - l1.i > 5) {
      const between = prices.slice(l1.i, l2.i);
      const peak = Math.max(...between);
      const depth = (peak - l1.price) / l1.price;
      if (depth > 0.03) {
        const symmetry = 1 - pct(l1.price, l2.price) / tolerance;
        const reliability = calcReliability(50, symmetry, depth * 10);
        const neckline = peak;
        const targetPrice = +(neckline + (neckline - Math.min(l1.price, l2.price))).toFixed(2);
        const stopLoss = +(Math.min(l1.price, l2.price) * 0.99).toFixed(2);
        results.push({
          pattern: 'Doble Suelo', signal: 'alcista',
          reliability, targetPrice, stopLoss,
          neckline: +neckline.toFixed(2), currentPrice: +currentPrice.toFixed(2),
          detectedAt: l2.i, dataPoints: prices.length,
        });
      }
    }
  }
  return results;
}

function detectHeadAndShoulders(prices, tolerance = 0.06) {
  const pivots = findPivots(prices, 3);
  const highs = pivots.filter(p => p.type === 'high');
  const results = [];
  const currentPrice = prices[prices.length - 1];
  for (let i = 0; i < highs.length - 2; i++) {
    const ls = highs[i], head = highs[i + 1], rs = highs[i + 2];
    if (
      head.price > ls.price && head.price > rs.price &&
      pct(ls.price, rs.price) < tolerance &&
      (head.price - ls.price) / ls.price > 0.02
    ) {
      const symmetry = 1 - pct(ls.price, rs.price) / tolerance;
      const depth = (head.price - Math.min(ls.price, rs.price)) / head.price;
      const reliability = calcReliability(55, symmetry, depth * 8);
      const neckline = Math.min(ls.price, rs.price);
      const targetPrice = +(neckline - (head.price - neckline)).toFixed(2);
      const stopLoss = +(head.price * 1.01).toFixed(2);
      results.push({
        pattern: 'Cabeza y Hombros', signal: 'bajista',
        reliability, targetPrice, stopLoss,
        neckline: +neckline.toFixed(2), currentPrice: +currentPrice.toFixed(2),
        detectedAt: rs.i, dataPoints: prices.length,
      });
    }
  }
  return results;
}

function detectInverseHeadAndShoulders(prices, tolerance = 0.06) {
  const pivots = findPivots(prices, 3);
  const lows = pivots.filter(p => p.type === 'low');
  const results = [];
  const currentPrice = prices[prices.length - 1];
  for (let i = 0; i < lows.length - 2; i++) {
    const ls = lows[i], head = lows[i + 1], rs = lows[i + 2];
    if (
      head.price < ls.price && head.price < rs.price &&
      pct(ls.price, rs.price) < tolerance &&
      (ls.price - head.price) / ls.price > 0.02
    ) {
      const symmetry = 1 - pct(ls.price, rs.price) / tolerance;
      const depth = (Math.max(ls.price, rs.price) - head.price) / Math.max(ls.price, rs.price);
      const reliability = calcReliability(55, symmetry, depth * 8);
      const neckline = Math.max(ls.price, rs.price);
      const targetPrice = +(neckline + (neckline - head.price)).toFixed(2);
      const stopLoss = +(head.price * 0.99).toFixed(2);
      results.push({
        pattern: 'Cabeza y Hombros Invertido', signal: 'alcista',
        reliability, targetPrice, stopLoss,
        neckline: +neckline.toFixed(2), currentPrice: +currentPrice.toFixed(2),
        detectedAt: rs.i, dataPoints: prices.length,
      });
    }
  }
  return results;
}

function detectWedge(prices) {
  const n = prices.length;
  if (n < 20) return [];
  const recent = prices.slice(-20);
  const currentPrice = prices[prices.length - 1];
  const highs = recent.filter((_, i) => i % 2 === 0);
  const lows  = recent.filter((_, i) => i % 2 === 1);
  const highTrend = highs[highs.length - 1] - highs[0];
  const lowTrend  = lows[lows.length - 1]  - lows[0];
  const results = [];
  if (highTrend > 0 && lowTrend > 0 && highTrend < lowTrend) {
    const width = Math.max(...recent) - Math.min(...recent);
    const targetPrice = +(currentPrice - width * 0.6).toFixed(2);
    const stopLoss = +(Math.max(...recent) * 1.01).toFixed(2);
    results.push({
      pattern: 'Cuña Alcista', signal: 'bajista',
      reliability: 45, targetPrice, stopLoss,
      neckline: null, currentPrice: +currentPrice.toFixed(2),
      detectedAt: n - 1, dataPoints: n,
    });
  } else if (highTrend < 0 && lowTrend < 0 && Math.abs(highTrend) < Math.abs(lowTrend)) {
    const width = Math.max(...recent) - Math.min(...recent);
    const targetPrice = +(currentPrice + width * 0.6).toFixed(2);
    const stopLoss = +(Math.min(...recent) * 0.99).toFixed(2);
    results.push({
      pattern: 'Cuña Bajista', signal: 'alcista',
      reliability: 45, targetPrice, stopLoss,
      neckline: null, currentPrice: +currentPrice.toFixed(2),
      detectedAt: n - 1, dataPoints: n,
    });
  }
  return results;
}

export function detectPatterns(prices) {
  if (!prices || prices.length < 20) return [];
  return [
    ...detectDoubleTop(prices),
    ...detectDoubleBottom(prices),
    ...detectHeadAndShoulders(prices),
    ...detectInverseHeadAndShoulders(prices),
    ...detectWedge(prices),
  ];
}
