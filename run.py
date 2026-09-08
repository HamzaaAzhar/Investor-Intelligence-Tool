# run.py — project root of psx-flask-dashboard
import os
from dotenv import load_dotenv

load_dotenv()               # MUST be before any psxapp import

from psxapp import create_app

app = create_app()

if __name__ == "__main__":
    port     = int(os.getenv("PORT", 5000))
    debug    = os.getenv("FLASK_ENV", "development") == "development"
    admin_pw = os.getenv("ADMIN_PASSWORD", "admin123")

    print(f"\n📊  InvestorLens  →  http://localhost:{port}")
    print(f"   Admin: http://localhost:{port}/analytics/admin?pwd={admin_pw}\n")

    # use_reloader=False stops Flask spawning a second process that would
    # create a second SQLAlchemy() instance and trigger the RuntimeError.
    app.run(host="127.0.0.1", port=port, debug=debug, use_reloader=False)
