from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.tariff import router as tariff_router

app = FastAPI(title="CustomsTech API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tariff_router, prefix="/api/tariff", tags=["tariff"])

@app.get("/")
def root():
    return {"message": "CustomsTech API is running."}
