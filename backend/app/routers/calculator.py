from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import httpx
from app.core.config import EXCHANGE_RATE_API_KEY, DEFAULT_EXCHANGE_RATE, DEFAULT_VAT_RATE

router = APIRouter()

class DutyInput(BaseModel):
    fob: float
    freight: float = 0.0
    insurance: float = 0.0
    exchange_rate: Optional[float] = None
    duty_rate: float
    vat_rate: float = DEFAULT_VAT_RATE

@router.post("/duty")
def calculate_duty(body: DutyInput):
    exr = body.exchange_rate or DEFAULT_EXCHANGE_RATE
    cif_usd = body.fob + body.freight + body.insurance
    cif_php = cif_usd * exr
    duty = cif_php * (body.duty_rate / 100)
    vat = (cif_php + duty) * (body.vat_rate / 100)
    return {
        "fob_usd": body.fob, "freight_usd": body.freight,
        "insurance_usd": body.insurance, "cif_usd": round(cif_usd, 4),
        "exchange_rate": exr, "cif_php": round(cif_php, 2),
        "duty_rate_pct": body.duty_rate, "customs_duty": round(duty, 2),
        "vat_rate_pct": body.vat_rate, "vat_base": round(cif_php + duty, 2),
        "vat": round(vat, 2), "total_payable": round(duty + vat, 2),
    }

@router.get("/exchange-rate")
async def get_rate():
    k = EXCHANGE_RATE_API_KEY
    if not k or k == "YOUR_NINJA_API_KEY":
        return {"rate": DEFAULT_EXCHANGE_RATE, "source": "default"}
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            r = await c.get("https://api.api-ninjas.com/v1/exchangerate?pair=USD_PHP",
                            headers={"X-Api-Key": k})
            return {"rate": r.json().get("exchange_rate", DEFAULT_EXCHANGE_RATE), "source": "live"}
    except Exception:
        return {"rate": DEFAULT_EXCHANGE_RATE, "source": "fallback"}
