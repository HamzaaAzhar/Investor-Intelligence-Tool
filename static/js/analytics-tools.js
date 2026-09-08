// ── ADVANCED ANALYTICS & TOOLS ──────────────────────────────────────────────
// Enhanced analytics features for InvestorLens
const Analytics = {
  
  // Technical Indicators Calculator
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i-1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return {
      value: rsi.toFixed(2),
      signal: rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral',
      color: rsi > 70 ? '#f6465d' : rsi < 30 ? '#02c076' : '#f0b90b'
    };
  },

  // Moving Average Convergence Divergence
  calculateMACD(prices, short = 12, long = 26, signal = 9) {
    if (prices.length < long) return null;
    
    const ema = (data, period) => {
      const k = 2 / (period + 1);
      let emaValue = data[0];
      for (let i = 1; i < data.length; i++) {
        emaValue = data[i] * k + emaValue * (1 - k);
      }
      return emaValue;
    };
    
    const emaShort = ema(prices, short);
    const emaLong = ema(prices, long);
    const macdLine = emaShort - emaLong;
    
    return {
      value: macdLine.toFixed(2),
      signal: macdLine > 0 ? 'Bullish' : 'Bearish',
      color: macdLine > 0 ? '#02c076' : '#f6465d'
    };
  },

  // Volatility Index (Historical Volatility)
  calculateVolatility(prices, period = 30) {
    if (prices.length < period) return null;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i-1]));
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
    
    return {
      value: volatility.toFixed(2),
      level: volatility > 40 ? 'High' : volatility > 20 ? 'Medium' : 'Low',
      color: volatility > 40 ? '#f6465d' : volatility > 20 ? '#f0b90b' : '#02c076'
    };
  },

  // Sharpe Ratio Calculator (Risk-Adjusted Returns)
  calculateSharpe(returns, riskFreeRate = 0.18) {
    if (returns.length === 0) return null;
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    const sharpe = (avgReturn - riskFreeRate) / stdDev;
    
    return {
      value: sharpe.toFixed(2),
      rating: sharpe > 2 ? 'Excellent' : sharpe > 1 ? 'Good' : sharpe > 0 ? 'Fair' : 'Poor',
      color: sharpe > 2 ? '#02c076' : sharpe > 1 ? '#00ff9d' : sharpe > 0 ? '#f0b90b' : '#f6465d'
    };
  },

  // Portfolio Correlation Matrix
  calculateCorrelation(series1, series2) {
    if (series1.length !== series2.length || series1.length === 0) return null;
    
    const n = series1.length;
    const mean1 = series1.reduce((a, b) => a + b, 0) / n;
    const mean2 = series2.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0, denom1 = 0, denom2 = 0;
    for (let i = 0; i < n; i++) {
      const diff1 = series1[i] - mean1;
      const diff2 = series2[i] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }
    
    const correlation = numerator / Math.sqrt(denom1 * denom2);
    return correlation;
  },

  // Market Breadth (Advance/Decline Ratio)
  calculateMarketBreadth(stocks) {
    const advancing = stocks.filter(s => s.d > 0).length;
    const declining = stocks.filter(s => s.d < 0).length;
    const unchanged = stocks.filter(s => s.d === 0).length;
    const total = stocks.length;
    
    const ratio = advancing / declining;
    
    return {
      advancing,
      declining,
      unchanged,
      total,
      ratio: ratio.toFixed(2),
      signal: ratio > 1.5 ? 'Strong Buy' : ratio > 1 ? 'Buy' : ratio < 0.67 ? 'Sell' : 'Neutral',
      breadthPct: ((advancing / total) * 100).toFixed(1)
    };
  },

  // Support and Resistance Levels
  calculateSupportResistance(prices, window = 20) {
    if (prices.length < window) return null;
    
    const recentPrices = prices.slice(-window);
    const max = Math.max(...recentPrices);
    const min = Math.min(...recentPrices);
    const current = prices[prices.length - 1];
    
    // Fibonacci retracement levels
    const range = max - min;
    const levels = {
      resistance3: max,
      resistance2: max - (range * 0.236),
      resistance1: max - (range * 0.382),
      pivot: min + (range * 0.5),
      support1: min + (range * 0.618),
      support2: min + (range * 0.764),
      support3: min,
      current: current
    };
    
    return levels;
  },

  // Dividend Yield & Calendar
  calculateDividendMetrics(stock) {
    const { p: price, dv: yield_pct, divs } = stock;
    
    if (!divs || divs.length === 0) return null;
    
    const annualDiv = divs.reduce((sum, d) => sum + d.amount, 0);
    const divYield = (annualDiv / price) * 100;
    const payoutFreq = divs.length;
    const avgDiv = annualDiv / payoutFreq;
    
    return {
      annualDividend: annualDiv.toFixed(2),
      yield: divYield.toFixed(2),
      frequency: payoutFreq,
      avgPayment: avgDiv.toFixed(2),
      nextPayment: divs[0]?.date || 'N/A'
    };
  },

  // Portfolio Performance Attribution
  calculateAttribution(holdings, benchmark) {
    const portfolioReturn = holdings.reduce((sum, h) => {
      return sum + (h.return * h.weight);
    }, 0);
    
    const sectorAllocation = holdings.reduce((sum, h) => {
      const sectorBench = benchmark.sectors[h.sector] || 0;
      return sum + ((h.weight - sectorBench) * sectorBench);
    }, 0);
    
    const stockSelection = holdings.reduce((sum, h) => {
      return sum + (h.return - benchmark.return) * h.weight;
    }, 0);
    
    return {
      totalReturn: portfolioReturn.toFixed(2),
      allocationEffect: sectorAllocation.toFixed(2),
      selectionEffect: stockSelection.toFixed(2),
      alpha: (portfolioReturn - benchmark.return).toFixed(2)
    };
  },

  // Monte Carlo Simulation
  monteCarloSimulation(initialValue, avgReturn, volatility, years, iterations = 1000) {
    const results = [];
    const days = years * 252;
    
    for (let i = 0; i < iterations; i++) {
      let value = initialValue;
      for (let day = 0; day < days; day++) {
        const randomReturn = this.normalRandom(avgReturn / 252, volatility / Math.sqrt(252));
        value *= (1 + randomReturn);
      }
      results.push(value);
    }
    
    results.sort((a, b) => a - b);
    
    return {
      median: results[Math.floor(iterations / 2)],
      percentile10: results[Math.floor(iterations * 0.1)],
      percentile25: results[Math.floor(iterations * 0.25)],
      percentile75: results[Math.floor(iterations * 0.75)],
      percentile90: results[Math.floor(iterations * 0.9)],
      best: results[iterations - 1],
      worst: results[0]
    };
  },

  // Helper: Generate normal random variable
  normalRandom(mean, stdDev) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * stdDev + mean;
  },

  // Value at Risk (VaR) Calculator
  calculateVaR(portfolio, confidenceLevel = 0.95, horizon = 1) {
    const returns = portfolio.map(h => h.return);
    returns.sort((a, b) => a - b);
    
    const index = Math.floor((1 - confidenceLevel) * returns.length);
    const varValue = returns[index];

    return {
      value: (varValue * 100).toFixed(2),
      horizon: horizon,
      confidence: (confidenceLevel * 100).toFixed(0),
      interpretation: `There is a ${((1-confidenceLevel)*100).toFixed(0)}% chance of losing more than ${Math.abs(varValue*100).toFixed(2)}% over ${horizon} day(s)`
    };
  }
};

// Export for use in pages
window.Analytics = Analytics;
