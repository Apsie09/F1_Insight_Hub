from __future__ import annotations

from typing import Any

from app.models.entities import AppNotification, AppUser


def serialize_auth_user(user: AppUser) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "displayName": user.display_name,
    }


def serialize_auth_notification(notification: AppNotification) -> dict[str, Any]:
    return {
        "id": notification.id,
        "type": notification.type,
        "title": notification.title,
        "message": notification.message,
        "createdAt": notification.created_at.isoformat(),
        "readAt": notification.read_at.isoformat() if notification.read_at is not None else None,
    }
