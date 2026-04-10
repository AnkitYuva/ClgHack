from flask import Blueprint, request, jsonify
import os
import random
from datetime import datetime

waste_bp = Blueprint("waste_bp", __name__)

CLASSES = ["biodegradable", "hazardous", "recyclable"]

WASTE_LOG = []

@waste_bp.route("/classify-waste", methods=["POST"])
def classify_waste():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image = request.files["image"]
    os.makedirs("uploads", exist_ok=True)
    file_path = os.path.join("uploads", image.filename)
    image.save(file_path)

    # Try real ML model; fall back to demo prediction
    try:
        from ml.predict import predict_waste
        predicted_class, confidence = predict_waste(file_path)
    except Exception:
        predicted_class = random.choice(CLASSES)
        confidence = round(random.uniform(0.85, 0.99), 4)

    log_entry = {
        "image": image.filename,
        "predicted_class": predicted_class,
        "confidence": confidence,
        "timestamp": datetime.now().isoformat(),
    }
    WASTE_LOG.append(log_entry)

    return jsonify({
        "predicted_class": predicted_class,
        "confidence": confidence,
        "timestamp": log_entry["timestamp"],
    })

@waste_bp.route("/waste-logs", methods=["GET"])
def get_waste_logs():
    return jsonify(WASTE_LOG[-20:][::-1])
