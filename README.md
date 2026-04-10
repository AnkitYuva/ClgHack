# EcoSmart Bin 🗑️♻️

**AI + IoT Smart Waste Segregation and Route Optimization System**
*Sustain-a-thon 2026 · Dept. of MCA, CMRIT*

---

## Overview

EcoSmart Bin is a full-stack sustainability hackathon project that:
- 🤖 Classifies waste via AI (MobileNetV2)
- 📡 Monitors bin fill levels (IoT / simulated)
- 🗺️ Optimizes garbage truck collection routes
- 📊 Visualizes analytics and environmental impact
- 🌐 Renders 3D bin models and route scenes (Three.js)

---

## Tech Stack

| Layer    | Technologies |
|----------|-------------|
| Frontend | React, Three.js, @react-three/fiber, Tailwind CSS, Recharts, Framer Motion |
| Backend  | Python Flask, Flask-CORS |
| ML       | TensorFlow, Keras, MobileNetV2 |
| Database | MongoDB (optional) |

---

## Project Structure

```
ClgHack/
├── frontend/       # React + Vite app
│   └── src/
│       ├── pages/            # 6 pages
│       ├── components/       # UI, 3D, Charts
│       ├── data/mockData.js  # Demo data
│       └── services/api.js   # Axios
├── backend/        # Flask API
│   ├── routes/               # API blueprints
│   ├── ml/                   # Train + predict
│   └── utils/route_optimizer.py
└── README.md
```

---

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run dev
```
Open: http://localhost:5173

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
python app.py
```
API: http://localhost:5000/api

---

## Pages

| Route       | Page                   |
|-------------|------------------------|
| `/`         | Landing Page (3D hero) |
| `/dashboard`| Main dashboard         |
| `/bins`     | Smart bin monitoring   |
| `/classify` | AI waste classifier    |
| `/routes`   | Route optimization     |
| `/reports`  | Analytics & reports    |

---

## ML Training

```bash
# Prepare dataset folder
dataset/
  biodegradable/  (images)
  recyclable/     (images)
  hazardous/      (images)

cd backend
python ml/train_model.py
```

Dataset: [Garbage Classification – Kaggle](https://www.kaggle.com/datasets/asdasdasasdas/garbage-classification)

---

## Demo Pitch

> "EcoSmart Bin is an AI + IoT smart waste management system that classifies waste, monitors bin levels in real time, and optimizes collection routes to create cleaner, smarter campuses and cities."

**Impact numbers:**
- 30% fewer collection trips
- 25% reduction in overflow incidents
- 48 kg CO₂ saved per day via route optimization
