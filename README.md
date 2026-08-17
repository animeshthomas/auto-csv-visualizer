# ⚡ DataPulse — Automated CSV Profiler & AI Visualizer

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Pandas-2.2-150458?style=for-the-badge&logo=pandas" alt="Pandas" />
  <img src="https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet" alt="Leaflet" />
  <img src="https://img.shields.io/badge/Gemini_AI-1.5_Flash-8E44AD?style=for-the-badge&logo=google" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/Deployment-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="Render" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

> A full-stack, high-performance data profiling and AI visual analytics application powered by **Python (FastAPI + Pandas)**, an interactive **Dark-Mode Glassmorphism Frontend (Chart.js + Leaflet.js)**, and a **100% Free AI Dataset Assistant ("Ask Your CSV")**.

🌐 **Render Full-Stack API Deployment**: [https://auto-csv-visualizer.onrender.com/](https://auto-csv-visualizer.onrender.com/)  
⚡ **GitHub Pages Live Hosting**: [https://animeshthomas.github.io/auto-csv-visualizer/](https://animeshthomas.github.io/auto-csv-visualizer/)

---

## 🌟 Overview

**DataPulse** turns raw, unorganized CSV datasets into instant visual insights and answers plain English questions about your data! Upload any `.csv`, `.tsv`, or `.txt` file, and DataPulse automatically cleans, profiles, and analyzes the data while offering an **AI Chatbot** to query, filter, and summarize your dataset, alongside an **Auto-Geographic Map Visualizer**.

---

## ✨ Key Features

- **🗺️ Auto-Geographic Map Visualizer (Leaflet.js + OpenStreetMap):**
  - Auto-detects `Latitude` & `Longitude` coordinate columns in uploaded CSV datasets.
  - Interactive map canvas with circle markers color-coded and scaled by numerical attributes (*Median House Value*, *Revenue*, *Population*).
  - Hover/click popups displaying exact record metadata and auto-bounds camera fitting.
- **🤖 AI "Ask Your CSV" Chatbot (100% Free Dual Engine):** 
  - **Google Gemini LLM Engine:** Translates complex natural language queries into Pandas code for precise execution.
  - **Local Smart Query Engine (Zero API Key):** Works 100% free offline out-of-the-box for top values, group averages, missing stats, and dataset summaries!
- **🚀 Instant Automated Profiling:** Calculates row/column counts, memory footprint, missing data percentages, and duplicate row detection.
- **📊 Univariate Distribution Analysis:** Automatic column type classification (Numeric, Categorical, Datetime, Boolean) with histogram frequency binning and categorical bar charts.
- **🟢 Pearson Correlation Matrix:** Interactive color-coded heatmap grid highlighting positive and inverse relationships between numeric variables.
- **⚠️ Outlier & Health Diagnostics:** Detects extreme values using $1.5 \times \text{IQR}$ (Interquartile Range) method with quantile breakdowns ($Q_{25}, Q_{50}, Q_{75}$).
- **📋 Live Data Table Explorer:** Searchable, filterable raw data preview table with missing cell indicators.
- **📁 Built-In Sample Datasets:** Includes 3 pre-loaded datasets (*Sales Insights, Housing Demographics, and Customer Churn Analytics*) with realistic geographic coordinates for instant testing.

---

## 🏗️ Tech Stack & Architecture

```
┌─────────────────────────────────┐       HTTP / REST API       ┌─────────────────────────────────┐
│          JS Frontend            │ ──────────────────────────► │         Python Backend          │
│     (HTML5 / CSS3 / Vanilla JS) │   Upload CSV / Chat Query   │        (FastAPI + Uvicorn)      │
│                                 │                             │                                 │
│  • Chart.js (Visualizations)    │ ◄────────────────────────── │  • Pandas & NumPy (Profiling)   │
│  • Leaflet.js (Geo Maps)        │    Sanitized JSON Analysis  │  • Gemini LLM + Local AI Engine │
│  • Glassmorphism CSS Dashboard  │    & Query Result Tables    │  • IQR Outlier Calculations     │
│  • AI Assistant Chatbot Tab     │                             │  • Lat/Lng Geo Extraction       │
└─────────────────────────────────┘                             └─────────────────────────────────┘
```

- **Backend:** Python 3.10+, FastAPI, Pandas, NumPy, Google Generative AI (Gemini), Uvicorn
- **Frontend:** HTML5, Modern Vanilla CSS (Glassmorphism), Vanilla JavaScript (ES6+), Chart.js, Leaflet.js, OpenStreetMap

---

## 📁 Repository Structure

```
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI server, REST endpoints & static routing
│   ├── profiler.py          # Pandas statistical analysis & profiling engine
│   ├── chatbot.py           # Gemini LLM + Local Smart Query Engine
│   └── generate_samples.py  # Script generating 3 realistic sample datasets with Geo coordinates
├── data/                    # Generated sample CSV files
│   ├── sales_data.csv
│   ├── housing_demographics.csv
│   └── customer_churn.csv
├── frontend/
│   ├── index.html           # Main dashboard UI with AI Chatbot & Geo Map tabs
│   ├── style.css            # Dark mode glassmorphism styles, map & chat UI
│   └── app.js               # Client API integration, Chart.js, Leaflet.js & Chatbot
├── index.html
├── style.css
├── app.js
├── requirements.txt
├── README.md
└── run.py                   # Launcher script
```

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have **Python 3.10+** installed.

### 1. Clone the Repository
```bash
git clone https://github.com/animeshthomas/auto-csv-visualizer.git
cd auto-csv-visualizer
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Launch the Server
```bash
python run.py
```

Open your browser and navigate to **`http://127.0.0.1:8000`** 🎉

---

## 📡 REST API Documentation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/upload-csv` | Accepts multipart `.csv` file upload and returns complete JSON analysis payload |
| `GET` | `/api/samples` | Returns list of available sample datasets |
| `GET` | `/api/sample-csv/{sample_id}` | Runs analysis engine on built-in sample dataset (`sales_data`, `housing_demographics`, `customer_churn`) |
| `POST` | `/api/chat-query` | Executes natural language AI chat query against active DataFrame |

---

## 📜 License & Credits

Created with ❤️ by **[Animesh Thomas](https://github.com/animeshthomas)**. Distributed under the **MIT License**.
