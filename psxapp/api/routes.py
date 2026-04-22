"""Market data API routes — all endpoints use lazy imports for speed."""
import re
from flask import Blueprint, request, jsonify
from config import cache, Config, ck, topic_hash, ai_limiter

api_bp = Blueprint("api", __name__)

VALID_PERIOD = re.compile(r"^(1D|1W|1M|3M|6M|1Y)$")
VALID_ASSET  = re.compile(r"^[A-Za-z0-9_\-]{1,30}$")


def _ok(d, status=200): return jsonify(d), status
def _err(m, s=400):     return jsonify({"error": m}), s
def _ip():              return request.headers.get("X-Forwarded-For", "127.0.0.1").split(",")[0].strip()


# ── Bulk init — one request on page load ──────────────────────────────────────
@api_bp.route("/init")
def init():
    from psxapp.data.fetchers import fetch_stocks, fetch_exchange, fetch_sectors
    sd = fetch_stocks()
    return _ok({
        "stocks":   sd.get("stocks", []),
        "kse100":   sd.get("kse100", 90400),
        "exchange": fetch_exchange(),
        "sectors":  fetch_sectors()["sectors"],
        "summary": {
            "kse100": 90400, "kse100_chg": 2.6,
            "kse30":  38820, "kse30_chg":  2.1,
            "advances": 312, "declines": 186, "unchanged": 22,
            "high52w": 48,   "low52w": 12,
            "volume": "₨28.4B", "sbp_rate": 17.50,
            "inflation": 12.6,  "total_listed": 525,
        },
    })


@api_bp.route("/gold")
def gold():
    from psxapp.data.fetchers import fetch_gold
    return _ok(fetch_gold())


@api_bp.route("/stocks")
def stocks():
    from psxapp.data.fetchers import fetch_stocks
    return _ok(fetch_stocks())


@api_bp.route("/reits")
def reits():
    from psxapp.data.fetchers import fetch_reits
    return _ok(fetch_reits())


@api_bp.route("/funds")
def funds():
    from psxapp.data.fetchers import fetch_funds
    return _ok(fetch_funds())


@api_bp.route("/fixed")
def fixed():
    from psxapp.data.fetchers import fetch_fixed_income
    return _ok(fetch_fixed_income())


@api_bp.route("/exchange")
def exchange():
    from psxapp.data.fetchers import fetch_exchange
    return _ok(fetch_exchange())


@api_bp.route("/sectors")
def sectors():
    from psxapp.data.fetchers import fetch_sectors
    return _ok(fetch_sectors())


@api_bp.route("/history")
def history():
    asset  = request.args.get("asset",  "kse100")
    period = request.args.get("period", "1M")
    if not VALID_ASSET.match(asset):
        return _err("Invalid asset parameter (alphanumeric, max 30 chars)")
    if not VALID_PERIOD.match(period):
        return _err("Invalid period — use: 1D 1W 1M 3M 6M 1Y")
    from psxapp.data.history import get_history
    data = get_history(asset, period)
    if "error" in data:
        return _err(data["error"])
    return _ok(data)


@api_bp.route("/opportunities")
def opportunities():
    from psxapp.data.fetchers import (
        fetch_stocks, fetch_funds, fetch_fixed_income, fetch_reits, fetch_gold,
    )
    gold_d  = fetch_gold()
    stocks  = fetch_stocks().get("stocks", [])
    funds   = fetch_funds().get("funds",   [])
    fixed   = fetch_fixed_income().get("fixed", [])
    reits   = fetch_reits().get("reits",  [])

    ops = []

    # Commodities
    ops.append({
        "id":"gold","label":"Gold 24K (per Tola)","type":"Commodity","category":"Commodity",
        "ret1y":18.5,"ret3y":14.2,"ret5y":12.8,"risk":"Low","min_invest":"₨1,000",
        "halal":True,"liquidity":"High","tenure":"Flexible",
        "price":gold_d.get("gold_24k_tola",327000),"col":"#E8BE3D",
    })
    ops.append({
        "id":"silver","label":"Silver (per Tola)","type":"Commodity","category":"Commodity",
        "ret1y":12.1,"ret3y":9.8,"ret5y":8.5,"risk":"Medium","min_invest":"₨500",
        "halal":True,"liquidity":"Medium","tenure":"Flexible",
        "price":gold_d.get("silver_tola",3620),"col":"#00B8A0",
    })

    for s in stocks[:15]:
        ops.append({
            "id":s["sym"],"label":f"{s['sym']} — {s['name']}","type":"Stock","category":"Equity",
            "ret1y":s.get("y",20),"ret3y":round(s.get("y",20)*0.75,1),
            "ret5y":round(s.get("y",20)*0.60,1),
            "risk":"High","min_invest":"₨5,000","halal":False,
            "liquidity":"Very High","tenure":"Short-Long",
            "price":s["p"],"col":s.get("col","#2980FF"),
            "sector":s["sec"],"pe":s.get("pe",10),"dv":s.get("dv",5),
        })

    for f in funds:
        ops.append({
            "id":f["id"],"label":f["name"],"type":"Mutual Fund","category":"Fund",
            "ret1y":f["y1"],"ret3y":f["y3"],"ret5y":f["y5"],
            "risk":f["risk"],"min_invest":f"₨{f['min']:,}","halal":f["halal"],
            "liquidity":"High","tenure":"Flexible",
            "price":f.get("nav",100),"col":"#00C27A",
            "amc":f["amc"],"cat":f["cat"],"er":f["er"],
        })

    for fi in fixed:
        if fi["rate"] > 0:
            ops.append({
                "id":fi["abbr"],"label":fi["name"],"type":"Fixed Income","category":"Fixed",
                "ret1y":fi["rate"],"ret3y":fi["rate"],"ret5y":fi["rate"],
                "risk":fi["risk"],"min_invest":fi["min"],"halal":fi["halal"],
                "liquidity":"Low","tenure":fi["term"],
                "price":1000,"col":"#2980FF","issuer":fi.get("issuer","GoP"),
            })

    for r in reits:
        ops.append({
            "id":r["sym"],"label":r["name"],"type":"REIT","category":"Real Estate",
            "ret1y":r["yield"],"ret3y":round(r["yield"]*0.9,1),
            "ret5y":round(r["yield"]*0.85,1),
            "risk":"Medium","min_invest":"₨5,000","halal":False,
            "liquidity":"High","tenure":"Long Term",
            "price":r["p"],"col":r.get("col","#8B5CF6"),
            "sector":r["sector"],"dist":r["dist"],
        })

    return _ok({"opportunities": ops, "total": len(ops)})


@api_bp.route("/ai-insight", methods=["POST"])
def ai_insight():
    if not request.is_json:
        return _err("Content-Type must be application/json")

    body    = request.get_json(silent=True) or {}
    topic   = str(body.get("topic",   "")).strip()
    context = str(body.get("context", "")).strip()

    if not topic:        return _err("topic required")
    if len(topic) > 600: return _err("topic too long (max 600 chars)")

    if not ai_limiter.ok(_ip()):
        return _err("Rate limit reached — max 20 AI queries per hour", 429)

    key = ck("ai", topic_hash(topic))
    hit = cache.get(key)
    if hit:
        return _ok({"insight": hit, "cached": True})

    if not Config.ANTHROPIC_KEY:
        return _err("ANTHROPIC_API_KEY not configured in .env — see README", 503)

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=Config.ANTHROPIC_KEY)
        msg = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=700,
            system=(
                "You are a senior Pakistani financial analyst, March 2026. "
                "Give concise, data-driven advice for Pakistani investors. "
                "Use ₨ for PKR. Reference SBP rate 17.5%, inflation 12.6%, IMF program."
            ),
            messages=[{"role": "user", "content":
                f"Analyze: {topic}\nContext: {context}\n\n"
                "Format EXACTLY as:\n\n"
                "📊 MARKET OUTLOOK\n[2-3 sentences with PKR data]\n\n"
                "⚠️ KEY RISKS\n• [Risk 1]\n• [Risk 2]\n• [Risk 3]\n\n"
                "🎯 STRATEGY\n[2-3 actionable sentences]\n\n"
                "📈 3-MONTH FORECAST\n[Specific target]\n\n"
                "💡 BEGINNER TIP\n[One practical tip]\n\nMax 230 words."
            }],
        )
        text = msg.content[0].text
        cache.set(key, text, ttl=Config.TTL_AI)
        return _ok({"insight": text, "cached": False})

    except anthropic.AuthenticationError:
        return _err("Invalid ANTHROPIC_API_KEY — check your .env file", 401)
    except anthropic.RateLimitError:
        return _err("Anthropic rate limit hit — try again shortly", 429)
    except Exception as exc:
        return _err(f"AI service error: {exc}", 503)


@api_bp.route("/health")
def health():
    return _ok({
        "status": "ok",
        "ai_configured": bool(Config.ANTHROPIC_KEY),
        "version": "2.0.0",
    })
