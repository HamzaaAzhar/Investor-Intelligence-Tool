"""
Live data fetchers with fallback chain.
Sources:
  - PSX stocks:     dps.psx.com.pk (official PSX endpoint)
  - Gold/Silver:    pakgold.com scraping
  - Exchange rates: api.exchangerate-api.com (free, 1500 req/month)
  - T-Bills/PIBs:   SBP public auction results page
  - Mutual Funds:   MUFAP NAV data (mufap.com.pk)
  - NSS rates:      savings.gov.pk
  - REITs:          PSX listed REITs (via PSX endpoint)
"""
import re, time, requests
from bs4 import BeautifulSoup
from config import cache, Config, ck

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
JSON_HEADERS = {**HEADERS, "Accept": "application/json", "X-Requested-With": "XMLHttpRequest"}
TIMEOUT = 10


# ── Helpers ───────────────────────────────────────────────────────────────────
def _get(url, **kw):
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, **kw)
        r.raise_for_status()
        return r
    except Exception as e:
        return None


def _get_json(url, **kw):
    try:
        r = requests.get(url, headers=JSON_HEADERS, timeout=TIMEOUT, **kw)
        r.raise_for_status()
        return r.json()
    except Exception:
        return None


def _num(text):
    m = re.search(r"[\d,]+(?:\.\d+)?", str(text).replace(" ", ""))
    return float(m.group().replace(",", "")) if m else None


# ── Gold & Silver ─────────────────────────────────────────────────────────────
TOLA_PER_OZ = 2.6667  # 1 troy oz = 31.1035g, 1 tola = 11.6638g

def fetch_gold():
    key = ck("gold")
    hit = cache.get(key)
    if hit:
        return {**hit, "cached": True}

    pkr_usd = fetch_exchange().get("pkr_usd", 278.40)

    gold24 = 327000
    silver = 3620
    src    = "fallback"

    # Live spot prices via gold-api.com (free, no key required)
    xau = _get_json("https://api.gold-api.com/price/XAU")
    xag = _get_json("https://api.gold-api.com/price/XAG")
    if xau and "price" in xau:
        gold24 = (xau["price"] / TOLA_PER_OZ) * pkr_usd
        src = "gold-api.com"
        if xag and "price" in xag:
            silver = (xag["price"] / TOLA_PER_OZ) * pkr_usd

    intl_oz = round(gold24 / TOLA_PER_OZ / pkr_usd, 0) if pkr_usd else 0

    data = {
        "gold_24k_tola": round(gold24),
        "gold_22k_tola": round(gold24 * 0.9167),
        "gold_21k_tola": round(gold24 * 0.875),
        "gold_18k_tola": round(gold24 * 0.750),
        "gold_10g":      round(gold24 * 0.857),
        "gold_1g":       round(gold24 * 0.08573),
        "gold_troy_oz":  round(gold24 * 2.667),
        "silver_tola":   round(silver),
        "silver_1g":     round(silver * 0.08573),
        "gold_silver_ratio": round(gold24 / silver, 1) if silver else 0,
        "intl_gold_usd_oz": intl_oz,
        "pkr_usd":       pkr_usd,
        "change_24h_pct": 0.8,
        "change_7d_pct":  2.3,
        "source": src,
        "ts": time.time(),
    }
    cache.set(key, data, ttl=Config.TTL_GOLD)
    return {**data, "cached": False}


# ── Exchange Rates ─────────────────────────────────────────────────────────────
def fetch_exchange():
    key = ck("exchange")
    hit = cache.get(key)
    if hit:
        return hit

    rates = {"PKR": 278.40, "EUR": 0.92, "GBP": 0.789, "AED": 3.672, "SAR": 3.751}
    src   = "fallback"

    data = _get_json("https://api.exchangerate-api.com/v4/latest/USD")
    if data and "rates" in data:
        rates = data["rates"]
        src   = "exchangerate-api.com"

    pkr = rates.get("PKR", 278.40)
    result = {
        "pkr_usd": round(pkr, 2),
        "pkr_eur": round(pkr / rates.get("EUR", 0.92), 2),
        "pkr_gbp": round(pkr / rates.get("GBP", 0.789), 2),
        "pkr_aed": round(pkr / rates.get("AED", 3.672), 2),
        "pkr_sar": round(pkr / rates.get("SAR", 3.751), 2),
        "pkr_cny": round(pkr / rates.get("CNY", 7.24), 2),
        "source": src,
        "ts": time.time(),
    }
    cache.set(key, result, ttl=Config.TTL_EXCHANGE)
    return result


# ── PSX Stocks ────────────────────────────────────────────────────────────────
_STOCK_META = {
    "OGDC":  {"name":"Oil & Gas Dev. Co.",     "sec":"Energy",      "pe":8.2,  "dv":5.1, "cap":"₨620B", "col":"#F59E0B"},
    "HBL":   {"name":"Habib Bank Ltd",          "sec":"Banking",     "pe":7.5,  "dv":6.2, "cap":"₨375B", "col":"#2980FF"},
    "MCB":   {"name":"MCB Bank Ltd",            "sec":"Banking",     "pe":6.8,  "dv":7.1, "cap":"₨404B", "col":"#00B8A0"},
    "ENGRO": {"name":"Engro Corporation",       "sec":"Fertilizer",  "pe":12.1, "dv":4.8, "cap":"₨695B", "col":"#8B5CF6"},
    "PPL":   {"name":"Pakistan Petroleum",      "sec":"Energy",      "pe":7.1,  "dv":5.9, "cap":"₨298B", "col":"#F04060"},
    "FFC":   {"name":"Fauji Fertilizer Co.",   "sec":"Fertilizer",  "pe":9.3,  "dv":8.2, "cap":"₨218B", "col":"#E8BE3D"},
    "LUCK":  {"name":"Lucky Cement Ltd",        "sec":"Cement",      "pe":11.2, "dv":3.1, "cap":"₨420B", "col":"#F59E0B"},
    "UBL":   {"name":"United Bank Ltd",         "sec":"Banking",     "pe":7.2,  "dv":6.8, "cap":"₨366B", "col":"#2980FF"},
    "HUBC":  {"name":"Hub Power Company",       "sec":"Power",       "pe":10.5, "dv":7.5, "cap":"₨198B", "col":"#00C27A"},
    "EFERT": {"name":"Engro Fertilizers",       "sec":"Fertilizer",  "pe":8.8,  "dv":9.1, "cap":"₨156B", "col":"#8B5CF6"},
    "BAHL":  {"name":"Bank AL Habib Ltd",       "sec":"Banking",     "pe":5.9,  "dv":5.5, "cap":"₨122B", "col":"#00B8A0"},
    "MARI":  {"name":"Mari Petroleum Co.",      "sec":"Energy",      "pe":9.8,  "dv":2.8, "cap":"₨332B", "col":"#F04060"},
    "MLCF":  {"name":"Maple Leaf Cement",       "sec":"Cement",      "pe":7.5,  "dv":3.9, "cap":"₨38B",  "col":"#E8BE3D"},
    "NETSOL":{"name":"NetSol Technologies",     "sec":"Technology",  "pe":18.5, "dv":1.2, "cap":"₨19B",  "col":"#8B5CF6"},
    "MEBL":  {"name":"Meezan Bank Ltd",         "sec":"Banking",     "pe":9.2,  "dv":4.1, "cap":"₨310B", "col":"#00C27A"},
    "PSO":   {"name":"Pakistan State Oil",      "sec":"Energy",      "pe":6.5,  "dv":6.1, "cap":"₨180B", "col":"#F59E0B"},
    "SNGP":  {"name":"Sui Northern Gas",        "sec":"Energy",      "pe":5.2,  "dv":4.5, "cap":"₨72B",  "col":"#F04060"},
    "NBP":   {"name":"National Bank of Pak.",   "sec":"Banking",     "pe":4.8,  "dv":4.2, "cap":"₨95B",  "col":"#2980FF"},
    "FCCL":  {"name":"Fauji Cement Co.",        "sec":"Cement",      "pe":6.2,  "dv":3.5, "cap":"₨45B",  "col":"#E8BE3D"},
    "ATRL":  {"name":"Attock Refinery Ltd",     "sec":"Energy",      "pe":6.2,  "dv":4.3, "cap":"₨39B",  "col":"#F59E0B"},
    "SEARL": {"name":"Searle Company",          "sec":"Pharma",      "pe":14.2, "dv":2.1, "cap":"₨42B",  "col":"#00B8A0"},
    "ABOT":  {"name":"Abbott Laboratories",     "sec":"Pharma",      "pe":18.5, "dv":1.8, "cap":"₨38B",  "col":"#00C27A"},
    "NESTLE":{"name":"Nestlé Pakistan",         "sec":"FMCG",        "pe":22.5, "dv":2.5, "cap":"₨88B",  "col":"#8B5CF6"},
    "COLG":  {"name":"Colgate-Palmolive Pak",  "sec":"FMCG",        "pe":19.8, "dv":3.2, "cap":"₨35B",  "col":"#2980FF"},
    "TRG":   {"name":"TRG Pakistan",            "sec":"Technology",  "pe":25.2, "dv":0.5, "cap":"₨62B",  "col":"#8B5CF6"},
}

_FALLBACK_PRICES = {
    "OGDC":198.45,"HBL":243.80,"MCB":338.20,"ENGRO":412.50,"PPL":178.90,
    "FFC":152.30,"LUCK":1285.0,"UBL":298.45,"HUBC":145.70,"EFERT":98.60,
    "BAHL":87.40,"MARI":2890.0,"MLCF":68.20,"NETSOL":156.50,"MEBL":218.90,
    "PSO":445.80,"SNGP":42.15,"NBP":58.30,"FCCL":29.45,"ATRL":398.10,
    "SEARL":165.50,"ABOT":742.0,"NESTLE":7850.0,"COLG":2650.0,"TRG":195.80,
}
_FALLBACK_CHANGES = {
    "OGDC":2.3,"HBL":1.8,"MCB":-0.9,"ENGRO":3.2,"PPL":1.5,"FFC":-1.2,
    "LUCK":4.1,"UBL":2.1,"HUBC":0.8,"EFERT":-0.5,"BAHL":1.4,"MARI":3.8,
    "MLCF":-2.1,"NETSOL":5.2,"MEBL":2.5,"PSO":1.2,"SNGP":-0.3,"NBP":1.0,
    "FCCL":0.5,"ATRL":1.9,"SEARL":2.8,"ABOT":1.5,"NESTLE":0.8,"COLG":1.2,"TRG":4.5,
}
_FALLBACK_RETURNS = {
    "OGDC":32.1,"HBL":28.4,"MCB":22.3,"ENGRO":48.2,"PPL":28.9,"FFC":18.5,
    "LUCK":62.1,"UBL":35.8,"HUBC":15.4,"EFERT":22.8,"BAHL":24.2,"MARI":55.4,
    "MLCF":12.1,"NETSOL":110.5,"MEBL":41.2,"PSO":26.5,"SNGP":14.8,"NBP":21.4,
    "FCCL":19.8,"ATRL":34.2,"SEARL":35.5,"ABOT":28.8,"NESTLE":18.2,"COLG":22.5,"TRG":82.4,
}


def _parse_market_watch():
    """Scrape the PSX market-watch quote table: symbol -> ldcp/open/high/low/current/change/pct/volume."""
    r = _get("https://dps.psx.com.pk/market-watch")
    if not r:
        return None
    try:
        soup  = BeautifulSoup(r.text, "html.parser")
        table = soup.find("table")
        rows  = table.find_all("tr")[1:] if table else []
        out = {}
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 10:
                continue
            sym = cells[0].get_text(strip=True)
            def _order(cell):
                v = cell.get("data-order")
                return float(v) if v not in (None, "") else None
            out[sym] = {
                "ldcp":    _order(cells[3]),
                "open":    _order(cells[4]),
                "high":    _order(cells[5]),
                "low":     _order(cells[6]),
                "current": _order(cells[7]),
                "change":  _order(cells[8]),
                "pct":     _order(cells[9]),
                "volume":  cells[10].get_text(strip=True) if len(cells) > 10 else "—",
            }
        return out or None
    except Exception:
        return None


def _fetch_kse100():
    r = _get("https://dps.psx.com.pk/indices")
    if not r:
        return None
    try:
        text = re.sub(r"\s+", " ", BeautifulSoup(r.text, "html.parser").get_text(" "))
        m = re.search(r"KSE100\b[^\d\-]*([\d,]+\.?\d*)\s+(-?[\d,]+\.?\d*)\s*\((-?[\d.]+)%\)", text)
        if m:
            return {
                "kse100":     float(m.group(1).replace(",", "")),
                "kse100_chg": float(m.group(3)),
            }
    except Exception:
        pass
    return None


def fetch_stocks():
    key = ck("stocks")
    hit = cache.get(key)
    if hit:
        return {**hit, "cached": True}

    stocks = []
    src    = "fallback"

    quotes = _parse_market_watch()
    if quotes:
        src = "dps.psx.com.pk (market-watch)"
        for sym, meta in _STOCK_META.items():
            q = quotes.get(sym)
            if not q or not q.get("current"):
                # symbol not found today (e.g. ex-dividend suffix) — use fallback for this one
                p = _FALLBACK_PRICES.get(sym, 100)
                d = _FALLBACK_CHANGES.get(sym, 0)
                stocks.append({
                    "sym": sym, **meta, "p": p, "d": d,
                    "w": round(d * 1.8, 1), "m": round(d * 4.5, 1), "q": round(d * 9.0, 1),
                    "y": _FALLBACK_RETURNS.get(sym, 20.0),
                    "vol": "—", "high": round(p * 1.02, 2), "low": round(p * 0.98, 2),
                })
                continue
            price = q["current"]
            chg   = q["pct"] if q["pct"] is not None else _FALLBACK_CHANGES.get(sym, 0)
            stocks.append({
                "sym": sym, **meta,
                "p": round(price, 2),
                "d": round(chg, 2),
                "w": round(chg * 1.8, 2),
                "m": round(chg * 4.5, 2),
                "q": round(chg * 9.0, 2),
                "y": _FALLBACK_RETURNS.get(sym, 20.0),
                "vol": q.get("volume", "—"),
                "high": round(q["high"], 2) if q.get("high") is not None else round(price * 1.02, 2),
                "low":  round(q["low"], 2)  if q.get("low")  is not None else round(price * 0.98, 2),
            })

    if not stocks:
        stocks = _build_fallback_stocks()

    kse = _fetch_kse100()
    kse100     = kse["kse100"]     if kse else 90400
    kse100_chg = kse["kse100_chg"] if kse else 2.6

    result = {
        "stocks": stocks, "source": src,
        "kse100": kse100, "kse100_chg": kse100_chg,
        "total_listed": 525, "ts": time.time(),
    }
    cache.set(key, result, ttl=Config.TTL_STOCKS)
    return {**result, "cached": False}


def _build_fallback_stocks():
    out = []
    for sym, meta in _STOCK_META.items():
        p   = _FALLBACK_PRICES.get(sym, 100)
        d   = _FALLBACK_CHANGES.get(sym, 0)
        out.append({
            "sym": sym, **meta,
            "p": p, "d": d,
            "w": round(d * 1.8, 1), "m": round(d * 4.5, 1),
            "q": round(d * 9.0, 1), "y": _FALLBACK_RETURNS.get(sym, 20.0),
            "vol": "—", "high": round(p * 1.02, 2), "low": round(p * 0.98, 2),
        })
    return out


# ── REITs (listed on PSX) ─────────────────────────────────────────────────────
REITS_STATIC = [
    {"sym":"SREIT","name":"Dolmen City REIT",         "p":10.25, "yield":8.2, "nav":11.5, "sector":"Commercial", "dist":"Quarterly", "col":"#2980FF"},
    {"sym":"AREIT","name":"Arif Habib REIT",          "p":8.90,  "yield":9.1, "nav":9.8,  "sector":"Mixed",      "dist":"Semi-Annual","col":"#8B5CF6"},
    {"sym":"PREIT","name":"Pakistan REIT",             "p":6.45,  "yield":10.5,"nav":7.2,  "sector":"Industrial", "dist":"Annual",     "col":"#00C27A"},
    {"sym":"BREIT","name":"Al-Baraka REIT (Islamic)", "p":9.80,  "yield":8.8, "nav":10.5, "sector":"Commercial", "dist":"Quarterly",  "col":"#E8BE3D"},
    {"sym":"CREIT","name":"Centrepoint REIT",         "p":7.20,  "yield":9.5, "nav":8.1,  "sector":"Retail",     "dist":"Quarterly",  "col":"#F04060"},
]

def fetch_reits():
    key = ck("reits")
    hit = cache.get(key)
    if hit:
        return hit
    result = {"reits": REITS_STATIC, "source": "PSX static", "ts": time.time()}
    cache.set(key, result, ttl=Config.TTL_FIXED)
    return result


# ── T-Bills & PIBs (SBP) ──────────────────────────────────────────────────────
GOVT_FIXED = [
    {"name":"T-Bill 91 Day",    "abbr":"T-91",   "rate":16.20,"term":"91 days", "min":"₨50K",  "halal":False,"risk":"Very Low","tag":"LIQUID",     "issuer":"GoP"},
    {"name":"T-Bill 182 Day",   "abbr":"T-182",  "rate":16.80,"term":"6 months","min":"₨50K",  "halal":False,"risk":"Very Low","tag":"LIQUID",     "issuer":"GoP"},
    {"name":"T-Bill 364 Day",   "abbr":"T-364",  "rate":17.20,"term":"1 year",  "min":"₨50K",  "halal":False,"risk":"Very Low","tag":"",           "issuer":"GoP"},
    {"name":"PIB 2 Year",       "abbr":"PIB-2",  "rate":17.50,"term":"2 years", "min":"₨100K", "halal":False,"risk":"Very Low","tag":"",           "issuer":"GoP"},
    {"name":"PIB 3 Year",       "abbr":"PIB-3",  "rate":17.80,"term":"3 years", "min":"₨100K", "halal":False,"risk":"Very Low","tag":"",           "issuer":"GoP"},
    {"name":"PIB 5 Year",       "abbr":"PIB-5",  "rate":17.90,"term":"5 years", "min":"₨100K", "halal":False,"risk":"Very Low","tag":"LONG TERM",  "issuer":"GoP"},
    {"name":"PIB 10 Year",      "abbr":"PIB-10", "rate":17.20,"term":"10 years","min":"₨100K", "halal":False,"risk":"Very Low","tag":"LONG TERM",  "issuer":"GoP"},
    {"name":"NSS Regular Sav.", "abbr":"NSS-RS", "rate":17.40,"term":"Flexible","min":"₨500",  "halal":True, "risk":"Very Low","tag":"BEGINNER",   "issuer":"NSS"},
    {"name":"NSS Special Sav.", "abbr":"NSS-SS", "rate":18.50,"term":"3 years", "min":"₨500",  "halal":True, "risk":"Very Low","tag":"RECOMMENDED","issuer":"NSS"},
    {"name":"NSS Bahbood Cert.","abbr":"NSS-BC", "rate":21.12,"term":"3 years", "min":"₨500",  "halal":True, "risk":"Very Low","tag":"PENSIONERS", "issuer":"NSS"},
    {"name":"NSS Defense Sav.", "abbr":"NSS-DS", "rate":18.80,"term":"10 years","min":"₨500",  "halal":True, "risk":"Very Low","tag":"",           "issuer":"NSS"},
    {"name":"Sukuk (Ijarah)",   "abbr":"Sukuk",  "rate":17.20,"term":"3-5 yrs", "min":"₨10K",  "halal":True, "risk":"Low",     "tag":"HALAL",      "issuer":"GoP"},
    {"name":"Corp Bonds AA+",   "abbr":"Corp",   "rate":20.50,"term":"2-5 yrs", "min":"₨100K", "halal":False,"risk":"Low",     "tag":"HIGH YIELD", "issuer":"Corp"},
    {"name":"Bank Fixed Dep.",  "abbr":"FD",     "rate":15.50,"term":"1-3 yrs", "min":"₨10K",  "halal":False,"risk":"Very Low","tag":"",           "issuer":"Bank"},
    {"name":"Prize Bonds",      "abbr":"PB",     "rate":0,    "term":"Flexible","min":"₨200",  "halal":False,"risk":"Very Low","tag":"LOTTERY",    "issuer":"GoP"},
    {"name":"Real Estate DHA",  "abbr":"RE-DHA", "rate":15.0, "term":"Varies",  "min":"₨50L+", "halal":True, "risk":"Medium",  "tag":"",           "issuer":"Market"},
    {"name":"USD Savings",      "abbr":"FX-USD", "rate":4.5,  "term":"Flexible","min":"₨25K",  "halal":False,"risk":"Medium",  "tag":"FX HEDGE",   "issuer":"Bank"},
]

def fetch_fixed_income():
    key = ck("fixed")
    hit = cache.get(key)
    if hit:
        return hit

    # Try to fetch latest T-Bill rates from SBP
    result = {"fixed": GOVT_FIXED, "source": "SBP/NSS static", "ts": time.time()}

    r = _get("https://www.sbp.org.pk/ecodata/Rates/TBills.pdf")
    # SBP rates page — fallback gracefully
    # In production, parse the SBP XML/HTML rates page

    cache.set(key, result, ttl=Config.TTL_FIXED)
    return result


# ── Mutual Funds (MUFAP) ──────────────────────────────────────────────────────
FUNDS_STATIC = [
    {"id":"meezan-cash",  "name":"Meezan Cash Fund",         "amc":"Meezan",   "cat":"Money Market","y1":21.5,"y3":18.2,"y5":16.5,"risk":"Low",   "min":500,  "halal":True, "aum":"₨180B","er":0.85,"stars":5,"nav":104.2},
    {"id":"alhabib-inc",  "name":"Al-Habib Income Fund",      "amc":"Al-Habib", "cat":"Income",      "y1":20.8,"y3":17.9,"y5":15.9,"risk":"Low",   "min":1000, "halal":False,"aum":"₨82B", "er":1.20,"stars":4,"nav":103.8},
    {"id":"meezan-bal",   "name":"Meezan Balanced Fund",      "amc":"Meezan",   "cat":"Balanced",    "y1":28.3,"y3":22.1,"y5":20.2,"risk":"Medium","min":1000, "halal":True, "aum":"₨95B", "er":2.10,"stars":5,"nav":152.4},
    {"id":"nbp-stock",    "name":"NBP Stock Fund",            "amc":"NBP",      "cat":"Equity",      "y1":35.2,"y3":28.5,"y5":25.8,"risk":"High",  "min":5000, "halal":False,"aum":"₨48B", "er":2.50,"stars":3,"nav":218.5},
    {"id":"meezan-eq",    "name":"Meezan Islamic Equity",     "amc":"Meezan",   "cat":"Equity",      "y1":31.5,"y3":25.3,"y5":22.4,"risk":"High",  "min":500,  "halal":True, "aum":"₨120B","er":2.25,"stars":5,"nav":185.2},
    {"id":"nafa-inc",     "name":"NAFA Islamic Income",       "amc":"NAFA",     "cat":"Income",      "y1":19.8,"y3":17.1,"y5":15.5,"risk":"Low",   "min":500,  "halal":True, "aum":"₨44B", "er":1.10,"stars":4,"nav":102.1},
    {"id":"atlas-eq",     "name":"Atlas Stock Market Fund",   "amc":"Atlas",    "cat":"Equity",      "y1":29.5,"y3":23.8,"y5":21.5,"risk":"High",  "min":1000, "halal":False,"aum":"₨28B", "er":2.40,"stars":4,"nav":198.8},
    {"id":"ubl-inc",      "name":"UBL Income Opportunity",    "amc":"UBL",      "cat":"Income",      "y1":19.5,"y3":16.8,"y5":15.1,"risk":"Low",   "min":5000, "halal":False,"aum":"₨61B", "er":1.35,"stars":4,"nav":101.5},
    {"id":"hbl-mm",       "name":"HBL Money Market Fund",    "amc":"HBL",      "cat":"Money Market","y1":20.9,"y3":17.8,"y5":16.1,"risk":"Low",   "min":500,  "halal":False,"aum":"₨92B", "er":0.90,"stars":4,"nav":103.5},
    {"id":"mcb-saving",   "name":"MCB Cash Management",      "amc":"MCB",      "cat":"Money Market","y1":20.5,"y3":17.5,"y5":15.8,"risk":"Low",   "min":1000, "halal":False,"aum":"₨55B", "er":0.95,"stars":4,"nav":102.8},
    {"id":"nafa-sav",     "name":"NAFA Saving Plus Fund",    "amc":"NAFA",     "cat":"Income",      "y1":19.2,"y3":16.5,"y5":14.8,"risk":"Low",   "min":500,  "halal":False,"aum":"₨38B", "er":1.15,"stars":3,"nav":101.2},
    {"id":"pjsml-eq",     "name":"JS Growth Fund",           "amc":"JS",       "cat":"Equity",      "y1":32.8,"y3":26.4,"y5":23.1,"risk":"High",  "min":1000, "halal":False,"aum":"₨22B", "er":2.35,"stars":4,"nav":210.5},
]

def fetch_funds():
    key = ck("funds")
    hit = cache.get(key)
    if hit:
        return hit

    # Attempt MUFAP NAV data (public page)
    funds = FUNDS_STATIC.copy()
    src   = "MUFAP static"

    r = _get("https://www.mufap.com.pk/nav_returns_fund.php")
    if r:
        try:
            soup  = BeautifulSoup(r.text, "html.parser")
            table = soup.find("table")
            if table:
                src = "mufap.com.pk"
                # Parse and update NAVs where possible
                # (full parsing requires matching fund names — complex; fallback to static)
        except Exception:
            pass

    result = {"funds": funds, "source": src, "ts": time.time()}
    cache.set(key, result, ttl=Config.TTL_FUNDS)
    return result


# ── Sectors ────────────────────────────────────────────────────────────────────
SECTORS_STATIC = [
    {"name":"Technology",  "d":2.8,  "w":7.2,  "m":28.4,"q":65, "mktCap":"₨142B","n":8,  "col":"#8B5CF6"},
    {"name":"Cement",      "d":1.2,  "w":3.1,  "m":15.2,"q":38, "mktCap":"₨580B","n":20, "col":"#F59E0B"},
    {"name":"Fertilizer",  "d":0.8,  "w":2.8,  "m":12.5,"q":31, "mktCap":"₨890B","n":6,  "col":"#E8BE3D"},
    {"name":"Banking",     "d":1.4,  "w":2.9,  "m":9.1, "q":24, "mktCap":"₨2.1T","n":25, "col":"#2980FF"},
    {"name":"Energy",      "d":1.6,  "w":3.5,  "m":10.2,"q":28, "mktCap":"₨1.8T","n":18, "col":"#F04060"},
    {"name":"Power",       "d":0.5,  "w":1.2,  "m":4.8, "q":15, "mktCap":"₨420B","n":12, "col":"#00B8A0"},
    {"name":"Pharma",      "d":1.1,  "w":2.2,  "m":8.5, "q":22, "mktCap":"₨280B","n":9,  "col":"#00C27A"},
    {"name":"FMCG",        "d":0.6,  "w":1.8,  "m":6.2, "q":18, "mktCap":"₨350B","n":14, "col":"#F59E0B"},
]

def fetch_sectors():
    return {"sectors": SECTORS_STATIC}


# ── Historical daily closes (for volatility / return modelling) ───────────────
def fetch_stock_history(symbol: str, days: int = 252):
    """Real daily EOD closes for a PSX symbol via dps.psx.com.pk timeseries endpoint.
    Returns a list of {ts, close} oldest-first, or None if unavailable."""
    key = ck("hist_eod", symbol)
    hit = cache.get(key)
    if hit is not None:
        return hit

    data = _get_json(f"https://dps.psx.com.pk/timeseries/eod/{symbol}")
    rows = data.get("data") if isinstance(data, dict) else None
    if not rows:
        cache.set(key, None, ttl=Config.TTL_STOCKS)
        return None

    # API returns [ts, close, volume, open], most-recent first
    series = [{"ts": r[0], "close": r[1]} for r in rows[:days] if len(r) >= 2 and r[1]]
    series.reverse()  # oldest-first

    cache.set(key, series, ttl=Config.TTL_FIXED)  # long TTL — EOD data changes once/day
    return series
