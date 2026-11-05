from datetime import datetime, timezone

from fastapi import Response
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_token, hash_token_id, new_token_id
from app.deps import ACCESS_COOKIE, REFRESH_COOKIE
from app.models import RefreshToken, User

REFRESH_PATH = "/api/v1/auth"
# Readable by JavaScript and holds no secret: it only tells the front-end a session exists,
# so logged-out visitors never trigger pointless 401 requests.
SESSION_HINT_COOKIE = "cravio_logged_in"


def start_session(db: Session, response: Response, user: User) -> None:
    """Issue an access token and a server-tracked refresh token as httpOnly cookies."""
    settings = get_settings()
    access, access_exp = create_token(user.id, "access")
    jti = new_token_id()
    refresh, refresh_exp = create_token(user.id, "refresh", jti=jti)
    db.add(RefreshToken(user_id=user.id, token_hash=hash_token_id(jti), expires_at=refresh_exp))
    db.commit()

    cookie = {"httponly": True, "secure": settings.is_production, "samesite": "lax"}
    response.set_cookie(ACCESS_COOKIE, access, expires=access_exp, path="/", **cookie)
    response.set_cookie(REFRESH_COOKIE, refresh, expires=refresh_exp, path=REFRESH_PATH, **cookie)
    response.set_cookie(
        SESSION_HINT_COOKIE,
        "1",
        expires=refresh_exp,
        path="/",
        httponly=False,
        secure=settings.is_production,
        samesite="lax",
    )


def clear_session_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH)
    response.delete_cookie(SESSION_HINT_COOKIE, path="/")


def revoke_all(db: Session, user_id: int) -> None:
    db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )
    db.commit()


def find_refresh_token(db: Session, jti: str) -> RefreshToken | None:
    return db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token_id(jti)))
