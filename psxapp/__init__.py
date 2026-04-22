# psxapp/__init__.py  ─── Flask application factory ───────────────────────────
#
# FIXED INIT ORDER (this is what was broken before):
#   1. Create Flask app
#   2. Load config
#   3. db.init_app(app)      ← extensions bound to THIS app instance
#   4. models imported       ← inside app_context so SQLAlchemy sees the app
#   5. db.create_all()       ← inside app_context
#   6. blueprints imported   ← AFTER db is ready
#
import os
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from config import Config


def create_app() -> Flask:
    app = Flask(
        __name__,
        # Absolute paths — works regardless of working directory
        template_folder=os.path.join(os.path.dirname(__file__), "..", "templates"),
        static_folder  =os.path.join(os.path.dirname(__file__), "..", "static"),
    )
    app.config.from_object(Config)

    # ── STEP 1: Init extensions — nothing else is imported yet ────────────────
    from psxapp.extensions import db, jwt   # ← import from extensions, not from psxapp
    db.init_app(app)
    jwt.init_app(app)
    CORS(app, supports_credentials=True, origins="*")

    # ── STEP 2: Import models and create tables inside the app context ─────────
    with app.app_context():
        from psxapp import models           # noqa: F401 — registers ORM metadata
        db.create_all()

    # ── STEP 3: Import and register blueprints — db is fully ready now ─────────
    from psxapp.auth.routes      import auth_bp
    from psxapp.api.routes       import api_bp
    from psxapp.portfolio.routes import portfolio_bp
    from psxapp.analytics.routes import analytics_bp

    app.register_blueprint(auth_bp,       url_prefix="/auth")
    app.register_blueprint(api_bp,        url_prefix="/api")
    app.register_blueprint(portfolio_bp,  url_prefix="/portfolio")
    app.register_blueprint(analytics_bp,  url_prefix="/analytics")

    # ── Security headers ──────────────────────────────────────────────────────
    @app.after_request
    def security_headers(resp):
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["X-Frame-Options"]        = "DENY"
        resp.headers["X-XSS-Protection"]       = "1; mode=block"
        resp.headers["Referrer-Policy"]        = "strict-origin-when-cross-origin"
        return resp

    # ── SPA catch-all (serves index.html for any non-API route) ──────────────
    _API = ("/api/", "/auth/", "/portfolio/", "/analytics/")

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def spa(path=""):
        if request.path.startswith(_API):
            return jsonify({"error": "Not found"}), 404
        return render_template("index.html")

    @app.errorhandler(404)
    def not_found(_):
        if request.path.startswith(_API):
            return jsonify({"error": "Not found"}), 404
        return render_template("index.html")

    @app.errorhandler(500)
    def server_error(exc):
        app.logger.exception("500: %s", exc)
        return jsonify({"error": "Internal server error"}), 500

    return app
