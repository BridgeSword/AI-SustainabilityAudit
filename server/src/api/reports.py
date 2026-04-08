from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.dependencies import get_db
from ..db.postgres.models import Report
from ..db.postgres.schemas import ReportCreate, ReportRead

router = APIRouter(tags=["reports"])


@router.get("/", response_model=list[ReportRead])
def list_reports(db: Session = Depends(get_db)):
    return db.query(Report).all()


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
    return report