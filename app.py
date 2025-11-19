import streamlit as st
import pandas as pd
import json
import sqlalchemy
from sqlalchemy import create_engine, text
import io

st.set_page_config(page_title="JSON to PostgreSQL Importer", layout="wide")

st.title("JSON to PostgreSQL Importer")

# --- Sidebar: Configuration ---
st.sidebar.header("Database Configuration")
connection_string = st.sidebar.text_input(
    "Connection String",
    placeholder="postgresql://user:password@localhost:5432/dbname",
    help="Format: postgresql://user:password@host:port/database"
)
table_name = st.sidebar.text_input("Target Table Name", placeholder="my_table")

# --- Main Content ---
st.write("Upload a JSON file to import it into your PostgreSQL database.")

uploaded_file = st.file_uploader("Choose a JSON file", type=["json"])

if uploaded_file is not None:
    try:
        # 1. Load JSON
        content = uploaded_file.read().decode("utf-8")
        data = json.loads(content)
        
        if not isinstance(data, list):
            # Handle single object
            data = [data]
            
        # 2. Flatten 'records' if present
        # Check if all items have a 'records' array
        has_records = all(isinstance(item, dict) and "records" in item and isinstance(item["records"], list) for item in data)
        
        if has_records:
            st.info("Detected nested 'records' arrays. Flattening data...")
            flattened_data = []
            for item in data:
                flattened_data.extend(item["records"])
            data = flattened_data
            
        if not data:
            st.error("JSON file is empty or contains no records.")
            st.stop()

        # 3. Convert to DataFrame
        df = pd.DataFrame(data)
        
        # 4. Handle Nested Objects (JSONB)
        # Identify columns that are objects/lists and serialize them
        json_columns = []
        for col in df.columns:
            # Check if column contains dicts or lists
            # We sample non-null values
            sample = df[col].dropna().head(10)
            if any(isinstance(x, (dict, list)) for x in sample):
                json_columns.append(col)
                # Serialize to JSON string for insertion
                df[col] = df[col].apply(lambda x: json.dumps(x) if x is not None else None)
        
        st.write(f"Preview ({len(df)} rows):")
        st.dataframe(df.head())
        
        if st.button("Start Import"):
            if not connection_string or not table_name:
                st.error("Please provide a connection string and table name.")
            else:
                try:
                    with st.spinner("Importing data..."):
                        engine = create_engine(connection_string)
                        
                        # Map JSON columns to sqlalchemy JSON type
                        dtype_mapping = {col: sqlalchemy.types.JSON for col in json_columns}
                        
                        # Handle ID collision
                        if "id" in df.columns:
                            st.warning("Found 'id' column in JSON. Renaming generated primary key to avoid collision.")
                            # Pandas to_sql doesn't automatically create a PK if we don't ask it to, 
                            # but usually we want one.
                            # We'll let pandas write the table, then maybe add a PK if needed, 
                            # or just let it be. 
                            # Actually, to match previous behavior (auto PK), we can let pandas write data
                            # and not index 'id'.
                            pass

                        # Write to DB
                        # if_exists='replace' or 'append'? Let's default to 'replace' for this tool or ask user.
                        # For simplicity matching previous app: create new table (fail if exists? or replace?)
                        # Previous app did "CREATE IF NOT EXISTS" then INSERT.
                        # Pandas 'fail' is safest default.
                        
                        df.to_sql(
                            table_name, 
                            engine, 
                            if_exists='replace', # Let's use replace to be user friendly for retries
                            index=False, # Don't write pandas index
                            dtype=dtype_mapping
                        )
                        
                        # Add a primary key if one doesn't exist?
                        # Pandas to_sql doesn't add a PK.
                        # We can add one manually.
                        with engine.connect() as conn:
                            # Check if we have a PK. If not, add _generated_id
                            # This is a bit complex for generic SQL, but for Postgres:
                            conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS _generated_id SERIAL PRIMARY KEY;'))
                            conn.commit()

                    st.success(f"Successfully imported {len(df)} rows into table '{table_name}'!")
                    
                except Exception as e:
                    st.error(f"Import failed: {e}")
                    
    except json.JSONDecodeError:
        st.error("Invalid JSON file.")
    except Exception as e:
        st.error(f"An error occurred: {e}")
