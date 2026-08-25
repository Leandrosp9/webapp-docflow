import re
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import StreamingResponse
from pypdf import PdfReader
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.ai.service import AIService, get_ai_service
from app.api.deps import get_current_user
from app.core.config import settings
from app.core.enums import DocumentStatus, DocumentType, HistoryAction, UserRole
from app.core.errors import AppError
from app.db.session import get_db
from app.models.entities import Comment, Document, DocumentHistory, DocumentVersion, User
from app.repositories.documents import list_tenant_documents
from app.schemas.common import MessageResponse, UserBrief
from app.schemas.document import (
    AiTextRequest,
    CommentCreate,
    CommentRead,
    CompareRequest,
    DocumentCreate,
    DocumentDetail,
    DocumentListItem,
    DocumentUpdate,
    HistoryRead,
    ReviewRequest,
    VersionCreate,
    VersionRead,
)
from app.services.documents import (
    add_text_version,
    archive_document,
    can_edit,
    create_document,
    get_document_or_404,
    publish_document,
    review_document,
    send_to_review,
    text_diff,
    update_document,
)
from app.services.history import add_history
from app.storage.base import FileStorage
from app.storage.service import get_storage

router = APIRouter(prefix="/documents", tags=["documents"])
ai_router = APIRouter(prefix="/ai", tags=["ai"])


def safe_pdf_name(filename: str | None) -> str:
    basename = Path(filename or "document.pdf").name
    cleaned = re.sub(r"[^A-Za-z0-9._ -]", "_", basename).strip(". ")[:200]
    return cleaned if cleaned.lower().endswith(".pdf") else "document.pdf"


def version_schema(version: DocumentVersion) -> VersionRead:
    return VersionRead(
        id=version.id,
        version_number=version.version_number,
        label=version.label,
        content=version.content,
        original_filename=version.original_filename,
        mime_type=version.mime_type,
        file_size=version.file_size,
        created_by=version.created_by,
        change_summary=version.change_summary,
        created_at=version.created_at,
    )


def list_item(document: Document) -> DocumentListItem:
    current = next(
        (item for item in document.versions if item.version_number == document.current_version), None
    )
    return DocumentListItem(
        id=document.id,
        title=document.title,
        description=document.description,
        category=document.category,
        document_type=document.document_type,
        status=document.status,
        current_version=document.current_version,
        version_label=current.label if current else "v1.0",
        author=UserBrief.model_validate(document.author),
        reviewer=UserBrief.model_validate(document.reviewer) if document.reviewer else None,
        created_at=document.created_at,
        updated_at=document.updated_at,
    )


def detail_item(document: Document, user: User) -> DocumentDetail:
    item = list_item(document).model_dump()
    current = next(
        (version for version in document.versions if version.version_number == document.current_version),
        None,
    )
    is_admin = user.role == UserRole.ADMIN.value
    is_reviewer = document.assigned_reviewer_id == user.id
    permissions = {
        "edit": can_edit(document, user),
        "submit": document.status
        in {DocumentStatus.DRAFT.value, DocumentStatus.CHANGES_REQUESTED.value}
        and (is_admin or document.created_by == user.id)
        and bool(document.assigned_reviewer_id),
        "review": document.status == DocumentStatus.IN_REVIEW.value and (is_admin or is_reviewer),
        "publish": document.status == DocumentStatus.APPROVED.value and is_admin,
        "archive": document.status != DocumentStatus.ARCHIVED.value and is_admin,
        "comment": document.status == DocumentStatus.IN_REVIEW.value,
    }
    return DocumentDetail(
        **item,
        ai_summary=document.ai_summary,
        current_content=current.content if current else None,
        current_file_name=current.original_filename if current else None,
        versions=[version_schema(version) for version in reversed(document.versions)],
        permissions=permissions,
    )


def validate_pdf(data: bytes, content_type: str | None) -> None:
    if content_type != "application/pdf":
        raise AppError(422, "INVALID_FILE_TYPE", "Only application/pdf files are accepted")
    if len(data) > settings.max_upload_mb * 1024 * 1024:
        raise AppError(413, "FILE_TOO_LARGE", f"PDF must be at most {settings.max_upload_mb} MB")
    if not data.startswith(b"%PDF-"):
        raise AppError(422, "INVALID_PDF", "The uploaded file is not a valid PDF")


def save_pdf_version(
    db: Session,
    document: Document,
    user: User,
    data: bytes,
    filename: str,
    change_summary: str,
    storage: FileStorage,
) -> DocumentVersion:
    if not can_edit(document, user):
        raise AppError(409, "VERSION_NOT_ALLOWED", "A new version is not allowed in this state")
    number = document.current_version + 1
    path = storage.save(BytesIO(data), filename)
    version = DocumentVersion(
        document_id=document.id,
        version_number=number,
        file_path=path,
        original_filename=filename,
        mime_type="application/pdf",
        file_size=len(data),
        created_by=user.id,
        change_summary=change_summary,
    )
    document.current_version = number
    db.add(version)
    db.flush()
    add_history(db, document.id, user.id, HistoryAction.VERSION_CREATED, f"published version {version.label}")
    db.commit()
    db.refresh(version)
    return version


def content_for_ai(version: DocumentVersion, storage: FileStorage) -> str:
    if version.content:
        return version.content
    if not version.file_path:
        raise AppError(422, "CONTENT_UNAVAILABLE", "This version has no content")
    try:
        with storage.open(version.file_path) as stream:
            reader = PdfReader(stream)
            content = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as exc:
        raise AppError(422, "PDF_TEXT_UNAVAILABLE", "Text could not be extracted from this PDF") from exc
    if not content.strip():
        raise AppError(422, "PDF_TEXT_UNAVAILABLE", "This PDF does not contain extractable text")
    return content[:200_000]


@router.get("", response_model=dict)
def list_documents(
    status_filter: str | None = Query(default=None, alias="status"),
    category: str | None = None,
    author_id: str | None = None,
    search: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = list_tenant_documents(db, user)
    if status_filter:
        query = query.where(Document.status == status_filter)
    if category:
        query = query.where(Document.category == category)
    if author_id:
        query = query.where(Document.created_by == author_id)
    if search:
        query = query.where(Document.title.ilike(f"%{search.strip()}%"))
    items = db.scalars(
        query.order_by(Document.updated_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).unique().all()
    count_query = select(func.count()).select_from(Document).where(Document.company_id == user.company_id)
    if user.role != UserRole.ADMIN.value:
        count_query = count_query.where(
            or_(Document.created_by == user.id, Document.assigned_reviewer_id == user.id)
        )
    if status_filter:
        count_query = count_query.where(Document.status == status_filter)
    if category:
        count_query = count_query.where(Document.category == category)
    if author_id:
        count_query = count_query.where(Document.created_by == author_id)
    if search:
        count_query = count_query.where(Document.title.ilike(f"%{search.strip()}%"))
    return {
        "items": [list_item(item).model_dump() for item in items],
        "total": db.scalar(count_query) or 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/dashboard", response_model=dict)
def dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    documents = db.scalars(
        list_tenant_documents(db, user).order_by(Document.updated_at.desc())
    ).unique().all()
    counts = {value.value: 0 for value in DocumentStatus}
    for document in documents:
        counts[document.status] += 1
    pending = [
        list_item(item).model_dump()
        for item in documents
        if item.status == DocumentStatus.IN_REVIEW.value and item.assigned_reviewer_id == user.id
    ][:5]
    history_query = (
        select(DocumentHistory)
        .join(Document)
        .options(joinedload(DocumentHistory.user), joinedload(DocumentHistory.document))
        .where(Document.company_id == user.company_id)
        .order_by(DocumentHistory.created_at.desc())
        .limit(8)
    )
    activities = db.scalars(history_query).unique().all()
    return {
        "metrics": {
            "total": len(documents),
            "in_review": counts[DocumentStatus.IN_REVIEW.value],
            "changes_requested": counts[DocumentStatus.CHANGES_REQUESTED.value],
            "approved": counts[DocumentStatus.APPROVED.value],
        },
        "by_status": counts,
        "recent_documents": [list_item(item).model_dump() for item in documents[:5]],
        "pending_reviews": pending,
        "recent_activity": [
            {
                "id": item.id,
                "document_id": item.document_id,
                "document_title": item.document.title,
                "action": item.action,
                "details": item.details,
                "user_name": item.user.name,
                "created_at": item.created_at,
            }
            for item in activities
        ],
    }


@router.post("", response_model=DocumentDetail, status_code=status.HTTP_201_CREATED)
def create_text_document(
    payload: DocumentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.document_type != DocumentType.TEXT:
        raise AppError(422, "USE_UPLOAD_ENDPOINT", "Use the PDF upload endpoint")
    return detail_item(create_document(db, payload, user), user)


@router.post("/upload", response_model=DocumentDetail, status_code=status.HTTP_201_CREATED)
async def create_pdf_document(
    title: str = Form(min_length=3, max_length=220),
    description: str = Form(default="", max_length=3000),
    category: str = Form(min_length=2, max_length=100),
    assigned_reviewer_id: str | None = Form(default=None),
    change_summary: str = Form(default="Initial version", max_length=500),
    file: UploadFile = File(),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
):
    data = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    validate_pdf(data, file.content_type)
    payload = DocumentCreate(
        title=title,
        description=description,
        category=category,
        document_type=DocumentType.PDF,
        content=None,
        assigned_reviewer_id=assigned_reviewer_id or None,
        change_summary=change_summary,
    )
    document = create_document(db, payload, user)
    current = document.versions[0]
    filename = safe_pdf_name(file.filename)
    current.file_path = storage.save(BytesIO(data), filename)
    current.original_filename = filename
    current.mime_type = "application/pdf"
    current.file_size = len(data)
    db.commit()
    return detail_item(get_document_or_404(db, document.id, user), user)


@router.get("/{document_id}", response_model=DocumentDetail)
def get_document(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return detail_item(get_document_or_404(db, document_id, user), user)


@router.patch("/{document_id}", response_model=DocumentDetail)
def edit_document(
    document_id: str,
    payload: DocumentUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(db, document_id, user)
    return detail_item(update_document(db, document, payload, user), user)


@router.post("/{document_id}/versions", response_model=VersionRead, status_code=201)
def create_version(
    document_id: str,
    payload: VersionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(db, document_id, user)
    return version_schema(add_text_version(db, document, user, payload.content, payload.change_summary))


@router.post("/{document_id}/versions/upload", response_model=VersionRead, status_code=201)
async def create_pdf_version(
    document_id: str,
    change_summary: str = Form(min_length=3, max_length=500),
    file: UploadFile = File(),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
):
    document = get_document_or_404(db, document_id, user)
    if document.document_type != DocumentType.PDF.value:
        raise AppError(422, "INVALID_DOCUMENT_TYPE", "This document requires a text version")
    data = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    validate_pdf(data, file.content_type)
    version = save_pdf_version(
        db, document, user, data, safe_pdf_name(file.filename), change_summary, storage
    )
    return version_schema(version)


@router.get("/{document_id}/versions/{version_id}/file")
def download_version(
    document_id: str,
    version_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
):
    document = get_document_or_404(db, document_id, user)
    version = next((item for item in document.versions if item.id == version_id), None)
    if not version or not version.file_path:
        raise AppError(404, "FILE_NOT_FOUND", "File not found")
    try:
        stream = storage.open(version.file_path)
    except FileNotFoundError as exc:
        raise AppError(404, "FILE_NOT_FOUND", "File not found") from exc
    headers = {"Content-Disposition": f'inline; filename="{version.original_filename or "document.pdf"}"'}
    return StreamingResponse(stream, media_type="application/pdf", headers=headers)


@router.post("/{document_id}/submit", response_model=MessageResponse)
def submit_document(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    send_to_review(db, get_document_or_404(db, document_id, user), user)
    return MessageResponse(message="Document sent to review")


@router.post("/{document_id}/review", response_model=MessageResponse)
def decide_document(
    document_id: str,
    payload: ReviewRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review_document(db, get_document_or_404(db, document_id, user), user, payload.decision, payload.comment)
    return MessageResponse(message="Review decision recorded")


@router.post("/{document_id}/publish", response_model=MessageResponse)
def publish(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    publish_document(db, get_document_or_404(db, document_id, user), user)
    return MessageResponse(message="Document published")


@router.post("/{document_id}/archive", response_model=MessageResponse)
def archive(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    archive_document(db, get_document_or_404(db, document_id, user), user)
    return MessageResponse(message="Document archived")


@router.get("/{document_id}/comments", response_model=list[CommentRead])
def list_comments(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(db, document_id, user)
    comments = db.scalars(
        select(Comment)
        .options(joinedload(Comment.user))
        .where(Comment.document_id == document.id)
        .order_by(Comment.created_at)
    ).all()
    return [
        CommentRead(
            id=item.id,
            message=item.message,
            user=UserBrief.model_validate(item.user),
            created_at=item.created_at,
        )
        for item in comments
    ]


@router.post("/{document_id}/comments", response_model=CommentRead, status_code=201)
def add_comment(
    document_id: str,
    payload: CommentCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(db, document_id, user)
    if document.status != DocumentStatus.IN_REVIEW.value:
        raise AppError(409, "COMMENTS_CLOSED", "Comments are available during review")
    comment = Comment(document_id=document.id, user_id=user.id, message=payload.message.strip())
    db.add(comment)
    db.flush()
    add_history(db, document.id, user.id, HistoryAction.COMMENT_ADDED, "added a review comment")
    db.commit()
    db.refresh(comment)
    return CommentRead(
        id=comment.id,
        message=comment.message,
        user=UserBrief.model_validate(user),
        created_at=comment.created_at,
    )


@router.get("/{document_id}/history", response_model=list[HistoryRead])
def list_history(
    document_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    document = get_document_or_404(db, document_id, user)
    history = db.scalars(
        select(DocumentHistory)
        .options(joinedload(DocumentHistory.user))
        .where(DocumentHistory.document_id == document.id)
        .order_by(DocumentHistory.created_at.desc())
    ).all()
    return [
        HistoryRead(
            id=item.id,
            action=item.action,
            details=item.details,
            user=UserBrief.model_validate(item.user),
            created_at=item.created_at,
        )
        for item in history
    ]


@router.post("/{document_id}/compare", response_model=dict)
def compare_versions(
    document_id: str,
    payload: CompareRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
    ai: AIService = Depends(get_ai_service),
):
    document = get_document_or_404(db, document_id, user)
    old = next((item for item in document.versions if item.id == payload.from_version_id), None)
    new = next((item for item in document.versions if item.id == payload.to_version_id), None)
    if not old or not new:
        raise AppError(404, "VERSION_NOT_FOUND", "Version not found")
    old_content = content_for_ai(old, storage)
    new_content = content_for_ai(new, storage)
    diff = text_diff(old_content, new_content)
    explanation = (
        ai.compare(document.title, old_content, new_content, diff["diff"])
        if payload.explain_with_ai
        else None
    )
    return {
        "from": version_schema(old).model_dump(),
        "to": version_schema(new).model_dump(),
        "from_content": old_content,
        "to_content": new_content,
        **diff,
        "ai_explanation": explanation,
    }


def selected_version(document: Document, version_id: str | None) -> DocumentVersion:
    if version_id:
        version = next((item for item in document.versions if item.id == version_id), None)
    else:
        version = next(
            (item for item in document.versions if item.version_number == document.current_version), None
        )
    if not version:
        raise AppError(404, "VERSION_NOT_FOUND", "Version not found")
    return version


@ai_router.post("/documents/{document_id}/review", response_model=dict)
def ai_review(
    document_id: str,
    payload: AiTextRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
    ai: AIService = Depends(get_ai_service),
):
    document = get_document_or_404(db, document_id, user)
    version = selected_version(document, payload.version_id)
    result = ai.review(document.title, content_for_ai(version, storage))
    return {"result": result, "version": version.label}


@ai_router.post("/documents/{document_id}/summary", response_model=dict)
def ai_summary(
    document_id: str,
    payload: AiTextRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: FileStorage = Depends(get_storage),
    ai: AIService = Depends(get_ai_service),
):
    document = get_document_or_404(db, document_id, user)
    version = selected_version(document, payload.version_id)
    result = ai.summarize(document.title, content_for_ai(version, storage))
    document.ai_summary = result
    db.commit()
    return {"result": result, "version": version.label}
