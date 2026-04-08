from typing import Optional, List, Dict
from dataclasses import dataclass, field

from pydantic import BaseModel, Field, field_validator, EmailStr
from sympy import O


class CarbonReportPlanRequest(BaseModel):
    standard: str
    goal: str
    plan: str
    action: str
    company: str
    genai_model: str
    device: str = Field(default="cpu", validate_default=True)

    @field_validator('device', mode='before')
    @classmethod
    def ensure_device(cls, device: Optional[str]) -> str:
        return device or "cpu"
    

@dataclass
class CRPlanRequest:
    user_id: str = field(default=None)
    report_name: str = field(default=None)
    standard: str = field(default=None)
    goal: str = field(default=None)
    plan: str = field(default=None)
    action: str = field(default=None)
    company: str = field(default=None)
    genai_model: str = field(default="openai-gpt-4o")
    device: str = field(default="cpu")


@dataclass
class CRPlanResponse:
    task_status: str = field(default_factory=str)
    error: str = field(default=None)
    response: Dict = field(default=None)

    def json(self):
        return {
            "task_status": self.task_status,
            "error": self.error,
            "response": self.response
        }


class CarbonReportPlanResponse(BaseModel):
    task_status: str = Field(default=None)
    task_id: str = Field(default=None)
    error: str = Field(default=None)


class CarbonReportGenRequest(BaseModel):
    user_approved: bool


class CarbonReportGenResponse(BaseModel):
    report_path: str = Field(default=None)
    report_status: str = Field(default=None)


class ManualEditsRequest(BaseModel):
    section_id: str
    user_edit: str


class GenericResponse(BaseModel):
    response: str
    status: str


class AIEditsRequest(BaseModel):
    report_id: str
    section_id: str
    user_request: str
    genai_model: str = Field(default=None)
    device: str = Field(default=None)


class AIEditsResponse(BaseModel):
    section_id: str
    modified_content: str


class ComputeDocumentEmbeddingsRequest(BaseModel):
    docs_path: str
    embedding_model: str = Field(default=None)
    device: str = Field(default="cpu", validate_default=True)
    chunk_size: int = Field(default=256, validate_default=True)

    @field_validator('chunk_size', mode='before')
    @classmethod
    def ensure_id(cls, chunk_size: Optional[int]) -> int:
        return chunk_size or 256
    
    @field_validator('device', mode='before')
    @classmethod
    def ensure_device(cls, device: Optional[str]) -> str:
        return device or "cpu"
    

class GetEmbeddingRequest(BaseModel):
    texts: List[str]
    model: str
    device: str = Field(default="cpu", validate_default=True)

    @field_validator('device', mode='before')
    @classmethod
    def ensure_device(cls, device: Optional[str]) -> str:
        return device or "cpu"


class SearchEmbRequest(BaseModel):
    query: str
    model: str
    k: int = Field(default=3, validate_default=True)
    device: str = Field(default="cpu", validate_default=True)

    @field_validator('k', mode='before')
    @classmethod
    def ensure_k(cls, device: Optional[int]) -> int:
        return device or 3
    
    @field_validator('device', mode='before')
    @classmethod
    def ensure_device(cls, device: Optional[str]) -> str:
        return device or "cpu"


class UserLoginRequest(BaseModel):
    user_email: EmailStr
    password: str


class UserSignUpRequest(BaseModel):
    user_email: EmailStr
    password: str
    company_name: str



class UserChangePwdRequest(BaseModel):
    user_email: EmailStr
    old_password: str
    new_password: str


class UserDeleteAccountRequest(BaseModel):
    user_email: EmailStr
    password: str


class UserOperationResponse(BaseModel):
    success: bool = Field(default=None)
    user_id: str = Field(default=None)
    company: Optional[str] = Field(default=None)
    message: str = Field(default=None)
    history_list: Optional[List[Dict[str, str]]] = None

class HistoryRequest(BaseModel):
    report_title: str = Field(default=None)
    created_at: str = Field(default=None)

class HistoryResponse(BaseModel):
    success: bool = Field(default=None)
    report: str = Field(default=None)


class DownloadsRequest(BaseModel):
    report_id: str = Field(default=None)
