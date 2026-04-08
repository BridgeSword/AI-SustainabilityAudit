from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..core.dependencies import get_db
from ..db.postgres.models import Company
from ..db.postgres.schemas import CompanyCreate, CompanyRead

router = APIRouter(tags=["companies"])


@router.get("/", response_model=list[CompanyRead])
def list_companies(db: Session = Depends(get_db)):
    return db.query(Company).all()


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
    return company