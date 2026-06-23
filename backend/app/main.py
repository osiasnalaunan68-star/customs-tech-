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

# Inadjust ang mga prefix para maglapat sa tinatawag ng frontend mo (tinanggal ang /api at itinama ang classifier)
app.include_router(tariff.router, prefix="/tariff", tags=["Tariff"])
app.include_router(calculator.router, prefix="/calculator", tags=["Calculator"])
app.include_router(classifier.router, prefix="/classifier", tags=["Classifier"])
app.include_router(clients.router, prefix="/clients", tags=["Clients"])
app.include_router(shipments.router, prefix="/shipments", tags=["Shipments"])
app.include_router(entries.router, prefix="/entries", tags=["Entries"])
app.include_router(settings.router, prefix="/settings", tags=["Settings"])

@app.get("/")
def root():
    return {"message": "Customs Tech API is running"}
