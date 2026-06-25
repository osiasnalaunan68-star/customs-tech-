import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Request, Response
from app.routers import tariff, assessments, calculator, clients, shipments, entries, settings

app = FastAPI(title="Customs Tech by Osias.org", version="1.0.0")

# MASTER CORS INTERCEPTOR: Sasaluhin lahat bago pa mag-error ang FastAPI
@app.middleware("http")
async def master_cors_middleware(request: Request, call_next):
    # Kung OPTIONS request (Preflight), unahan na natin at mag-return agad ng 200 OK
    if request.method == "OPTIONS":
        response = Response(status_code=200)
        origin = request.headers.get("Origin", "*")
        req_headers = request.headers.get("Access-Control-Request-Headers", "*")
        
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = req_headers
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
    
    # Para sa ibang requests (GET, POST, etc.), lagyan ng CORS headers pagkatapos maproseso
    response = await call_next(request)
    origin = request.headers.get("Origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = request.headers.get("Access-Control-Request-Headers", "*")
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

app.include_router(assessments.router, prefix="/api/assessments", tags=["Assessments"])
app.include_router(tariff.router,     prefix="/api/tariff",     tags=["Tariff"])
app.include_router(calculator.router, prefix="/api/calculator", tags=["Calculator"])
app.include_router(clients.router,    prefix="/api/clients",    tags=["Clients"])
app.include_router(shipments.router,  prefix="/api/shipments",  tags=["Shipments"])
app.include_router(entries.router,    prefix="/api/entries",    tags=["Entries"])
app.include_router(settings.router,   prefix="/api/settings",   tags=["Settings"])

@app.get("/")
def root(): return {"status": "ok", "app": "Customs Tech by Osias.org"}

@app.get("/health")
def health(): return {"status": "healthy"}
