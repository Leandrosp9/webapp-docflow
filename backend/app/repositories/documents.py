from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.core.enums import UserRole
from app.models.entities import Document, User


def document_query():
    return select(Document).options(
        joinedload(Document.author),
        joinedload(Document.reviewer),
        selectinload(Document.versions),
    )


def get_tenant_document(db: Session, document_id: str, user: User) -> Document | None:
    query = document_query().where(
        Document.id == document_id,
        Document.company_id == user.company_id,
    )
    if user.role != UserRole.ADMIN.value:
        query = query.where(
            or_(Document.created_by == user.id, Document.assigned_reviewer_id == user.id)
        )
    return db.scalar(query)


def list_tenant_documents(db: Session, user: User):
    query = document_query().where(Document.company_id == user.company_id)
    if user.role != UserRole.ADMIN.value:
        query = query.where(
            or_(Document.created_by == user.id, Document.assigned_reviewer_id == user.id)
        )
    return query

