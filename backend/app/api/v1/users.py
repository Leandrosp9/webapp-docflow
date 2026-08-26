from datetime import UTC, datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.errors import AppError
from app.core.security import hash_password
from app.db.session import get_db
from app.models.entities import (
    Comment,
    Document,
    DocumentHistory,
    DocumentVersion,
    RefreshToken,
    User,
)
from app.schemas.common import MessageResponse
from app.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


def get_tenant_user(db: Session, user_id: str, admin: User) -> User:
    user = db.scalar(
        select(User).where(User.id == user_id, User.company_id == admin.company_id)
    )
    if not user:
        raise AppError(404, "USER_NOT_FOUND", "User not found")
    return user


def ensure_unique_identity(
    db: Session,
    admin: User,
    *,
    email: str,
    cpf: str | None,
    exclude_user_id: str | None = None,
) -> None:
    email_query = select(User).where(User.email == email.lower())
    cpf_query = select(User).where(User.company_id == admin.company_id, User.cpf == cpf)
    if exclude_user_id:
        email_query = email_query.where(User.id != exclude_user_id)
        cpf_query = cpf_query.where(User.id != exclude_user_id)
    if db.scalar(email_query):
        raise AppError(409, "EMAIL_ALREADY_EXISTS", "A user with this email already exists")
    if cpf and db.scalar(cpf_query):
        raise AppError(409, "CPF_ALREADY_EXISTS", "A user with this CPF already exists")


@router.get("", response_model=list[UserRead])
def list_users(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(User).where(User.company_id == user.company_id).order_by(User.name)
    ).all()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ensure_unique_identity(db, admin, email=str(payload.email), cpf=payload.cpf)
    user = User(
        company_id=admin.company_id,
        name=payload.name,
        email=payload.email.lower(),
        cpf=payload.cpf,
        password_hash=hash_password(payload.password),
        role=payload.role.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: str,
    payload: UserUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = get_tenant_user(db, user_id, admin)
    data = payload.model_dump(exclude_unset=True)
    if user.id == admin.id and (
        data.get("is_active") is False
        or ("role" in data and data["role"].value != admin.role)
    ):
        raise AppError(409, "SELF_ADMIN_CHANGE_NOT_ALLOWED", "You cannot remove your own admin access")

    next_email = str(data.get("email", user.email)).lower()
    next_cpf = data.get("cpf", user.cpf)
    ensure_unique_identity(
        db,
        admin,
        email=next_email,
        cpf=next_cpf,
        exclude_user_id=user.id,
    )

    for field in ("name", "cpf", "is_active"):
        if field in data:
            setattr(user, field, data[field])
    if "email" in data:
        user.email = next_email
    if "role" in data:
        user.role = data["role"].value
    if data.get("password"):
        user.password_hash = hash_password(data["password"])
    if data.get("is_active") is False:
        for token in db.scalars(
            select(RefreshToken).where(
                RefreshToken.user_id == user.id,
                RefreshToken.revoked_at.is_(None),
            )
        ):
            token.revoked_at = datetime.now(UTC)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", response_model=MessageResponse)
def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = get_tenant_user(db, user_id, admin)
    if user.id == admin.id:
        raise AppError(409, "SELF_DELETE_NOT_ALLOWED", "You cannot delete your own account")

    has_history = any(
        (
            db.scalar(
                select(Document.id).where(
                    or_(Document.created_by == user.id, Document.assigned_reviewer_id == user.id)
                )
            ),
            db.scalar(select(DocumentVersion.id).where(DocumentVersion.created_by == user.id)),
            db.scalar(select(Comment.id).where(Comment.user_id == user.id)),
            db.scalar(select(DocumentHistory.id).where(DocumentHistory.user_id == user.id)),
        )
    )
    if has_history:
        raise AppError(
            409,
            "USER_HAS_DOCUMENT_HISTORY",
            "Users linked to document history must be deactivated instead",
        )

    for token in db.scalars(select(RefreshToken).where(RefreshToken.user_id == user.id)):
        db.delete(token)
    db.delete(user)
    db.commit()
    return MessageResponse(message="User deleted")
