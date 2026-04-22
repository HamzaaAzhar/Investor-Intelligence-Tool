"""Central config, in-memory TTL cache, and rate limiter."""
import os, time, hashlib, threading
from datetime import timedelta
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY      = os.getenv("SECRET_KEY", "dev-secret-change-in-prod")
    JWT_SECRET_KEY  = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-change-in-prod")

    # ── Database ───────────────────────────────────────────────────────────────
    # Always resolve to an absolute path so SQLite works regardless of cwd.
    _raw_db = os.getenv("DATABASE_URL", "")
    if _raw_db:
        SQLALCHEMY_DATABASE_URI = _raw_db
    else:
        _db_dir = os.path.dirname(os.path.abspath(__file__))
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(_db_dir, 'investorlens.db')}"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle":  300,
    }

    # ── JWT ────────────────────────────────────────────────────────────────────
    JWT_TOKEN_LOCATION      = ["headers", "cookies"]
    JWT_COOKIE_SECURE       = os.getenv("FLASK_ENV") == "production"
    JWT_COOKIE_SAMESITE     = "Lax"
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)   # ← MUST be timedelta, not int

    # ── App config ─────────────────────────────────────────────────────────────
    ANTHROPIC_KEY    = os.getenv("ANTHROPIC_API_KEY", "")
    ADMIN_PASSWORD   = os.getenv("ADMIN_PASSWORD", "admin123")
    TTL_GOLD         = int(os.getenv("CACHE_TTL_GOLD",     300))
    TTL_STOCKS       = int(os.getenv("CACHE_TTL_STOCKS",    60))
    TTL_EXCHANGE     = int(os.getenv("CACHE_TTL_EXCHANGE", 300))
    TTL_FUNDS        = int(os.getenv("CACHE_TTL_FUNDS",   3600))
    TTL_FIXED        = int(os.getenv("CACHE_TTL_FIXED",   3600))
    TTL_AI           = int(os.getenv("CACHE_TTL_AI",       900))
    AI_RATE_LIMIT    = int(os.getenv("AI_RATE_LIMIT_PER_HOUR", 20))


class TTLCache:
    """Thread-safe in-memory TTL cache — no Redis required."""
    def __init__(self):
        self._store: dict = {}
        self._lock = threading.RLock()

    def get(self, key):
        with self._lock:
            entry = self._store.get(key)
            if entry and time.monotonic() < entry["exp"]:
                return entry["val"]
            self._store.pop(key, None)
            return None

    def set(self, key, val, ttl: int = 300):
        with self._lock:
            self._store[key] = {"val": val, "exp": time.monotonic() + ttl}

    def clear(self):
        with self._lock:
            self._store.clear()


class RateLimiter:
    """Sliding-window rate limiter keyed by IP — no Redis required."""
    def __init__(self, limit: int = 20, window: int = 3600):
        self.limit  = limit
        self.window = window
        self._hits  = defaultdict(list)
        self._lock  = threading.RLock()

    def ok(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            self._hits[key] = [t for t in self._hits[key] if now - t < self.window]
            if len(self._hits[key]) >= self.limit:
                return False
            self._hits[key].append(now)
            return True


# ── Module-level singletons (safe — no db usage here) ─────────────────────────
cache      = TTLCache()
ai_limiter = RateLimiter(limit=Config.AI_RATE_LIMIT)


def ck(*parts) -> str:
    return ":".join(str(p) for p in parts)


def topic_hash(t: str) -> str:
    return hashlib.sha256(t.strip().lower().encode()).hexdigest()[:16]
