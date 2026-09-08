"""Deterministic historical price series for charting."""
from config import cache, Config, ck

ASSET_CFG = {
    "kse100":  {"base":90400,   "vol":0.012,"trend":0.18,"seed":42},
    "gold":    {"base":327000,  "vol":0.008,"trend":0.14,"seed":99},
    "silver":  {"base":3620,    "vol":0.010,"trend":0.12,"seed":77},
    "OGDC":    {"base":198.45,  "vol":0.018,"trend":0.32,"seed":11},
    "HBL":     {"base":243.80,  "vol":0.016,"trend":0.28,"seed":22},
    "MCB":     {"base":338.20,  "vol":0.015,"trend":0.22,"seed":33},
    "ENGRO":   {"base":412.50,  "vol":0.020,"trend":0.48,"seed":44},
    "PPL":     {"base":178.90,  "vol":0.017,"trend":0.29,"seed":55},
    "FFC":     {"base":152.30,  "vol":0.014,"trend":0.18,"seed":66},
    "LUCK":    {"base":1285.0,  "vol":0.022,"trend":0.62,"seed":77},
    "UBL":     {"base":298.45,  "vol":0.016,"trend":0.36,"seed":88},
    "HUBC":    {"base":145.70,  "vol":0.012,"trend":0.15,"seed":91},
    "EFERT":   {"base":98.60,   "vol":0.014,"trend":0.23,"seed":13},
    "BAHL":    {"base":87.40,   "vol":0.015,"trend":0.24,"seed":24},
    "MARI":    {"base":2890.0,  "vol":0.019,"trend":0.55,"seed":35},
    "NETSOL":  {"base":156.50,  "vol":0.028,"trend":1.10,"seed":57},
    "MEBL":    {"base":218.90,  "vol":0.016,"trend":0.41,"seed":68},
    "PSO":     {"base":445.80,  "vol":0.015,"trend":0.27,"seed":79},
    "MARI":    {"base":2890.0,  "vol":0.019,"trend":0.55,"seed":35},
    "SREIT":   {"base":10.25,   "vol":0.010,"trend":0.12,"seed":81},
}

PERIOD_N   = {"1D":24,"1W":7,"1M":30,"3M":13,"6M":26,"1Y":52}
PERIOD_LBL = {
    "1D": lambda i,_: f"{i}h",
    "1W": lambda i,_: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i],
    "1M": lambda i,_: str(i+1),
    "3M": lambda i,_: f"W{i+1}",
    "6M": lambda i,n: ["Oct","Nov","Dec","Jan","Feb","Mar"][int(i*6/n)],
    "1Y": lambda i,n: ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"][int(i*12/n)],
}


def _rng(seed):
    s = int(seed) & 0xFFFFFFFF
    def f():
        nonlocal s
        s = (s * 1664525 + 1013904223) & 0xFFFFFFFF
        return s / 0xFFFFFFFF
    return f


def generate(asset: str, period: str) -> dict:
    cfg = ASSET_CFG.get(asset, {"base":100,"vol":0.015,"trend":0.20,"seed":1})
    n   = PERIOD_N.get(period, 12)
    lbl = PERIOD_LBL.get(period, lambda i,_: str(i))
    rng = _rng(cfg["seed"] + ord(period[0]) * 7)
    tf  = cfg["trend"] * (n / 52)
    p   = cfg["base"] / (1 + tf)

    labels, values = [], []
    for i in range(n):
        p *= 1 + tf/n + (rng() - 0.47) * cfg["vol"]
        labels.append(lbl(i, n))
        values.append(round(p, 2))

    hi, lo = max(values), min(values)
    f, l   = values[0], values[-1]
    chg    = round((l - f) / f * 100, 2) if f else 0
    return {
        "asset": asset, "period": period,
        "labels": labels, "values": values,
        "stats": {"open":f,"close":l,"high":hi,"low":lo,"change_pct":chg},
    }


def get_history(asset: str, period: str) -> dict:
    if period not in PERIOD_N:
        return {"error": f"Invalid period. Choose: {list(PERIOD_N.keys())}"}
    key = ck("hist", asset, period)
    hit = cache.get(key)
    if hit:
        return {**hit, "cached": True}
    data = generate(asset, period)
    data["cached"] = False
    cache.set(key, data, ttl=Config.TTL_FIXED)
    return data
