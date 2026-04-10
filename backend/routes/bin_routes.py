from flask import Blueprint, jsonify, request
from datetime import datetime
from db import get_db

bin_bp = Blueprint("bin_bp", __name__)

@bin_bp.route("/bins", methods=["GET"])
def get_bins():
    """Fetch live IoT bins / pending requests from the database"""
    conn = get_db()
    rows = conn.execute("SELECT * FROM pickup_requests WHERE status = 'Pending'").fetchall()
    conn.close()
    
    bins = []
    for r in rows:
        bins.append({
            "id": f"REQ-{r['id']}",
            "name": f"User Request {r['id']} ({r['waste_type']})",
            "fill_level": r["fill_level"],
            "status": "Overflow" if r["fill_level"] >= 95 else "Full" if r["fill_level"] >= 80 else "Medium",
            "type": r["waste_type"],
            "lat": r["lat"],
            "lng": r["lng"],
            "last_updated": r["timestamp"]
        })
    return jsonify(bins)

@bin_bp.route("/stats", methods=["GET"])
def get_stats():
    """Live analytics derived from real database requests"""
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM pickup_requests WHERE status = 'Pending'").fetchone()[0]
    full = conn.execute("SELECT COUNT(*) FROM pickup_requests WHERE status = 'Pending' AND fill_level >= 80").fetchone()[0]
    overflow = conn.execute("SELECT COUNT(*) FROM pickup_requests WHERE status = 'Pending' AND fill_level >= 95").fetchone()[0]
    conn.close()
    
    return jsonify({
        "total_bins": total,
        "full_bins": full,
        "overflow_bins": overflow,
        "active_alerts": full + overflow,
    })
