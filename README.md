# JSON to PostgreSQL Importer 🚀

[![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=Streamlit&logoColor=white)](https://streamlit.io/)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

A robust, production-ready tool to seamlessly import complex JSON datasets into PostgreSQL. Built with Python and Streamlit, it handles dynamic schemas, nested structures, and massive record arrays with ease.

## ✨ Key Features

-   **Dynamic Schema Inference**: Automatically detects column names and data types (`INTEGER`, `FLOAT`, `BOOLEAN`, `TIMESTAMP`, `JSONB`) from your JSON data. No manual mapping required.
-   **Smart Flattening**: Intelligently detects and flattens nested `records` arrays (common in telemetry/log data) into individual database rows.
-   **JSONB Support**: Complex nested objects and arrays are automatically serialized and stored as `JSONB` columns, preserving data structure.
-   **Conflict Resolution**: Safely handles primary key collisions by automatically renaming conflicting `id` columns in the source data.
-   **User-Friendly UI**: Clean, intuitive interface for database configuration and file management.

## 🛠️ Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/json-to-pg-app.git
    cd json-to-pg-app
    ```

2.  **Set Up Environment**
    It is recommended to use a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install Dependencies**
    ```bash
    pip install -r requirements.txt
    ```

## 🚀 Usage

1.  **Start the Application**
    ```bash
    streamlit run app.py
    ```

2.  **Configure Database**
    -   Enter your PostgreSQL connection string in the sidebar.
    -   *Format*: `postgresql://user:password@localhost:5432/dbname`

3.  **Import Data**
    -   Enter a target **Table Name**.
    -   Upload your `.json` file.
    -   Review the data preview and click **Start Import**.

## 📂 Supported Data Formats

### 1. Standard Array of Objects
```json
[
  { "id": 1, "name": "Alice", "role": "Admin" },
  { "id": 2, "name": "Bob", "role": "User" }
]
```

### 2. Nested Records (Telemetry/Logs)
Automatically extracts items from the `records` array.
```json
[
  {
    "records": [
      { "timestamp": "2023-01-01T12:00:00Z", "event": "login" },
      { "timestamp": "2023-01-01T12:05:00Z", "event": "logout" }
    ]
  }
]
```

### 3. Complex Nested Structures
Nested objects are stored as `JSONB`.
```json
[
  {
    "product_id": 101,
    "details": {
      "color": "red",
      "dimensions": { "w": 10, "h": 20 }
    }
  }
]
```

## 📦 Tech Stack

-   **Frontend**: [Streamlit](https://streamlit.io/)
-   **Data Processing**: [Pandas](https://pandas.pydata.org/)
-   **Database ORM**: [SQLAlchemy](https://www.sqlalchemy.org/)
-   **Database Driver**: [psycopg2](https://pypi.org/project/psycopg2/)

## 📄 License

This project is licensed under the MIT License.
