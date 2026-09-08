# InvestorLens - Pakistan Investment Platform 🇵🇰

Pakistan-focused investment dashboard: PSX stocks, gold/silver, mutual funds,
fixed income, REITs, a portfolio builder, and AI-assisted market insights.

## 📡 Live Data Sources

| Data | Source | How | Update |
|---|---|---|---|
| PSX stocks (price, change, volume, high/low) | `dps.psx.com.pk/market-watch` | Scrapes the public quote table | 60s cache |
| KSE-100 index | `dps.psx.com.pk/indices` | Scrapes the public indices page | 60s cache |
| Historical stock prices (for volatility) | `dps.psx.com.pk/timeseries/eod/<symbol>` | Official EOD JSON endpoint | daily cache |
| Gold & Silver spot | `gold-api.com` | Free XAU/XAG spot price, converted to PKR/tola via the live PKR/USD rate | 5 min cache |
| Currency exchange rates | `exchangerate-api.com` | Free tier, no key required | 5 min cache |
| Cryptocurrency prices | `coingecko.com` | Free, no key required | 5 min cache |

No API keys are required for any of the above — they're all free, public endpoints.

**Not live** (static reference data, refreshed manually in code): mutual fund
NAVs/returns (MUFAP), T-Bill/PIB/NSS rates (SBP), and REIT prices. These
sources exist but require more involved scraping (PDF parsing, name
matching) than was worth doing for this pass — see `fetch_funds()` /
`fetch_fixed_income()` in `psxapp/data/fetchers.py` for the current state
and where to pick it up.

Every fetcher falls back to a hardcoded snapshot if its live source is
unreachable, so the app degrades gracefully rather than breaking.

## 📈 Future Returns Projection

The Portfolio Builder includes a Monte Carlo projection panel: for each
holding it estimates annualized drift and volatility — from real historical
PSX daily closes where available (stocks), or documented category
assumptions otherwise (funds, fixed income, gold, REITs) — then simulates
3,000 geometric-Brownian-motion paths per 1/3/5-year horizon. It reports a
median projected value, a p10–p90 range, probability of gain, and a
confidence label based on how tight that range is.

This is a statistical illustration, not personalized financial advice —
the panel says so, and the disclaimer is also returned in the API response
(`GET /portfolio/<id>/projection`). See `psxapp/portfolio/projection.py`.

## 🧮 Analytics Tools (`static/js/analytics-tools.js`)

Client-side calculators used across the dashboard:
- **Technical indicators**: RSI, MACD, support/resistance (Fibonacci)
- **Risk metrics**: historical volatility, Sharpe ratio, Value at Risk
- **Portfolio math**: correlation, performance attribution, market breadth
- **Monte Carlo simulation** (the building block the projection panel above wraps server-side)

## 🤖 AI Insights

Each market page has a "Get AI Insights" panel that calls Claude
(`POST /api/ai-insight`) for a short, data-driven read on that topic.
Requires `ANTHROPIC_API_KEY` — without it, the endpoint returns a clear
503 rather than fabricating an answer. Rate-limited to 20 requests/hour
per IP and cached 15 minutes per topic.

## 🔧 Installation & Setup

```bash
git clone https://github.com/HamzaaAzhar/Investor-Intelligence-Tool.git
cd Investor-Intelligence-Tool

# Create virtual environment
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (all optional — sensible dev defaults apply if omitted)
cp .env.example .env          # then edit .env

# Run — tables are created automatically on first launch
python run.py
```

Navigate to: `http://localhost:5000`
Admin analytics: `http://localhost:5000/analytics/admin?pwd=<ADMIN_PASSWORD>`

### Environment Variables

None are required to run the app — everything has a working default for
local development. Set these for production or to enable optional features:

```bash
FLASK_ENV=production                        # enables secure cookies, disables debug
SECRET_KEY=<random string>                  # Flask session signing
JWT_SECRET_KEY=<random string, 32+ chars>   # auth tokens
DATABASE_URL=sqlite:///investorlens.db      # or a Postgres URL for production
ADMIN_PASSWORD=<your choice>                # protects /analytics/admin
ANTHROPIC_API_KEY=<your key>                # required for the AI Insights panels
```

## 🎨 Color Theme Reference

```css
--neon:      #00ff9d  /* Primary accent - Technology */
--gold:      #f0b90b  /* Secondary accent - Cement */
--green:     #02c076  /* Success - Fertilizer */
--neon-dim:  #00c27a  /* Banking */
--gold-dim:  #b8890a  /* Power */
--red:       #f6465d  /* Danger/Energy */
```

## 🛠️ Tech Stack

**Backend**: Flask 3.0 · SQLAlchemy (SQLite by default, Postgres via `DATABASE_URL`) · Flask-JWT-Extended · BeautifulSoup4 · Requests

**Frontend**: Vanilla JavaScript (ES6+) · Chart.js 4.4 · CSS3, no framework

**Deployment**: `render.yaml` blueprint included for one-click Render.com deploy (`gunicorn` via `Procfile`)

## 📱 Browser Support

Chrome/Edge, Firefox, Safari. No IE11 support.

## 📄 License

Proprietary — All rights reserved

---

**Built in Pakistan 🇵🇰 — Empowering Pakistani investors with world-class tools**
