from __future__ import annotations

from secrets import token_urlsafe
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies.auth_dependencies import extract_bearer_token, get_current_user
from app.domain.auth_service import (
    authenticate_user,
    change_user_password,
    create_user,
    create_user_session,
    get_active_session,
    list_user_notifications,
    mark_all_notifications_read,
    revoke_session,
)
from app.models.database import get_db_session
from app.models.entities import AppUser
from app.views.schemas import (
    AuthResponsePayload,
    AuthUserPayload,
    ChangePasswordPayload,
    LoginPayload,
    LogoutResponsePayload,
    NotificationsResponsePayload,
    RegisterPayload,
    SuccessResponsePayload,
)
from app.views.serializers import serialize_auth_notification, serialize_auth_user


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponsePayload, status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterPayload, db: Session = Depends(get_db_session)) -> dict[str, Any]:
    try:
        user = create_user(
            db,
            email=payload.email,
            password=payload.password,
            display_name=payload.displayName,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error

    token = token_urlsafe(32)
    create_user_session(db, user, token)
    return {
        "token": token,
        "user": serialize_auth_user(user),
    }


@router.post("/login", response_model=AuthResponsePayload)
def login_user(payload: LoginPayload, db: Session = Depends(get_db_session)) -> dict[str, Any]:
    user = authenticate_user(db, email=payload.email, password=payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    token = token_urlsafe(32)
    create_user_session(db, user, token)
    return {
        "token": token,
        "user": serialize_auth_user(user),
    }


@router.get("/me", response_model=AuthUserPayload)
def get_authenticated_user(current_user: AppUser = Depends(get_current_user)) -> dict[str, Any]:
    return serialize_auth_user(current_user)


@router.post("/logout", response_model=LogoutResponsePayload)
def logout_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db_session),
) -> dict[str, bool]:
    token = extract_bearer_token(authorization)
    session = get_active_session(db, token)
    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired or invalid.")
    revoke_session(db, session)
    return {"success": True}


@router.get("/notifications", response_model=NotificationsResponsePayload)
def get_auth_notifications(
    current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> dict[str, Any]:
    notifications = list_user_notifications(db, current_user)
    return {"notifications": [serialize_auth_notification(notification) for notification in notifications]}


@router.post("/notifications/read-all", response_model=SuccessResponsePayload)
def read_all_auth_notifications(
    current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> dict[str, bool]:
    mark_all_notifications_read(db, current_user)
    return {"success": True}


@router.post("/password/reset", response_model=SuccessResponsePayload)
def reset_authenticated_user_password(
    payload: ChangePasswordPayload,
    current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> dict[str, bool]:
    try:
        change_user_password(db, current_user, payload.currentPassword, payload.newPassword)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    return {"success": True}
