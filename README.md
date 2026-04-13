# AI_SustainabilityAudit

AI Sustainability Audit is a local demo stack that combines:

- a **React + Vite frontend** (`client/`)
- a **FastAPI backend** (`server/`)
- a **PDF extraction service** (run separately, typically from `D:\Work\PDF_Extraction_SA_AIM_T2`)
- a **PostgreSQL database** (using Docker + pgvector)

---

## Current Architecture

The current local demo flow is:

```text
Frontend (5173)
→ Backend API (9092)
→ PDF Extraction Service (8000)
→ PostgreSQL (55432)
```

### Notes

- The frontend does **not** talk directly to PostgreSQL.
- The frontend talks to the backend.
- The backend forwards PDF extraction requests to the PDF extraction service.
- PostgreSQL is the main data store in the current setup.
- Milvus is optional in the current demo. If it fails locally, the backend can still start.

---

## Repository Structure

```text
AI_SustainabilityAudit/
├── client/                     # React + Vite frontend
├── server/                     # FastAPI backend
├── docker-compose-sdmarag.yaml # Optional supporting services
├── README.md
└── ...
```

If you keep the PDF extraction service as a separate local project, it typically lives outside this repo, for example:

```text
D:\Work\PDF_Extraction_SA_AIM_T2
```

---

## Service Ports

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:9092`
- **PDF Extraction Service**: `http://127.0.0.1:8000`
- **PostgreSQL**: `127.0.0.1:55432`

---

## Prerequisites

Install the following first:

- **Python 3.12**
- **Node.js + npm**
- **Docker Desktop**
- **Git**

Recommended:
- a Python virtual environment for the backend
- a separate Python virtual environment for the PDF extraction service

---

## Quick Start (Windows / PowerShell)

### 1. Start PostgreSQL

The project uses PostgreSQL with pgvector.

Create the container:

```powershell
docker run --name sustain-postgres `
  -e POSTGRES_DB=sustainability_ai `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -p 55432:5432 `
  -d pgvector/pgvector:pg16
```

If the container already exists:

```powershell
docker start sustain-postgres
```

Check it:

```powershell
docker ps
```

You should see `sustain-postgres` running.

---

### 2. Backend environment variables

Create or update your backend environment variables to:

```env
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=55432
POSTGRES_DB=sustainability_ai
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
APP_ENV=local
```

You can place these in your environment or in your local backend setup.

---

### 3. Start the backend

From the repository root:

```powershell
cd D:\Work\AI_SustainabilityAudit
.\.venv\Scripts\python.exe -m uvicorn server.src.main:app --host 0.0.0.0 --port 9092
```

Health check:

```text
http://localhost:9092/health
```

Expected behavior:
- backend starts successfully
- PostgreSQL tables are initialized
- `/health` returns success

#### Important
Milvus may fail to initialize locally. In the current local demo this is **not fatal** if the app continues starting.

---

### 4. Start the frontend

From the frontend directory:

```powershell
cd D:\Work\AI_SustainabilityAudit\client
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

Create or update `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:9092
```

---

### 5. Start the PDF extraction service

If you keep the PDF extraction service as a separate local project:

```powershell
cd D:\Work\PDF_Extraction_SA_AIM_T2
D:\Work\PDF_Extraction_SA_AIM_T2\.venv\Scripts\python.exe -m uvicorn web_api.main:app --app-dir . --host 127.0.0.1 --port 8000
```

PDF extraction docs:

```text
http://127.0.0.1:8000/docs
```

---

## Recommended Local Startup Order

### Terminal 1 — PostgreSQL

```powershell
docker start sustain-postgres
```

### Terminal 2 — Backend

```powershell
cd D:\Work\AI_SustainabilityAudit
.\.venv\Scripts\python.exe -m uvicorn server.src.main:app --host 0.0.0.0 --port 9092
```

### Terminal 3 — PDF Extraction

```powershell
cd D:\Work\PDF_Extraction_SA_AIM_T2
D:\Work\PDF_Extraction_SA_AIM_T2\.venv\Scripts\python.exe -m uvicorn web_api.main:app --app-dir . --host 127.0.0.1 --port 8000
```

### Terminal 4 — Frontend

```powershell
cd D:\Work\AI_SustainabilityAudit\client
npm run dev
```

---

## Current Demo Flow

### Add Report

The current upload flow is:

1. Frontend creates a report row through the backend
2. Frontend uploads the PDF through:
   - `POST /pdf/v1/upload`
3. Backend forwards the file to the PDF extraction service
4. Frontend polls job status
5. When extraction completes, the report row is updated

### Analyze

The `Analyze` action should only be used **after extraction has completed**.

If a report has not finished extraction yet, the UI should show that the report is not ready.

---

## PDF Extraction Service Notes

The PDF extraction service is job-based:

- `POST /api/extract`
- `GET /api/extract/{job_id}/status`
- `GET /api/extract/{job_id}/result`

### Important behaviors

- `POST /api/extract` does **not** return final extracted data immediately
- it returns a `job_id`
- status must be polled
- result must be fetched after the job completes

---

## Common PDF Extraction Problems

### 1. Missing `docling`

Install it in the PDF extraction service environment:

```powershell
python -m pip install docling
```

---

### 2. Missing `spacy`

Install it in the PDF extraction service environment:

```powershell
python -m pip install spacy
```

---

### 3. Large PDFs fail with OCR memory errors

Typical symptoms:

- `std::bad_alloc`
- `MemoryError`
- `RapidOCR returned empty result`

This usually means the PDF is too large or too memory-heavy for the current local machine.

Recommended workaround for demos:

- use a **smaller PDF**
- use a **shorter page range**
- use a PDF that actually contains extractable ESG metric tables

---

### 4. Result comes back but all normalized ESG values are `null`

This usually means one or more of the following happened:

- text extraction was skipped
- OCR failed on the important pages
- the extracted table was not actually an ESG metric table
- the PDF mostly produced headings / table-of-contents data instead of metric values

---

## Backend Health and Validation

### Health endpoint

```text
http://localhost:9092/health
```

### Optional database validation

If you want to validate PostgreSQL manually from Docker:

```powershell
docker exec -it sustain-postgres psql -U postgres -l
```

You should see:

```text
sustainability_ai
```

---

## Frontend Notes

The frontend currently depends on:

```env
VITE_API_BASE_URL=http://localhost:9092
```

If the frontend is running but API calls fail, check:

- backend is running on `9092`
- PDF extraction is running on `8000`
- frontend `.env` points to the correct backend URL
- the dev server was restarted after editing `.env`

---

## Useful URLs

- **Frontend**: `http://localhost:5173`
- **Backend health**: `http://localhost:9092/health`
- **Backend docs**: `http://localhost:9092/docs`
- **PDF extraction docs**: `http://127.0.0.1:8000/docs`

---

## Git Workflow (Cornell GitHub Enterprise)

If you want to push your current local work to the Cornell repository branch:

```powershell
git remote add cornell https://github.coecis.cornell.edu/CATChain/AI_SustainabilityAudit.git
git push cornell HEAD:feature/postgres-migration --force
```

If `cornell` already exists, use:

```powershell
git remote set-url cornell https://github.coecis.cornell.edu/CATChain/AI_SustainabilityAudit.git
git push cornell HEAD:feature/postgres-migration --force
```

---

## Current Status Summary

At the current stage, the repo is intended to support:

- local frontend development
- local FastAPI backend
- PostgreSQL-based data storage
- PDF extraction integration
- local demo of report upload and extraction flow

Not all advanced features are fully production-ready yet, but the local demo stack is structured around:

- frontend on `5173`
- backend on `9092`
- PDF extraction on `8000`
- PostgreSQL on `55432`

---

## License / Internal Usage

This repository is currently used for internal project development and demo workflow preparation.