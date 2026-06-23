from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_admin
from app.core.auth import current_user

router = APIRouter()

class ShipmentBody(BaseModel):
    reference_no: str
    client_id: str
    origin: Optional[str] = None
    destination: Optional[str] = None
    etd: Optional[str] = None
    eta: Optional[str] = None

@router.get("")
def list_shipments(uid: str = Depends(current_user)):
    sb = get_admin()
    return sb.table('shipments').select('*, clients(name)').eq('user_id', uid).is_('deleted_at', 'null').order('created_at', desc=True).execute().data

@router.post("")
def create_shipment(body: ShipmentBody, uid: str = Depends(current_user)):
    sb = get_admin()
    return sb.table('shipments').insert({**body.model_dump(), 'user_id': uid}).execute().data[0]

@router.put("/{sid}")
def update_shipment(sid: str, body: ShipmentBody, uid: str = Depends(current_user)):
    sb = get_admin()
    res = sb.table('shipments').update(body.model_dump()).eq('id', sid).eq('user_id', uid).execute()
    if not res.data: raise HTTPException(404, "Not found")
    return res.data[0]

@router.delete("/{sid}")
def delete_shipment(sid: str, uid: str = Depends(current_user)):
    sb = get_admin()
    sb.table('shipments').update({'deleted_at': datetime.now(timezone.utc).isoformat()}).eq('id', sid).eq('user_id', uid).execute()
    return {"deleted": True}
