"""
PDF extraction client — **mock mode**.

When the real PDF Extraction Service (PDF_Extraction_SA_AIM_T2) is not
available, this module provides an in-memory mock that simulates the
job-based extraction flow so the full frontend upload → poll → done
cycle works end-to-end.

To switch back to the real service, set the env var:

    USE_MOCK_PDF_EXTRACTION=false

and make sure the real service is running at PDF_EXTRACT_API_URL.
"""

import os
import uuid
import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Mode switch
# ---------------------------------------------------------------------------
USE_MOCK = os.getenv("USE_MOCK_PDF_EXTRACTION", "true").lower() in (
    "true", "1", "yes", "",
)

# ---------------------------------------------------------------------------
# In-memory job store (mock only, cleared on restart — fine for demos)
# ---------------------------------------------------------------------------
_mock_jobs: Dict[str, Dict[str, Any]] = {}


def _build_mock_result(filename: str) -> Dict[str, Any]:
    """Return a realistic-looking ESG extraction result."""
    return {
        "file_name": filename,
        "full_text": (
            f"[Mock extraction] This is simulated extracted text from "
            f"{filename}. In production this would contain the full text "
            f"content parsed from the uploaded PDF document."
        ),
        "ghg_emissions": 12345.67,
        "energy_consumption_mwh": 98765.4,
        "water_withdrawal_m3": 54321.0,
        "waste_generated_tonnes": 1234.5,
        "scope_1_emissions": 4000.0,
        "scope_2_emissions": 5000.0,
        "scope_3_emissions": 3345.67,
        "extraction_method": "mock",
        "extracted_at": datetime.utcnow().isoformat(),
    }


# =========================================================================
#  Mock implementations
# =========================================================================

async def _mock_create_extract_job(
    file_bytes: bytes,
    filename: str,
    **kwargs,
) -> Dict[str, Any]:
    job_id = str(uuid.uuid4())
    _mock_jobs[job_id] = {
        "status": "completed",
        "result": _build_mock_result(filename),
        "filename": filename,
        "file_size": len(file_bytes),
    }
    logger.info(
        f"[MOCK] PDF extraction job created: job_id={job_id}, "
        f"file={filename} ({len(file_bytes)} bytes)"
    )
    return {"job_id": job_id}


async def _mock_get_extract_status(job_id: str) -> Dict[str, Any]:
    # Always return "completed" — even for unknown job_ids.  This prevents
    # reports from getting stuck at "processing" when the server restarts
    # (which clears the in-memory _mock_jobs dict) during --reload mode.
    status = _mock_jobs.get(job_id, {}).get("status", "completed")
    logger.info(f"[MOCK] PDF extraction status: job_id={job_id} → {status}")
    return {"status": status}


async def _mock_get_extract_result(job_id: str) -> Dict[str, Any]:
    job = _mock_jobs.get(job_id)
    if job is not None:
        logger.info(f"[MOCK] PDF extraction result: job_id={job_id}")
        return job["result"]
    # Unknown job (e.g. after server restart) — return generic mock data.
    logger.info(f"[MOCK] PDF extraction result: job_id={job_id} (generic fallback)")
    return _build_mock_result("uploaded.pdf")


# =========================================================================
#  Real implementations (call external PDF_Extraction_SA_AIM_T2 service)
# =========================================================================

PDF_EXTRACT_API_URL = os.getenv("PDF_EXTRACT_API_URL", "http://127.0.0.1:8000")


async def _real_create_extract_job(
    file_bytes: bytes,
    filename: str,
    content_type: str = "application/pdf",
    company_number: str | None = None,
    company_name: str | None = None,
    year: str | None = None,
    standard: str | None = None,
    revenue_override_million: str | None = None,
) -> Dict[str, Any]:
    import httpx

    async with httpx.AsyncClient(timeout=120.0) as client:
        files = {"file": (filename, file_bytes, content_type)}
        data = {}
        if company_number is not None:
            data["company_number"] = company_number
        if company_name is not None:
            data["company_name"] = company_name
        if year is not None:
            data["year"] = year
        if standard is not None:
            data["standard"] = standard
        if revenue_override_million is not None:
            data["revenue_override_million"] = revenue_override_million

        resp = await client.post(
            f"{PDF_EXTRACT_API_URL}/api/extract", files=files, data=data
        )
        resp.raise_for_status()
        return resp.json()


async def _real_get_extract_status(job_id: str) -> Dict[str, Any]:
    import httpx

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            f"{PDF_EXTRACT_API_URL}/api/extract/{job_id}/status"
        )
        resp.raise_for_status()
        return resp.json()


async def _real_get_extract_result(job_id: str) -> Dict[str, Any]:
    import httpx

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.get(
            f"{PDF_EXTRACT_API_URL}/api/extract/{job_id}/result"
        )
        resp.raise_for_status()
        return resp.json()


# =========================================================================
#  Public API — routes call these three functions
# =========================================================================

if USE_MOCK:
    logger.info("PDF extraction client running in MOCK mode")
    create_extract_job = _mock_create_extract_job
    get_extract_status = _mock_get_extract_status
    get_extract_result = _mock_get_extract_result
else:
    logger.info(f"PDF extraction client → {PDF_EXTRACT_API_URL}")
    create_extract_job = _real_create_extract_job
    get_extract_status = _real_get_extract_status
    get_extract_result = _real_get_extract_result
