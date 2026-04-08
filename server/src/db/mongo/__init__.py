from typing import Annotated, Optional

from pydantic import BeforeValidator, Field, BaseModel


PyObjectId = Annotated[str, BeforeValidator(str)]

class MongoBase(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)

# NOW_FACTORY = datetime.now


# class DateTimeModelMixin(BaseModel):
#     created_at: Optional[datetime] = Field(..., alias="createdAt", default_factory=NOW_FACTORY)
#     updated_at: Optional[datetime] = Field(..., alias="updatedAt", default_factory=NOW_FACTORY)


# class DBModelMixin(DateTimeModelMixin):
#     id: Optional[PyObjectId] = Field(alias="_id", default=None)
