import tensorflow as tf
import numpy as np
from tensorflow.keras.preprocessing import image as keras_image
import os

RAW_CLASSES = [
    "battery", "biological", "brown-glass", "cardboard", "clothes", 
    "green-glass", "metal", "paper", "plastic", "shoes", "trash", "white-glass"
]

MAPPING = {
    "battery": "hazardous",
    "biological": "biodegradable", # FOOD WASTE!
    "brown-glass": "recyclable",
    "cardboard": "recyclable",
    "clothes": "recyclable",
    "green-glass": "recyclable",
    "metal": "recyclable",
    "paper": "recyclable",
    "plastic": "recyclable",
    "shoes": "recyclable",
    "trash": "hazardous",
    "white-glass": "recyclable"
}

_model = None

def _load_model():
    global _model
    model_path = os.path.join(os.path.dirname(__file__), "my_wastemodel.h5")
    if _model is None and os.path.exists(model_path):
        _model = tf.keras.models.load_model(model_path)
    return _model

def predict_waste(img_path: str):
    model = _load_model()
    if model is None:
        raise FileNotFoundError("Model file my_wastemodel.h5 not found.")

    # Model input shape is (224, 224)
    img = keras_image.load_img(img_path, target_size=(224, 224))
    img_array = keras_image.img_to_array(img) / 255.0
    img_array = np.expand_dims(img_array, axis=0)

    predictions = model.predict(img_array, verbose=0)
    idx = int(np.argmax(predictions))
    confidence = float(np.max(predictions))

    raw_class = RAW_CLASSES[idx] if idx < len(RAW_CLASSES) else "trash"
    mapped_class = MAPPING.get(raw_class, "hazardous")

    return mapped_class, confidence
