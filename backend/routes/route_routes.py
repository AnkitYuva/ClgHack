from flask import Blueprint, jsonify, request
from utils.route_optimizer import optimize_route

route_bp = Blueprint("route_bp", __name__)

DEFAULT_START = {"name": "Depot", "lat": 13.0698, "lng": 77.5982}

DEFAULT_BINS = [
    {"id": "BIN-003", "name": "Food Court",              "fill_level": 98, "lat": 13.0715, "lng": 77.6001},
    {"id": "BIN-001", "name": "Block A – Main Entrance", "fill_level": 92, "lat": 13.0707, "lng": 77.5993},
    {"id": "BIN-008", "name": "Library",                 "fill_level": 87, "lat": 13.0712, "lng": 77.5978},
    {"id": "BIN-005", "name": "Lab Block – Entrance",    "fill_level": 78, "lat": 13.0705, "lng": 77.5988},
]

@route_bp.route("/optimize-route", methods=["POST"])
def optimize():
    data = request.get_json() or {}
    start = data.get("start", DEFAULT_START)
    bins  = data.get("bins",  DEFAULT_BINS)

    # Filter above threshold
    threshold = data.get("threshold", 75)
    filtered = [b for b in bins if b.get("fill_level", 0) >= threshold]

    if not filtered:
        return jsonify({"optimized_route": [], "message": "No bins above threshold"}), 200

    ordered = optimize_route(start, filtered)

    total_dist = 0.0
    prev = start
    for b in ordered:
        from utils.route_optimizer import haversine
        total_dist += haversine(prev["lat"], prev["lng"], b["lat"], b["lng"])
        prev = b

    return jsonify({
        "optimized_route": ordered,
        "total_distance_km": round(total_dist, 2),
        "estimated_duration_min": round(total_dist * 9, 0),
        "fuel_saved_liters": round(total_dist * 0.5, 1),
        "co2_saved_kg": round(total_dist * 11.5, 1),
    })
