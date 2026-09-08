"""Analytics — event tracking and owner dashboard."""
import time
import functools
from flask import Blueprint, request, jsonify, render_template
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from psxapp.extensions import db
from psxapp.models import AnalyticsEvent
from config import Config
import sqlalchemy as sa

analytics_bp = Blueprint("analytics", __name__)


def admin_required(f):
    @functools.wraps(f)
    def wrapper(*a, **kw):
        pwd = request.args.get("pwd") or request.headers.get("X-Admin-Password", "")
        if pwd != Config.ADMIN_PASSWORD:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*a, **kw)
    return wrapper


@analytics_bp.route("/event", methods=["POST"])
def track():
    d   = request.get_json(silent=True) or {}
    uid = None
    try:
        verify_jwt_in_request(optional=True)
        raw = get_jwt_identity()
        uid = int(raw) if raw else None
    except Exception:
        pass

    try:
        ev = AnalyticsEvent(
            ts         = time.time(),
            session_id = str(d.get("session_id", ""))[:36],
            user_id    = uid,
            event      = str(d.get("event",  "page_view"))[:60],
            module     = str(d.get("module", ""))[:40],
            duration_s = float(d.get("duration_s", 0) or 0),
            ip_country = "PK",
            user_agent = (request.user_agent.string or "")[:200],
        )
        db.session.add(ev)
        db.session.commit()
    except Exception as exc:
        db.session.rollback()
        # Don't fail the response — analytics must never break the app
    return jsonify({"ok": True})


@analytics_bp.route("/live")
def live_count():
    try:
        cutoff = time.time() - 300
        count = db.session.execute(
            sa.text("SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE ts > :c"),
            {"c": cutoff},
        ).scalar() or 0
    except Exception:
        count = 0
    return jsonify({"live_users": count})


@analytics_bp.route("/dashboard")
@admin_required
def dashboard():
    now     = time.time()
    day_ago = now - 86400
    wk_ago  = now - 604800
    mo_ago  = now - 2592000

    def _q(sql, params=None):
        try:
            return db.session.execute(sa.text(sql), params or {})
        except Exception:
            return None

    def count_distinct(col, since):
        r = _q(
            f"SELECT COUNT(DISTINCT {col}) FROM analytics_events WHERE ts > :t",
            {"t": since},
        )
        return r.scalar() if r else 0

    def count_all(since):
        r = _q("SELECT COUNT(*) FROM analytics_events WHERE ts > :t", {"t": since})
        return r.scalar() if r else 0

    def module_breakdown(since):
        r = _q(
            "SELECT module, COUNT(*) as cnt FROM analytics_events "
            "WHERE ts > :t AND module != '' GROUP BY module ORDER BY cnt DESC",
            {"t": since},
        )
        return [{"module": row[0], "views": row[1]} for row in r] if r else []

    def hourly_users(since):
        r = _q(
            "SELECT CAST((ts - :base) / 3600 AS INT) as hr, "
            "COUNT(DISTINCT session_id) FROM analytics_events "
            "WHERE ts > :day GROUP BY hr ORDER BY hr",
            {"base": since, "day": since},
        )
        return [{"hour": row[0], "users": row[1]} for row in r] if r else []

    def recent_events(limit=20):
        r = _q(
            "SELECT event, module, ts, session_id FROM analytics_events "
            "ORDER BY ts DESC LIMIT :l",
            {"l": limit},
        )
        if not r:
            return []
        return [
            {"event": row[0], "module": row[1], "ts": row[2],
             "session": (row[3] or "")[:8] + "…"}
            for row in r
        ]

    live_r = _q(
        "SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE ts > :c",
        {"c": now - 300},
    )

    return jsonify({
        "live_users":       live_r.scalar() if live_r else 0,
        "users_24h":        count_distinct("session_id", day_ago),
        "users_7d":         count_distinct("session_id", wk_ago),
        "users_30d":        count_distinct("session_id", mo_ago),
        "events_24h":       count_all(day_ago),
        "events_7d":        count_all(wk_ago),
        "module_breakdown": module_breakdown(day_ago),
        "hourly_users":     hourly_users(day_ago),
        "recent_events":    recent_events(),
    })


@analytics_bp.route("/admin")
@admin_required
def admin_page():
    return render_template("admin/dashboard.html")
