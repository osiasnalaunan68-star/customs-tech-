from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.database import get_admin
from app.core.auth import current_user

router = APIRouter()

class SettingsBody(BaseModel):
    default_exchange_rate: float = 56.0
    vat_rate: float = 12.0
    professional_fee: float = 0.0
    theme: str = "dark"

@router.get("")
def get_settings(uid: str = Depends(current_user)):
    sb = get_admin()
    res = sb.table('user_settings').select('*').eq('user_id', uid).execute()
    if res.data: return res.data[0]
    return {"user_id": uid, "default_exchange_rate": 56.0, "vat_rate": 12.0,
            "professional_fee": 0.0, "theme": "dark"}

@router.put("")
def update_settings(body: SettingsBody, uid: str = Depends(current_user)):
    sb = get_admin()
    data = {**body.model_dump(), "user_id": uid}
    return sb.table('user_settings').upsert(data, on_conflict='user_id').execute().data[0]
