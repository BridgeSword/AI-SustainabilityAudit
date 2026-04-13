# web_api/main.py
from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from web_api.extractor import extract_all


class JobStatus(BaseModel):
    state: str
    updated_at: int
    error: Optional[str] = None


RUNS_DIR = Path(os.getenv("WEB_RUNS_DIR", str(Path(__file__).resolve().parents[1] / "runs"))).resolve()
UPLOADS_DIR = RUNS_DIR / "uploads"
JOBS_DIR = RUNS_DIR / "jobs"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR.mkdir(parents=True, exist_ok=True)

# in-memory job registry
JOBS: Dict[str, Dict[str, Any]] = {}


app = FastAPI(title="PDF Extraction API", version="1.0")

# Dev CORS: allow your Lovable/localhost frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/extract/{job_id}/status", response_model=JobStatus)
def get_status(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job_id not found")
    return JobStatus(state=job["state"], updated_at=job["updated_at"], error=job.get("error"))


@app.get("/api/extract/{job_id}/result")
def get_result(job_id: str):
    job = JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="job_id not found")

    if job["state"] == "running" or job["state"] == "queued":
        raise HTTPException(status_code=409, detail=f"Job not done yet: {job['state']}")

    if job["state"] == "error":
        raise HTTPException(status_code=500, detail=job.get("error", "unknown error"))

    result_path = job.get("result_path")
    if not result_path or not Path(result_path).exists():
        raise HTTPException(status_code=500, detail="result file missing")

    return json.loads(Path(result_path).read_text(encoding="utf-8"))


async def _run_job(job_id: str, pdf_path: Path, meta_extra: Dict[str, Any], job_dir: Path):
    JOBS[job_id]["state"] = "running"
    JOBS[job_id]["updated_at"] = int(time.time())

    try:
        result = await asyncio.to_thread(extract_all, pdf_path, job_dir, meta_extra)
        result_path = job_dir / "result.json"
        result_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

        JOBS[job_id]["state"] = "done"
        JOBS[job_id]["updated_at"] = int(time.time())
        JOBS[job_id]["result_path"] = str(result_path)

    except Exception as e:
        JOBS[job_id]["state"] = "error"
        JOBS[job_id]["updated_at"] = int(time.time())
        JOBS[job_id]["error"] = str(e)


@app.post("/api/extract")
async def create_extract_job(
    file: UploadFile = File(...),

    company_number: Optional[str] = Form(None),
    company_name: Optional[str] = Form(None),
    year: Optional[int] = Form(2023),
    standard: Optional[str] = Form(None),

    revenue_override_million: Optional[float] = Form(None),
):
    if revenue_override_million is not None and revenue_override_million == 0:
        revenue_override_million = None

    job_id = str(uuid.uuid4())
    JOBS[job_id] = {"state": "queued", "updated_at": int(time.time())}

    pdf_path = UPLOADS_DIR / f"{job_id}.pdf"
    content = await file.read()
    pdf_path.write_bytes(content)

    job_dir = JOBS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    meta_extra = {
        "company_number": company_number,
        "company_name": company_name,
        "year": year,
        "standard": standard,
        "revenue_override_million": revenue_override_million,
        "elapsed_sec": None,
    }

    asyncio.create_task(_run_job(job_id, pdf_path, meta_extra, job_dir))
    return {"job_id": job_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "web_api.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )