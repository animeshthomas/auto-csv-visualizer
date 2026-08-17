import os
import pandas as pd
import numpy as np

def generate_datasets():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    os.makedirs(data_dir, exist_ok=True)
    
    np.random.seed(42)

    # 1. Sales Performance Dataset (1,000 rows)
    n_sales = 1000
    regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East']
    products = ['Cloud Analytics', 'Enterprise ERP', 'Security Suite', 'AI CoPilot', 'Data Connector']
    categories = ['Software', 'Subscription', 'Services']
    
    dates = pd.date_range(start='2024-01-01', periods=n_sales, freq='12h')
    
    units = np.random.randint(1, 50, size=n_sales)
    unit_price = np.random.uniform(50, 1200, size=n_sales).round(2)
    revenue = (units * unit_price).round(2)
    discount_pct = np.random.choice([0.0, 0.05, 0.10, 0.15, 0.20, 0.25], size=n_sales, p=[0.3, 0.2, 0.2, 0.15, 0.1, 0.05])
    profit_margin = np.random.uniform(0.15, 0.65, size=n_sales)
    profit = (revenue * (1 - discount_pct) * profit_margin).round(2)
    customer_rating = np.random.choice([1, 2, 3, 4, 5], size=n_sales, p=[0.05, 0.08, 0.17, 0.40, 0.30])
    
    sales_df = pd.DataFrame({
        'Date': dates.strftime('%Y-%m-%d'),
        'Region': np.random.choice(regions, size=n_sales, p=[0.35, 0.25, 0.20, 0.12, 0.08]),
        'Product': np.random.choice(products, size=n_sales),
        'Category': np.random.choice(categories, size=n_sales, p=[0.5, 0.35, 0.15]),
        'Units_Sold': units,
        'Unit_Price_USD': unit_price,
        'Revenue_USD': revenue,
        'Discount_Pct': (discount_pct * 100).round(1),
        'Profit_USD': profit,
        'Customer_Rating': customer_rating
    })
    
    # Add a few NaN values to simulate realistic messy data
    sales_df.loc[np.random.choice(n_sales, 25, replace=False), 'Discount_Pct'] = np.nan
    sales_df.loc[np.random.choice(n_sales, 15, replace=False), 'Customer_Rating'] = np.nan

    sales_path = os.path.join(data_dir, "sales_data.csv")
    sales_df.to_csv(sales_path, index=False)
    print(f"Generated: {sales_path} ({len(sales_df)} rows)")

    # 2. Housing & Demographics Dataset (800 rows)
    n_house = 800
    med_income = np.random.gamma(shape=3.0, scale=2.0, size=n_house).round(2) + 1.5
    house_age = np.random.randint(1, 55, size=n_house)
    avg_rooms = (med_income * 0.8 + np.random.normal(2, 0.8, size=n_house)).clip(1.5, 12).round(1)
    avg_bedrooms = (avg_rooms * 0.35 + np.random.normal(0.2, 0.1, size=n_house)).clip(1.0, 5.0).round(1)
    population = (med_income * 400 + house_age * 10 + np.random.normal(500, 200, size=n_house)).clip(100, 6000).astype(int)
    dist_city_km = np.random.exponential(scale=15, size=n_house).round(1)
    ocean_proximity = np.random.choice(['NEAR BAY', '<1H OCEAN', 'INLAND', 'NEAR OCEAN', 'ISLAND'], size=n_house, p=[0.22, 0.44, 0.25, 0.08, 0.01])
    med_house_val = (med_income * 45000 - dist_city_km * 1800 + house_age * 500 + np.random.normal(20000, 15000, size=n_house)).clip(75000, 500000).round(0)

    housing_df = pd.DataFrame({
        'Median_Income_kUSD': med_income,
        'House_Age_Years': house_age,
        'Avg_Rooms': avg_rooms,
        'Avg_Bedrooms': avg_bedrooms,
        'Block_Population': population,
        'Distance_City_Km': dist_city_km,
        'Ocean_Proximity': ocean_proximity,
        'Median_House_Value_USD': med_house_val
    })
    
    housing_path = os.path.join(data_dir, "housing_demographics.csv")
    housing_df.to_csv(housing_path, index=False)
    print(f"Generated: {housing_path} ({len(housing_df)} rows)")

    # 3. Customer Churn Telecom Dataset (600 rows)
    n_churn = 600
    tenure_months = np.random.randint(1, 72, size=n_churn)
    contract_type = np.random.choice(['Month-to-month', 'One year', 'Two year'], size=n_churn, p=[0.55, 0.25, 0.20])
    internet_service = np.random.choice(['Fiber optic', 'DSL', 'No'], size=n_churn, p=[0.45, 0.35, 0.20])
    monthly_charges = np.where(internet_service == 'Fiber optic', np.random.uniform(70, 115, size=n_churn),
                       np.where(internet_service == 'DSL', np.random.uniform(40, 75, size=n_churn),
                                np.random.uniform(18, 28, size=n_churn))).round(2)
    total_charges = (tenure_months * monthly_charges + np.random.normal(0, 50, size=n_churn)).clip(18, 9000).round(2)
    tech_support_calls = np.random.poisson(lam=1.8, size=n_churn).clip(0, 9)
    
    # Calculate realistic churn risk logic
    churn_prob = (
        (contract_type == 'Month-to-month') * 0.35 +
        (internet_service == 'Fiber optic') * 0.15 +
        (tech_support_calls > 3) * 0.25 +
        (tenure_months < 12) * 0.20
    ).clip(0.05, 0.90)
    
    churned = [np.random.choice(['Yes', 'No'], p=[p, 1-p]) for p in churn_prob]
    
    churn_df = pd.DataFrame({
        'Customer_ID': [f"CUST-{1000+i}" for i in range(n_churn)],
        'Tenure_Months': tenure_months,
        'Contract_Type': contract_type,
        'Internet_Service': internet_service,
        'Monthly_Charges_USD': monthly_charges,
        'Total_Charges_USD': total_charges,
        'Tech_Support_Calls': tech_support_calls,
        'Churned': churned
    })
    
    churn_path = os.path.join(data_dir, "customer_churn.csv")
    churn_df.to_csv(churn_path, index=False)
    print(f"Generated: {churn_path} ({len(churn_df)} rows)")

if __name__ == '__main__':
    generate_datasets()
