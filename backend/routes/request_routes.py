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
    has_image_col = False
    try:
        conn = get_db()
        conn.execute("SELECT image_path FROM pickup_requests LIMIT 1")
        has_image_col = True
        conn.close()
    except:
        pass

    for r in rows:
        req_dict = {
            "id": r["id"],
            "user_id": r["user_id"],
            "user_email": r["user_email"],
            "lat": r["lat"],
            "lng": r["lng"],
            "status": r["status"],
            "waste_type": r["waste_type"],
            "fill_level": r["fill_level"],
            "timestamp": r["timestamp"]
        }
        if has_image_col:
            req_dict["image_path"] = r["image_path"]
        requests.append(req_dict)
    return jsonify(requests)

@request_bp.route("/requests", methods=["POST"])
def create_request():
    """User endpoint to request a pickup at their location, with optional image upload"""
    import os
    from werkzeug.utils import secure_filename
    
    # Try to get data from form-data (if image upload), else fallback to json
    image_path = None
    waste_type = "mixed"
    
    if request.content_type and "multipart/form-data" in request.content_type:
        user_id = request.form.get("user_id")
        lat = request.form.get("lat")
        lng = request.form.get("lng")
        waste_type = request.form.get("waste_type", "mixed")
        
        # Handle image
        if "image" in request.files:
            file = request.files["image"]
            if file and file.filename != "":
                filename = secure_filename(file.filename)
                os.makedirs("uploads", exist_ok=True)
                filepath = os.path.join("uploads", filename)
                file.save(filepath)
                image_path = f"uploads/{filename}"
                
                # If waste_type is auto/mixed, we can try to use AI classifier!
                try:
                    from ml.predict import predict_waste
                    predicted_class, _ = predict_waste(filepath)
                    waste_type = predicted_class
                except Exception as e:
                    print(f"Auto-classify failed: {e}")
                    
    else:
        data = request.get_json() or {}
        user_id = data.get("user_id")
        lat = data.get("lat")
        lng = data.get("lng")
        waste_type = data.get("waste_type", "mixed")

    if not user_id or not lat or not lng:
        return jsonify({"error": "user_id, lat, and lng are required"}), 400

    conn = get_db()
    
    # Check if image_path column exists first to build query correctly
    has_image_col = False
    try:
        conn.execute("SELECT image_path FROM pickup_requests LIMIT 1")
        has_image_col = True
    except:
        pass

    if has_image_col and image_path:
        conn.execute('''
            INSERT INTO pickup_requests (user_id, lat, lng, waste_type, image_path)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, lat, lng, waste_type, image_path))
    else:
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
