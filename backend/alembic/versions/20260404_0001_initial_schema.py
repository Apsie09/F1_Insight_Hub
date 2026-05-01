"""Initial serving schema

Revision ID: 20260404_0001
Revises:
Create Date: 2026-04-04 17:15:00

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260404_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "constructors",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "drivers",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("team", sa.String(length=255), nullable=True),
        sa.Column("number", sa.Integer(), nullable=True),
        sa.Column("nationality", sa.String(length=128), nullable=True),
        sa.Column("wins", sa.Integer(), nullable=False),
        sa.Column("podiums", sa.Integer(), nullable=False),
        sa.Column("championships", sa.Integer(), nullable=False),
        sa.Column("career_points", sa.Integer(), nullable=False),
        sa.Column("style", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "model_versions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("model_name", sa.String(length=64), nullable=False),
        sa.Column("version_label", sa.String(length=64), nullable=False),
        sa.Column("artifact_path", sa.Text(), nullable=True),
        sa.Column("metadata_path", sa.Text(), nullable=True),
        sa.Column("feature_count", sa.Integer(), nullable=True),
        sa.Column("min_train_year", sa.Integer(), nullable=True),
        sa.Column("train_end_year", sa.Integer(), nullable=True),
        sa.Column("val_year", sa.Integer(), nullable=True),
        sa.Column("test_start_year", sa.Integer(), nullable=True),
        sa.Column("trained_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("model_name", "version_label", name="uq_model_versions_name_label"),
    )

    op.create_table(
        "seasons",
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=32), nullable=False),
        sa.Column("total_races", sa.Integer(), nullable=False),
        sa.Column("champion_hint", sa.Text(), nullable=True),
        sa.Column("prediction_support", sa.String(length=32), nullable=False),
        sa.Column("support_message", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("year"),
    )

    op.create_table(
        "races",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("season_year", sa.Integer(), nullable=False),
        sa.Column("round", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("circuit", sa.String(length=255), nullable=False),
        sa.Column("country", sa.String(length=128), nullable=False),
        sa.Column("date", sa.Date(), nullable=True),
        sa.Column("weather_forecast", sa.String(length=16), nullable=True),
        sa.Column("spotlight", sa.Boolean(), nullable=False),
        sa.Column("prediction_support", sa.String(length=32), nullable=False),
        sa.Column("support_message", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["season_year"], ["seasons.year"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_races_season_year"), "races", ["season_year"], unique=False)

    op.create_table(
        "race_context",
        sa.Column("race_id", sa.String(length=32), nullable=False),
        sa.Column("track_length_km", sa.Float(), nullable=True),
        sa.Column("laps", sa.Integer(), nullable=True),
        sa.Column("altitude_m", sa.Integer(), nullable=True),
        sa.Column("overtake_difficulty", sa.String(length=32), nullable=True),
        sa.Column("notes_json", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"]),
        sa.PrimaryKeyConstraint("race_id"),
    )

    op.create_table(
        "race_participants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("race_id", sa.String(length=32), nullable=False),
        sa.Column("driver_id", sa.String(length=32), nullable=False),
        sa.Column("constructor_id", sa.String(length=32), nullable=True),
        sa.Column("grid", sa.Integer(), nullable=True),
        sa.Column("qualifying_position", sa.Integer(), nullable=True),
        sa.Column("recent_form_score", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["constructor_id"], ["constructors.id"]),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"]),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("race_id", "driver_id", name="uq_race_participants_race_driver"),
    )
    op.create_index(op.f("ix_race_participants_driver_id"), "race_participants", ["driver_id"], unique=False)
    op.create_index(op.f("ix_race_participants_race_id"), "race_participants", ["race_id"], unique=False)

    op.create_table(
        "racer_race_context",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("race_id", sa.String(length=32), nullable=False),
        sa.Column("driver_id", sa.String(length=32), nullable=False),
        sa.Column("last_finish", sa.Integer(), nullable=True),
        sa.Column("avg_finish_at_circuit", sa.Float(), nullable=True),
        sa.Column("constructor_momentum", sa.Integer(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"]),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("race_id", "driver_id", name="uq_racer_race_context_race_driver"),
    )
    op.create_index(op.f("ix_racer_race_context_driver_id"), "racer_race_context", ["driver_id"], unique=False)
    op.create_index(op.f("ix_racer_race_context_race_id"), "racer_race_context", ["race_id"], unique=False)

    op.create_table(
        "race_predictions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("race_id", sa.String(length=32), nullable=False),
        sa.Column("driver_id", sa.String(length=32), nullable=False),
        sa.Column("constructor_id", sa.String(length=32), nullable=True),
        sa.Column("model_version_id", sa.Integer(), nullable=False),
        sa.Column("grid", sa.Integer(), nullable=True),
        sa.Column("qualifying_position", sa.Integer(), nullable=True),
        sa.Column("recent_form_score", sa.Integer(), nullable=True),
        sa.Column("top10_probability", sa.Float(), nullable=False),
        sa.Column("confidence", sa.String(length=16), nullable=False),
        sa.Column("prediction_support", sa.String(length=32), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["constructor_id"], ["constructors.id"]),
        sa.ForeignKeyConstraint(["driver_id"], ["drivers.id"]),
        sa.ForeignKeyConstraint(["model_version_id"], ["model_versions.id"]),
        sa.ForeignKeyConstraint(["race_id"], ["races.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("race_id", "driver_id", "model_version_id", name="uq_race_predictions_race_driver_model"),
    )
    op.create_index(op.f("ix_race_predictions_driver_id"), "race_predictions", ["driver_id"], unique=False)
    op.create_index(op.f("ix_race_predictions_model_version_id"), "race_predictions", ["model_version_id"], unique=False)
    op.create_index(op.f("ix_race_predictions_race_id"), "race_predictions", ["race_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_race_predictions_race_id"), table_name="race_predictions")
    op.drop_index(op.f("ix_race_predictions_model_version_id"), table_name="race_predictions")
    op.drop_index(op.f("ix_race_predictions_driver_id"), table_name="race_predictions")
    op.drop_table("race_predictions")

    op.drop_index(op.f("ix_racer_race_context_race_id"), table_name="racer_race_context")
    op.drop_index(op.f("ix_racer_race_context_driver_id"), table_name="racer_race_context")
    op.drop_table("racer_race_context")

    op.drop_index(op.f("ix_race_participants_race_id"), table_name="race_participants")
    op.drop_index(op.f("ix_race_participants_driver_id"), table_name="race_participants")
    op.drop_table("race_participants")

    op.drop_table("race_context")

    op.drop_index(op.f("ix_races_season_year"), table_name="races")
    op.drop_table("races")

    op.drop_table("seasons")
    op.drop_table("model_versions")
    op.drop_table("drivers")
    op.drop_table("constructors")
