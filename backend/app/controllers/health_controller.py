from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from sqlalchemy import func, select

from app.models.database import SessionLocal
from app.models.entities import ModelVersion, Season
from app.core.config import DATA_ROOT, F1_SERVING_MODE


router = APIRouter()


@router.get("/")
def healthcheck() -> dict[str, Any]:
    with SessionLocal() as session:
        model_version = session.execute(
            select(ModelVersion).order_by(ModelVersion.created_at.desc(), ModelVersion.id.desc()).limit(1)
        ).scalar_one_or_none()
        season_count = session.execute(select(func.count(Season.year))).scalar_one()

    training_years = {}
    if model_version is not None:
        training_years = {
            "min_train_year": model_version.min_train_year,
            "train_end_year": model_version.train_end_year,
            "val_year": model_version.val_year,
            "test_start_year": model_version.test_start_year,
        }

    return {
        "status": "ok",
        "dataRoot": str(DATA_ROOT),
        "archiveReady": season_count > 0,
        "databaseReady": True,
        "modelReady": model_version is not None,
        "featureCount": model_version.feature_count if model_version is not None else 0,
        "trainingYears": training_years,
        "servingMode": F1_SERVING_MODE,
        "legacyFallbackEnabled": False,
    }
