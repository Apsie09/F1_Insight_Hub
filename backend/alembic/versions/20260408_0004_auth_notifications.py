"""Add email verification and app notifications

Revision ID: 20260408_0004
Revises: 20260408_0003
Create Date: 2026-04-08 20:30:00

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260408_0004"
down_revision = "20260408_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "app_users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.alter_column("app_users", "email_verified", server_default=None)

    op.create_table(
        "app_notifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["app_users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_app_notifications_user_id"), "app_notifications", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_app_notifications_user_id"), table_name="app_notifications")
    op.drop_table("app_notifications")
    op.drop_column("app_users", "email_verified")
