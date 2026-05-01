from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.dependencies.auth_dependencies import get_current_user
from app.domain.prediction_service import calculate_top10_prediction_payload
from app.models.database import get_db_session
from app.models.entities import AppUser, ModelVersion
from app.views.schemas import CalculatorInputPayload


router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.post("/calculate")
def calculate_prediction(
    payload: CalculatorInputPayload,
    _current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> dict[str, Any]:
    model_version = (
        db.query(ModelVersion)
        .order_by(ModelVersion.created_at.desc(), ModelVersion.id.desc())
        .first()
    )
    training_years = {}
    if model_version is not None:
        training_years = {
            "min_train_year": model_version.min_train_year,
            "train_end_year": model_version.train_end_year,
            "val_year": model_version.val_year,
            "test_start_year": model_version.test_start_year,
        }
    try:
        return calculate_top10_prediction_payload(db, payload, training_years)
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
