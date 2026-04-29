from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.dependencies import get_db
from ..db.postgres.models import Company
from ..db.postgres.schemas import CompanyCreate, CompanyRead
from ..db.redis.report_cache_service import (
    list_all_companies,
    invalidate_companies_list_cache,
    invalidate_company_profile_cache,
)

router = APIRouter(tags=["companies"])


@router.get("/", response_model=list[CompanyRead])
def get_companies(db: Session = Depends(get_db)):
    """List all companies (Redis-cached, falls back to Postgres)."""
    return list_all_companies(db)


@router.post("/", response_model=CompanyRead)
def create_company(payload: CompanyCreate, db: Session = Depends(get_db)):
    company = Company(
        name=payload.name,
        sector=payload.sector,
        country=payload.country,
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    # Invalidate list cache so the next GET picks up the new entry.
    invalidate_companies_list_cache()

    return company
