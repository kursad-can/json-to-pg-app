<!-- .github/copilot-instructions.md - Project-specific guidance for AI coding agents -->
# JSON-to-PG App — Copilot Instructions

Purpose: provide immediate, actionable context so an AI coding agent can be productive in this repository.

**Big Picture**
- **What this app does:** A Streamlit app (`app.py`) that accepts a `.json` upload, normalizes/serializes nested structures, and writes rows to a PostgreSQL table via SQLAlchemy.
- **Data flow:** File uploader -> `json.loads` -> optional flattening of `records` arrays -> `pandas.DataFrame` -> serialize nested columns -> `df.to_sql(...)` -> run a Postgres `ALTER TABLE` to add `_generated_id` primary key if missing.

**Key Files**
- `app.py` — single-file Streamlit app; contains parsing, flattening, serialization, DB write logic and the `ALTER TABLE` step that adds `_generated_id`.
- `PROMPT.md` — the original design/requirements used to build the app (useful for feature parity or refactors).
- `README.md` — usage and run instructions (streamlit command, connection string format).
- `requirements.txt` — runtime dependencies: `streamlit`, `pandas`, `sqlalchemy`, `psycopg2-binary`.
- `sample_data.json`, `nested_records.json`, `complex_data.json` — realistic input examples for manual or automated tests.

**Project Conventions & Patterns (concrete)**
- Flatten nested telemetry-style data only when every top-level entry contains a `records` array. `app.py` tests this with an `all(... "records" in item ...)` check and then concatenates all `records` lists.
- Detect JSON/complex columns by sampling non-null values (`.dropna().head(10)`) and checking for `dict` or `list`. Those columns are serialized via `json.dumps` and mapped to `sqlalchemy.types.JSON` before `to_sql`.
- `df.to_sql(... if_exists='replace', index=False, dtype=...)` is the current write strategy — note the repo chooses `replace` for usability during retries.
- After writing, the app runs: `ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS _generated_id SERIAL PRIMARY KEY;` to guarantee a primary key exists (Postgres-specific).
- If input JSON contains an `id` column, the app warns and avoids using it as the DB primary key; the generated `_generated_id` is used instead.

**How to run locally (exact commands)**
```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```
Keep the working directory at the `json-to-pg-app` folder when running these commands.

**Integration points & external requirements**
- PostgreSQL reachable from the machine running Streamlit; `app.py` expects a full SQLAlchemy connection string in the sidebar: `postgresql://user:password@host:port/dbname`.
- SQLAlchemy engine + `psycopg2-binary` is the driver backing DB writes; direct SQL is used for the `ALTER TABLE` step.

**What AI agents should do first when editing or adding features**
- Search and open `app.py` to understand current logic paths: parsing -> flattening -> JSON serialization -> `to_sql` -> ALTER TABLE.
- Preserve the sample-based detection behavior if changing JSONB handling (tests rely on sampling non-null values).
- When changing DB write semantics (e.g., `if_exists`), update the Streamlit UI or README so users know the behavior.

**Useful examples in repo to reference or test against**
- `nested_records.json` — exercise the `records`-flattening path.
- `complex_data.json` — contains nested objects/arrays that should become `JSONB` columns.

**Notes & limitations discovered in code (so agents don't break things)**
- The `_generated_id` PK step is Postgres-specific; avoid applying that SQL to other DBs without conditional logic.
- Secrets: the app currently asks for a plaintext connection string in the sidebar. Do not commit credentials. Consider env var / secrets manager changes only if updating README and UI.

If anything in this document is unclear or you'd like more detail (for example: line-level references in `app.py`, or suggested unit tests using the sample JSON files), tell me which area and I will expand or iterate.
