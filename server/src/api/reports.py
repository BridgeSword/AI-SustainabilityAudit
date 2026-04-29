from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.dependencies import get_db
from ..db.postgres.models import PDFFile, Report, ReportText
from ..db.postgres.schemas import ReportCreate, ReportRead, ReportUpdate
from ..db.redis.report_cache_service import (
    list_all_reports,
    invalidate_reports_list_cache,
)

router = APIRouter(tags=["reports"])


@router.get("/", response_model=list[ReportRead])
def get_reports(db: Session = Depends(get_db)):
    """List all reports (Redis-cached, falls back to Postgres)."""
    return list_all_reports(db)


@router.post("/", response_model=ReportRead)
def create_report(payload: ReportCreate, db: Session = Depends(get_db)):
    report = Report(
        user_id=payload.user_id,
        company_id=payload.company_id,
        year=payload.year,
        extracted_json=payload.extracted_json,
        extraction_status=payload.extraction_status,
        scoring_status=payload.scoring_status,
        anomaly_status=payload.anomaly_status,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Invalidate list cache so the next GET picks up the new entry.
    invalidate_reports_list_cache()

    return report


@router.put("/{report_id}", response_model=ReportRead)
def update_report(
    report_id: int,
    payload: ReportUpdate,
    db: Session = Depends(get_db),
):
    """Update report metadata (year, extracted_json)."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if payload.year is not None:
        report.year = payload.year
    if payload.extracted_json is not None:
        report.extracted_json = payload.extracted_json

    db.commit()
    db.refresh(report)
    invalidate_reports_list_cache()
    return report


@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    """Delete a report together with its PDF files and extracted text."""
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Delete related rows (PDF blobs, report text)
    db.query(PDFFile).filter(PDFFile.report_id == report_id).delete()
    db.query(ReportText).filter(ReportText.report_id == report_id).delete()
    db.delete(report)
    db.commit()
    invalidate_reports_list_cache()

    return {"message": "Report deleted", "report_id": report_id}
