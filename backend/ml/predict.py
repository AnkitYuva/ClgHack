"""
predict.py – Robust ensemble waste classifier
─────────────────────────────────────────────
Strategy:
  1. Run all available models and pick the one with highest confidence.
  2. Apply image-color heuristics as a sanity check.
  3. Fuse model output + color heuristic via weighted voting.
  4. Fall back to keyword override on filename when model is unsure.
"""
import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image as keras_image
import os
import re

# ── 12-class model class list & category mapping ──────────────
RAW_CLASSES_12 = [
    "battery", "biological", "brown-glass", "cardboard", "clothes",
    "green-glass", "metal", "paper", "plastic", "shoes", "trash", "white-glass"
]
MAPPING_12 = {
    "battery":      "hazardous",
    "biological":   "biodegradable",
    "brown-glass":  "recyclable",
    "cardboard":    "recyclable",
    "clothes":      "recyclable",
    "green-glass":  "recyclable",
    "metal":        "recyclable",
    "paper":        "recyclable",
    "plastic":      "recyclable",
    "shoes":        "recyclable",
    "trash":        "hazardous",
    "white-glass":  "recyclable",
}

CLASSES_3 = ["biodegradable", "hazardous", "recyclable"]

# ── Filename keyword overrides ──────────────────────────────
KEYWORD_OVERRIDES = {
    "recyclable": [
        r"plastic", r"bottle", r"pet", r"water.?bottle", r"can",
        r"alumin", r"glass", r"metal", r"tin", r"cardboard", r"paper",
        r"carton", r"box", r"polythene", r"bag", r"wrapper", r"packet",
        r"jar", r"container",
    ],
    "hazardous": [
        r"battery", r"electronic", r"e.?waste", r"bulb", r"paint",
        r"chemical", r"syringe", r"medical", r"sharp", r"toxic",
        r"phone", r"laptop", r"circuit",
    ],
    "biodegradable": [
        r"food", r"vegetable", r"fruit", r"leaf", r"leaves",
        r"organic", r"compost", r"banana", r"apple", r"rice",
        r"onion", r"branch", r"grass", r"wood",
    ],
}

# Lower threshold → more keyword/heuristic correction kicks in
CONFIDENCE_THRESHOLD = 0.55

# ── Global model cache (avoids re-loading) ────────────────────
_models = {}  # path → (model, type)


def _load_all_models():
    base = os.path.dirname(__file__)
    candidates = [
        (os.path.join(base, "garbage_classifier_final.keras"), "3class"),
        (os.path.join(base, "waste_classifier_model.h5"),      "3class"),
        (os.path.join(base, "my_wastemodel.h5"),               "12class"),
    ]
    for path, mtype in candidates:
        if path in _models:
            continue
        if os.path.exists(path):
            try:
                _models[path] = (tf.keras.models.load_model(path, compile=False), mtype)
            except Exception as e:
                print(f"[WARN] Could not load {path}: {e}")
    return _models


def _predict_one(model, mtype, img_array):
    """Run inference and return (label, confidence)."""
    preds = model.predict(img_array, verbose=0)[0]
    idx   = int(np.argmax(preds))
    conf  = float(preds[idx])
    if mtype == "12class":
        raw   = RAW_CLASSES_12[idx] if idx < len(RAW_CLASSES_12) else "trash"
        label = MAPPING_12.get(raw, "hazardous")
    else:
        label = CLASSES_3[idx] if idx < len(CLASSES_3) else "hazardous"
    return label, conf


def _color_heuristic(img_array_raw):
    """
    Lightweight color-histogram heuristic.
    Returns (label, weight) where weight is how strongly we trust this signal.
    img_array_raw: float32 array [0,1] of shape (224, 224, 3) – RGB.
    """
    img = (img_array_raw * 255).astype(np.uint8)
    r, g, b = img[:, :, 0], img[:, :, 1], img[:, :, 2]

    total = img.shape[0] * img.shape[1]

    # ── Brown/earthy/dark-green → biodegradable ──
    # High green channel relative to blue, moderate red → organic
    organic_mask = (
        (g.astype(int) - b.astype(int) > 15) &
        (g.astype(int) - r.astype(int) > -30) &
        (r < 200) & (g < 200)
    )
    organic_ratio = organic_mask.sum() / total

    # ── Bright white/gray/silver → recyclable (glass/metal/paper) ──
    bright_mask = (r > 180) & (g > 180) & (b > 180)
    bright_ratio = bright_mask.sum() / total

    # ── Very colorful / synthetic → recyclable (plastic) ──
    # Saturated pixels with uniform hue
    max_ch = np.maximum(np.maximum(r, g), b).astype(float)
    min_ch = np.minimum(np.minimum(r, g), b).astype(float)
    sat = np.where(max_ch > 0, (max_ch - min_ch) / max_ch, 0)
    plastic_mask = (sat > 0.45) & (max_ch > 80)
    plastic_ratio = plastic_mask.sum() / total

    # ── Dark / black / very dim → could be batteries/electronics (hazardous) ──
    dark_mask = (r < 60) & (g < 60) & (b < 60)
    dark_ratio = dark_mask.sum() / total

    scores = {
        "biodegradable": organic_ratio * 1.8,
        "recyclable":    (bright_ratio + plastic_ratio) * 1.2,
        "hazardous":     dark_ratio * 1.5,
    }

    best_label = max(scores, key=scores.__getitem__)
    best_score = scores[best_label]

    # Only trust if signal is reasonably strong
    if best_score < 0.10:
        return None, 0.0
    weight = min(best_score * 2.0, 0.50)   # cap heuristic influence at 0.5
    return best_label, weight


def _keyword_override(img_path: str):
    name = os.path.basename(img_path).lower()
    for label, patterns in KEYWORD_OVERRIDES.items():
        for pat in patterns:
            if re.search(pat, name):
                return label
    return None


def predict_waste(img_path: str):
    models = _load_all_models()
    if not models:
        raise FileNotFoundError("No model file found in ml/")

    # ── Load & normalise image ─────────────────────────────────
    img         = keras_image.load_img(img_path, target_size=(224, 224))
    img_raw     = keras_image.img_to_array(img) / 255.0
    img_array   = np.expand_dims(img_raw, axis=0)

    # ── Run all models, accumulate weighted votes ──────────────
    category_votes = {"biodegradable": 0.0, "hazardous": 0.0, "recyclable": 0.0}
    best_conf      = 0.0

    for path, (model, mtype) in models.items():
        label, conf = _predict_one(model, mtype, img_array)
        # Weight by confidence so high-confidence models dominate
        category_votes[label] += conf
        if conf > best_conf:
            best_conf = conf

    total_model_weight = sum(category_votes.values())

    # ── Color heuristic contribution ───────────────────────────
    color_label, color_weight = _color_heuristic(img_raw)
    if color_label:
        # Blend: model gets (1 - color_weight), heuristic gets color_weight
        # Only add heuristic if model confidence is below threshold
        if best_conf < CONFIDENCE_THRESHOLD:
            category_votes[color_label] += total_model_weight * color_weight

    # ── Keyword override (filename) ────────────────────────────
    kw = _keyword_override(img_path)
    if kw and best_conf < CONFIDENCE_THRESHOLD:
        category_votes[kw] += total_model_weight * 0.60  # strong boost

    # ── Final decision ─────────────────────────────────────────
    final_label = max(category_votes, key=category_votes.__getitem__)

    # ── Hard safety rules ──────────────────────────────────────
    # Plastic/glass/metal can NEVER be biodegradable
    if final_label == "biodegradable" and kw in ("recyclable", "hazardous"):
        final_label = kw

    # Compute a normalised confidence (max 0.99, min 0.50)
    total_votes = sum(category_votes.values())
    if total_votes > 0:
        reported_conf = max(0.50, min(0.99, category_votes[final_label] / total_votes))
    else:
        reported_conf = best_conf

    return final_label, round(float(reported_conf), 4)
