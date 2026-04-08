from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import AppNotification, AppNotificationType, AppUser, AppUserSession


password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
)
SESSION_TTL_DAYS = 30


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password_hash: str, plain_password: str) -> bool:
    try:
        return password_hasher.verify(password_hash, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def get_user_by_email(db: Session, email: str) -> AppUser | None:
    normalized_email = normalize_email(email)
    return db.execute(select(AppUser).where(AppUser.email == normalized_email)).scalar_one_or_none()


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_notification(
    db: Session,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
) -> AppNotification:
    notification = AppNotification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        created_at=utc_now(),
        read_at=None,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def create_user(db: Session, email: str, password: str, display_name: str | None = None) -> AppUser:
    if get_user_by_email(db, email) is not None:
        raise ValueError("Account already exists for this email.")

    normalized_email = normalize_email(email)
    resolved_name = (display_name or normalized_email.split("@")[0]).strip() or normalized_email.split("@")[0]

    user = AppUser(
        email=normalized_email,
        display_name=resolved_name,
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> AppUser | None:
    user = get_user_by_email(db, email)
    if user is None or not user.is_active:
        return None

    if not verify_password(user.password_hash, password):
        return None

    return user


def create_user_session(db: Session, user: AppUser, token: str) -> AppUserSession:
    now = utc_now()
    session = AppUserSession(
        user_id=user.id,
        token_hash=hash_token(token),
        created_at=now,
        last_used_at=now,
        expires_at=now + timedelta(days=SESSION_TTL_DAYS),
        revoked_at=None,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def get_active_session(db: Session, token: str) -> AppUserSession | None:
    session = db.execute(
        select(AppUserSession)
        .where(AppUserSession.token_hash == hash_token(token))
        .limit(1)
    ).scalar_one_or_none()
    if session is None:
        return None

    now = utc_now()
    if session.revoked_at is not None:
        return None
    expires_at = ensure_utc(session.expires_at)
    if expires_at is not None and expires_at <= now:
        return None
    if not session.user.is_active:
        return None
    return session


def touch_session(db: Session, session: AppUserSession) -> None:
    session.last_used_at = utc_now()
    db.add(session)
    db.commit()


def revoke_session(db: Session, session: AppUserSession) -> None:
    session.revoked_at = utc_now()
    db.add(session)
    db.commit()


def list_user_notifications(db: Session, user: AppUser) -> list[AppNotification]:
    return db.execute(
        select(AppNotification)
        .where(AppNotification.user_id == user.id)
        .order_by(AppNotification.created_at.desc(), AppNotification.id.desc())
    ).scalars().all()


def mark_all_notifications_read(db: Session, user: AppUser) -> None:
    now = utc_now()
    notifications = db.execute(
        select(AppNotification).where(
            AppNotification.user_id == user.id,
            AppNotification.read_at.is_(None),
        )
    ).scalars().all()
    for notification in notifications:
        notification.read_at = now
        db.add(notification)
    db.commit()


def change_user_password(db: Session, user: AppUser, current_password: str, new_password: str) -> None:
    if not verify_password(user.password_hash, current_password):
        raise ValueError("Current password is incorrect.")

    user.password_hash = hash_password(new_password)
    db.add(user)
    db.commit()
    db.refresh(user)

    create_notification(
        db,
        user_id=user.id,
        notification_type=AppNotificationType.PASSWORD.value,
        title="Password updated",
        message="Your password was changed successfully.",
    )
