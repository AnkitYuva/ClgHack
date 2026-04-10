from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from db import get_db

auth_bp = Blueprint("auth_bp", __name__)

SECRET_KEY = "ecosmart-hackathon-secret-key"

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if user and check_password_hash(user["password_hash"], password):
        # Generate token with 24 hours expiry
        token = jwt.encode({
            "user_id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm="HS256")
        
        return jsonify({
            "success": True,
            "token": token,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "role": user["role"]
            }
        })

    return jsonify({"error": "Invalid credentials"}), 401

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db()
    # Ensure email doesn't exist
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "Email already exists"}), 400

    hashed_pw = generate_password_hash(password)
    # Default role for public signup is 'user'
    conn.execute("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
                 (email, hashed_pw, "user"))
    conn.commit()
    conn.close()

    # Automatically log them in after registration
    return login()
