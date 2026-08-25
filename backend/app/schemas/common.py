from pydantic import BaseModel, ConfigDict, EmailStr


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: EmailStr
    role: str


class MessageResponse(BaseModel):
    message: str


class Paginated(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
