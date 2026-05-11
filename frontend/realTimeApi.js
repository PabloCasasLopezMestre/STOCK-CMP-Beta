// Real-time API service with fallback system
const WORKER_BASE = 'https://proxy.stockcmp-proxy.workers.dev';

class RealTimeApiService {
  constructor() {
    this.apiStatus = null;
    this.lastStatusCheck = 0;
    this.statusCacheTime = 60000; // 1 minute cache
  }

  async checkApiStatus() {
    const now = Date.now();
    
    // Use cached status if recent
    if (this.apiStatus && (now - this.lastStatusCheck) < this.statusCacheTime) {
      return this.apiStatus;
    }

    try {
      const response = await fetch(`${WORKER_BASE}/api/status`);
      if (response.ok) {
        this.apiStatus = await response.json();
        this.lastStatusCheck = now;
        return this.apiStatus;
      }
    } catch (error) {
      console.warn('Could not check API status:', error);
    }

    // Fallback status
    this.apiStatus = {
      apis: {
        alphavantage: { available: false },
        twelvedata: { available: false },
        yahoo: { available: true, delay: '15min' }
      }
    };
    
    return this.apiStatus;
  }

  async getRealTimePrice(symbol) {
    // Check user preference
    const useRealTimeApis = localStorage.getItem('useRealTimeApis') !== 'false';
    
    if (!useRealTimeApis) {
      // User prefers Yahoo Finance (unlimited with delay)
      return this.getFallbackPrice(symbol);
    }

    try {
      // Try new real-time endpoint first
      const response = await fetch(`${WORKER_BASE}/api/price/${symbol}`);
      
      if (response.ok) {
        const data = await response.json();
        return {
          ...data,
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.warn('Real-time API not available yet, using fallback:', error);
    }

    // Fallback to existing chart data (15min delay)
    return this.getFallbackPrice(symbol);
  }

  async getFallbackPrice(symbol) {
    try {
      // Use existing chart endpoint as fallback
      const response = await fetch(`${WORKER_BASE}/api/stock/${symbol}?interval=1d&range=1d`);
      
      if (response.ok) {
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        
        if (result) {
          const meta = result.meta;
          const quotes = result.indicators?.quote?.[0];
          const lastIndex = quotes?.close?.length - 1;
          
          return {
            symbol: meta.symbol,
            price: meta.regularMarketPrice || quotes?.close?.[lastIndex] || 0,
            change: 0,
            changePercent: 0,
            volume: meta.regularMarketVolume || 0,
            source: 'yahoo',
            realtime: false,
            delay: '15min',
            timestamp: new Date().toISOString()
          };
        }
      }
    } catch (error) {
      console.error('Fallback price fetch failed:', error);
    }

    return null;
  }

  async getBatchPrices(symbols) {
    const promises = symbols.map(symbol => this.getRealTimePrice(symbol));
    const results = await Promise.allSettled(promises);
    
    return results.map((result, index) => ({
      symbol: symbols[index],
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  }

  getApiStatusSummary() {
    if (!this.apiStatus) return 'Checking...';
    
    const { apis } = this.apiStatus;
    
    if (apis.alphavantage?.available) {
      return `Real-time (Alpha Vantage: ${apis.alphavantage.callsThisMinute}/60 calls)`;
    }
    
    if (apis.twelvedata?.available) {
      return `Real-time (Twelve Data: ${apis.twelvedata.callsToday}/800 calls)`;
    }
    
    return 'Yahoo Finance (15min delay)';
  }
}

// Export singleton instance
export const realTimeApi = new RealTimeApiService();
export default realTimeApi;