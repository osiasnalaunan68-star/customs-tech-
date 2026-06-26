from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.database import supabase
from app.schemas import HistoricalSADCreate, HistoricalSADResponse

router = APIRouter()


@router.get("/", response_model=List[HistoricalSADResponse])
async def list_historical_sad(
    year: Optional[int] = Query(
        default=None,
        description="Filter archived entries by SAD year, e.g. ?year=2023"
    )
):
    """Return archived SAD entries. Optionally filter by ?year=YYYY."""
    try:
        query = supabase.table("historical_sad").select("*")
        if year is not None:
            query = query.eq("sad_year", year)
        res = query.order("archived_at", desc=True).execute()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")

    return res.data or []


@router.post("/", response_model=HistoricalSADResponse, status_code=201)
async def archive_sad_entry(entry: HistoricalSADCreate):
    """
    Archive a completed SAD entry.
    archived_at is auto-set by the database DEFAULT (NOW()).
    """
    payload = entry.model_dump()

    try:
        res = supabase.table("historical_sad").insert(payload).execute()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")

    if not res.data:
        raise HTTPException(status_code=500, detail="Insert returned no data.")

    return res.data[0]
