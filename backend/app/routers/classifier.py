from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json
import urllib.request
import urllib.error

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
    
    # Listahan ng mga models na pwedeng sumalo sa request mo
    models_to_try = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash"
    ]
    
    last_error = None
    prompt = f"Given the product description: '{input.description}', return the likely 8-digit AHTN HS code and a brief reason. Format exactly like this: code: XXXX.XX.XX, reason: ..."
    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    headers = {"Content-Type": "application/json"}

    # Iikutin natin ang mga models hanggang sa may gumana
    for model in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={gemini_key}"
        try:
            req = urllib.request.Request(
                url, 
                data=json.dumps(payload).encode('utf-8'), 
                headers=headers, 
                method="POST"
            )
            with urllib.request.urlopen(req) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                text_result = res_data["candidates"][0]["content"]["parts"][0]["text"]
                # Kapag may gumana, ibalik agad ang resulta!
                return {"result": text_result}
                
        except urllib.error.HTTPError as e:
            last_error = e.read().decode('utf-8')
            # Kung 404 (Model Not Found), ituloy lang ang loop sa susunod na model name
            if e.code == 404:
                continue
            # Kung ibang klaseng error (hal. 400 o 403), i-bato agad sa frontend
            raise HTTPException(e.code, f"Gemini API Error: {last_error}")
        except Exception as e:
            raise HTTPException(500, str(e))
            
    # Kung natapos ang loop at lahat sila nag-404
    raise HTTPException(404, f"All Gemini model variants failed. Last Google error: {last_error}")
