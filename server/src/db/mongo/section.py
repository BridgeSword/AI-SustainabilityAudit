from typing import Optional, List, Dict

from pydantic import BaseModel, Field, EmailStr, ConfigDict

from . import MongoBase


class SectionModel(MongoBase):
    name: str = Field(...)
    initial_summary: str = Field(...)
    description: str = Field(alias="description", default=None)
    agent_output: Optional[List] = Field(alias="agentOutput", default=None)

    # this will store the data in the format: {"latest": "<section>", "previous_versions": ["<sec1>", "<sec2>", ...]}
    edits: Optional[Dict] = Field(alias="edits", default=None)

    # this will also store the data in the format: {"latest": "<edit_req>", "previous_requests": ["<req1>", "<req2>", ...]}
    ai_edit_requests: Optional[Dict] = Field(alias="aiEditRequests", default=None)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "name": "Section Name",
                "initial_summary": "Section Initial Summary"
            }
        }
    )


class UpdateSectionModel(BaseModel):
    name: Optional[str] = None
    initial_summary: Optional[str] = None
    description: Optional[str] = None
    agent_output: Optional[List] = None
    edits: Optional[Dict] = None
    ai_edit_requests: Optional[Dict] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "name": "Section Name",
                "initial_summary": "Section Initial Summary"
            }
        }
    )


class SectionCollection(MongoBase):
    sections: List[SectionModel]
