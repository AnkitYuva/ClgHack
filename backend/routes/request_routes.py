from flask import Blueprint, request, jsonify
from db import get_db

request_bp = Blueprint("request_bp", __name__)

@request_bp.route("/requests", methods=["GET"])
def get_requests():
    """Endpoint to fetch pickup requests. Admins get all pending, Users get their own."""
    user_id = request.args.get("user_id")
    conn = get_db()
    
    if user_id:
        rows = conn.execute('''
            SELECT p.*, u.email as user_email 
            FROM pickup_requests p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.user_id = ?
            ORDER BY p.timestamp DESC
        ''', (user_id,)).fetchall()
    else:
        # Admin gets all pending
        rows = conn.execute('''
            SELECT p.*, u.email as user_email 
            FROM pickup_requests p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.status = 'Pending'
        ''').fetchall()
        
    conn.close()

    requests = []
    for r in rows:
        requests.append({
            "id": r["id"],
            "user_id": r["user_id"],
            "user_email": r["user_email"],
            "lat": r["lat"],
            "lng": r["lng"],
            "status": r["status"],
            "waste_type": r["waste_type"],
            "fill_level": r["fill_level"],
            "timestamp": r["timestamp"]
        })
    return jsonify(requests)

@request_bp.route("/requests", methods=["POST"])
def create_request():
    """User endpoint to request a pickup at their location"""
    data = request.get_json()
    user_id = data.get("user_id")
    lat = data.get("lat")
    lng = data.get("lng")
    waste_type = data.get("waste_type", "mixed")

    if not user_id or not lat or not lng:
        return jsonify({"error": "user_id, lat, and lng are required"}), 400

    conn = get_db()
    conn.execute('''
        INSERT INTO pickup_requests (user_id, lat, lng, waste_type)
        VALUES (?, ?, ?, ?)
    ''', (user_id, lat, lng, waste_type))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Pickup requested successfully"})

@request_bp.route("/requests/<int:req_id>/collect", methods=["PUT"])
def collect_request(req_id):
    """Admin endpoint to mark a request as collected"""
    conn = get_db()
    conn.execute("UPDATE pickup_requests SET status = 'Collected' WHERE id = ?", (req_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})
