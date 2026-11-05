from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import func, select

from app.core.rate_limit import limiter
from app.core.security import decode_token, hash_password, verify_password
from app.deps import DB, REFRESH_COOKIE, CurrentUser
from app.models import User
from app.schemas.user import LoginIn, RegisterIn, UserOut
from app.services.auth import clear_session_cookies, find_refresh_token, revoke_all, start_session

router = APIRouter(prefix="/auth", tags=["auth"])

# A real hash, verified against when the email is unknown, so both paths take the same time.
_DUMMY_HASH = hash_password("timing-safe-dummy-password")


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, response: Response, body: RegisterIn, db: DB) -> User:
    email = body.email.lower()
    if db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists")
    user = User(name=body.name, email=email, password_hash=hash_password(body.password), locale=body.locale)
    db.add(user)
    db.commit()
    db.refresh(user)
    start_session(db, response, user)
    return user


@router.post("/login", response_model=UserOut)
@limiter.limit("10/minute")
def login(request: Request, response: Response, body: LoginIn, db: DB) -> User:
    user = db.scalar(select(User).where(func.lower(User.email) == body.email.lower()))
    valid = verify_password(body.password, user.password_hash if user and user.password_hash else _DUMMY_HASH)
    if not user or not user.password_hash or not valid or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    start_session(db, response, user)
    return user


@router.post("/refresh", response_model=UserOut)
@limiter.limit("30/minute")
def refresh(request: Request, response: Response, db: DB) -> User:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="No session")
    try:
        payload = decode_token(token, "refresh")
    except jwt.PyJWTError:
        clear_session_cookies(response)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Session expired") from None

    stored = find_refresh_token(db, payload.get("jti", ""))
    if stored is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    if stored.revoked_at is not None:
        # A rotated token was used twice: treat it as stolen and end every session.
        revoke_all(db, stored.user_id)
        clear_session_cookies(response)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Session expired")

    stored.revoked_at = datetime.now(timezone.utc)
    user = stored.user
    if not user.is_active:
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    start_session(db, response, user)  # rotation: new refresh token, old one revoked
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: DB) -> Response:
    token = request.cookies.get(REFRESH_COOKIE)
    if token:
        try:
            payload = decode_token(token, "refresh")
            stored = find_refresh_token(db, payload.get("jti", ""))
            if stored and stored.revoked_at is None:
                stored.revoked_at = datetime.now(timezone.utc)
                db.commit()
        except jwt.PyJWTError:
            pass
    clear_session_cookies(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(user: CurrentUser, response: Response, db: DB) -> Response:
    revoke_all(db, user.id)
    clear_session_cookies(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> User:
    return user
