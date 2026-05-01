"""Remove email verification feature

Revision ID: 20260408_0006
Revises: 20260408_0005
Create Date: 2026-04-08 21:40:00

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260408_0006"
down_revision = "20260408_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index(
        op.f("ix_app_user_email_verification_tokens_user_id"),
        table_name="app_user_email_verification_tokens",
    )
    op.drop_table("app_user_email_verification_tokens")
    op.drop_column("app_users", "email_verified")


def downgrade() -> None:
    op.add_column(
        "app_users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.alter_column("app_users", "email_verified", server_default=None)

    op.create_table(
        "app_user_email_verification_tokens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["app_users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_app_user_email_verification_tokens_token_hash"),
    )
    op.create_index(
        op.f("ix_app_user_email_verification_tokens_user_id"),
        "app_user_email_verification_tokens",
        ["user_id"],
        unique=False,
    )
