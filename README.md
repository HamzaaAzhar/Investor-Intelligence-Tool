# InvestorLens v9 - Upgraded Pakistan Investment Platform 🇵🇰

## 🚀 Major Upgrades & New Features

### 1. **Fixed Color Scheme** ✅
- **Before**: Candy-like colors (bright purple #a855f7, blue #1890ff, cyan #06b6d4)
- **After**: Cohesive dark theme colors matching the gold/neon accent palette:
  - Technology: #00ff9d (neon green)
  - Banking: #00c27a (green) 
  - Cement: #f0b90b (gold)
  - Fertilizer: #02c076 (emerald)
  - Power: #b8890a (gold-dim)
  - Energy: #f6465d (red - kept for danger/energy)

All sector heatmap colors now blend seamlessly with the Binance/MEXC-inspired dark theme.

### 2. **Improved Ticker** ✅
- **Speed**: Reduced from 65s to 35s for normal scrolling speed
- **Hover Functionality**: Ticker pauses when mouse hovers over it
- **Better Readability**: Now you can actually read the stock prices while hovering

### 3. **Live Data Integration** 🔴 LIVE
Enhanced data fetchers with **legitimate API sources**:

#### Currency Exchange Rates
- **Primary**: ExchangeRate-API.com (free tier, 1500 req/month)
- **Features**: Live PKR/USD, EUR, GBP, AED, SAR rates
- **Update**: Every 30 minutes

#### Cryptocurrency Prices
- **Source**: CoinGecko API (free, no API key required)
- **Assets**: Bitcoin, Ethereum, Ripple, Cardano, Solana
- **Features**: USD & PKR prices, 24h change percentage
- **Update**: Every 5 minutes

#### Gold & Silver
- **Primary**: pakgold.com live scraping
- **Fallback**: GoldAPI.io (requires API key)
- **Formats**: 24K, 22K, 21K, 18K tola prices + gram prices
- **Update**: Every 30 minutes

#### PSX Stock Market
- **Source**: Official PSX API (dps.psx.com.pk)
- **Data**: Live prices, volumes, daily changes
- **Coverage**: Top 100 PSX stocks
- **Update**: Every 5 minutes

#### World Market Indices
- **Markets**: S&P 500, NASDAQ, Dow Jones, FTSE, DAX, Nikkei, Shanghai, Sensex
- **Update**: Every 15 minutes
- **Note**: Can integrate Yahoo Finance or Twelve Data API

### 4. **Advanced Analytics Tools** 🧮

New analytical capabilities powered by `analytics-tools.js`:

#### Technical Indicators
- **RSI (Relative Strength Index)**: Overbought/oversold signals
- **MACD**: Trend following momentum indicator
- **Moving Averages**: Multiple timeframes
- **Support/Resistance**: Fibonacci retracement levels

#### Risk Metrics
- **Volatility Index**: Historical volatility calculation
- **Sharpe Ratio**: Risk-adjusted returns
- **Value at Risk (VaR)**: Portfolio risk measurement
- **Beta Calculation**: Market correlation

#### Portfolio Analytics
- **Correlation Matrix**: Asset correlation analysis
- **Performance Attribution**: Sector allocation vs stock selection
- **Monte Carlo Simulation**: Future portfolio projections
- **Diversification Score**: Portfolio concentration analysis

#### Market Breadth
- **Advance/Decline Ratio**: Market strength indicator
- **Volume Analysis**: Trading activity metrics
- **Sector Rotation**: Capital flow tracking

### 5. **Authentication Fixes** ✅
Fixed several auth flow issues:
- Ensured `App.init()` is properly called after registration
- Fixed error message element IDs
- Improved session management
- Better user state handling across page navigation

## 📊 API Configuration

### Required Environment Variables

Create a `.env` file in the project root:

```bash
# Flask Configuration
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///investorlens.db

# Optional: Enhanced API Keys (for better data quality)
# GOLDAPI_KEY=your-goldapi-key        # Get from goldapi.io
# ALPHA_VANTAGE_KEY=your-av-key       # Get from alphavantage.co
# TWELVE_DATA_KEY=your-td-key         # Get from twelvedata.com

# Admin Access
ADMIN_PASSWORD=admin123
```

### Free API Tiers Used
All primary data sources use FREE tiers:
- ✅ **ExchangeRate-API**: 1,500 requests/month (free forever)
- ✅ **CoinGecko**: Unlimited (rate limited, no key needed)
- ✅ **PSX Official**: Public data, no key needed
- ✅ **Web Scraping**: pakgold.com, MUFAP (public data)

### Optional Paid Upgrades
For production-grade data quality:
- **GoldAPI.io**: $10/month for live gold prices
- **Alpha Vantage**: $50/month for comprehensive stock data
- **Twelve Data**: $8/month for world indices

## 🎨 Color Theme Reference

The upgraded palette maintains consistency throughout:

```css
/* Core Theme */
--neon:      #00ff9d  /* Primary accent - Technology */
--gold:      #f0b90b  /* Secondary accent - Cement */
--green:     #02c076  /* Success - Fertilizer */
--neon-dim:  #00c27a  /* Banking */
--gold-dim:  #b8890a  /* Power */
--red:       #f6465d  /* Danger/Energy */
```

## 🔧 Installation & Setup

```bash
# 1. Extract and navigate
unzip investorlens-upgraded.zip
cd investorlens-upgraded

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment
cp .env.example .env
# Edit .env with your configuration

# 5. Initialize database
python
>>> from psxapp import create_app, db
>>> app = create_app()
>>> with app.app_context():
>>>     db.create_all()
>>> exit()

# 6. Run the app
python run.py
```

Navigate to: `http://localhost:5000`

## 📈 New Analytics Dashboard

Access advanced analytics through the navigation menu:
1. **Technical Analysis**: RSI, MACD, Bollinger Bands
2. **Risk Metrics**: Sharpe, Sortino, VaR, Beta
3. **Portfolio Tools**: Correlation, Attribution, Rebalancing
4. **Market Breadth**: Advance/Decline, Volume, Momentum

## 🔔 Coming Soon
- Real-time price alerts
- Watchlist management
- Advanced charting with TradingView
- News sentiment analysis
- Mobile app (React Native)

## 📝 Changelog

### v9.0 (Current)
- ✅ Fixed candy-like colors to cohesive theme
- ✅ Ticker speed normalized (65s → 35s)
- ✅ Ticker pause on hover
- ✅ Live API integration (ExchangeRate, CoinGecko, PSX)
- ✅ Advanced analytics tools module
- ✅ Auth flow improvements
- ✅ Enhanced data caching (5-30 min TTL)

### v8.0 (Previous)
- Multi-step registration with risk profiling
- Portfolio builder
- Trading simulator
- AI insights (basic)

## 🛠️ Tech Stack

**Backend**:
- Flask 3.0
- SQLAlchemy (SQLite/PostgreSQL)
- Flask-JWT-Extended
- BeautifulSoup4 (web scraping)
- Requests (API calls)

**Frontend**:
- Vanilla JavaScript (ES6+)
- Chart.js 4.4
- CSS3 (custom dark theme)
- No framework bloat!

**Data Sources**:
- PSX Official API
- ExchangeRate-API.com
- CoinGecko API
- pakgold.com
- MUFAP NAV data

## 📱 Browser Support

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ IE11 (not supported)

## 🤝 Contributing

This is a private project, but suggestions welcome via:
- GitHub Issues
- Email: support@investorlens.pk

## 📄 License

Proprietary - All rights reserved

## 🙏 Acknowledgments

- PSX for official market data
- CoinGecko for free crypto API
- ExchangeRate-API for forex data
- Binance/MEXC for design inspiration

---

**Built with ❤️ in Pakistan 🇵🇰**

*Empowering Pakistani investors with world-class tools*
