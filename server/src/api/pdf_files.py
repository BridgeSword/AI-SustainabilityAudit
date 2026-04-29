import hashlib

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..core.dependencies import get_db
from ..db.postgres.models import PDFFile, Report, ReportText
from ..db.redis.report_cache_service import invalidate_reports_list_cache
from ..services.pdf_extraction_client import (
    create_extract_job,
    get_extract_status,
    get_extract_result,
)

router = APIRouter(tags=["pdf-files"])


# ------------------------------------------------------------------
# Upload
# ------------------------------------------------------------------

@router.post("/upload")
async def upload_pdf(
    report_id: int,
    uploaded_by: int | None = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF is allowed")

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    file_bytes = await file.read()
    sha256 = hashlib.sha256(file_bytes).hexdigest()

    pdf_row = PDFFile(
        report_id=report_id,
        uploaded_by=uploaded_by,
        filename=file.filename,
        mime_type=file.content_type,
        file_size_bytes=len(file_bytes),
        sha256=sha256,
        content_blob=file_bytes,
        is_public=True,
    )
    db.add(pdf_row)

    report.extraction_status = "processing"
    db.commit()

    job_resp = await create_extract_job(
        file_bytes=file_bytes,
        filename=file.filename,
        content_type=file.content_type,
    )

    job_id = job_resp.get("job_id") or job_resp.get("id")
    if not job_id:
        raise HTTPException(
            status_code=500,
            detail="PDF extraction job_id not found in response",
        )

    return {
        "message": "PDF uploaded, extraction job created",
        "report_id": report_id,
        "job_id": job_id,
    }


# ------------------------------------------------------------------
# Job polling
# ------------------------------------------------------------------

@router.get("/jobs/{job_id}/status")
async def check_pdf_job_status(
    job_id: str,
    report_id: int,
    db: Session = Depends(get_db),
):
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    status_resp = await get_extract_status(job_id)

    status_value = (
        status_resp.get("status")
        or status_resp.get("state")
        or status_resp.get("job_status")
    )

    if status_value in ["completed", "done", "success", "finished"]:
        result_resp = await get_extract_result(job_id)

        report.extracted_json = result_resp
        report.extraction_status = "completed"

        full_text = (
            result_resp.get("full_text")
            or result_resp.get("text")
            or result_resp.get("content")
        )

        if full_text:
            existing = (
                db.query(ReportText)
                .filter(ReportText.report_id == report_id)
                .first()
            )
            if existing:
                existing.full_text = full_text
            else:
                db.add(
                    ReportText(
                        report_id=report_id,
                        full_text=full_text,
                        embedding=None,
                    )
                )

        db.commit()
        invalidate_reports_list_cache()

        return {
            "job_id": job_id,
            "report_id": report_id,
            "status": "completed",
        }

    if status_value in ["failed", "error"]:
        report.extraction_status = "failed"
        db.commit()
        invalidate_reports_list_cache()

    return {
        "job_id": job_id,
        "report_id": report_id,
        "status": status_value,
        "raw_status": status_resp,
    }


@router.get("/jobs/{job_id}/result")
async def get_pdf_job_result(job_id: str):
    return await get_extract_result(job_id)


# ------------------------------------------------------------------
# Replace PDF for a report
# ------------------------------------------------------------------

@router.put("/replace/{report_id}")
async def replace_pdf(
    report_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Delete existing PDF(s) for a report and upload a new one,
    then re-run extraction."""
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF is allowed")

    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Remove old PDFs
    db.query(PDFFile).filter(PDFFile.report_id == report_id).delete()

    file_bytes = await file.read()
    sha256 = hashlib.sha256(file_bytes).hexdigest()

    pdf_row = PDFFile(
        report_id=report_id,
        uploaded_by=None,
        filename=file.filename,
        mime_type=file.content_type,
        file_size_bytes=len(file_bytes),
        sha256=sha256,
        content_blob=file_bytes,
        is_public=True,
    )
    db.add(pdf_row)

    # Update filename in extracted_json
    ej = dict(report.extracted_json or {})
    ej["file_name"] = file.filename
    report.extracted_json = ej
    report.extraction_status = "processing"
    db.commit()

    # Kick off extraction
    job_resp = await create_extract_job(
        file_bytes=file_bytes,
        filename=file.filename,
        content_type=file.content_type,
    )
    job_id = job_resp.get("job_id") or job_resp.get("id")

    invalidate_reports_list_cache()

    return {
        "message": "PDF replaced, new extraction started",
        "report_id": report_id,
        "job_id": job_id,
    }


# ------------------------------------------------------------------
# PDF download / preview
# ------------------------------------------------------------------

@router.get("/download/{report_id}")
def download_pdf(report_id: int, db: Session = Depends(get_db)):
    """Return the stored PDF blob so the browser can view/download it."""
    pdf = (
        db.query(PDFFile)
        .filter(PDFFile.report_id == report_id)
        .order_by(PDFFile.id.desc())
        .first()
    )
    if not pdf:
        raise HTTPException(status_code=404, detail="No PDF found for this report")

    return Response(
        content=bytes(pdf.content_blob),
        media_type=pdf.mime_type or "application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{pdf.filename}"',
        },
    )


# ------------------------------------------------------------------
# Fix stuck "processing" reports (mock / demo helper)
# ------------------------------------------------------------------

@router.post("/fix-stuck/{report_id}")
async def fix_stuck_report(report_id: int, db: Session = Depends(get_db)):
    """For reports stuck in 'processing' — re-run mock extraction and mark
    as completed.  Only useful in demo / mock mode."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.extraction_status == "completed":
        return {"message": "Already completed", "report_id": report_id}

    # Get mock result
    result_resp = await get_extract_result("fix-stuck-fallback")

    report.extracted_json = result_resp
    report.extraction_status = "completed"

    full_text = result_resp.get("full_text")
    if full_text:
        existing = (
            db.query(ReportText)
            .filter(ReportText.report_id == report_id)
            .first()
        )
        if existing:
            existing.full_text = full_text
        else:
            db.add(
                ReportText(
                    report_id=report_id,
                    full_text=full_text,
                    embedding=None,
                )
            )

    db.commit()
    invalidate_reports_list_cache()

    return {
        "message": "Report fixed — now marked as completed",
        "report_id": report_id,
    }
