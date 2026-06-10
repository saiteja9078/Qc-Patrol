import asyncio
from collections import defaultdict
from datetime import date, datetime, timezone
from typing import AsyncGenerator
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.patrol import PatrolRecord, PatrolRow
from app.schemas.patrol import (
    PatrolRecordCreate,
    PatrolRecordUpdate,
    PatrolRecordResponse,
    PaginatedRecordsResponse,
)

router = APIRouter(prefix="/records", tags=["records"])

# In-memory SSE queues: {date_str: [asyncio.Queue, ...]}
# Note: This works only in single-process deployment.
_sse_listeners: dict[str, list[asyncio.Queue]] = defaultdict(list)


def _broadcast_new_record(patrol_date: date, record_id: UUID) -> None:
    """Notify all SSE listeners for a given date."""
    date_str = patrol_date.isoformat()
    for q in _sse_listeners.get(date_str, []):
        try:
            q.put_nowait({"type": "new_record", "record_id": str(record_id)})
        except asyncio.QueueFull:
            pass


async def _record_to_response(record: PatrolRecord) -> PatrolRecordResponse:
    return PatrolRecordResponse.model_validate(record)


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=PatrolRecordResponse)
async def create_record(
    body: PatrolRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # SQLAlchemy 2.x async_sessionmaker uses autobegin — a transaction is already
    # open on first use. Calling db.begin() again raises InvalidRequestError.
    # Use flush() + commit() directly instead.
    try:
        record = PatrolRecord(
            user_id=current_user.id,
            patrol_date=body.patrol_date,
            time_start=body.time_start,
            time_end=body.time_end,
            weather=body.weather,
            temperature_c=body.temperature_c,
            humidity_pct=body.humidity_pct,
            special_notes=body.special_notes,
            confirmed_by=body.confirmed_by,
            inspected_by=body.inspected_by,
        )
        db.add(record)
        await db.flush()  # assign record.id without committing

        for row_data in body.rows:
            row = PatrolRow(
                record_id=record.id,
                row_order=row_data.row_order,
                product_name=row_data.product_name,
                check1_ok=row_data.check1_ok,
                check2_ok=row_data.check2_ok,
                check3_ok=row_data.check3_ok,
                check4_ok=row_data.check4_ok,
                check5_needs_improvement=row_data.check5_needs_improvement,
                check5_note=row_data.check5_note,
            )
            db.add(row)

        await db.flush()
        record_id = record.id
        patrol_date = record.patrol_date
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    # Re-fetch with rows for response
    result = await db.execute(
        select(PatrolRecord)
        .options(selectinload(PatrolRecord.rows))
        .where(PatrolRecord.id == record_id)
    )
    record = result.scalar_one()
    _broadcast_new_record(patrol_date, record_id)
    return record


@router.get("/dates", response_model=list[str])
async def get_record_dates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all distinct patrol_date values with at least one active record."""
    result = await db.execute(
        select(PatrolRecord.patrol_date)
        .where(
            PatrolRecord.user_id == current_user.id,
            PatrolRecord.deleted_at.is_(None),
        )
        .distinct()
        .order_by(PatrolRecord.patrol_date.desc())
    )
    return [str(d) for d in result.scalars().all()]


@router.get("/stream")
async def stream_records(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    current_user: User = Depends(get_current_user),
):
    """SSE endpoint — push new_record events for the given date."""
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    _sse_listeners[date].append(queue)

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            yield "data: {\"type\": \"connected\"}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    import json
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive ping
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            try:
                _sse_listeners[date].remove(queue)
            except ValueError:
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/", response_model=PaginatedRecordsResponse)
async def list_records(
    date: str | None = Query(None, description="Filter by patrol_date (YYYY-MM-DD)"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_where = and_(
        PatrolRecord.user_id == current_user.id,
        PatrolRecord.deleted_at.is_(None),
    )

    if date:
        try:
            filter_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
        base_where = and_(base_where, PatrolRecord.patrol_date == filter_date)

    # Count total
    count_result = await db.execute(
        select(func.count()).select_from(PatrolRecord).where(base_where)
    )
    total = count_result.scalar_one()

    # Fetch page
    order_by = (
        PatrolRecord.created_at.asc()
        if date
        else (PatrolRecord.patrol_date.desc(), PatrolRecord.created_at.asc())
    )
    query = (
        select(PatrolRecord)
        .options(selectinload(PatrolRecord.rows))
        .where(base_where)
        .order_by(*([order_by] if not isinstance(order_by, tuple) else order_by))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    records = result.scalars().all()

    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedRecordsResponse(
        items=records,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{record_id}", response_model=PatrolRecordResponse)
async def get_record(
    record_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PatrolRecord)
        .options(selectinload(PatrolRecord.rows))
        .where(
            PatrolRecord.id == record_id,
            PatrolRecord.deleted_at.is_(None),
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")
    return record


@router.put("/{record_id}", response_model=PatrolRecordResponse)
async def update_record(
    record_id: UUID,
    body: PatrolRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PatrolRecord)
        .where(
            PatrolRecord.id == record_id,
            PatrolRecord.deleted_at.is_(None),
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")
    if record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this record.")

    try:
        record.patrol_date = body.patrol_date
        record.time_start = body.time_start
        record.time_end = body.time_end
        record.weather = body.weather
        record.temperature_c = body.temperature_c
        record.humidity_pct = body.humidity_pct
        record.special_notes = body.special_notes
        record.confirmed_by = body.confirmed_by
        record.inspected_by = body.inspected_by
        record.updated_at = datetime.now(timezone.utc)
        db.add(record)

        # Delete old rows and re-insert
        existing_rows_result = await db.execute(
            select(PatrolRow).where(PatrolRow.record_id == record_id)
        )
        for row in existing_rows_result.scalars().all():
            await db.delete(row)

        for row_data in body.rows:
            row = PatrolRow(
                record_id=record_id,
                row_order=row_data.row_order,
                product_name=row_data.product_name,
                check1_ok=row_data.check1_ok,
                check2_ok=row_data.check2_ok,
                check3_ok=row_data.check3_ok,
                check4_ok=row_data.check4_ok,
                check5_needs_improvement=row_data.check5_needs_improvement,
                check5_note=row_data.check5_note,
            )
            db.add(row)

        await db.commit()
    except Exception:
        await db.rollback()
        raise

    result2 = await db.execute(
        select(PatrolRecord)
        .options(selectinload(PatrolRecord.rows))
        .where(PatrolRecord.id == record_id)
    )
    return result2.scalar_one()


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    record_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PatrolRecord).where(
            PatrolRecord.id == record_id,
            PatrolRecord.deleted_at.is_(None),
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found.")
    if record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this record.")

    record.deleted_at = datetime.now(timezone.utc)
    await db.commit()
