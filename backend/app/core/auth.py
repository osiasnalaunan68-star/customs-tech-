from fastapi import Header, HTTPException
from app.core.database import get_admin

async def current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        sb = get_admin()
        user = sb.auth.get_user(authorization.split(" ")[1])
        return str(user.user.id)
    except Exception:
        raise HTTPException(401, "Invalid token")
