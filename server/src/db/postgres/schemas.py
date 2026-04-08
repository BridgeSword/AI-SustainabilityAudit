from typing import Optional, Any

from pydantic import BaseModel, ConfigDict


class CompanyCreate(BaseModel):
    name: str
    sector: Optional[str] = None
    country: Optional[str] = None


class CompanyRead(BaseModel):
    id: int
    name: str
    sector: Optional[str] = None
    country: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReportCreate(BaseModel):
    user_id: Optional[int] = None
    company_id: Optional[int] = None
    year: int
    extracted_json: dict[str, Any]
    extraction_status: Optional[str] = "pending"
    scoring_status: Optional[str] = "pending"
    anomaly_status: Optional[str] = "pending"


class ReportRead(BaseModel):
    id: int
    user_id: Optional[int] = None
    company_id: Optional[int] = None
    year: int
    extracted_json: dict[str, Any]
    extraction_status: Optional[str] = None
    scoring_status: Optional[str] = None
    anomaly_status: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)