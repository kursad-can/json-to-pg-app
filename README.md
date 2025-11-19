# JSON to PostgreSQL Importer

A powerful Next.js web application that allows you to upload JSON files and automatically import them into a local PostgreSQL database. It features dynamic schema inference, handling of nested objects, and automatic flattening of record arrays.

## Features

### 🚀 Core Functionality
- **Web Interface**: Clean and simple UI to configure database connection and upload files.
- **Automatic Table Creation**: Creates tables dynamically based on JSON structure.
- **Data Import**: Efficiently inserts data into your PostgreSQL database.

### 🧠 Smart Schema Inference
- **Dynamic Columns**: Scans the entire JSON file to discover all unique keys across all rows.
- **Type Detection**: Automatically detects data types (`INTEGER`, `DOUBLE PRECISION`, `BOOLEAN`, `TIMESTAMP`, `TEXT`).
- **Conflict Resolution**: Handles mixed types by choosing the safest compatible type (e.g., `TEXT` or `JSONB`).
- **ID Safety**: Automatically renames generated primary keys to `_generated_id` if your JSON already contains an `id` column.

### 📦 Complex Data Support
- **Nested Objects & Arrays**: Automatically detects nested structures and stores them as `JSONB` columns.
- **Nested Records Extraction**: If your JSON contains a list of objects with a `records` array (e.g., Azure Telemetry logs), the app automatically extracts and flattens these records into individual rows.

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database running locally

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/kursad-can/json-to-pg-app.git
   cd json-to-pg-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Database Connection**: Enter your PostgreSQL connection string.
   - Format: `postgresql://user:password@localhost:5432/dbname`
2. **Table Name**: Enter the name of the table you want to create (e.g., `my_data`).
3. **Select File**: Choose a `.json` file from your computer.
4. **Import**: Click "Start Import".

## Example Data Formats

### Standard Array
```json
[
  { "name": "Alice", "age": 30 },
  { "name": "Bob", "age": 25 }
]
```

### Nested Records (Automatically Flattened)
```json
[
  {
    "records": [
      { "time": "10:00", "event": "login" },
      { "time": "10:05", "event": "click" }
    ]
  }
]
```

### Complex/Dynamic Keys
```json
[
  { "id": 1, "details": { "color": "red" } },
  { "id": 2, "price": 99.99 } 
]
```
*Result: Table will have columns `id`, `details` (JSONB), and `price`.*

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database Client**: `pg` (node-postgres)
- **Styling**: Vanilla CSS (CSS Modules & Global Styles)
- **Language**: TypeScript
