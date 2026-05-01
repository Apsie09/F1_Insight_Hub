from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.queries import get_db_backed_calculation_inputs
from app.views.schemas import CalculatorInputPayload
from app.core.helpers import confidence_label, support_message


def calculate_top10_prediction_payload(
    db: Session,
    payload: CalculatorInputPayload,
    model_training_years: dict[str, int] | None = None,
) -> dict[str, Any]:
    race_id = payload.raceId
    racer_id = payload.racerId

    matching, race_payload = get_db_backed_calculation_inputs(db, race_id, racer_id)
    if matching is None:
        raise LookupError(f"Racer {racer_id} not found in race {race_id}")

    training_years = model_training_years or {}
    race_payload = race_payload or {}
    probability = float(matching["top10Probability"])
    grid_adjustment = max(min((11 - payload.gridPosition) * 0.012, 0.12), -0.12)
    recent_form_score = int(matching.get("recentFormScore", 50))
    form_adjustment = max(min((recent_form_score - 50) / 400, 0.12), -0.12)
    weather_adjustment = {"Dry": 0.01, "Mixed": -0.01, "Wet": -0.025}.get(payload.weatherCondition, 0.0)
    adjusted_probability = max(0.01, min(0.99, probability + grid_adjustment + form_adjustment + weather_adjustment))

    return {
        "racerId": racer_id,
        "racerName": matching["racerName"],
        "raceId": race_id,
        "predictedTop10Probability": round(adjusted_probability, 4),
        "confidence": confidence_label(adjusted_probability),
        "recentFormScore": recent_form_score,
        "predictionSupport": race_payload.get("predictionSupport", "supported"),
        "supportMessage": race_payload.get(
            "supportMessage",
            support_message(
                payload.season,
                training_years.get("min_train_year"),
                training_years.get("train_end_year"),
                training_years.get("val_year"),
                training_years.get("test_start_year"),
            ),
        ),
        "reasoning": [
            f"Base backend model probability for {matching['racerName']} in race {race_id}: {round(probability * 100)}%.",
            f"Grid position {payload.gridPosition} and backend-derived recent form score {recent_form_score} adjusted the baseline estimate.",
            f"Weather scenario '{payload.weatherCondition}' applied a lightweight simulation penalty/boost for interactive use.",
        ],
    }
