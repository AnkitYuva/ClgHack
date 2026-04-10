from flask import Flask
from flask_cors import CORS
from routes.bin_routes import bin_bp
from routes.waste_routes import waste_bp
from routes.route_routes import route_bp
from routes.alert_routes import alert_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(bin_bp,   url_prefix="/api")
app.register_blueprint(waste_bp, url_prefix="/api")
app.register_blueprint(route_bp, url_prefix="/api")
app.register_blueprint(alert_bp, url_prefix="/api")

if __name__ == "__main__":
    print("[OK] EcoSmart Bin Backend running at http://127.0.0.1:5000")
    app.run(debug=True)
