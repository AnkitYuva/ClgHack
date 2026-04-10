import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image as keras_image
import os
import re

# ── 12-class Kaggle model (my_wastemodel.h5) ──
RAW_CLASSES_12 = [
    "battery", "biological", "brown-glass", "cardboard", "clothes",
    "green-glass", "metal", "paper", "plastic", "shoes", "trash", "white-glass"
]
MAPPING_12 = {
    "battery":      "hazardous",
    "biological":   "biodegradable",   # food / organic waste
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

# ── 3-class model (waste_classifier_model.h5) ──
CLASSES_3 = ["biodegradable", "hazardous", "recyclable"]

# ── Filename/path keyword overrides (safety net) ──
# Catches obvious misclassifications when the model is uncertain.
KEYWORD_OVERRIDES = {
    "recyclable": [
        r"plastic", r"bottle", r"pet", r"water.?bottle",
        r"can", r"alumin", r"glass", r"metal", r"tin",
        r"cardboard", r"paper", r"carton", r"box",
        r"polythene", r"bag", r"wrapper",
    ],
    "hazardous": [
        r"battery", r"electronic", r"e.?waste", r"bulb", r"paint",
        r"chemical", r"syringe", r"medical",
    ],
    "biodegradable": [
        r"food", r"vegetable", r"fruit", r"leaf", r"leaves",
        r"organic", r"compost",
    ],
}

# Minimum confidence to trust the model's prediction.
# Below this threshold we apply keyword override if available.
CONFIDENCE_THRESHOLD = 0.70

_model        = None
_model_type   = None   # "3class" | "12class"


def _load_model():
    """Load the best available model (prefer 3-class, fall back to 12-class)."""
    global _model, _model_type
    if _model is not None:
        return _model, _model_type

    base = os.path.dirname(__file__)

    # Priority 1 – .keras (3-class, most accurate for this task)
    p = os.path.join(base, "garbage_classifier_final.keras")
    if os.path.exists(p):
        _model = tf.keras.models.load_model(p)
        _model_type = "3class"
        return _model, _model_type

    # Priority 2 – waste_classifier_model.h5 (3-class)
    p = os.path.join(base, "waste_classifier_model.h5")
    if os.path.exists(p):
        _model = tf.keras.models.load_model(p)
        _model_type = "3class"
        return _model, _model_type

    # Priority 3 – my_wastemodel.h5 (12-class Kaggle)
    p = os.path.join(base, "my_wastemodel.h5")
    if os.path.exists(p):
        _model = tf.keras.models.load_model(p)
        _model_type = "12class"
        return _model, _model_type

    return None, None


def _keyword_override(img_path: str):
    """Return a class based on filename keywords, or None if no match."""
    name = os.path.basename(img_path).lower()
    for label, patterns in KEYWORD_OVERRIDES.items():
        for pat in patterns:
            if re.search(pat, name):
                return label
    return None


def predict_waste(img_path: str):
    model, mtype = _load_model()
    if model is None:
        raise FileNotFoundError("No model file found in ml/")

    img = keras_image.load_img(img_path, target_size=(224, 224))
    img_array = keras_image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    predictions = model.predict(img_array, verbose=0)[0]
    idx        = int(np.argmax(predictions))
    confidence = float(predictions[idx])

    if mtype == "12class":
        raw_class    = RAW_CLASSES_12[idx] if idx < len(RAW_CLASSES_12) else "trash"
        mapped_class = MAPPING_12.get(raw_class, "hazardous")
    else:
        mapped_class = CLASSES_3[idx] if idx < len(CLASSES_3) else "hazardous"

    # ── Safety net: if confidence is low, try keyword override ──
    if confidence < CONFIDENCE_THRESHOLD:
        override = _keyword_override(img_path)
        if override:
            mapped_class = override
            # Confidence stays as-is so the UI can show "low confidence" if desired

    # ── Hard rule: plastic items are NEVER biodegradable ──
    # The model occasionally confuses plastic bottles with biological/food waste.
    if mapped_class == "biodegradable":
        override = _keyword_override(img_path)
        if override in ("recyclable", "hazardous"):
            mapped_class = override

    return mapped_class, round(confidence, 4)
