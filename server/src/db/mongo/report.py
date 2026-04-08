from typing import Optional, List

from pydantic import Field, ConfigDict, BaseModel

from . import MongoBase, PyObjectId


class ReportModel(MongoBase):
    user_id: Optional[PyObjectId] = Field(alias="userId", default=None)
    section_ids: Optional[List[PyObjectId]] = Field(alias="sectionIds", default=None)

    report_name: str = Field(alias="reportName", default=None)
    standard: str = Field(...)
    goal: str = Field(...)
    user_plan: str = Field(...)
    action: str = Field(...)
    company: str = Field(alias="company", default=None)

    generated_report: str = Field(alias="generatedReport", default=None)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "standard": "Sample Standard",
                "goal": "Sample Goal",
                "user_plan": "Sample Initial User Plan",
                "action": "Sample Action"
            }
        }
    )


class UpdateReportModel(BaseModel):
    user_id: PyObjectId = None
    sections: List[PyObjectId] = None
    standard: str = None
    goal: str = None
    user_plan: str = None
    action: str = None
    generated_plan: str = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "standard": "Sample Standard",
                "goal": "Sample Goal",
                "user_plan": "Sample Initial User Plan",
                "action": "Sample Action"
            }
        }
    )


class ReportCollection(MongoBase):
    reports: List[ReportModel]
