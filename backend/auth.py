from __future__ import annotations

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from sqlalchemy import select
from sqlalchemy.orm import Session

from models import AppUser


password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
)


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
