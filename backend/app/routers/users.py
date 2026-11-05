from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from sqlalchemy import func, select

from app.core.rate_limit import limiter
from app.core.security import hash_password, verify_password
from app.deps import DB, AdminUser, CurrentUser
from app.models import User
from app.schemas.user import AdminUserOut, AdminUserUpdate, Page, PasswordChange, UserOut, UserUpdate
from app.services.auth import clear_session_cookies, revoke_all, start_session

router = APIRouter(tags=["users"])


@router.patch("/users/me", response_model=UserOut)
def update_me(body: UserUpdate, user: CurrentUser, db: DB) -> User:
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value.strip() if isinstance(value, str) and field == "name" else value)
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/me/password", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
def change_password(request: Request, body: PasswordChange, user: CurrentUser, db: DB, response: Response) -> Response:
    """Checks the current password, then signs out every other device and opens a fresh session here."""
    if not user.password_hash or not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    revoke_all(db, user.id)
    start_session(db, response, user)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.delete("/users/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_me(user: CurrentUser, db: DB, response: Response) -> Response:
    db.delete(user)
    db.commit()
    clear_session_cookies(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


# --- Admin -----------------------------------------------------------------


@router.get("/admin/users", response_model=Page[AdminUserOut], tags=["admin"])
def list_users(
    _: AdminUser,
    db: DB,
    q: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> dict:
    query = select(User)
    if q:
        term = f"%{q.lower()}%"
        query = query.where(func.lower(User.email).like(term) | func.lower(User.name).like(term))
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.patch("/admin/users/{user_id}", response_model=AdminUserOut, tags=["admin"])
def update_user(user_id: int, body: AdminUserUpdate, admin: AdminUser, db: DB) -> User:
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="You cannot change your own role or status")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(target, field, value)
    db.commit()
    db.refresh(target)
    return target


@router.delete("/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["admin"])
def delete_user(user_id: int, admin: AdminUser, db: DB) -> Response:
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="You cannot delete your own account here")
    db.delete(target)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
