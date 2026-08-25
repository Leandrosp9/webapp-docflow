import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(user_id: str) -> tuple[str, int]:
    expires = datetime.now(UTC) + timedelta(minutes=settings.access_token_minutes)
    payload = {"sub": user_id, "type": "access", "exp": expires, "iat": datetime.now(UTC)}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256"), int(
        settings.access_token_minutes * 60
    )


def decode_access_token(token: str) -> str:
    payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    if payload.get("type") != "access" or not payload.get("sub"):
        raise jwt.InvalidTokenError("Invalid access token")
    return payload["sub"]


def create_refresh_token() -> tuple[str, str, datetime]:
    raw = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw.encode()).hexdigest()
    expires = datetime.now(UTC) + timedelta(days=settings.refresh_token_days)
    return raw, token_hash, expires


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

