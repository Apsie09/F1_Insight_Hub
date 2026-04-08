from __future__ import annotations

import re

from pydantic import BaseModel, Field, field_validator


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class CalculatorInputPayload(BaseModel):
    season: int
    raceId: str
    racerId: str
    gridPosition: int
    weatherCondition: str


class RegisterPayload(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    displayName: str | None = Field(default=None, max_length=80)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_PATTERN.match(normalized):
            raise ValueError("Enter a valid email address.")
        return normalized

    @field_validator("displayName")
    @classmethod
    def validate_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        return normalized


class LoginPayload(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_PATTERN.match(normalized):
            raise ValueError("Enter a valid email address.")
        return normalized


class AuthUserPayload(BaseModel):
    id: int
    email: str
    displayName: str


class AuthResponsePayload(BaseModel):
    token: str
    user: AuthUserPayload
