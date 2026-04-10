from flask import Blueprint, jsonify, request
import random
from datetime import datetime

bin_bp = Blueprint("bin_bp", __name__)

BINS = [
    {"id": "BIN-001", "name": "Block A – Main Entrance",  "fill_level": 92, "status": "Full",     "type": "Recyclable",    "lat": 13.0707, "lng": 77.5993, "last_updated": "2 min ago"},
    {"id": "BIN-002", "name": "Block B – Corridor",       "fill_level": 48, "status": "Medium",   "type": "Biodegradable", "lat": 13.0710, "lng": 77.5997, "last_updated": "5 min ago"},
    {"id": "BIN-003", "name": "Food Court",               "fill_level": 98, "status": "Overflow", "type": "Biodegradable", "lat": 13.0715, "lng": 77.6001, "last_updated": "1 min ago"},
    {"id": "BIN-004", "name": "Parking Lot – North",      "fill_level": 33, "status": "Low",      "type": "Recyclable",    "lat": 13.0720, "lng": 77.5990, "last_updated": "10 min ago"},
    {"id": "BIN-005", "name": "Lab Block – Entrance",     "fill_level": 78, "status": "High",     "type": "Hazardous",     "lat": 13.0705, "lng": 77.5988, "last_updated": "3 min ago"},
    {"id": "BIN-006", "name": "Admin Block",              "fill_level": 15, "status": "Low",      "type": "Recyclable",    "lat": 13.0700, "lng": 77.5985, "last_updated": "15 min ago"},
    {"id": "BIN-007", "name": "Sports Ground",            "fill_level": 61, "status": "Medium",   "type": "Biodegradable", "lat": 13.0725, "lng": 77.6005, "last_updated": "7 min ago"},
    {"id": "BIN-008", "name": "Library",                  "fill_level": 87, "status": "Full",     "type": "Recyclable",    "lat": 13.0712, "lng": 77.5978, "last_updated": "4 min ago"},
]

@bin_bp.route("/bins", methods=["GET"])
def get_bins():
    # Simulate live fluctuating fill levels
    for b in BINS:
        delta = random.randint(-3, 3)
        b["fill_level"] = max(0, min(100, b["fill_level"] + delta))
        if b["fill_level"] >= 95: b["status"] = "Overflow"
        elif b["fill_level"] >= 80: b["status"] = "Full"
        elif b["fill_level"] >= 60: b["status"] = "Medium"
        elif b["fill_level"] >= 30: b["status"] = "Low"
        else: b["status"] = "Empty"
        b["last_updated"] = "just now"
    return jsonify(BINS)

@bin_bp.route("/bin/<bin_id>", methods=["GET"])
def get_bin(bin_id):
    for b in BINS:
        if b["id"] == bin_id:
            return jsonify(b)
    return jsonify({"error": "Bin not found"}), 404

@bin_bp.route("/bin/update", methods=["POST"])
def update_bin():
    data = request.get_json()
    bin_id = data.get("id")
    for b in BINS:
        if b["id"] == bin_id:
            b["fill_level"] = data.get("fill_level", b["fill_level"])
            b["last_updated"] = datetime.now().strftime("%H:%M:%S")
            return jsonify({"success": True, "bin": b})
    return jsonify({"error": "Bin not found"}), 404

@bin_bp.route("/stats", methods=["GET"])
def get_stats():
    total = len(BINS)
    full = sum(1 for b in BINS if b["fill_level"] >= 80)
    overflow = sum(1 for b in BINS if b["fill_level"] >= 95)
    return jsonify({
        "total_bins": total,
        "full_bins": full,
        "overflow_bins": overflow,
        "active_alerts": full + overflow,
    })
