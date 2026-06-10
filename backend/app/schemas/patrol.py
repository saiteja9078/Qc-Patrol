from datetime import date, time, datetime
from decimal import Decimal
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, field_validator


class PatrolRowInput(BaseModel):
    row_order: int
    product_name: Optional[str] = None
    check1_ok: Optional[bool] = None
    check2_ok: Optional[bool] = None
    check3_ok: Optional[bool] = None
    check4_ok: Optional[bool] = None
    check5_needs_improvement: bool = False
    check5_note: Optional[str] = None

    @field_validator("row_order")
    @classmethod
    def validate_row_order(cls, v: int) -> int:
        if not (1 <= v <= 19):
            raise ValueError("row_order must be between 1 and 19")
        return v


class PatrolRecordCreate(BaseModel):
    patrol_date: date
    time_start: time
    time_end: time
    weather: Optional[str] = None
    temperature_c: Optional[Decimal] = None
    humidity_pct: Optional[Decimal] = None
    special_notes: Optional[str] = None
    confirmed_by: Optional[str] = None
    inspected_by: Optional[str] = None
    rows: list[PatrolRowInput] = []

    @field_validator("temperature_c")
    @classmethod
    def validate_temperature(cls, v):
        if v is not None and not (-50 <= float(v) <= 100):
            raise ValueError("Temperature must be between -50 and 100°C")
        return v

    @field_validator("humidity_pct")
    @classmethod
    def validate_humidity(cls, v):
        if v is not None and not (0 <= float(v) <= 100):
            raise ValueError("Humidity must be between 0 and 100%")
        return v


class PatrolRecordUpdate(PatrolRecordCreate):
    pass


class PatrolRowResponse(BaseModel):
    id: UUID
    record_id: UUID
    row_order: int
    product_name: Optional[str]
    check1_ok: Optional[bool]
    check2_ok: Optional[bool]
    check3_ok: Optional[bool]
    check4_ok: Optional[bool]
    check5_needs_improvement: bool
    check5_note: Optional[str]

    model_config = {"from_attributes": True}


class PatrolRecordResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    form_id: str
    patrol_date: date
    time_start: time
    time_end: time
    weather: Optional[str]
    temperature_c: Optional[Decimal]
    humidity_pct: Optional[Decimal]
    special_notes: Optional[str]
    confirmed_by: Optional[str]
    inspected_by: Optional[str]
    created_at: datetime
    updated_at: datetime
    rows: list[PatrolRowResponse] = []

    model_config = {"from_attributes": True}


class PaginatedRecordsResponse(BaseModel):
    items: list[PatrolRecordResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
