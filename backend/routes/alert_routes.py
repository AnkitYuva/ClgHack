from flask import Blueprint, jsonify

alert_bp = Blueprint("alert_bp", __name__)

ALERTS = [
    {"id": 1, "message": "Block A bin exceeded 90% capacity",       "priority": "high",     "time": "2 min ago",  "bin": "BIN-001"},
    {"id": 2, "message": "Food Court bin OVERFLOW detected",         "priority": "critical", "time": "1 min ago",  "bin": "BIN-003"},
    {"id": 3, "message": "Hazardous waste identified – Lab Block",   "priority": "high",     "time": "3 min ago",  "bin": "BIN-005"},
    {"id": 4, "message": "Library bin nearing full capacity",        "priority": "medium",   "time": "4 min ago",  "bin": "BIN-008"},
    {"id": 5, "message": "Route optimization suggested for Zone A",  "priority": "info",     "time": "5 min ago",  "bin": ""},
]

@alert_bp.route("/alerts", methods=["GET"])
def get_alerts():
    return jsonify(ALERTS)
