# ⚡ DataPulse — Automated CSV Profiler & AI Visualizer

> A full-stack, high-performance data profiling and AI visual analytics application powered by **Python (FastAPI + Pandas)** and an interactive **Dark-Mode Glassmorphism Frontend (Chart.js)** with a **100% Free AI Dataset Assistant ("Ask Your CSV")**.

![Python Version](https://img.shields.io/badge/python-3.10%2B-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)
![Pandas](https://img.shields.io/badge/Pandas-2.2-150458?style=for-the-badge&logo=pandas)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-1.5_Flash-8E44AD?style=for-the-badge&logo=google)
![Chart.js](https://img.shields.io/badge/Chart.js-4.0-FF6384?style=for-the-badge&logo=chartdotjs)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

---

## 🌟 Overview

**DataPulse** turns raw, unorganized CSV datasets into instant visual insights and answers plain English questions about your data! Upload any `.csv`, `.tsv`, or `.txt` file, and DataPulse automatically cleans, profiles, and analyzes the data while offering an **AI Chatbot** to query, filter, and summarize your dataset.

---

## ✨ Key Features

- **🤖 AI "Ask Your CSV" Chatbot (100% Free Dual Engine):** 
  - **Google Gemini LLM Engine:** Translates complex natural language queries into Pandas code for precise execution.
  - **Local Smart Query Engine (Zero API Key):** Works 100% free offline out-of-the-box for top values, group averages, missing stats, and dataset summaries!
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
│     (HTML5 / CSS3 / Vanilla JS) │   Upload CSV / Chat Query   │        (FastAPI + Uvicorn)      │
│                                 │                             │                                 │
│  • Chart.js (Visualizations)    │ ◄────────────────────────── │  • Pandas & NumPy (Profiling)   │
│  • Glassmorphism CSS Dashboard  │    Sanitized JSON Analysis  │  • Gemini LLM + Local AI Engine │
│  • AI Assistant Chatbot Tab     │    & Query Result Tables    │  • IQR Outlier Calculations     │
└─────────────────────────────────┘                             └─────────────────────────────────┘
```

- **Backend:** Python 3.10+, FastAPI, Pandas, NumPy, Google Generative AI (Gemini), Uvicorn
- **Frontend:** HTML5, Modern Vanilla CSS (Glassmorphism), Vanilla JavaScript (ES6+), Chart.js

---

## 📁 Repository Structure

```
├── backend/
│   ├── __init__.py
│   ├── main.py              # FastAPI server, REST endpoints & static routing
│   ├── profiler.py          # Pandas statistical analysis & profiling engine
│   ├── chatbot.py           # Gemini LLM + Local Smart Query Engine
│   └── generate_samples.py  # Script generating 3 realistic sample datasets
├── data/                    # Generated sample CSV files
│   ├── sales_data.csv
│   ├── housing_demographics.csv
│   └── customer_churn.csv
├── frontend/
│   ├── index.html           # Main dashboard UI with AI Chatbot tab
│   ├── style.css            # Dark mode glassmorphism styles & chat UI
│   └── app.js               # Client API integration, Chart.js & Chatbot
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

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.
