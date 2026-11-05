import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

password_hasher = PasswordHash.recommended()  # Argon2id

TokenType = Literal["access", "refresh"]


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def create_token(user_id: int, token_type: TokenType, jti: str | None = None) -> tuple[str, datetime]:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    lifetime = (
        timedelta(minutes=settings.access_token_minutes)
        if token_type == "access"
        else timedelta(days=settings.refresh_token_days)
    )
    expires = now + lifetime
    payload = {"sub": str(user_id), "type": token_type, "iat": now, "exp": expires}
    if jti:
        payload["jti"] = jti
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires


def decode_token(token: str, expected_type: TokenType) -> dict:
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Wrong token type")
    return payload


def new_token_id() -> str:
    return secrets.token_urlsafe(32)


def hash_token_id(jti: str) -> str:
    """Refresh token ids are stored hashed, so a database leak cannot be replayed."""
    return hashlib.sha256(jti.encode()).hexdigest()
