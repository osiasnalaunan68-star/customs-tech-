from __future__ import annotations

from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException

from app.core.database import supabase
from app.schemas import ClientCreate, ClientResponse

router = APIRouter()


def _is_expiring_soon(cprs_expiry: Optional[str]) -> bool:
    """True if CPRS expiry is within the next 30 calendar days."""
    if not cprs_expiry:
        return False
    try:
        expiry_date = date.fromisoformat(str(cprs_expiry))
        today = date.today()
        return today <= expiry_date <= today + timedelta(days=30)
    except (ValueError, TypeError):
        return False


def _enrich(client: dict) -> dict:
    client["cprs_expiring_soon"] = _is_expiring_soon(client.get("cprs_expiry"))
    return client


@router.get("/", response_model=List[ClientResponse])
async def list_clients():
    """Return all clients, newest first, with 30-day CPRS expiry warning."""
    try:
        res = (
            supabase
            .table("clients")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")

    return [_enrich(c) for c in (res.data or [])]


@router.post("/", response_model=ClientResponse, status_code=201)
async def create_client(client: ClientCreate):
    """Insert a new client."""
    payload = client.model_dump()

    if payload.get("cprs_expiry") is not None:
        payload["cprs_expiry"] = payload["cprs_expiry"].isoformat()

    allowed_statuses = {"Active", "Expired", "Suspended"}
    if payload.get("cprs_status") not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"cprs_status must be one of: {', '.join(allowed_statuses)}"
        )

    try:
        res = supabase.table("clients").insert(payload).execute()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")

    if not res.data:
        raise HTTPException(status_code=500, detail="Insert returned no data.")

    return _enrich(res.data[0])
