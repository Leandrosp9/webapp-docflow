from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.core.enums import DocumentType
from app.schemas.common import UserBrief


class DocumentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=220)
    description: str = Field(default="", max_length=3000)
    category: str = Field(min_length=2, max_length=100)
    document_type: DocumentType = DocumentType.TEXT
    content: str | None = Field(default=None, max_length=200_000)
    assigned_reviewer_id: str | None = None
    change_summary: str = Field(default="Initial version", max_length=500)

    @model_validator(mode="after")
    def text_requires_content(self):
        if self.document_type == DocumentType.TEXT and not (self.content or "").strip():
            raise ValueError("Text documents require content")
        return self


class DocumentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=220)
    description: str | None = Field(default=None, max_length=3000)
    category: str | None = Field(default=None, min_length=2, max_length=100)
    assigned_reviewer_id: str | None = None


class VersionCreate(BaseModel):
    content: str = Field(min_length=1, max_length=200_000)
    change_summary: str = Field(min_length=3, max_length=500)


class VersionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    version_number: int
    label: str
    content: str | None
    original_filename: str | None
    mime_type: str | None
    file_size: int | None
    created_by: str
    change_summary: str
    created_at: datetime


class DocumentListItem(BaseModel):
    id: str
    title: str
    description: str
    category: str
    document_type: str
    status: str
    current_version: int
    version_label: str
    author: UserBrief
    reviewer: UserBrief | None
    created_at: datetime
    updated_at: datetime


class DocumentDetail(DocumentListItem):
    ai_summary: str | None
    current_content: str | None
    current_file_name: str | None
    versions: list[VersionRead]
    permissions: dict[str, bool]


class ReviewRequest(BaseModel):
    decision: str
    comment: str | None = Field(default=None, max_length=3000)


class CommentCreate(BaseModel):
    message: str = Field(min_length=1, max_length=3000)


class CommentRead(BaseModel):
    id: str
    message: str
    user: UserBrief
    created_at: datetime


class HistoryRead(BaseModel):
    id: str
    action: str
    details: str
    user: UserBrief
    created_at: datetime


class CompareRequest(BaseModel):
    from_version_id: str
    to_version_id: str
    explain_with_ai: bool = False


class AiTextRequest(BaseModel):
    version_id: str | None = None
