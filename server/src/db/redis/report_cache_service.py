"""
Report cache service with optional Redis caching.
Falls back to direct PostgreSQL queries if Redis is not available.
"""
from typing import List, Optional
from sqlalchemy.orm import Session

from ..postgres.models import Company, Report


def list_all_companies(db: Session) -> List[Company]:
    """List all companies from database."""
    return db.query(Company).all()


def list_all_reports(db: Session) -> List[Report]:
    """List all reports from database."""
    return db.query(Report).all()


def invalidate_companies_list_cache() -> None:
    """Invalidate companies list cache. No-op without Redis."""
    pass


def invalidate_company_profile_cache(company_id: Optional[int] = None) -> None:
    """Invalidate company profile cache. No-op without Redis."""
    pass


def invalidate_reports_list_cache() -> None:
    """Invalidate reports list cache. No-op without Redis."""
    pass
