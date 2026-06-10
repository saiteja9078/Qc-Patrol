from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.patrol import PatrolRecord
from app.services.pdf_service import render_pdf, render_bulk_pdf

router = APIRouter(prefix="/export", tags=["export"])


def _record_to_dict(record: PatrolRecord) -> dict:
    return {
        "id": str(record.id),
        "form_id": record.form_id,
        "patrol_date": record.patrol_date,
        "time_start": record.time_start,
        "time_end": record.time_end,
        "weather": record.weather,
        "temperature_c": record.temperature_c,
        "humidity_pct": record.humidity_pct,
        "special_notes": record.special_notes,
        "confirmed_by": record.confirmed_by,
        "inspected_by": record.inspected_by,
        "rows": [
            {
                "row_order": row.row_order,
                "product_name": row.product_name,
                "check1_ok": row.check1_ok,
                "check2_ok": row.check2_ok,
                "check3_ok": row.check3_ok,
                "check4_ok": row.check4_ok,
                "check5_needs_improvement": row.check5_needs_improvement,
                "check5_note": row.check5_note,
            }
            for row in record.rows
        ],
    }


@router.get("/pdf/{record_id}")
async def export_pdf(
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

    pdf_bytes = render_pdf(_record_to_dict(record))
    filename = f"TQD-002_{record.patrol_date}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/pdf/bulk")
async def export_bulk_pdf(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        filter_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format.")

    result = await db.execute(
        select(PatrolRecord)
        .options(selectinload(PatrolRecord.rows))
        .where(
            PatrolRecord.user_id == current_user.id,
            PatrolRecord.patrol_date == filter_date,
            PatrolRecord.deleted_at.is_(None),
        )
        .order_by(PatrolRecord.created_at.asc())
    )
    records = result.scalars().all()
    if not records:
        raise HTTPException(status_code=404, detail="No records found for this date.")

    pdf_bytes = render_bulk_pdf([_record_to_dict(r) for r in records])
    filename = f"TQD-002_bulk_{date}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
