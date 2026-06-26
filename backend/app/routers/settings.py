from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.core.database import supabase
from app.schemas import GlobalSettingsUpdate, GlobalSettingsResponse

router = APIRouter()

_SETTINGS_ID = 1  # singleton row — id is always 1


def _fetch() -> dict:
    """Fetch the singleton settings row or raise 404."""
    res = (
        supabase
        .table("global_settings")
        .select("*")
        .eq("id", _SETTINGS_ID)
        .execute()
    )
    if not res.data:
        raise HTTPException(
            status_code=404,
            detail="Settings row missing. Run the SQL migration in Supabase first."
        )
    return res.data[0]


@router.get("/", response_model=GlobalSettingsResponse)
async def get_settings():
    """Return the single global configuration row."""
    try:
        return _fetch()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")


@router.put("/", response_model=GlobalSettingsResponse)
async def update_settings(body: GlobalSettingsUpdate):
    """
    Partial update — only fields explicitly provided are written.
    Omitted fields are left unchanged in the database.
    """
    payload = body.model_dump(exclude_none=True)

    if not payload:
        raise HTTPException(
            status_code=400,
            detail="No updatable fields were provided in the request body."
        )

    payload["updated_at"] = datetime.now(tz=timezone.utc).isoformat()

    try:
        res = (
            supabase
            .table("global_settings")
            .update(payload)
            .eq("id", _SETTINGS_ID)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")

    if not res.data:
        raise HTTPException(status_code=404, detail="Settings row not found.")

    return res.data[0]


@router.post("/", response_model=GlobalSettingsResponse)
async def upsert_settings(body: GlobalSettingsUpdate):
    """
    Full upsert — safe to call even if the row somehow got deleted.
    Sends all fields at once (used by the Settings page Save button).
    """
    payload = body.model_dump(exclude_none=True)
    payload["id"] = _SETTINGS_ID
    payload["updated_at"] = datetime.now(tz=timezone.utc).isoformat()

    try:
        res = (
            supabase
            .table("global_settings")
            .upsert(payload, on_conflict="id")
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")

    if not res.data:
        raise HTTPException(status_code=500, detail="Upsert returned no data.")

    return res.data[0]
