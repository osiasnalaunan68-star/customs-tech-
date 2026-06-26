from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.core.database import get_admin

router = APIRouter()


@router.get("/chapters")
def list_chapters():
    sb = get_admin()
    try:
        res = (
            sb.table("tariff_chapters")
            .select("chapter_no,chapter_title,section_no,section_title")
            .order("chapter_no")
            .execute()
        )
    except Exception as exc:
        raise HTTPException(503, f"Database error: {exc}")
    return res.data or []


@router.get("/codes")
def search_codes(
    q: Optional[str] = Query(None, description="Free-text search on description"),
    code_prefix: Optional[str] = Query(None, description="Prefix match on AHTN code"),
    chapter: Optional[int] = Query(None),
    code: Optional[str] = Query(None, description="Exact AHTN code match"),
    year: int = Query(2026),
    limit: int = Query(50, le=200),
):
    """
    Returns a JSON array. Each item:
    {
      "id": int, "ahtn_code": str, "description": str, "indent_level": int,
      "is_quota": bool, "quota_type": "in_quota"|"out_quota"|null,
      "chapter_no": int|null, "footnote": str|null,
      "rate": float|null,   # tariff_rates.rate for the requested `year`
      "year": int           # echoes the query param
    }
    Returns [] (not a 404) when nothing matches.
    """
    sb = get_admin()
    query = sb.table("hs_codes").select(
        "id,ahtn_code,description,indent_level,is_quota,quota_type,chapter_no,footnote"
    )
    if chapter:
        query = query.eq("chapter_no", chapter)
    if code:
        query = query.eq("ahtn_code", code)
    elif code_prefix:
        query = query.like("ahtn_code", f"{code_prefix}%")
    elif q:
        query = query.ilike("description", f"%{q}%")

    try:
        res = query.order("ahtn_code").limit(limit).execute()
    except Exception as exc:
        raise HTTPException(503, f"Database error: {exc}")

    if not res.data:
        return []

    ids = [r["id"] for r in res.data]
    try:
        rr = (
            sb.table("tariff_rates")
            .select("hs_code_id,rate")
            .in_("hs_code_id", ids)
            .eq("year", year)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(503, f"Database error: {exc}")

    rm = {r["hs_code_id"]: r["rate"] for r in rr.data}
    return [{**item, "rate": rm.get(item["id"]), "year": year} for item in res.data]


@router.get("/code/{ahtn_code}")
def get_code(ahtn_code: str):
    """
    Returns a single object: all hs_codes columns plus a nested
    "tariff_rates": [{ "year": int, "rate": float|null }, ...] for every year on file.
    404 with {"detail": "HS code not found"} if there's no match.
    """
    sb = get_admin()
    try:
        res = (
            sb.table("hs_codes")
            .select("*,tariff_rates(year,rate)")
            .eq("ahtn_code", ahtn_code)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(503, f"Database error: {exc}")
    if not res.data:
        raise HTTPException(404, "HS code not found")
    return res.data[0]


@router.get("/footnote/{code}")
def get_footnote(code: str):
    """Returns a single footnote row. 404 if not found (was previously a 200 with an error body)."""
    sb = get_admin()
    try:
        res = sb.table("tariff_footnotes").select("*").eq("code", code).execute()
    except Exception as exc:
        raise HTTPException(503, f"Database error: {exc}")
    if not res.data:
        raise HTTPException(404, "Footnote not found")
    return res.data[0]
