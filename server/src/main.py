import os
import ssl

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# CRITICAL: load .env BEFORE importing any project module that reads env vars
# at import time (e.g. db/postgres/database.py builds the SQLAlchemy engine at
# module import using POSTGRES_HOST/PORT/etc). If load_dotenv() runs after
# those imports, the engine is bound to default values (localhost:5432) and
# silently connects to whatever local Postgres happens to be running instead
# of the Docker container on :55432.
from dotenv import load_dotenv
load_dotenv()

# APP_ENV must exist before get_logger runs (utils.py reads it).
os.environ.setdefault("APP_ENV", "local")

from .core.config import settings
from .core.utils import get_logger
# NOTE: event_handlers + dependencies (Milvus / Celery / torch / nltk) pull in
# heavy deps. They are imported lazily below so the backend can boot in a
# minimal environment (DB + API only).
from .exceptions.global_exception_handler import (
    catch_global_exceptions,
    validation_exception_handler,
)

from .db.postgres.database import init_db

try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

logger = get_logger(__name__)

# Minimal router set: DB-backed CRUD + health. The embeddings router pulls in
# torch / sentence-transformers and is intentionally disabled for now — re-
# enable it once the ML deps are installed.
from .api import checks, companies, reports, pdf_files


app = FastAPI(title=settings.app_name, docs_url="/docs")

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(catch_global_exceptions)

init_db()

app.include_router(checks.router)
app.include_router(companies.router, prefix="/companies")
app.include_router(reports.router, prefix="/reports")
app.include_router(pdf_files.router, prefix="/pdf/v1")

# Milvus / Celery / NLTK startup is optional for the minimal demo.
# If the heavy deps are installed we register it; otherwise we skip.
try:
    from .core.event_handlers import start_app_handler
    from .core.dependencies import milvus_client  # noqa: F401
    app.add_event_handler("startup", start_app_handler(app, milvus_client))
    logger.info("Milvus/NLTK startup handler registered.")
except Exception as e:
    logger.warning(f"Skipping Milvus/NLTK startup handler: {e}")
    logger.info("Starting without Milvus integration (minimal mode).")

app.exception_handler(validation_exception_handler)


@app.get("/")
def root():
    return JSONResponse(
        content={
            "detail": settings.app_name,
            "status": 200,
            "database": "postgres",
        }
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "database": "postgres",
    }
