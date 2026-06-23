from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.core.config import ANTHROPIC_API_KEY
import anthropic

router = APIRouter()

class ClassifyInput(BaseModel):
    description: str

# Sinalo lahat ng posibleng URL combinations para walang kawala ang frontend
@router.post("")
@router.post("/")
@router.post("/classify")
def classify(input: ClassifyInput):
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == "sk-ant-api03-...":
        raise HTTPException(503, "Anthropic API key not configured")
    
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    try:
        resp = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=100,
            messages=[{"role": "user", "content": f"Given the product description: '{input.description}', return the likely 8-digit AHTN HS code and a brief reason. Format: code: XXXX.XX.XX, reason: ..."}]
        )
        return {"result": resp.content[0].text}
    except Exception as e:
        raise HTTPException(500, str(e))
