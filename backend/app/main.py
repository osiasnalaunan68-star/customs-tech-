from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import tariff, calculator, classifier, clients, shipments, entries, settings

app = FastAPI(title="Customs Tech API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ibinalik ang /api dahil automatic pala itong idinugtong ng frontend mo
app.include_router(tariff.router, prefix="/api/tariff", tags=["Tariff"])
app.include_router(calculator.router, prefix="/api/calculator", tags=["Calculator"])
app.include_router(classifier.router, prefix="/api/classifier", tags=["Classifier"]) # Itinama mula /classify patungong /classifier
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(shipments.router, prefix="/api/shipments", tags=["Shipments"])
app.include_router(entries.router, prefix="/api/entries", tags=["Entries"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])

@app.get("/")
def root():
    return {"message": "Customs Tech API is running"}
