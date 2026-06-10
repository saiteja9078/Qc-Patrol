"""Initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---- users ----
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # ---- otp_tokens ----
    op.create_table(
        "otp_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False),
        sa.Column("purpose", sa.String(20), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ---- patrol_records ----
    op.create_table(
        "patrol_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("form_id", sa.String(20), server_default="TQD-002付表"),
        sa.Column("patrol_date", sa.Date(), nullable=False),
        sa.Column("time_start", sa.Time(), nullable=False),
        sa.Column("time_end", sa.Time(), nullable=False),
        sa.Column("weather", sa.String(50), nullable=True),
        sa.Column("temperature_c", sa.Numeric(4, 1), nullable=True),
        sa.Column("humidity_pct", sa.Numeric(4, 1), nullable=True),
        sa.Column("special_notes", sa.Text(), nullable=True),
        sa.Column("confirmed_by", sa.String(100), nullable=True),
        sa.Column("inspected_by", sa.String(100), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.execute(
        "CREATE INDEX idx_patrol_records_date ON patrol_records(patrol_date DESC) WHERE deleted_at IS NULL"
    )
    op.execute(
        "CREATE INDEX idx_patrol_records_user ON patrol_records(user_id) WHERE deleted_at IS NULL"
    )
    op.create_index("idx_patrol_records_created", "patrol_records", ["created_at"])

    # ---- patrol_rows ----
    op.create_table(
        "patrol_rows",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("record_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("patrol_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("row_order", sa.SmallInteger(), nullable=False),
        sa.Column("product_name", sa.String(200), nullable=True),
        sa.Column("check1_ok", sa.Boolean(), nullable=True),
        sa.Column("check2_ok", sa.Boolean(), nullable=True),
        sa.Column("check3_ok", sa.Boolean(), nullable=True),
        sa.Column("check4_ok", sa.Boolean(), nullable=True),
        sa.Column("check5_needs_improvement", sa.Boolean(), server_default=sa.false()),
        sa.Column("check5_note", sa.Text(), nullable=True),
    )
    op.create_index("idx_patrol_rows_record", "patrol_rows", ["record_id", "row_order"])


def downgrade() -> None:
    op.drop_table("patrol_rows")
    op.drop_table("patrol_records")
    op.drop_table("otp_tokens")
    op.drop_table("users")
