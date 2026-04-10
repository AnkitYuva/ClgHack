from flask import Flask
from flask_cors import CORS
from routes.bin_routes import bin_bp
from routes.waste_routes import waste_bp
from routes.route_routes import route_bp
from routes.alert_routes import alert_bp
from routes.auth_routes import auth_bp
from routes.request_routes import request_bp
from db import init_db

from flask import Flask, send_from_directory
import os

app = Flask(__name__)
CORS(app)

# Serve uploaded garbage images
os.makedirs("uploads", exist_ok=True)
@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory('uploads', filename)

app.register_blueprint(bin_bp,   url_prefix="/api")
app.register_blueprint(waste_bp, url_prefix="/api")
app.register_blueprint(route_bp, url_prefix="/api")
app.register_blueprint(alert_bp, url_prefix="/api")
app.register_blueprint(auth_bp,  url_prefix="/api")
app.register_blueprint(request_bp, url_prefix="/api")

if __name__ == "__main__":
    init_db()  # Initialize SQLite database on startup
    print("[OK] EcoSmart Bin Backend running at http://127.0.0.1:5000")
    app.run(debug=True)
