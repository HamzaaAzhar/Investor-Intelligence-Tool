"""Portfolio builder — CRUD for portfolios and holdings."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from psxapp.extensions import db
from psxapp.models import Portfolio, Holding

portfolio_bp = Blueprint("portfolio", __name__)


def _ok(d, status=200):  return jsonify(d), status
def _err(m, s=400):      return jsonify({"error": m}), s
def _uid():              return int(get_jwt_identity())


# ── List portfolios ───────────────────────────────────────────────────────────
@portfolio_bp.route("/", methods=["GET"])
@jwt_required()
def list_portfolios():
    rows = Portfolio.query.filter_by(user_id=_uid()).order_by(Portfolio.created_at).all()
    return _ok({"portfolios": [p.to_dict() for p in rows]})


# ── Create portfolio ──────────────────────────────────────────────────────────
@portfolio_bp.route("/", methods=["POST"])
@jwt_required()
def create_portfolio():
    uid = _uid()
    if Portfolio.query.filter_by(user_id=uid).count() >= 10:
        return _err("Maximum 10 portfolios per user", 400)

    d     = request.get_json(silent=True) or {}
    name  = str(d.get("name",  "My Portfolio"))[:80].strip() or "My Portfolio"
    color = str(d.get("color", "#2980FF"))[:20]

    p = Portfolio(user_id=uid, name=name, color=color)
    db.session.add(p)
    db.session.commit()
    return _ok({"portfolio": p.to_dict()}, 201)


# ── Update portfolio ──────────────────────────────────────────────────────────
@portfolio_bp.route("/<int:pid>", methods=["PUT"])
@jwt_required()
def update_portfolio(pid):
    p = Portfolio.query.filter_by(id=pid, user_id=_uid()).first()
    if not p:
        return _err("Portfolio not found", 404)
    d = request.get_json(silent=True) or {}
    if "name"  in d: p.name  = str(d["name"])[:80]
    if "color" in d: p.color = str(d["color"])[:20]
    db.session.commit()
    return _ok({"portfolio": p.to_dict()})


# ── Delete portfolio ──────────────────────────────────────────────────────────
@portfolio_bp.route("/<int:pid>", methods=["DELETE"])
@jwt_required()
def delete_portfolio(pid):
    p = Portfolio.query.filter_by(id=pid, user_id=_uid()).first()
    if not p:
        return _err("Portfolio not found", 404)
    db.session.delete(p)
    db.session.commit()
    return _ok({"ok": True})


# ── Add holding ───────────────────────────────────────────────────────────────
@portfolio_bp.route("/<int:pid>/holdings", methods=["POST"])
@jwt_required()
def add_holding(pid):
    p = Portfolio.query.filter_by(id=pid, user_id=_uid()).first()
    if not p:
        return _err("Portfolio not found", 404)

    d          = request.get_json(silent=True) or {}
    asset_id   = str(d.get("asset_id",    ""))[:40]
    asset_label= str(d.get("asset_label", ""))[:120]
    asset_type = str(d.get("asset_type",  "Stock"))[:30]
    color      = str(d.get("color", "#00C27A"))[:20]

    try:
        buy_price = float(d.get("buy_price", 0))
        units     = float(d.get("units",     0))
        ret1y     = float(d.get("ret1y",     0))
    except (TypeError, ValueError):
        return _err("buy_price, units, ret1y must be numbers")

    if not asset_id:          return _err("asset_id required")
    if buy_price <= 0:        return _err("buy_price must be > 0")
    if units <= 0:            return _err("units must be > 0")

    # Replace existing holding for same asset
    Holding.query.filter_by(portfolio_id=pid, asset_id=asset_id).delete()

    h = Holding(
        portfolio_id=pid, asset_id=asset_id, asset_label=asset_label,
        asset_type=asset_type, buy_price=buy_price, units=units,
        ret1y=ret1y, color=color,
    )
    db.session.add(h)
    db.session.commit()
    return _ok({"holding": h.to_dict()}, 201)


# ── Remove holding ────────────────────────────────────────────────────────────
@portfolio_bp.route("/<int:pid>/holdings/<int:hid>", methods=["DELETE"])
@jwt_required()
def remove_holding(pid, hid):
    p = Portfolio.query.filter_by(id=pid, user_id=_uid()).first()
    if not p:
        return _err("Portfolio not found", 404)
    h = Holding.query.filter_by(id=hid, portfolio_id=pid).first()
    if not h:
        return _err("Holding not found", 404)
    db.session.delete(h)
    db.session.commit()
    return _ok({"ok": True})


# ── Compare all portfolios ────────────────────────────────────────────────────
@portfolio_bp.route("/compare")
@jwt_required()
def compare():
    rows = Portfolio.query.filter_by(user_id=_uid()).all()
    out  = []
    for p in rows:
        total_val = sum(h.buy_price * h.units for h in p.holdings)
        wt_return = (
            sum(h.buy_price * h.units * h.ret1y / 100 for h in p.holdings) / total_val * 100
            if total_val else 0
        )
        out.append({
            **p.to_dict(),
            "total_value":    round(total_val, 2),
            "wt_return_pct":  round(wt_return, 2),
            "projected_gain": round(total_val * wt_return / 100, 2),
            "holding_count":  len(p.holdings),
        })
    return jsonify({"portfolios": out})
