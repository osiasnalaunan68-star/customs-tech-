from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json
import urllib.request

router = APIRouter()

class ClassifyInput(BaseModel):
    description: str

@router.post("")
@router.post("/")
@router.post("/classify")
def classify(input: ClassifyInput):
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        raise HTTPException(503, "Gemini API key not configured in Render environment")
    
    # Itinama natin mula v1beta patungong v1 stable endpoint base sa nahanap mo!
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={gemini_key}"
    headers = {"Content-Type": "application/json"}
    
    prompt = f"Given the product description: '{input.description}', return the likely 8-digit AHTN HS code and a brief reason. Format exactly like this: code: XXXX.XX.XX, reason: ..."
    
    payload = {
        "contents": [{
            "parts": [{
                "text": prompt
            }]
        }]
    }
    
    try:
        req = urllib.request.Request(
            url, 
            data=json.dumps(payload).encode('utf-8'), 
            headers=headers, 
            method="POST"
        )
        
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            
            # Pagkuha ng text mula sa stable v1 structure
            text_result = res_data["candidates"][0]["content"]["parts"][0]["text"]
            return {"result": text_result}
            
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode('utf-8')
        raise HTTPException(e.code, f"Gemini API Error: {error_msg}")
    except Exception as e:
        raise HTTPException(500, str(e))
