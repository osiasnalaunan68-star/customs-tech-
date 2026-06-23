from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from app.core.database import get_admin
from app.core.auth import current_user

router = APIRouter()

class ClientBody(BaseModel):
    name: str
    company: Optional[str] = None
    tin: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

@router.get("")
def list_clients(uid: str = Depends(current_user)):
    sb = get_admin()
    return sb.table('clients').select('*').eq('user_id', uid).is_(
        'deleted_at', 'null').order('created_at', desc=True).execute().data

@router.post("")
def create_client(body: ClientBody, uid: str = Depends(current_user)):
    sb = get_admin()
    return sb.table('clients').insert({**body.model_dump(), 'user_id': uid}).execute().data[0]

@router.put("/{cid}")
def update_client(cid: str, body: ClientBody, uid: str = Depends(current_user)):
    sb = get_admin()
    res = sb.table('clients').update(body.model_dump()).eq('id', cid).eq('user_id', uid).execute()
    if not res.data: raise HTTPException(404, "Not found")
    return res.data[0]

@router.delete("/{cid}")
def delete_client(cid: str, uid: str = Depends(current_user)):
    sb = get_admin()
    sb.table('clients').update({'deleted_at': datetime.now(timezone.utc).isoformat()}).eq(
        'id', cid).eq('user_id', uid).execute()
    return {"deleted": True}
