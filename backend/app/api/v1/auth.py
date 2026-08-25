from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    verify_password,
)
from app.db.session import get_db
from app.models.entities import RefreshToken, User
from app.schemas.auth import LoginRequest, LogoutRequest, RefreshRequest, TokenResponse
from app.schemas.common import MessageResponse, UserBrief

router = APIRouter(prefix="/auth", tags=["auth"])


def issue_tokens(db: Session, user: User) -> TokenResponse:
    access, expires_in = create_access_token(user.id)
    refresh, refresh_hash, refresh_expires = create_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=refresh_expires))
    db.commit()
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        expires_in=expires_in,
        user=UserBrief.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise AppError(401, "INVALID_CREDENTIALS", "Invalid email or password")
    return issue_tokens(db, user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    token = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(payload.refresh_token))
    )
    expires_at = token.expires_at if token else None
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if not token or token.revoked_at or expires_at <= datetime.now(UTC):
        raise AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token")
    user = db.get(User, token.user_id)
    if not user or not user.is_active:
        raise AppError(401, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token")
    token.revoked_at = datetime.now(UTC)
    return issue_tokens(db, user)


@router.post("/logout", response_model=MessageResponse)
def logout(payload: LogoutRequest, db: Session = Depends(get_db)):
    token = db.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(payload.refresh_token))
    )
    if token and not token.revoked_at:
        token.revoked_at = datetime.now(UTC)
        db.commit()
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserBrief)
def me(user: User = Depends(get_current_user)):
    return UserBrief.model_validate(user)

