# psxapp/models.py
import time
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from psxapp.extensions import db   # ← always from extensions


class User(db.Model):
    __tablename__ = "users"
    id             = db.Column(db.Integer, primary_key=True)
    email          = db.Column(db.String(120), unique=True, nullable=False, index=True)
    name           = db.Column(db.String(80),  nullable=False)
    password_hash  = db.Column(db.String(256), nullable=False)
    created_at     = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    risk_score     = db.Column(db.Integer, default=0)
    risk_label     = db.Column(db.String(20), default="")
    age_group      = db.Column(db.String(20), default="")
    income_range   = db.Column(db.String(30), default="")
    invest_goal    = db.Column(db.String(50), default="")
    invest_horizon = db.Column(db.String(30), default="")
    monthly_savings= db.Column(db.String(30), default="")
    halal_only     = db.Column(db.Boolean, default=False)
    profile_done   = db.Column(db.Boolean, default=False)
    portfolios     = db.relationship("Portfolio", back_populates="user",
                                     cascade="all, delete-orphan", lazy="select")

    def set_password(self, pw):   self.password_hash = generate_password_hash(pw)
    def check_password(self, pw): return check_password_hash(self.password_hash, pw)

    def to_dict(self):
        return {"id":self.id,"email":self.email,"name":self.name,
                "risk_score":self.risk_score,"risk_label":self.risk_label,
                "age_group":self.age_group,"income_range":self.income_range,
                "invest_goal":self.invest_goal,"invest_horizon":self.invest_horizon,
                "monthly_savings":self.monthly_savings,"halal_only":self.halal_only,
                "profile_done":self.profile_done,
                "created_at":self.created_at.isoformat() if self.created_at else None}


class Portfolio(db.Model):
    __tablename__ = "portfolios"
    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name       = db.Column(db.String(80), nullable=False)
    color      = db.Column(db.String(20), default="#2980FF")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    user       = db.relationship("User", back_populates="portfolios")
    holdings   = db.relationship("Holding", back_populates="portfolio",
                                  cascade="all, delete-orphan", lazy="select")

    def to_dict(self):
        return {"id":self.id,"name":self.name,"color":self.color,
                "created_at":self.created_at.isoformat() if self.created_at else None,
                "holdings":[h.to_dict() for h in self.holdings]}


class Holding(db.Model):
    __tablename__ = "holdings"
    id           = db.Column(db.Integer, primary_key=True)
    portfolio_id = db.Column(db.Integer, db.ForeignKey("portfolios.id"), nullable=False, index=True)
    asset_id     = db.Column(db.String(40),  nullable=False)
    asset_label  = db.Column(db.String(120), nullable=False)
    asset_type   = db.Column(db.String(30),  nullable=False)
    buy_price    = db.Column(db.Float, nullable=False)
    units        = db.Column(db.Float, nullable=False)
    ret1y        = db.Column(db.Float, default=0.0)
    color        = db.Column(db.String(20), default="#00C27A")
    added_at     = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    portfolio    = db.relationship("Portfolio", back_populates="holdings")

    def to_dict(self):
        return {"id":self.id,"asset_id":self.asset_id,"asset_label":self.asset_label,
                "asset_type":self.asset_type,"buy_price":self.buy_price,"units":self.units,
                "ret1y":self.ret1y,"color":self.color,
                "value":round(self.buy_price*self.units, 2),
                "added_at":self.added_at.isoformat() if self.added_at else None}


class AnalyticsEvent(db.Model):
    __tablename__ = "analytics_events"
    id         = db.Column(db.Integer, primary_key=True)
    ts         = db.Column(db.Float, nullable=False, default=time.time, index=True)
    session_id = db.Column(db.String(36), index=True)
    user_id    = db.Column(db.Integer, nullable=True)
    event      = db.Column(db.String(60))
    module     = db.Column(db.String(40))
    duration_s = db.Column(db.Float, default=0.0)
    ip_country = db.Column(db.String(4), default="PK")
    user_agent = db.Column(db.String(200), default="")

    def to_dict(self):
        return {"id":self.id,"ts":self.ts,"session_id":self.session_id,
                "user_id":self.user_id,"event":self.event,"module":self.module,
                "duration_s":self.duration_s,"ip_country":self.ip_country}
