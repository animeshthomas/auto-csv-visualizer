import os
import re
import math
import numpy as np
import pandas as pd

def sanitize_val(val):
    if pd.isna(val):
        return None
    if isinstance(val, (np.integer, int)):
        return int(val)
    if isinstance(val, (np.floating, float)):
        if math.isnan(val) or math.isinf(val):
            return None
        return round(float(val), 2)
    return str(val)

def local_query_engine(df: pd.DataFrame, query: str) -> dict:
    q = query.lower().strip()
    cols = list(df.columns)
    cols_lower = [c.lower() for c in cols]
    
    # 1. Top N Query (e.g. "top 5 revenue", "top 5 products by revenue")
    top_match = re.search(r'top\s+(\d+)\s*(.*)', q)
    if top_match:
        n = int(top_match.group(1))
        remainder = top_match.group(2).strip()
        
        # Find numeric column to sort by
        sort_col = None
        group_col = None
        
        for idx, cl in enumerate(cols_lower):
            if cl in remainder and pd.api.types.is_numeric_dtype(df[cols[idx]]):
                sort_col = cols[idx]
            elif cl in remainder:
                group_col = cols[idx]
                
        if not sort_col:
            # Pick first numeric column
            num_cols = [c for c in cols if pd.api.types.is_numeric_dtype(df[c])]
            if num_cols:
                sort_col = num_cols[-1] # Usually revenue / profit is at the end
                
        if not group_col:
            # Pick first categorical column
            cat_cols = [c for c in cols if not pd.api.types.is_numeric_dtype(df[c])]
            if cat_cols:
                group_col = cat_cols[0]

        if group_col and sort_col:
            res_df = df.groupby(group_col)[sort_col].sum().reset_index().sort_values(by=sort_col, ascending=False).head(n)
            rows = [{group_col: sanitize_val(r[group_col]), sort_col: sanitize_val(r[sort_col])} for _, r in res_df.iterrows()]
            return {
                "answer": f"Here are the top {n} `{group_col}` entries by total `{sort_col}`:",
                "result_type": "table",
                "table_data": rows,
                "code_used": f"df.groupby('{group_col}')['{sort_col}'].sum().reset_index().sort_values(by='{sort_col}', ascending=False).head({n})"
            }
        elif sort_col:
            res_df = df.sort_values(by=sort_col, ascending=False).head(n)
            rows = [{col: sanitize_val(r[col]) for col in cols} for _, r in res_df.iterrows()]
            return {
                "answer": f"Here are the top {n} rows sorted by `{sort_col}`:",
                "result_type": "table",
                "table_data": rows[:n],
                "code_used": f"df.sort_values(by='{sort_col}', ascending=False).head({n})"
            }

    # 2. Average / Mean Query (e.g. "average profit by region")
    if 'average' in q or 'mean' in q or 'avg' in q:
        target_num = None
        group_cat = None
        for idx, cl in enumerate(cols_lower):
            if cl in q and pd.api.types.is_numeric_dtype(df[cols[idx]]):
                target_num = cols[idx]
            elif cl in q:
                group_cat = cols[idx]
                
        if target_num and group_cat:
            res_df = df.groupby(group_cat)[target_num].mean().reset_index().sort_values(by=target_num, ascending=False)
            rows = [{group_cat: sanitize_val(r[group_cat]), f"Average {target_num}": sanitize_val(r[target_num])} for _, r in res_df.iterrows()]
            return {
                "answer": f"Average `{target_num}` grouped by `{group_cat}`:",
                "result_type": "table",
                "table_data": rows,
                "code_used": f"df.groupby('{group_cat}')['{target_num}'].mean().reset_index()"
            }
        elif target_num:
            avg_val = round(float(df[target_num].mean()), 2)
            return {
                "answer": f"The average `{target_num}` across all records is **{avg_val}**.",
                "result_type": "text",
                "code_used": f"df['{target_num}'].mean()"
            }

    # 3. Missing values query
    if 'missing' in q or 'null' in q or 'na' in q:
        null_counts = df.isna().sum()
        null_cols = null_counts[null_counts > 0]
        if len(null_cols) == 0:
            return {
                "answer": "Great news! 🎉 This dataset has **0 missing values** across all columns.",
                "result_type": "text",
                "code_used": "df.isna().sum()"
            }
        else:
            rows = [{"Column": col, "Missing Count": int(cnt), "Missing %": f"{round(cnt/len(df)*100, 1)}%"} for col, cnt in null_cols.items()]
            return {
                "answer": f"Found missing values in {len(null_cols)} columns:",
                "result_type": "table",
                "table_data": rows,
                "code_used": "df.isna().sum()[lambda x: x > 0]"
            }

    # 4. Summary / Overview query
    if 'summary' in q or 'overview' in q or 'describe' in q or 'explain' in q:
        num_cols = len([c for c in cols if pd.api.types.is_numeric_dtype(df[c])])
        cat_cols = len(cols) - num_cols
        return {
            "answer": f"Dataset Summary: Contains **{len(df):,} rows** and **{len(cols)} columns** ({num_cols} numerical, {cat_cols} categorical). Total missing cells: {int(df.isna().sum().sum())}.",
            "result_type": "text",
            "code_used": "df.info()"
        }

    # 5. Highest / Maximum query
    if 'highest' in q or 'maximum' in q or 'max' in q:
        for idx, cl in enumerate(cols_lower):
            if cl in q and pd.api.types.is_numeric_dtype(df[cols[idx]]):
                max_val = df[cols[idx]].max()
                max_row = df[df[cols[idx]] == max_val].iloc[0]
                return {
                    "answer": f"The maximum `{cols[idx]}` is **{sanitize_val(max_val)}**.",
                    "result_type": "text",
                    "code_used": f"df['{cols[idx]}'].max()"
                }

    # Fallback response summarizing columns
    return {
        "answer": f"I analyzed your dataset of **{len(df):,} rows**. Available columns: `{', '.join(cols[:6])}`... You can ask me to find top values, averages, missing data, or group summaries!",
        "result_type": "text",
        "code_used": "# Standard dataset scan"
    }

def process_chat_query(df: pd.DataFrame, query: str, api_key: str = None) -> dict:
    # Check for API key
    token = api_key or os.environ.get("GEMINI_API_KEY")
    
    if token:
        try:
            # Try importing google.genai or google.generativeai
            import google.generativeai as genai
            genai.configure(api_key=token)
            
            # Prepare schema prompt
            schema_info = []
            for col in df.columns:
                dtype = str(df[col].dtype)
                sample = df[col].dropna().head(3).tolist()
                schema_info.append(f"- Column '{col}' ({dtype}): Sample values {sample}")
                
            prompt = f"""
You are an expert Data Analyst AI assistant for the DataPulse app.
The user is asking a question about their dataset: "{query}"

Dataset Schema:
- Total Rows: {len(df)}
- Columns:
{chr(10).join(schema_info)}

Instructions:
1. Provide a clear, direct natural language answer.
2. If the user asks for a breakdown, top N, or comparison, write executable Python code that produces a DataFrame named `result_df`.
3. Wrap your python code in ```python ... ``` blocks if applicable.
4. Keep explanations concise and helpful.
"""
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            resp_text = response.text
            
            # Check if code block generated
            code_match = re.search(r'```python\s*(.*?)\s*```', resp_text, re.DOTALL)
            if code_match:
                code_str = code_match.group(1).strip()
                local_vars = {"df": df.copy(), "pd": pd, "np": np}
                exec(code_str, {}, local_vars)
                
                if "result_df" in local_vars and isinstance(local_vars["result_df"], pd.DataFrame):
                    res_df = local_vars["result_df"].head(15)
                    rows = [{col: sanitize_val(r[col]) for col in res_df.columns} for _, r in res_df.iterrows()]
                    clean_answer = re.sub(r'```python.*?```', '', resp_text, flags=re.DOTALL).strip()
                    return {
                        "answer": clean_answer or "Here are the query results:",
                        "result_type": "table",
                        "table_data": rows,
                        "code_used": code_str
                    }

            return {
                "answer": resp_text,
                "result_type": "text",
                "code_used": "# Gemini LLM Reasoning"
            }
        except Exception as e:
            print(f"Gemini API Exception, falling back to local engine: {e}")
            
    # Fallback to local smart query engine
    return local_query_engine(df, query)
