"""
Train MobileNetV2-based waste classifier.

Dataset structure required:
  dataset/
    biodegradable/
    hazardous/
    recyclable/

Run:  python train_model.py
"""
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras import layers, models
import os

IMG_SIZE   = (224, 224)
BATCH_SIZE = 32
EPOCHS     = 10
DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "dataset")

def build_model(num_classes: int):
    base = MobileNetV2(weights="imagenet", include_top=False, input_shape=(224, 224, 3))
    base.trainable = False

    m = models.Sequential([
        base,
        layers.GlobalAveragePooling2D(),
        layers.Dense(256, activation="relu"),
        layers.Dropout(0.35),
        layers.Dense(num_classes, activation="softmax"),
    ])
    m.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])
    return m

if __name__ == "__main__":
    gen = ImageDataGenerator(rescale=1./255, validation_split=0.2,
                             rotation_range=20, horizontal_flip=True, zoom_range=0.2)

    train_data = gen.flow_from_directory(DATASET_DIR, target_size=IMG_SIZE,
                                         batch_size=BATCH_SIZE, class_mode="categorical", subset="training")
    val_data   = gen.flow_from_directory(DATASET_DIR, target_size=IMG_SIZE,
                                         batch_size=BATCH_SIZE, class_mode="categorical", subset="validation")

    model = build_model(train_data.num_classes)
    print("Classes:", train_data.class_indices)

    model.fit(train_data, validation_data=val_data, epochs=EPOCHS,
              callbacks=[tf.keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True)])

    model.save(os.path.join(os.path.dirname(__file__), "waste_classifier_model.h5"))
    print("[OK] Model saved to ml/waste_classifier_model.h5")
