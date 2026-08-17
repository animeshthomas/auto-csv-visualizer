import io
import os
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import pandas as pd

from backend.profiler import analyze_dataframe
from backend.chatbot import process_chat_query

app = FastAPI(title="Automated CSV Profiler & Visualizer", version="1.1.0")

# Enable CORS for local development & hosted frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")

class ChatQueryRequest(BaseModel):
    sample_id: Optional[str] = None
    query: str
    api_key: Optional[str] = None

@app.get("/api/samples")
def get_sample_list():
    samples = [
        {
            "id": "sales_data",
            "name": "📊 Sales Performance & Profitability",
            "description": "1,000 transactions with region, category, revenue, discount %, profit & ratings",
            "rows": 1000,
            "filename": "sales_data.csv"
        },
        {
            "id": "housing_demographics",
            "name": "🏠 Real Estate & Housing Demographics",
            "description": "800 census blocks with median income, house age, room counts, distance to city center & ocean proximity",
            "rows": 800,
            "filename": "housing_demographics.csv"
        },
        {
            "id": "customer_churn",
            "name": "📞 Telecom Customer Churn Analytics",
            "description": "600 customer records with tenure, internet service type, monthly charges & churn indicators",
            "rows": 600,
            "filename": "customer_churn.csv"
        }
    ]
    return {"samples": samples}

@app.get("/api/sample-csv/{sample_id}")
def load_sample_csv(sample_id: str):
    allowed_samples = {
        "sales_data": "sales_data.csv",
        "housing_demographics": "housing_demographics.csv",
        "customer_churn": "customer_churn.csv"
    }
    
    if sample_id not in allowed_samples:
        raise HTTPException(status_code=404, detail="Sample dataset not found")
        
    file_path = os.path.join(DATA_DIR, allowed_samples[sample_id])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Sample file missing on server")
        
    try:
        df = pd.read_csv(file_path)
        analysis_result = analyze_dataframe(df)
        analysis_result["dataset_name"] = allowed_samples[sample_id]
        return JSONResponse(content=analysis_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing sample file: {str(e)}")

@app.post("/api/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.txt', '.tsv')):
        raise HTTPException(status_code=400, detail="Only CSV, TSV, or TXT tabular files are supported")
        
    try:
        contents = await file.read()
        for encoding in ['utf-8', 'latin-1', 'cp1252']:
            try:
                sample_str = contents[:4096].decode(encoding, errors='ignore')
                sep = ','
                if '\t' in sample_str and sample_str.count('\t') > sample_str.count(','):
                    sep = '\t'
                elif ';' in sample_str and sample_str.count(';') > sample_str.count(','):
                    sep = ';'
                    
                df = pd.read_csv(io.BytesIO(contents), encoding=encoding, sep=sep)
                break
            except Exception:
                continue
                
        if 'df' not in locals():
            raise ValueError("Could not parse file with standard encodings")
            
        if df.empty or len(df.columns) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty or has no columns")
            
        analysis_result = analyze_dataframe(df)
        analysis_result["dataset_name"] = file.filename
        return JSONResponse(content=analysis_result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV file: {str(e)}")

@app.post("/api/chat-query")
def chat_query(req: ChatQueryRequest):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query text cannot be empty")
        
    sample_id = req.sample_id or "sales_data"
    allowed_samples = {
        "sales_data": "sales_data.csv",
        "housing_demographics": "housing_demographics.csv",
        "customer_churn": "customer_churn.csv"
    }
    
    file_name = allowed_samples.get(sample_id, "sales_data.csv")
    file_path = os.path.join(DATA_DIR, file_name)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found")
        
    try:
        df = pd.read_csv(file_path)
        result = process_chat_query(df, req.query, req.api_key)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing AI chat query: {str(e)}")

# Serve static files from root directory
if os.path.exists(DATA_DIR):
    app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")

@app.get("/")
def read_root():
    index_file = os.path.join(BASE_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "CSV Profiler API is running."}

@app.get("/{filename}")
def read_static(filename: str):
    file_path = os.path.join(BASE_DIR, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")
