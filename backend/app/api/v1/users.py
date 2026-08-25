from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.errors import AppError
from app.core.security import hash_password
from app.db.session import get_db
from app.models.entities import User
from app.schemas.user import UserCreate, UserRead

router = APIRouter(prefix="/users", tags=["users"])


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
    existing = db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise AppError(409, "EMAIL_ALREADY_EXISTS", "A user with this email already exists")
    user = User(
        company_id=admin.company_id,
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=payload.role.value,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
