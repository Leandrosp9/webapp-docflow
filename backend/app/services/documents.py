import difflib

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import DocumentStatus, DocumentType, HistoryAction, UserRole
from app.core.errors import AppError
from app.models.entities import Document, DocumentVersion, User
from app.repositories.documents import get_tenant_document
from app.schemas.document import DocumentCreate, DocumentUpdate
from app.services.history import add_history


def ensure_reviewer(db: Session, reviewer_id: str | None, user: User) -> User | None:
    if not reviewer_id:
        return None
    reviewer = db.scalar(
        select(User).where(
            User.id == reviewer_id,
            User.company_id == user.company_id,
            User.is_active.is_(True),
        )
    )
    if not reviewer:
        raise AppError(422, "INVALID_REVIEWER", "Reviewer must belong to your company")
    return reviewer


def get_document_or_404(db: Session, document_id: str, user: User) -> Document:
    document = get_tenant_document(db, document_id, user)
    if not document:
        raise AppError(404, "DOCUMENT_NOT_FOUND", "Document not found")
    return document


def create_document(
    db: Session, payload: DocumentCreate, user: User, *, commit: bool = True
) -> Document:
    reviewer = ensure_reviewer(db, payload.assigned_reviewer_id, user)
    document = Document(
        company_id=user.company_id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        document_type=payload.document_type.value,
        status=DocumentStatus.DRAFT.value,
        current_version=1,
        created_by=user.id,
        assigned_reviewer_id=reviewer.id if reviewer else None,
    )
    db.add(document)
    db.flush()
    version = DocumentVersion(
        document_id=document.id,
        version_number=1,
        content=payload.content,
        created_by=user.id,
        change_summary=payload.change_summary,
    )
    db.add(version)
    add_history(db, document.id, user.id, HistoryAction.DOCUMENT_CREATED, "criou o documento")
    add_history(db, document.id, user.id, HistoryAction.VERSION_CREATED, "criou a versão v1.0")
    db.flush()
    if commit:
        db.commit()
    return get_document_or_404(db, document.id, user)


def can_edit(document: Document, user: User) -> bool:
    return (
        document.status in {DocumentStatus.DRAFT.value, DocumentStatus.CHANGES_REQUESTED.value}
        and (user.role == UserRole.ADMIN.value or document.created_by == user.id)
    )


def update_document(
    db: Session, document: Document, payload: DocumentUpdate, user: User
) -> Document:
    if not can_edit(document, user):
        raise AppError(409, "DOCUMENT_NOT_EDITABLE", "Document cannot be edited in its current state")
    data = payload.model_dump(exclude_unset=True)
    if "assigned_reviewer_id" in data:
        reviewer = ensure_reviewer(db, data["assigned_reviewer_id"], user)
        data["assigned_reviewer_id"] = reviewer.id if reviewer else None
    for key, value in data.items():
        setattr(document, key, value)
    db.commit()
    return get_document_or_404(db, document.id, user)


def add_text_version(
    db: Session, document: Document, user: User, content: str, change_summary: str
) -> DocumentVersion:
    if document.document_type != DocumentType.TEXT.value:
        raise AppError(422, "INVALID_DOCUMENT_TYPE", "This document requires a PDF version")
    if not can_edit(document, user):
        raise AppError(409, "VERSION_NOT_ALLOWED", "A new version is not allowed in this state")
    number = document.current_version + 1
    version = DocumentVersion(
        document_id=document.id,
        version_number=number,
        content=content,
        created_by=user.id,
        change_summary=change_summary,
    )
    document.current_version = number
    db.add(version)
    db.flush()
    add_history(db, document.id, user.id, HistoryAction.VERSION_CREATED, f"criou a versão {version.label}")
    db.commit()
    db.refresh(version)
    return version


def send_to_review(db: Session, document: Document, user: User) -> None:
    if document.status not in {
        DocumentStatus.DRAFT.value,
        DocumentStatus.CHANGES_REQUESTED.value,
    }:
        raise AppError(409, "INVALID_STATE_TRANSITION", "Document cannot be sent to review")
    if not (user.role == UserRole.ADMIN.value or document.created_by == user.id):
        raise AppError(403, "FORBIDDEN", "Only the author or an admin can submit this document")
    if not document.assigned_reviewer_id:
        raise AppError(422, "REVIEWER_REQUIRED", "Assign a reviewer before submitting")
    document.status = DocumentStatus.IN_REVIEW.value
    reviewer_name = document.reviewer.name if document.reviewer else "reviewer"
    add_history(
        db,
        document.id,
        user.id,
        HistoryAction.SENT_TO_REVIEW,
        f"enviou o documento para revisão de {reviewer_name}",
    )
    db.commit()


def review_document(
    db: Session, document: Document, user: User, decision: str, comment: str | None
) -> None:
    if document.status != DocumentStatus.IN_REVIEW.value:
        raise AppError(409, "INVALID_STATE_TRANSITION", "Only documents in review can be decided")
    if user.role != UserRole.ADMIN.value and document.assigned_reviewer_id != user.id:
        raise AppError(403, "FORBIDDEN", "Only the assigned reviewer can decide")
    normalized = decision.upper()
    if normalized == "APPROVE":
        document.status = DocumentStatus.APPROVED.value
        action = HistoryAction.APPROVED
        details = "aprovou o documento"
    elif normalized == "REQUEST_CHANGES":
        if not (comment or "").strip():
            raise AppError(422, "COMMENT_REQUIRED", "Explain the requested changes")
        document.status = DocumentStatus.CHANGES_REQUESTED.value
        action = HistoryAction.CHANGES_REQUESTED
        details = f"solicitou ajustes: {comment.strip()}"
    else:
        raise AppError(422, "INVALID_DECISION", "Decision must be APPROVE or REQUEST_CHANGES")
    add_history(db, document.id, user.id, action, details)
    db.commit()


def publish_document(db: Session, document: Document, user: User) -> None:
    if user.role != UserRole.ADMIN.value:
        raise AppError(403, "FORBIDDEN", "Only admins can publish documents")
    if document.status != DocumentStatus.APPROVED.value:
        raise AppError(409, "INVALID_STATE_TRANSITION", "Only approved documents can be published")
    document.status = DocumentStatus.PUBLISHED.value
    add_history(db, document.id, user.id, HistoryAction.PUBLISHED, "publicou o documento")
    db.commit()


def archive_document(db: Session, document: Document, user: User) -> None:
    if user.role != UserRole.ADMIN.value:
        raise AppError(403, "FORBIDDEN", "Only admins can archive documents")
    if document.status == DocumentStatus.ARCHIVED.value:
        raise AppError(409, "INVALID_STATE_TRANSITION", "Document is already archived")
    document.status = DocumentStatus.ARCHIVED.value
    add_history(db, document.id, user.id, HistoryAction.ARCHIVED, "arquivou o documento")
    db.commit()


def text_diff(old: str, new: str) -> dict:
    old_lines = (old or "").splitlines()
    new_lines = (new or "").splitlines()
    diff = list(difflib.unified_diff(old_lines, new_lines, lineterm=""))
    return {
        "diff": diff,
        "added": [line[1:] for line in diff if line.startswith("+") and not line.startswith("+++")],
        "removed": [line[1:] for line in diff if line.startswith("-") and not line.startswith("---")],
    }
