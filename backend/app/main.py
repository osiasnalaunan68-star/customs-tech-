import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import tariff, calculator, clients, shipments, entries, settings
from app.core.config import ALLOWED_ORIGINS

origins = [o.strip() for o in ALLOWED_ORIGINS.split(",")]
origins += ["http://localhost:5173", "http://localhost:4173"]

app = FastAPI(title="Customs Tech by Osias.org", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
