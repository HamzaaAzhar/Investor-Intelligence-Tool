"""
Portfolio future-value projection via Monte Carlo simulation.

Statistical illustration only — NOT personalized financial/investment advice.
Uses geometric Brownian motion per holding, parameterized from real historical
volatility where available (PSX stocks), and category-level assumptions
elsewhere (funds/fixed-income/commodities), documented in `assumption` on
each holding's stats.
"""
import math, random

HORIZONS_YEARS = [1, 3, 5]
N_SIMS = 3000
TRADING_DAYS = 252

# Category-level annualized (mean_return, volatility) used when real daily
# price history isn't available for a holding. These are broad, documented
# planning assumptions — not live data.
CATEGORY_ASSUMPTIONS = {
    "Fixed Income": (0.17, 0.02),   # near risk-free PKR yield, low variance
    "Mutual Fund":  (0.24, 0.10),   # blended fund-of-market assumption
    "Commodity":    (0.15, 0.13),   # gold/silver historical PKR volatility
    "REIT":         (0.10, 0.08),
    "Stock":        (0.25, 0.28),   # generic equity fallback if no history
}


def _stock_stats_from_history(series):
    """Given oldest-first [{ts, close}], return (annualized_mean, annualized_vol) or None."""
    closes = [p["close"] for p in series if p.get("close")]
    if len(closes) < 30:
        return None
    log_returns = [math.log(closes[i] / closes[i - 1]) for i in range(1, len(closes)) if closes[i - 1]]
    if len(log_returns) < 20:
        return None
    n = len(log_returns)
    mean_daily = sum(log_returns) / n
    var_daily  = sum((r - mean_daily) ** 2 for r in log_returns) / max(n - 1, 1)
    vol_daily  = math.sqrt(var_daily)
    return mean_daily * TRADING_DAYS, vol_daily * math.sqrt(TRADING_DAYS)


def holding_stats(holding: dict):
    """
    holding: {asset_id, asset_type, value, ret1y (optional)}
    Returns dict with mu (annualized log-return drift), sigma (annualized vol), source.
    """
    asset_type = holding.get("asset_type", "Stock")
    from psxapp.data.fetchers import fetch_stock_history

    if asset_type == "Stock":
        series = fetch_stock_history(holding["asset_id"])
        if series:
            stats = _stock_stats_from_history(series)
            if stats:
                mean_ann, vol_ann = stats
                # mean_ann is a log-return drift already; convert to GBM mu = drift - 0.5*sigma^2 handled at sim time
                return {"mu_log": mean_ann, "sigma": vol_ann, "source": f"historical ({len(series)}d PSX EOD)"}

    mean_ret, vol = CATEGORY_ASSUMPTIONS.get(asset_type, CATEGORY_ASSUMPTIONS["Stock"])
    # Convert simple annual mean return to an approximate log-return drift
    mu_log = math.log(1 + mean_ret) - 0.5 * vol ** 2
    return {"mu_log": mu_log, "sigma": vol, "source": "category assumption (not live data)"}


def _percentile(sorted_vals, pct):
    if not sorted_vals:
        return 0
    idx = min(len(sorted_vals) - 1, max(0, round(pct / 100 * (len(sorted_vals) - 1))))
    return sorted_vals[idx]


def project_portfolio(holdings: list):
    """
    holdings: list of {asset_id, asset_type, value} — value = current market value (PKR).
    Returns per-horizon percentile bands, probability of gain, and per-holding assumption notes.
    """
    total_value = sum(h["value"] for h in holdings)
    if total_value <= 0:
        return {"error": "Portfolio has no value to project"}

    enriched = []
    for h in holdings:
        stats = holding_stats(h)
        enriched.append({**h, **stats})

    rng = random.Random(2026)  # deterministic across a single request for reproducibility
    results = {}
    for years in HORIZONS_YEARS:
        sim_totals = []
        for _ in range(N_SIMS):
            total = 0.0
            for h in enriched:
                z = rng.gauss(0, 1)
                factor = math.exp((h["mu_log"]) * years + h["sigma"] * math.sqrt(years) * z)
                total += h["value"] * factor
            sim_totals.append(total)
        sim_totals.sort()

        p10 = _percentile(sim_totals, 10)
        p25 = _percentile(sim_totals, 25)
        p50 = _percentile(sim_totals, 50)
        p75 = _percentile(sim_totals, 75)
        p90 = _percentile(sim_totals, 90)
        prob_gain = sum(1 for v in sim_totals if v > total_value) / len(sim_totals) * 100

        # Confidence bucket: how tight the middle 50% (p25-p75) is relative to the median —
        # a narrower spread means the model's range of outcomes is more concentrated.
        spread_ratio = (p75 - p25) / p50 if p50 else 1
        if spread_ratio < 0.25:
            confidence = "High"
        elif spread_ratio < 0.55:
            confidence = "Medium"
        else:
            confidence = "Low"

        results[f"{years}y"] = {
            "horizon_years": years,
            "median_value": round(p50, 0),
            "median_return_pct": round((p50 - total_value) / total_value * 100, 1),
            "p10_value": round(p10, 0),
            "p90_value": round(p90, 0),
            "p10_return_pct": round((p10 - total_value) / total_value * 100, 1),
            "p90_return_pct": round((p90 - total_value) / total_value * 100, 1),
            "probability_of_gain_pct": round(prob_gain, 1),
            "confidence": confidence,
            "confidence_spread_ratio": round(spread_ratio, 3),
        }

    return {
        "current_value": round(total_value, 0),
        "horizons": results,
        "holdings_used": [
            {"asset_id": h["asset_id"], "asset_type": h["asset_type"],
             "value": round(h["value"], 0),
             "annualized_return_assumed_pct": round((math.exp(h["mu_log"] + 0.5 * h["sigma"] ** 2) - 1) * 100, 1),
             "annualized_volatility_pct": round(h["sigma"] * 100, 1),
             "basis": h["source"]}
            for h in enriched
        ],
        "method": "Monte Carlo simulation (geometric Brownian motion), "
                  f"{N_SIMS} paths per horizon. Uses real historical PSX volatility where available.",
        "disclaimer": (
            "Statistical illustration only, not personalized financial or investment advice. "
            "Projections are based on historical volatility and category assumptions; actual "
            "future returns can differ substantially. Consult a licensed financial advisor "
            "before making investment decisions."
        ),
    }
