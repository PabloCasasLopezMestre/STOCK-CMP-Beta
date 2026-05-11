// Market Data APIs for AI stock selection
// Financial Modeling Prep (FMP) and Alpaca Markets integration

const FMP_API_KEY = 'demo'; // Free tier key - replace with actual key if needed
const ALPACA_API_KEY = 'demo'; // Free tier - replace with actual key if needed
const ALPACA_SECRET = 'demo';

class MarketDataAPI {
  constructor() {
    this.fmpBaseUrl = 'https://financialmodelingprep.com/api/v3';
    this.alpacaBaseUrl = 'https://paper-api.alpaca.markets/v2';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  // Cache management
  getCacheKey(endpoint, params = {}) {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  isValidCache(cacheEntry) {
    return cacheEntry && (Date.now() - cacheEntry.timestamp) < this.cacheTimeout;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  getCache(key) {
    const entry = this.cache.get(key);
    return this.isValidCache(entry) ? entry.data : null;
  }

  // Financial Modeling Prep (FMP) API calls
  async callFMP(endpoint, params = {}) {
    const cacheKey = this.getCacheKey(`fmp_${endpoint}`, params);
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const queryParams = new URLSearchParams({
        apikey: FMP_API_KEY,
        ...params
      });
      
      const url = `${this.fmpBaseUrl}/${endpoint}?${queryParams}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }
      
      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('FMP API call failed:', error);
      return null;
    }
  }

  // Alpaca Markets API calls
  async callAlpaca(endpoint, params = {}) {
    const cacheKey = this.getCacheKey(`alpaca_${endpoint}`, params);
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      const queryParams = new URLSearchParams(params);
      const url = `${this.alpacaBaseUrl}/${endpoint}?${queryParams}`;
      
      const response = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': ALPACA_SECRET,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Alpaca API error: ${response.status}`);
      }
      
      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Alpaca API call failed:', error);
      return null;
    }
  }

  // Get most active stocks (FMP)
  async getMostActiveStocks(limit = 20) {
    try {
      const data = await this.callFMP('stock_market/actives');
      if (!data || !Array.isArray(data)) return [];
      
      return data.slice(0, limit).map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        change: stock.change,
        changesPercentage: stock.changesPercentage,
        volume: stock.volume,
        source: 'FMP'
      }));
    } catch (error) {
      console.error('Error getting most active stocks:', error);
      return [];
    }
  }

  // Get biggest gainers (FMP)
  async getBiggestGainers(limit = 20) {
    try {
      const data = await this.callFMP('stock_market/gainers');
      if (!data || !Array.isArray(data)) return [];
      
      return data.slice(0, limit).map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        change: stock.change,
        changesPercentage: stock.changesPercentage,
        volume: stock.volume,
        source: 'FMP'
      }));
    } catch (error) {
      console.error('Error getting biggest gainers:', error);
      return [];
    }
  }

  // Get biggest losers (FMP)
  async getBiggestLosers(limit = 20) {
    try {
      const data = await this.callFMP('stock_market/losers');
      if (!data || !Array.isArray(data)) return [];
      
      return data.slice(0, limit).map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
        price: stock.price,
        change: stock.change,
        changesPercentage: stock.changesPercentage,
        volume: stock.volume,
        source: 'FMP'
      }));
    } catch (error) {
      console.error('Error getting biggest losers:', error);
      return [];
    }
  }

  // Get most active stocks by volume (Alpaca)
  async getMostActiveByVolume(limit = 10) {
    try {
      const data = await this.callAlpaca('assets', { 
        status: 'active',
        asset_class: 'us_equity'
      });
      
      if (!data || !Array.isArray(data)) return [];
      
      // Alpaca returns asset info, we need to get the most traded ones
      // This is a simplified version - in production you'd use their market data API
      return data.slice(0, limit).map(asset => ({
        symbol: asset.symbol,
        name: asset.name,
        tradable: asset.tradable,
        source: 'Alpaca'
      }));
    } catch (error) {
      console.error('Error getting most active by volume:', error);
      return [];
    }
  }

  // Get sector performance (FMP)
  async getSectorPerformance() {
    try {
      const data = await this.callFMP('sector-performance');
      if (!data || !Array.isArray(data)) return [];
      
      return data.map(sector => ({
        sector: sector.sector,
        changesPercentage: sector.changesPercentage,
        source: 'FMP'
      }));
    } catch (error) {
      console.error('Error getting sector performance:', error);
      return [];
    }
  }

  // Get market sentiment indicators
  async getMarketSentiment() {
    try {
      const [actives, gainers, losers, sectors] = await Promise.all([
        this.getMostActiveStocks(10),
        this.getBiggestGainers(10),
        this.getBiggestLosers(10),
        this.getSectorPerformance()
      ]);

      // Calculate market sentiment
      const totalGainers = gainers.length;
      const totalLosers = losers.length;
      const avgGainerChange = gainers.reduce((sum, stock) => sum + (stock.changesPercentage || 0), 0) / totalGainers;
      const avgLoserChange = losers.reduce((sum, stock) => sum + (stock.changesPercentage || 0), 0) / totalLosers;
      
      const sentiment = avgGainerChange + avgLoserChange > 0 ? 'bullish' : 'bearish';
      const strength = Math.abs(avgGainerChange + avgLoserChange) / 2;

      return {
        sentiment,
        strength,
        avgGainerChange,
        avgLoserChange,
        totalGainers,
        totalLosers,
        mostActive: actives,
        topGainers: gainers,
        topLosers: losers,
        sectorPerformance: sectors,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting market sentiment:', error);
      return null;
    }
  }

  // Smart stock selection for AI based on market conditions
  async getSmartStockSelection(strategy = 'balanced', limit = 20) {
    try {
      const sentiment = await this.getMarketSentiment();
      if (!sentiment) return [];

      let selectedStocks = [];

      // Strategy-based selection
      switch (strategy) {
        case 'conservative':
          // Focus on stable, less volatile stocks
          selectedStocks = sentiment.mostActive.filter(stock => 
            Math.abs(stock.changesPercentage || 0) < 3 && stock.volume > 1000000
          );
          break;

        case 'aggressive':
        case 'extreme':
        case 'yolo':
          // Focus on high volatility and momentum stocks
          if (sentiment.sentiment === 'bullish') {
            selectedStocks = [...sentiment.topGainers, ...sentiment.mostActive.filter(stock => 
              (stock.changesPercentage || 0) > 2
            )];
          } else {
            // In bearish market, look for oversold opportunities
            selectedStocks = sentiment.topLosers.filter(stock => 
              (stock.changesPercentage || 0) < -5 && stock.volume > 500000
            );
          }
          break;

        case 'scalping':
          // Focus on high volume, active stocks regardless of direction
          selectedStocks = sentiment.mostActive.filter(stock => 
            stock.volume > 2000000
          );
          break;

        default: // balanced
          // Mix of active and trending stocks
          selectedStocks = [
            ...sentiment.mostActive.slice(0, 10),
            ...sentiment.topGainers.slice(0, 5),
            ...sentiment.topLosers.slice(0, 5)
          ];
      }

      // Remove duplicates and limit results
      const uniqueStocks = selectedStocks.reduce((acc, stock) => {
        if (!acc.find(s => s.symbol === stock.symbol)) {
          acc.push(stock);
        }
        return acc;
      }, []);

      return uniqueStocks.slice(0, limit).map(stock => stock.symbol);
    } catch (error) {
      console.error('Error getting smart stock selection:', error);
      return [];
    }
  }

  // Get real-time market movers for immediate opportunities
  async getMarketMovers() {
    try {
      const [gainers, losers, actives] = await Promise.all([
        this.getBiggestGainers(5),
        this.getBiggestLosers(5),
        this.getMostActiveStocks(10)
      ]);

      return {
        breakout: gainers.filter(stock => (stock.changesPercentage || 0) > 5),
        oversold: losers.filter(stock => (stock.changesPercentage || 0) < -5),
        momentum: actives.filter(stock => Math.abs(stock.changesPercentage || 0) > 2),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error getting market movers:', error);
      return { breakout: [], oversold: [], momentum: [] };
    }
  }
}

// Export singleton instance
export const marketDataAPI = new MarketDataAPI();