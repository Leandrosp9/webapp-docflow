from fastapi import Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import InvalidTokenError
from sqlalchemy.orm import Session

from app.core.enums import UserRole
from app.core.errors import AppError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.entities import User

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise AppError(status.HTTP_401_UNAUTHORIZED, "NOT_AUTHENTICATED", "Authentication required")
    try:
        user_id = decode_access_token(credentials.credentials)
    except InvalidTokenError as exc:
        raise AppError(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN", "Invalid or expired token") from exc
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise AppError(status.HTTP_401_UNAUTHORIZED, "INVALID_TOKEN", "Invalid or expired token")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN.value:
        raise AppError(status.HTTP_403_FORBIDDEN, "FORBIDDEN", "Admin access required")
    return user

