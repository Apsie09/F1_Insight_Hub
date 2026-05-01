from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers.auth_controller import router as auth_router
from app.controllers.health_controller import router as health_router
from app.controllers.prediction_controller import router as prediction_router
from app.controllers.race_controller import router as race_router


app = FastAPI(
    title="F1 Insight Hub Backend",
    description="FastAPI backend serving F1 archive data and Top-10 model inference for the mobile app.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(race_router)
app.include_router(prediction_router)
