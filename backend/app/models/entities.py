from __future__ import annotations

from datetime import date, datetime, timezone
from enum import Enum
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PredictionSupport(str, Enum):
    SUPPORTED = "supported"
    HISTORICAL_ESTIMATE = "historical_estimate"


class WeatherCondition(str, Enum):
    DRY = "Dry"
    MIXED = "Mixed"
    WET = "Wet"


class ConfidenceLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class AppNotificationType(str, Enum):
    PASSWORD = "password"
    SUCCESS = "success"
    INFO = "info"


class UserRole(str, Enum):
    VIEWER = "viewer"
    ADMIN = "admin"


class AppUser(Base):
    __tablename__ = "app_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default=UserRole.VIEWER.value)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )

    sessions: Mapped[list["AppUserSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["AppNotification"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class AppUserSession(Base):
    __tablename__ = "app_user_sessions"
    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_app_user_sessions_token_hash"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_users.id"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["AppUser"] = relationship(back_populates="sessions")


class AppNotification(Base):
    __tablename__ = "app_notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("app_users.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(32), nullable=False, default=AppNotificationType.INFO.value)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["AppUser"] = relationship(back_populates="notifications")

class Season(Base):
    __tablename__ = "seasons"

    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String(32), nullable=False)
    total_races: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    champion_hint: Mapped[str | None] = mapped_column(Text, nullable=True)
    prediction_support: Mapped[str] = mapped_column(String(32), nullable=False, default=PredictionSupport.SUPPORTED.value)
    support_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    races: Mapped[list["Race"]] = relationship(back_populates="season", cascade="all, delete-orphan")


class Race(Base):
    __tablename__ = "races"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    season_year: Mapped[int] = mapped_column(ForeignKey("seasons.year"), nullable=False, index=True)
    round: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    circuit: Mapped[str] = mapped_column(String(255), nullable=False)
    country: Mapped[str] = mapped_column(String(128), nullable=False)
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    weather_forecast: Mapped[str | None] = mapped_column(String(16), nullable=True)
    spotlight: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    prediction_support: Mapped[str] = mapped_column(String(32), nullable=False, default=PredictionSupport.SUPPORTED.value)
    support_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    season: Mapped["Season"] = relationship(back_populates="races")
    race_context: Mapped["RaceContext | None"] = relationship(back_populates="race", cascade="all, delete-orphan")
    participants: Mapped[list["RaceParticipant"]] = relationship(back_populates="race", cascade="all, delete-orphan")
    predictions: Mapped[list["RacePrediction"]] = relationship(back_populates="race", cascade="all, delete-orphan")


class Constructor(Base):
    __tablename__ = "constructors"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    participants: Mapped[list["RaceParticipant"]] = relationship(back_populates="constructor")
    predictions: Mapped[list["RacePrediction"]] = relationship(back_populates="constructor")


class Driver(Base):
    __tablename__ = "drivers"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    team: Mapped[str | None] = mapped_column(String(255), nullable=True)
    number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nationality: Mapped[str | None] = mapped_column(String(128), nullable=True)
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    podiums: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    championships: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    career_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    style: Mapped[str | None] = mapped_column(Text, nullable=True)

    participants: Mapped[list["RaceParticipant"]] = relationship(back_populates="driver")
    predictions: Mapped[list["RacePrediction"]] = relationship(back_populates="driver")


class RaceContext(Base):
    __tablename__ = "race_context"

    race_id: Mapped[str] = mapped_column(ForeignKey("races.id"), primary_key=True)
    track_length_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    laps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    altitude_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    overtake_difficulty: Mapped[str | None] = mapped_column(String(32), nullable=True)
    notes_json: Mapped[list[str] | dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    race: Mapped["Race"] = relationship(back_populates="race_context")


class ModelVersion(Base):
    __tablename__ = "model_versions"
    __table_args__ = (
        UniqueConstraint("model_name", "version_label", name="uq_model_versions_name_label"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    model_name: Mapped[str] = mapped_column(String(64), nullable=False)
    version_label: Mapped[str] = mapped_column(String(64), nullable=False)
    artifact_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    feature_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_train_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    train_end_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    val_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    test_start_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    trained_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    predictions: Mapped[list["RacePrediction"]] = relationship(back_populates="model_version")


class RaceParticipant(Base):
    __tablename__ = "race_participants"
    __table_args__ = (
        UniqueConstraint("race_id", "driver_id", name="uq_race_participants_race_driver"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    race_id: Mapped[str] = mapped_column(ForeignKey("races.id"), nullable=False, index=True)
    driver_id: Mapped[str] = mapped_column(ForeignKey("drivers.id"), nullable=False, index=True)
    constructor_id: Mapped[str | None] = mapped_column(ForeignKey("constructors.id"), nullable=True)
    grid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    qualifying_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recent_form_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    race: Mapped["Race"] = relationship(back_populates="participants")
    driver: Mapped["Driver"] = relationship(back_populates="participants")
    constructor: Mapped["Constructor | None"] = relationship(back_populates="participants")


class RacerRaceContextRecord(Base):
    __tablename__ = "racer_race_context"
    __table_args__ = (
        UniqueConstraint("race_id", "driver_id", name="uq_racer_race_context_race_driver"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    race_id: Mapped[str] = mapped_column(ForeignKey("races.id"), nullable=False, index=True)
    driver_id: Mapped[str] = mapped_column(ForeignKey("drivers.id"), nullable=False, index=True)
    last_finish: Mapped[int | None] = mapped_column(Integer, nullable=True)
    avg_finish_at_circuit: Mapped[float | None] = mapped_column(Float, nullable=True)
    constructor_momentum: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)


class RacePrediction(Base):
    __tablename__ = "race_predictions"
    __table_args__ = (
        UniqueConstraint("race_id", "driver_id", "model_version_id", name="uq_race_predictions_race_driver_model"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    race_id: Mapped[str] = mapped_column(ForeignKey("races.id"), nullable=False, index=True)
    driver_id: Mapped[str] = mapped_column(ForeignKey("drivers.id"), nullable=False, index=True)
    constructor_id: Mapped[str | None] = mapped_column(ForeignKey("constructors.id"), nullable=True)
    model_version_id: Mapped[int] = mapped_column(ForeignKey("model_versions.id"), nullable=False, index=True)
    grid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    qualifying_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recent_form_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    top10_probability: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[str] = mapped_column(String(16), nullable=False, default=ConfidenceLevel.MEDIUM.value)
    prediction_support: Mapped[str] = mapped_column(String(32), nullable=False, default=PredictionSupport.SUPPORTED.value)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)

    race: Mapped["Race"] = relationship(back_populates="predictions")
    driver: Mapped["Driver"] = relationship(back_populates="predictions")
    constructor: Mapped["Constructor | None"] = relationship(back_populates="predictions")
    model_version: Mapped["ModelVersion"] = relationship(back_populates="predictions")
