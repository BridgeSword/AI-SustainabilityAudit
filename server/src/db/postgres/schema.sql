-- Enable pgvector extension (only runs once)
CREATE EXTENSION IF NOT EXISTS vector;

----------------------------------------------------
-- USERS TABLE
----------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

----------------------------------------------------
-- COMPANIES TABLE
----------------------------------------------------
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    sector TEXT,
    country TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

----------------------------------------------------
-- REPORTS TABLE (JSON stored here)
----------------------------------------------------
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    company_id INTEGER REFERENCES companies(id),
    year INTEGER NOT NULL,
    extracted_json JSONB NOT NULL,
    extraction_status TEXT DEFAULT 'pending',
    scoring_status TEXT DEFAULT 'pending',
    anomaly_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

----------------------------------------------------
-- METRICS TABLE (Structured ESG metrics)
----------------------------------------------------
CREATE TABLE metrics (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id),
    metric_name TEXT NOT NULL,
    raw_value FLOAT,
    normalized_value FLOAT,
    unit TEXT,
    source TEXT DEFAULT 'extracted',
    created_at TIMESTAMP DEFAULT NOW()
);

----------------------------------------------------
-- REPORT TEXT + EMBEDDING (for RAG)
----------------------------------------------------
CREATE TABLE report_text (
    report_id INTEGER PRIMARY KEY REFERENCES reports(id),
    full_text TEXT,
    embedding vector(1536)  -- pgvector column
);

----------------------------------------------------
-- LLM SCORES TABLE
----------------------------------------------------
CREATE TABLE llm_scores (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id),
    metric_name TEXT,
    standard_name TEXT,
    score FLOAT,
    explanation TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

----------------------------------------------------
-- ANOMALY RESULTS TABLE
----------------------------------------------------
CREATE TABLE anomaly_results (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id),
    model_name TEXT,
    anomaly_score FLOAT,
    is_anomaly BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

----------------------------------------------------
-- PEER RANKINGS TABLE
----------------------------------------------------
CREATE TABLE peer_rankings (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    year INTEGER,
    method TEXT,
    rank INTEGER,
    score FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);

----------------------------------------------------
-- TIME SERIES TABLE
----------------------------------------------------
CREATE TABLE time_series (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    metric_name TEXT,
    year INTEGER,
    value FLOAT
);

----------------------------------------------------
-- PDF FILES TABLE   store PDFs directly in Postgres (BYTEA/BLOB)
-- All uploads are visible to everyone by default (is_public = TRUE)
----------------------------------------------------
CREATE TABLE pdf_files (
    id SERIAL PRIMARY KEY,

    report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,

    uploaded_by INTEGER REFERENCES users(id),

    -- metadata
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    file_size_bytes BIGINT,
    sha256 TEXT,

    -- PDF binary content stored in Postgres
    content_blob BYTEA NOT NULL,

    -- public by default so everyone can view/download
    is_public BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW()
);

----------------------------------------------------
-- INDEXES (for speed)
----------------------------------------------------
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_company ON reports(company_id);
CREATE INDEX idx_metrics_report ON metrics(report_id);
CREATE INDEX idx_time_series_company_metric ON time_series(company_id, metric_name);

-- NEW indexes for PDF feature
CREATE INDEX idx_pdf_files_report ON pdf_files(report_id);
CREATE INDEX idx_pdf_files_uploader ON pdf_files(uploaded_by);
CREATE INDEX idx_pdf_files_sha256 ON pdf_files(sha256);
