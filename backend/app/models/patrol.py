import uuid
from datetime import date, time, datetime
from decimal import Decimal
from sqlalchemy import (
    String, Boolean, Date, Time, Text, Numeric, DateTime,
    ForeignKey, SmallInteger, func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class PatrolRecord(Base):
    __tablename__ = "patrol_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    form_id: Mapped[str] = mapped_column(String(20), default="TQD-002付表")
    patrol_date: Mapped[date] = mapped_column(Date, nullable=False)
    time_start: Mapped[time] = mapped_column(Time, nullable=False)
    time_end: Mapped[time] = mapped_column(Time, nullable=False)
    weather: Mapped[str | None] = mapped_column(String(50), nullable=True)
    temperature_c: Mapped[Decimal | None] = mapped_column(Numeric(4, 1), nullable=True)
    humidity_pct: Mapped[Decimal | None] = mapped_column(Numeric(4, 1), nullable=True)
    special_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    confirmed_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    inspected_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    rows: Mapped[list["PatrolRow"]] = relationship(
        "PatrolRow", back_populates="record", cascade="all, delete-orphan",
        order_by="PatrolRow.row_order"
    )

    __table_args__ = (
        Index("idx_patrol_records_date", "patrol_date", postgresql_where="deleted_at IS NULL"),
        Index("idx_patrol_records_user", "user_id", postgresql_where="deleted_at IS NULL"),
        Index("idx_patrol_records_created", "created_at"),
    )


class PatrolRow(Base):
    __tablename__ = "patrol_rows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patrol_records.id", ondelete="CASCADE"), nullable=False
    )
    row_order: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    product_name: Mapped[str | None] = mapped_column(String(200), nullable=True)

    check1_ok: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    check2_ok: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    check3_ok: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    check4_ok: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    check5_needs_improvement: Mapped[bool] = mapped_column(Boolean, default=False)
    check5_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    record: Mapped["PatrolRecord"] = relationship("PatrolRecord", back_populates="rows")

    __table_args__ = (
        Index("idx_patrol_rows_record", "record_id", "row_order"),
    )
