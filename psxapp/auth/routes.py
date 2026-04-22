# psxapp/auth/routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity,
    set_access_cookies, unset_jwt_cookies,
)
from psxapp.extensions import db        # ← CORRECT: from extensions, not from psxapp
from psxapp.models import User

auth_bp = Blueprint("auth", __name__)

_WEIGHTS = {
    "age_group":      {"18-25":20,"26-35":18,"36-45":12,"46-55":8,"55+":5},
    "income_range":   {"<30k":5,"30k-75k":10,"75k-150k":15,"150k-400k":18,"400k+":20},
    "invest_horizon": {"<1yr":5,"1-3yr":10,"3-5yr":15,"5-10yr":18,"10yr+":20},
    "loss_tolerance": {"panic_sell":5,"hold":12,"buy_more":20},
    "experience":     {"none":5,"beginner":10,"some":15,"experienced":20},
}

def _risk(a):
    s = sum([_WEIGHTS["age_group"].get(a.get("age_group",""),10),
             _WEIGHTS["income_range"].get(a.get("income_range",""),10),
             _WEIGHTS["invest_horizon"].get(a.get("invest_horizon",""),10),
             _WEIGHTS["loss_tolerance"].get(a.get("loss_tolerance",""),10),
             _WEIGHTS["experience"].get(a.get("experience",""),10)])
    if a.get("halal_only"): s = min(s, 65)
    return s, ("conservative" if s < 45 else "moderate" if s < 72 else "aggressive")


@auth_bp.route("/register", methods=["POST"])
def register_post():                    # ← kept as register_post to match your original
    d = request.get_json(silent=True) or {}
    email    = str(d.get("email","")).strip().lower()
    name     = str(d.get("name","")).strip()
    password = str(d.get("password",""))

    if not email or "@" not in email:  return jsonify({"error":"Valid email required"}), 400
    if len(name) < 2:                  return jsonify({"error":"Name min 2 chars"}), 400
    if len(password) < 8:              return jsonify({"error":"Password min 8 chars"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error":"Email already registered"}), 409

    user = User(email=email, name=name)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    resp  = jsonify({"ok":True,"user":user.to_dict(),"profile_done":False})
    set_access_cookies(resp, token)
    return resp, 201


@auth_bp.route("/profile-quiz", methods=["POST"])
@jwt_required()
def profile_quiz():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user: return jsonify({"error":"Not found"}), 404
    d = request.get_json(silent=True) or {}
    user.age_group       = str(d.get("age_group",""))[:20]
    user.income_range    = str(d.get("income_range",""))[:30]
    user.invest_goal     = str(d.get("invest_goal",""))[:50]
    user.invest_horizon  = str(d.get("invest_horizon",""))[:30]
    user.monthly_savings = str(d.get("monthly_savings",""))[:30]
    user.halal_only      = bool(d.get("halal_only",False))
    score, label         = _risk(d)
    user.risk_score, user.risk_label, user.profile_done = score, label, True
    db.session.commit()
    return jsonify({"ok":True,"risk_score":score,"risk_label":label,"user":user.to_dict()})


@auth_bp.route("/login", methods=["POST"])
def login():
    d = request.get_json(silent=True) or {}
    user = User.query.filter_by(email=str(d.get("email","")).strip().lower()).first()
    if not user or not user.check_password(str(d.get("password",""))):
        return jsonify({"error":"Invalid email or password"}), 401
    token = create_access_token(identity=str(user.id))
    resp  = jsonify({"ok":True,"user":user.to_dict()})
    set_access_cookies(resp, token)
    return resp


@auth_bp.route("/logout", methods=["POST"])
def logout():
    resp = jsonify({"ok":True})
    unset_jwt_cookies(resp)
    return resp


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    return jsonify(user.to_dict()) if user else (jsonify({"error":"Not found"}), 404)


@auth_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user: return jsonify({"error":"Not found"}), 404
    d = request.get_json(silent=True) or {}
    if "name"       in d: user.name       = str(d["name"])[:80]
    if "halal_only" in d: user.halal_only = bool(d["halal_only"])
    db.session.commit()
    return jsonify({"ok":True,"user":user.to_dict()})
