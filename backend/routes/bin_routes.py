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
    
    # Real KPIs based on the history of collected vs pending requests
    total_collected = conn.execute("SELECT COUNT(*) FROM pickup_requests WHERE status = 'Collected'").fetchone()[0]
    total_requests = conn.execute("SELECT COUNT(*) FROM pickup_requests").fetchone()[0]
    
    conn.close()
    
    # Assuming each collected pin represents ~4.2kg of waste and saves 1.5kg of CO2 routing emissions vs traditional fixed schedules
    collected_kg = total_collected * 4.2
    co2_saved_kg = total_collected * 1.5
    
    efficiency = 0
    if total_requests > 0:
        efficiency = int((total_collected / total_requests) * 100)
    
    return jsonify({
        "total_bins": total,
        "full_bins": full,
        "overflow_bins": overflow,
        "active_alerts": full + overflow,
        "collected_kg": round(collected_kg, 1),
        "co2_saved_kg": round(co2_saved_kg, 1),
        "efficiency": efficiency
    })
