from typing import Optional, List

from pydantic import BaseModel, Field, EmailStr, ConfigDict

from . import MongoBase


class UserModel(MongoBase):
    username: Optional[str] = Field(default=None)
    email: EmailStr = Field(...)
    password: str = Field(...)
    company: str = Field(...)
    created_at: Optional[str] = Field(alias="createdAt", default=None)

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "username": "John Doe",
                "email": "jdoe@example.com",
                "password": "password",
                "company": "company name"
            }
        }
    )


class UpdateUserModel(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_schema_extra={
            "example": {
                "username": "John Doe",
                "email": "jdoe@example.com",
                "password": "password"
            }
        }
    )


class UserCollection(MongoBase):
    users: List[UserModel]
