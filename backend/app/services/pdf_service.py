import os
from datetime import date, time, datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), "..", "templates")

_EMPTY_ROW = lambda n: {
    "row_order": n,
    "product_name": "",
    "check1_ok": None,
    "check2_ok": None,
    "check3_ok": None,
    "check4_ok": None,
    "check5_needs_improvement": False,
    "check5_note": None,
}


def _normalize(record: dict) -> dict:
    """Convert ISO-string date/time fields back to date/time objects so the
    Jinja template can call .strftime() on them without errors."""
    r = dict(record)  # shallow copy — don't mutate the original

    # patrol_date: "2026-06-10" → date(2026, 6, 10)
    pd = r.get("patrol_date")
    if isinstance(pd, str):
        try:
            r["patrol_date"] = date.fromisoformat(pd)
        except ValueError:
            r["patrol_date"] = None

    # time_start / time_end: "09:00" or "09:00:00" → time object
    for field in ("time_start", "time_end"):
        val = r.get(field)
        if isinstance(val, str):
            try:
                # Handle both "HH:MM" and "HH:MM:SS"
                parts = val.split(":")
                r[field] = time(int(parts[0]), int(parts[1]), int(parts[2]) if len(parts) > 2 else 0)
            except (ValueError, IndexError):
                r[field] = None

    # Pad / trim rows to 19
    rows = list(r.get("rows", []))
    while len(rows) < 19:
        rows.append(_EMPTY_ROW(len(rows) + 1))
    r["rows"] = rows[:19]

    return r


def render_pdf(record_data: dict) -> bytes:
    """Generate PDF bytes for a single patrol record."""
    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        autoescape=select_autoescape(["html"]),
    )
    template = env.get_template("patrol_pdf.html")
    html_content = template.render(record=_normalize(record_data))
    return HTML(string=html_content, base_url=TEMPLATE_DIR).write_pdf()


def render_bulk_pdf(records: list[dict]) -> bytes:
    """Generate multi-page PDF for multiple patrol records."""
    env = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        autoescape=select_autoescape(["html"]),
    )
    template = env.get_template("patrol_pdf.html")

    html_parts = [template.render(record=_normalize(r)) for r in records]

    # Combine pages with page-break between
    combined = '<div style="page-break-after: always;">'.join(html_parts)
    combined = f"<html><body>{combined}</body></html>"
    return HTML(string=combined, base_url=TEMPLATE_DIR).write_pdf()
