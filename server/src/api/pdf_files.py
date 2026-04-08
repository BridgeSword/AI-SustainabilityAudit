import hashlib

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.dependencies import get_db
from ..db.postgres.models import PDFFile, Report, ReportText
from ..services.pdf_extraction_client import (
    create_extract_job,
    get_extract_status,
    get_extract_result,
)

router = APIRouter(tags=["pdf-files"])


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

    # 先保存原始 PDF
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

    # 调外部 PDF extraction 服务
    job_resp = await create_extract_job(
        file_bytes=file_bytes,
        filename=file.filename,
        content_type=file.content_type,
    )

    # 假设返回里有 job_id
    job_id = job_resp.get("job_id") or job_resp.get("id")
    if not job_id:
        raise HTTPException(status_code=500, detail="PDF extraction job_id not found in response")

    return {
        "message": "PDF uploaded, extraction job created",
        "report_id": report_id,
        "job_id": job_id,
    }


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

    # 这里先兼容几种常见字段名
    status_value = (
        status_resp.get("status")
        or status_resp.get("state")
        or status_resp.get("job_status")
    )

    if status_value in ["completed", "done", "success", "finished"]:
        result_resp = await get_extract_result(job_id)

        report.extracted_json = result_resp
        report.extraction_status = "completed"

        # 尝试提取全文字段
        full_text = (
            result_resp.get("full_text")
            or result_resp.get("text")
            or result_resp.get("content")
        )

        if full_text:
            existing = db.query(ReportText).filter(ReportText.report_id == report_id).first()
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

        return {
            "job_id": job_id,
            "report_id": report_id,
            "status": "completed",
        }

    if status_value in ["failed", "error"]:
        report.extraction_status = "failed"
        db.commit()

    return {
        "job_id": job_id,
        "report_id": report_id,
        "status": status_value,
        "raw_status": status_resp,
    }


@router.get("/jobs/{job_id}/result")
async def get_pdf_job_result(job_id: str):
    return await get_extract_result(job_id)