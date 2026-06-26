from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException

from app.core.database import supabase
from app.schemas import (
    ShipmentCreate,
    ShipmentResponse,
    ShipmentStatusUpdate,
    OPERATIONAL_STATUSES,
)

router = APIRouter()


@router.get("/", response_model=List[ShipmentResponse])
async def list_shipments():
    """Return all shipments, newest first."""
    try:
        res = (
            supabase
            .table("shipments")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")

    return res.data or []


@router.post("/", response_model=ShipmentResponse, status_code=201)
async def create_shipment(shipment: ShipmentCreate):
    """Create a new shipment record."""
    payload = shipment.model_dump()

    if payload.get("eta") is not None:
        payload["eta"] = payload["eta"].isoformat()

    if payload.get("operational_status") not in OPERATIONAL_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"operational_status must be one of: {', '.join(OPERATIONAL_STATUSES)}"
        )

    try:
        res = supabase.table("shipments").insert(payload).execute()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")

    if not res.data:
        raise HTTPException(status_code=500, detail="Insert returned no data.")

    return res.data[0]


@router.put("/{shipment_id}/status", response_model=ShipmentResponse)
async def update_shipment_status(shipment_id: str, body: ShipmentStatusUpdate):
    """
    Update only the operational_status of a shipment.
    Pipeline: Documents Received → Entry Lodgement → Assessment/Payment
              → Gatepass Released → Delivered
    """
    if body.operational_status not in OPERATIONAL_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid status '{body.operational_status}'. "
                f"Allowed: {', '.join(OPERATIONAL_STATUSES)}"
            ),
        )

    try:
        res = (
            supabase
            .table("shipments")
            .update({"operational_status": body.operational_status})
            .eq("id", shipment_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database error: {exc}")

    if not res.data:
        raise HTTPException(
            status_code=404,
            detail=f"Shipment '{shipment_id}' not found."
        )

    return res.data[0]
