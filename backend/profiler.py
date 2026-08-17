import math
import numpy as np
import pandas as pd

def format_memory(bytes_val):
    if bytes_val < 1024:
        return f"{bytes_val} B"
    elif bytes_val < 1024 * 1024:
        return f"{bytes_val / 1024:.1f} KB"
    else:
        return f"{bytes_val / (1024 * 1024):.2f} MB"

def sanitize_val(val):
    if pd.isna(val):
        return None
    if isinstance(val, (np.integer, int)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        if math.isnan(val) or math.isinf(val):
            return None
        return float(val)
    if isinstance(val, (pd.Timestamp, np.datetime64)):
        return str(val)
    return str(val)

def analyze_dataframe(df: pd.DataFrame) -> dict:
    total_rows, total_cols = df.shape
    total_cells = total_rows * total_cols
    
    memory_bytes = df.memory_usage(deep=True).sum()
    total_null_cells = int(df.isna().sum().sum())
    null_percentage = round((total_null_cells / total_cells * 100), 2) if total_cells > 0 else 0.0
    
    duplicate_rows = int(df.duplicated().sum())
    duplicate_percentage = round((duplicate_rows / total_rows * 100), 2) if total_rows > 0 else 0.0
    
    numeric_cols = []
    categorical_cols = []
    datetime_cols = []
    boolean_cols = []
    
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            if pd.api.types.is_bool_dtype(df[col]):
                boolean_cols.append(col)
            else:
                numeric_cols.append(col)
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            datetime_cols.append(col)
        elif pd.api.types.is_bool_dtype(df[col]):
            boolean_cols.append(col)
        else:
            # Check if strings can be parsed to datetime
            sample_non_null = df[col].dropna().head(50)
            is_dt = False
            if len(sample_non_null) > 0:
                try:
                    pd.to_datetime(sample_non_null)
                    is_dt = True
                except (ValueError, TypeError):
                    is_dt = False
            
            if is_dt:
                datetime_cols.append(col)
            else:
                categorical_cols.append(col)

    overview = {
        "total_rows": total_rows,
        "total_columns": total_cols,
        "memory_bytes": int(memory_bytes),
        "memory_formatted": format_memory(memory_bytes),
        "total_null_cells": total_null_cells,
        "null_percentage": null_percentage,
        "duplicate_rows": duplicate_rows,
        "duplicate_percentage": duplicate_percentage,
        "numeric_count": len(numeric_cols),
        "categorical_count": len(categorical_cols),
        "datetime_count": len(datetime_cols),
        "boolean_count": len(boolean_cols)
    }

    column_classification = {
        "numeric": numeric_cols,
        "categorical": categorical_cols,
        "datetime": datetime_cols,
        "boolean": boolean_cols
    }

    column_stats = {}

    # Analyze Numeric Columns
    for col in numeric_cols:
        s = df[col].dropna()
        null_cnt = int(df[col].isna().sum())
        null_pct = round(null_cnt / total_rows * 100, 2) if total_rows > 0 else 0
        
        if len(s) > 0:
            c_min = float(s.min())
            c_max = float(s.max())
            c_mean = float(s.mean())
            c_median = float(s.median())
            c_std = float(s.std()) if len(s) > 1 else 0.0
            q25 = float(s.quantile(0.25))
            q75 = float(s.quantile(0.75))
            iqr = q75 - q25
            lower_bound = q25 - 1.5 * iqr
            upper_bound = q75 + 1.5 * iqr
            outliers_cnt = int(((s < lower_bound) | (s > upper_bound)).sum())
            skewness = float(s.skew()) if len(s) > 2 else 0.0
            
            # Histogram generation
            bin_count = min(15, max(5, int(np.sqrt(len(s)))))
            counts, bin_edges = np.histogram(s, bins=bin_count)
            histogram = {
                "bin_edges": [round(float(b), 2) for b in bin_edges],
                "bin_labels": [f"{round(bin_edges[i], 1)}-{round(bin_edges[i+1], 1)}" for i in range(len(bin_edges)-1)],
                "frequencies": [int(c) for c in counts]
            }
        else:
            c_min = c_max = c_mean = c_median = c_std = q25 = q75 = skewness = 0.0
            outliers_cnt = 0
            lower_bound = upper_bound = 0.0
            histogram = {"bin_edges": [], "bin_labels": [], "frequencies": []}

        column_stats[col] = {
            "type": "numeric",
            "null_count": null_cnt,
            "null_pct": null_pct,
            "unique_count": int(df[col].nunique()),
            "min": round(c_min, 2),
            "max": round(c_max, 2),
            "mean": round(c_mean, 2),
            "median": round(c_median, 2),
            "std": round(c_std, 2),
            "q25": round(q25, 2),
            "q75": round(q75, 2),
            "skewness": round(skewness, 2),
            "outliers": {
                "count": outliers_cnt,
                "pct": round(outliers_cnt / len(s) * 100, 2) if len(s) > 0 else 0,
                "lower_bound": round(lower_bound, 2),
                "upper_bound": round(upper_bound, 2)
            },
            "histogram": histogram
        }

    # Analyze Categorical & Boolean Columns
    for col in categorical_cols + boolean_cols + datetime_cols:
        col_type = "datetime" if col in datetime_cols else ("boolean" if col in boolean_cols else "categorical")
        null_cnt = int(df[col].isna().sum())
        null_pct = round(null_cnt / total_rows * 100, 2) if total_rows > 0 else 0
        
        value_counts = df[col].astype(str).value_counts(dropna=True).head(8)
        top_values = []
        for val, count in value_counts.items():
            if val != "nan":
                top_values.append({
                    "label": str(val),
                    "count": int(count),
                    "pct": round(int(count) / total_rows * 100, 1) if total_rows > 0 else 0
                })
                
        column_stats[col] = {
            "type": col_type,
            "null_count": null_cnt,
            "null_pct": null_pct,
            "unique_count": int(df[col].nunique()),
            "top_values": top_values
        }

    # Correlation Matrix calculation for numeric columns
    correlation_matrix = {"columns": [], "matrix": []}
    if len(numeric_cols) >= 2:
        num_df = df[numeric_cols].dropna()
        if len(num_df) > 2:
            corr_df = num_df.corr().fillna(0)
            correlation_matrix["columns"] = list(corr_df.columns)
            correlation_matrix["matrix"] = [
                [round(float(val), 3) for val in row] for row in corr_df.values
            ]

    # Data Table Preview (First 15 rows)
    preview_df = df.head(15).copy()
    preview_rows = []
    for _, row in preview_df.iterrows():
        row_dict = {col: sanitize_val(row[col]) for col in df.columns}
        preview_rows.append(row_dict)

    return {
        "overview": overview,
        "columns_classification": column_classification,
        "column_stats": column_stats,
        "correlation_matrix": correlation_matrix,
        "columns_list": list(df.columns),
        "preview_rows": preview_rows
    }
