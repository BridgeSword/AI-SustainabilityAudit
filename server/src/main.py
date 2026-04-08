import ssl

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv

from .core.config import settings
from .core.utils import get_logger
from .core.event_handlers import start_app_handler
from .core.dependencies import milvus_client, celery_app
from .exceptions.global_exception_handler import (
    catch_global_exceptions,
    validation_exception_handler,
)

from .db.postgres.database import init_db




load_dotenv()

try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

logger = get_logger(__name__)

from .api import checks, embeddings, companies, reports, pdf_files


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
app.include_router(embeddings.router, prefix="/embeddings/v1")
app.include_router(companies.router, prefix="/companies")
app.include_router(reports.router, prefix="/reports")
app.include_router(pdf_files.router, prefix="/pdf/v1")

# Make Milvus optional for basic functionality
try:
    app.add_event_handler("startup", start_app_handler(app, milvus_client))
except Exception as e:
    logger.warning(f"Failed to add Milvus startup handler: {e}")
    logger.info("Starting without Milvus integration...")

app.exception_handler(validation_exception_handler)

@app.get("/")
def root():
    return JSONResponse(
        content={
            "detail": settings.app_name,
            "status": 200,
            "database": "postgres"
        }
    )

@app.get("/health")
def health():
    return {
        "status": "ok",
        "database": "postgres"
    }