from __future__ import annotations

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from helpers import estimated_laps, overtake_difficulty, safe_int, track_length_km, trend_from_recent_form
from models import Driver, ModelVersion, Race, RaceContext, RaceParticipant, RacePrediction, RacerRaceContextRecord, Season


def select_from_seasons():
    return select(Season).order_by(Season.year.desc())


def select_from_races(year: int | None = None):
    stmt = select(Race)
    if year is not None:
        stmt = stmt.where(Race.season_year == year).order_by(Race.round.asc())
    else:
        stmt = stmt.order_by(Race.season_year.desc(), Race.round.asc())
    return stmt


def select_featured_races(featured_race_limit: int):
    return (
        select(Race)
        .where(Race.spotlight.is_(True))
        .order_by(Race.season_year.desc(), Race.round.desc())
        .limit(featured_race_limit)
    )


def select_top10_predictions(race_id: str, model_version_id: int):
    return (
        select(RacePrediction, Driver)
        .join(Driver, Driver.id == RacePrediction.driver_id)
        .where(
            RacePrediction.race_id == race_id,
            RacePrediction.model_version_id == model_version_id,
        )
        .order_by(RacePrediction.top10_probability.desc(), Driver.name.asc())
        .limit(10)
    )


def select_participants_for_race(race_id: str, model_version_id: int):
    return (
        select(RaceParticipant, Driver, RacePrediction)
        .join(Driver, Driver.id == RaceParticipant.driver_id)
        .outerjoin(
            RacePrediction,
            (RacePrediction.race_id == RaceParticipant.race_id)
            & (RacePrediction.driver_id == RaceParticipant.driver_id)
            & (RacePrediction.model_version_id == model_version_id),
        )
        .where(RaceParticipant.race_id == race_id)
    )


def latest_model_version_id(db: Session) -> int | None:
    model_version = db.execute(
        select(ModelVersion).order_by(ModelVersion.created_at.desc(), ModelVersion.id.desc()).limit(1)
    ).scalar_one_or_none()
    if model_version is None:
        return None
    return model_version.id


def serialize_race(race: Race) -> dict[str, Any]:
    return {
        "id": race.id,
        "season": race.season_year,
        "round": race.round,
        "name": race.name,
        "circuit": race.circuit,
        "country": race.country,
        "date": race.date.isoformat() if race.date is not None else None,
        "weatherForecast": race.weather_forecast,
        "spotlight": race.spotlight,
        "predictionSupport": race.prediction_support,
        "supportMessage": race.support_message,
    }


def serialize_race_context(context: RaceContext) -> dict[str, Any]:
    return {
        "trackLengthKm": context.track_length_km if context.track_length_km is not None else 0.0,
        "laps": context.laps if context.laps is not None else 57,
        "altitudeM": context.altitude_m if context.altitude_m is not None else 0,
        "overtakeDifficulty": context.overtake_difficulty if context.overtake_difficulty is not None else "Medium",
        "notes": context.notes_json if isinstance(context.notes_json, list) else [],
    }


def default_race_context(race: Race) -> dict[str, Any]:
    return {
        "trackLengthKm": round(track_length_km(race.circuit), 1),
        "laps": safe_int(estimated_laps(race.circuit), default=57),
        "altitudeM": 0,
        "overtakeDifficulty": overtake_difficulty(race.circuit),
        "notes": ["Race context was reconstructed from backend defaults."],
    }


def serialize_driver(driver: Driver) -> dict[str, Any]:
    return {
        "id": driver.id,
        "name": driver.name,
        "team": driver.team if driver.team is not None else "Unknown Team",
        "number": driver.number if driver.number is not None else 0,
        "nationality": driver.nationality if driver.nationality is not None else "Unknown",
        "wins": driver.wins,
        "podiums": driver.podiums,
        "championships": driver.championships,
        "careerPoints": driver.career_points,
        "style": driver.style if driver.style is not None else "Race-scoped backend participant.",
    }


def serialize_participant_row(participant: RaceParticipant, driver: Driver, prediction: RacePrediction | None) -> dict[str, Any]:
    team_name = None
    if prediction is not None and prediction.constructor is not None:
        team_name = prediction.constructor.name
    if team_name is None and participant.constructor is not None:
        team_name = participant.constructor.name
    if team_name is None:
        team_name = driver.team if driver.team is not None else "Unknown Team"

    top10_probability = float(prediction.top10_probability) if prediction is not None else 0.0
    return {
        "id": driver.id,
        "name": driver.name,
        "team": team_name,
        "number": driver.number if driver.number is not None else 0,
        "nationality": driver.nationality if driver.nationality is not None else "Unknown",
        "wins": driver.wins,
        "podiums": driver.podiums,
        "championships": driver.championships,
        "careerPoints": driver.career_points,
        "style": driver.style if driver.style is not None else "Race-scoped backend participant.",
        "recentFormScore": participant.recent_form_score if participant.recent_form_score is not None else 0,
        "_grid": participant.grid if participant.grid is not None else 0,
        "_top10Probability": top10_probability,
    }


def serialize_racer_race_context(record: RacerRaceContextRecord | None, race_id: str) -> dict[str, Any]:
    if record is None:
        return {
            "raceId": race_id,
            "lastFinish": 0,
            "avgFinishAtCircuit": 0.0,
            "constructorMomentum": 0,
            "note": "No model context available for this racer/race pair yet.",
        }
    return {
        "raceId": race_id,
        "lastFinish": record.last_finish if record.last_finish is not None else 0,
        "avgFinishAtCircuit": record.avg_finish_at_circuit if record.avg_finish_at_circuit is not None else 0.0,
        "constructorMomentum": record.constructor_momentum if record.constructor_momentum is not None else 0,
        "note": record.note if record.note is not None else "No model context available for this racer/race pair yet.",
    }


def get_db_backed_calculation_inputs(db: Session, race_id: str, racer_id: str) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
    model_version_id = latest_model_version_id(db)
    if model_version_id is None:
        return None, None

    race = db.get(Race, race_id)
    prediction = db.execute(
        select(RacePrediction, Driver)
        .join(Driver, Driver.id == RacePrediction.driver_id)
        .where(
            RacePrediction.race_id == race_id,
            RacePrediction.driver_id == racer_id,
            RacePrediction.model_version_id == model_version_id,
        )
        .limit(1)
    ).first()
    if prediction is None:
        return None, serialize_race(race) if race is not None else None

    race_prediction, driver = prediction
    return (
        {
            "racerId": driver.id,
            "racerName": driver.name,
            "team": driver.team if race_prediction.constructor is None else race_prediction.constructor.name,
            "grid": race_prediction.grid if race_prediction.grid is not None else 0,
            "qualifyingPosition": race_prediction.qualifying_position if race_prediction.qualifying_position is not None else 0,
            "top10Probability": float(race_prediction.top10_probability),
            "recentFormScore": race_prediction.recent_form_score if race_prediction.recent_form_score is not None else 0,
        },
        serialize_race(race) if race is not None else None,
    )


def serialize_top10_rows(rows: list[tuple[RacePrediction, Driver]]) -> list[dict[str, Any]]:
    return [
        {
            "rank": idx,
            "racerId": prediction.driver_id,
            "racerName": driver.name,
            "team": driver.team if prediction.constructor is None else prediction.constructor.name,
            "grid": safe_int(prediction.grid, default=0),
            "qualifyingPosition": safe_int(prediction.qualifying_position, default=0),
            "top10Probability": round(float(prediction.top10_probability), 4),
            "formTrend": trend_from_recent_form(prediction.recent_form_score),
        }
        for idx, (prediction, driver) in enumerate(rows, start=1)
    ]
