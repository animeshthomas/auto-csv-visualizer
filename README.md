# ⚡ DataPulse — Automated CSV Profiler & Data Visualizer

> A full-stack, high-performance data profiling and visual analytics application powered by **Python (FastAPI + Pandas)** and an interactive **Dark-Mode Glassmorphism Frontend (Chart.js)**.

![Python Version](https://img.shields.io/badge/python-3.10%2B-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)
![Pandas](https://img.shields.io/badge/Pandas-2.2-150458?style=for-the-badge&logo=pandas)
![Chart.js](https://img.shields.io/badge/Chart.js-4.0-FF6384?style=for-the-badge&logo=chartdotjs)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

---

## 🌟 Overview

**DataPulse** turns raw, unorganized CSV datasets into instant visual insights. Upload any `.csv`, `.tsv`, or `.txt` file, and DataPulse automatically cleans, profiles, and analyzes the data on a Python backend while serving interactive charts, correlation heatmaps, outlier diagnostics, and filterable tables on a responsive web dashboard.

---

## ✨ Key Features

- **🚀 Instant Automated Profiling:** Calculates row/column counts, memory footprint, missing data percentages, and duplicate row detection.
- **📊 Univariate Distribution Analysis:** Automatic column type classification (Numeric, Categorical, Datetime, Boolean) with histogram frequency binning and categorical bar charts.
- **🟢 Pearson Correlation Matrix:** Interactive color-coded heatmap grid highlighting positive and inverse relationships between numeric variables.
- **⚠️ Outlier & Health Diagnostics:** Detects extreme values using $1.5 \times \text{IQR}$ (Interquartile Range) method with quantile breakdowns ($Q_{25}, Q_{50}, Q_{75}$).
- **📋 Live Data Table Explorer:** Searchable, filterable raw data preview table with missing cell indicators.
- **📁 Built-In Sample Datasets:** Includes 3 pre-loaded datasets (*Sales Insights, Housing Demographics, and Customer Churn Analytics*) for instant testing.

---

## 🏗️ Tech Stack & Architecture

```
┌─────────────────────────────────┐       HTTP / REST API       ┌─────────────────────────────────┐
│          JS Frontend            │ ──────────────────────────► │         Python Backend          │
│     (HTML5 / CSS3 / Vanilla JS) │   Upload CSV / Query Params │        (FastAPI + Uvicorn)      │
│                                 │                             │                                 │
│  • Chart.js (Visualizations)    │ ◄────────────────────────── │  • Pandas & NumPy (Profiling)   │
│  • Glassmorphism CSS Dashboard  │    Sanitized JSON Analysis  │  • Automated Histogram Bins    │
│  • Searchable Data Explorer     │    & Correlation Metrics    │  • IQR Outlier Calculations     │
└─────────────────────────────────┘                             └─────────────────────────────────┘
```

- **Backend:** Python 3.10+, FastAPI, Pandas, NumPy, Uvicorn
- **Frontend:** HTML5, Modern Vanilla CSS (Glassmorphism), Vanilla JavaScript (ES6+), Chart.js

---

## 📁 Repository Structure

```
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI server, REST endpoints & static routing
│   ├── profiler.py          # Pandas statistical analysis & profiling engine
│   └── generate_samples.py  # Script generating 3 realistic sample datasets
├── data/                    # Generated sample CSV files
│   ├── sales_data.csv
│   ├── housing_demographics.csv
│   └── customer_churn.csv
├── frontend/
│   ├── index.html           # Main dashboard UI
│   ├── style.css            # Dark mode glassmorphism styles & responsiveness
│   └── app.js               # Client API integration, Chart.js & interactivity
├── README.md
└── run.py                   # Launcher script
```

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have **Python 3.10+** installed.

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/datapulse-csv-profiler.git
cd datapulse-csv-profiler
```

### 2. Install Dependencies
```bash
pip install fastapi uvicorn pandas numpy python-multipart
```

### 3. Generate Sample Datasets (Optional)
```bash
python backend/generate_samples.py
```

### 4. Launch the Server
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

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.
