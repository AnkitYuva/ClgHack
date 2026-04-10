<div align="center">

# 🌿 EcoSmart Bin

### AI-Powered Smart Waste Segregation & Route Optimization System

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-FF6F00?logo=tensorflow&logoColor=white)](https://tensorflow.org)
[![Three.js](https://img.shields.io/badge/Three.js-r165-black?logo=three.js&logoColor=white)](https://threejs.org)

*Sustain-a-thon 2026 · Dept. of MCA, CMRIT*

</div>

---

## 🏆 Problem Statement

> **"Smart Waste Segregation and Route Optimization System"**

Urban areas face increasing waste generation, leading to **inefficient collection** and **environmental hazards**. Traditional waste management is reactive, expensive, and imprecise — bins overflow before trucks arrive, recyclables end up in landfills, and hazardous waste is mishandled.

**EcoSmart Bin** is a data-driven solution that:

| Challenge | Our Solution |
|-----------|-------------|
| No real-time bin visibility | IoT-simulated fill-level sensors with live dashboards |
| Manual, unsorted waste | AI classifier (MobileNetV2) — biodegradable / recyclable / hazardous |
| Inefficient truck routes | Graph-based route optimizer (Nearest Neighbor + Greedy heuristic) |
| Landfill overflow | Predictive alerts trigger collections before bins hit 85%+ capacity |
| No analytics | Reports page with CO₂ savings, diversion rates, and time-series charts |

---

## ✨ Key Features

- 🤖 **AI Waste Classifier** — Upload any image; MobileNetV2 model classifies waste into 3 categories with confidence scores and 3D holographic scanning animation
- 📡 **Real-Time Bin Monitoring** — Live fill-level gauges for bins across the campus/city with status indicators (OK / Warning / Critical)
- 🗺️ **Route Optimization** — Dynamic map with truck route overlay; estimated distance, time, and fuel savings vs. unoptimized routes
- 📊 **Analytics Dashboard** — Charts for waste by category, collection frequency, overflow trends, and environmental impact
- 🌐 **3D Visualizations** — Interactive Three.js bin models with exploded-view mechanics and particle effects
- 🔔 **Smart Alerts** — Auto-generated alerts for overflow risk, missed collections, and anomalies

---

## 🖥️ Demo Pages

| Route | Page | What it Shows |
|-------|------|---------------|
| `/` | 🏠 Landing Page | 3D animated hero, project pitch, key stats |
| `/dashboard` | 📊 Dashboard | City-wide overview, KPI cards, live chart feed |
| `/bins` | 🗑️ Bin Monitoring | Per-bin fill levels, status, location map |
| `/classify` | 🤖 AI Classification | Upload image → AI result + holographic scanner |
| `/routes` | 🗺️ Route Optimization | Optimized truck path on live Leaflet map |
| `/reports` | 📈 Analytics & Reports | Trend charts, CO₂ savings, category breakdown |

---

## 🏗️ Architecture

```
EcoSmart Bin
│
├── Frontend (React + Vite)
│   ├── pages/              # 6 route pages
│   ├── components/
│   │   ├── three/          # 3D: HolographicScanner, InteractiveBin, RouteScene
│   │   ├── charts/         # WasteCharts (Recharts)
│   │   └── ui/             # Navbar, Sidebar, StatCard, GlassCard, AlertPanel
│   ├── services/api.js     # Axios client → Flask API
│   └── data/mockData.js    # Demo/IoT-simulated data
│
├── Backend (Python Flask)
│   ├── app.py              # Entry point, CORS, blueprints
│   ├── routes/
│   │   ├── bin_routes.py   # /api/bins — bin status, fill levels
│   │   ├── waste_routes.py # /api/classify — AI classification endpoint
│   │   ├── route_routes.py # /api/routes — optimized truck routes
│   │   └── alert_routes.py # /api/alerts — overflow & anomaly alerts
│   ├── ml/
│   │   ├── train_model.py  # MobileNetV2 transfer learning pipeline
│   │   └── predict.py      # Inference wrapper
│   └── utils/
│       └── route_optimizer.py  # Nearest-neighbor graph traversal
│
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Three.js, @react-three/fiber, Framer Motion |
| **Styling** | Tailwind CSS, custom glassmorphism design system |
| **Charts** | Recharts |
| **Maps** | Leaflet.js + React-Leaflet |
| **Backend** | Python 3.11, Flask 3.x, Flask-CORS |
| **ML Model** | TensorFlow 2.x, Keras, MobileNetV2 (transfer learning) |
| **Dataset** | Kaggle Garbage Classification (biodegradable / recyclable / hazardous) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- Python ≥ 3.10

---

### 1. Clone the Repository

```bash
git clone https://github.com/AnkitYuva/ClgHack.git
cd ClgHack
```

---

### 2. Start the Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
python app.py
```

> API running at: **http://localhost:5000/api**

---

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

> App running at: **http://localhost:5173**

---

### 4. (Optional) Retrain the ML Model

```bash
# Prepare your dataset
dataset/
  biodegradable/   ← images
  recyclable/      ← images
  hazardous/       ← images

cd backend
python ml/train_model.py
```

Dataset source: [Garbage Classification – Kaggle](https://www.kaggle.com/datasets/asdasdasasdas/garbage-classification)

> **Note:** The pre-trained `.h5` model file is excluded from this repo due to GitHub's 100 MB limit. Run `train_model.py` to generate it locally.

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/bins` | All bin statuses and fill levels |
| `GET` | `/api/bins/<id>` | Single bin details |
| `POST` | `/api/classify` | Classify a waste image (multipart/form-data) |
| `GET` | `/api/routes` | Optimized collection route for the day |
| `GET` | `/api/alerts` | Active overflow/anomaly alerts |

---

## 📊 Expected Outcomes & Impact

| Metric | Value |
|--------|-------|
| 🚛 Fewer collection trips | **30% reduction** |
| ♻️ Recycling diversion rate | **+40% improvement** |
| 🌿 CO₂ saved per day | **~48 kg** via route optimization |
| 🗑️ Overflow incidents | **25% fewer** with predictive alerts |
| 💰 Operational cost savings | Estimated **20–35%** annually |

---

## 👥 Team

**Sustain-a-thon 2026** | Dept. of MCA, CMRIT

---

## 📄 License

MIT — Open source and free to use.
