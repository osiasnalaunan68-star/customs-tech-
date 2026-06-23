from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_admin
from app.core.auth import current_user

router = APIRouter()

class EntryBody(BaseModel):
    shipment_id: Optional[str] = None
    client_id: Optional[str] = None
    entry_no: Optional[str] = None
    ahtn_code: Optional[str] = None
    description: Optional[str] = None
    quota_type: Optional[str] = None
    fob_value: float = 0
    freight: float = 0
    insurance: float = 0
    cif_value: float = 0
    exchange_rate: float = 56.0
    duty_rate: float = 0
    customs_duty: float = 0
    vat_rate: float = 12
    vat: float = 0
    total_payable: float = 0
    notes: Optional[str] = None

@router.get("")
def list_entries(uid: str = Depends(current_user)):
    sb = get_admin()
    return sb.table('entries').select('*,clients(name),shipments(reference_no)').eq(
        'user_id', uid).is_('deleted_at', 'null').order('created_at', desc=True).execute().data

@router.post("")
def create_entry(body: EntryBody, uid: str = Depends(current_user)):
    sb = get_admin()
    return sb.table('entries').insert({**body.model_dump(), 'user_id': uid}).execute().data[0]

@router.put("/{eid}")
def update_entry(eid: str, body: EntryBody, uid: str = Depends(current_user)):
    sb = get_admin()
    res = sb.table('entries').update(body.model_dump()).eq('id', eid).eq('user_id', uid).execute()
    if not res.data: raise HTTPException(404, "Not found")
    return res.data[0]

@router.delete("/{eid}")
def delete_entry(eid: str, uid: str = Depends(current_user)):
    sb = get_admin()
    sb.table('entries').update({'deleted_at': datetime.now(timezone.utc).isoformat()}).eq(
        'id', eid).eq('user_id', uid).execute()
    return {"deleted": True}
