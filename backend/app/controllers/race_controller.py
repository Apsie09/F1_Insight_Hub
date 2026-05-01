from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies.auth_dependencies import get_current_user
from app.models.database import get_db_session
from app.models.entities import AppUser, Driver, Race, RaceContext, RacerRaceContextRecord
from app.models.queries import (
    default_race_context,
    latest_model_version_id,
    select_featured_races,
    select_from_races,
    select_from_seasons,
    select_participants_for_race,
    select_top10_predictions,
    serialize_driver,
    serialize_participant_row,
    serialize_race,
    serialize_race_context,
    serialize_racer_race_context,
    serialize_top10_rows,
)
from app.core.config import FEATURED_RACE_LIMIT


router = APIRouter(tags=["races"])


@router.get("/seasons")
def get_seasons(
    _current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> list[dict[str, Any]]:
    seasons = db.execute(select_from_seasons()).scalars().all()
    return [
        {
            "year": season.year,
            "label": season.label,
            "totalRaces": season.total_races,
            "championHint": season.champion_hint,
            "predictionSupport": season.prediction_support,
            "supportMessage": season.support_message,
        }
        for season in seasons
    ]


@router.get("/seasons/{year}/races")
def get_races_by_season(
    year: int,
    _current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> list[dict[str, Any]]:
    races = db.execute(select_from_races(year)).scalars().all()
    return [serialize_race(race) for race in races]


@router.get("/races")
def get_all_races(
    _current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> list[dict[str, Any]]:
    races = db.execute(select_from_races()).scalars().all()
    return [serialize_race(race) for race in races]


@router.get("/races/featured")
def get_featured_races(
    _current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> list[dict[str, Any]]:
    races = db.execute(select_featured_races(FEATURED_RACE_LIMIT)).scalars().all()
    return [serialize_race(race) for race in races]


@router.get("/races/{race_id}")
def get_race_details(
    race_id: str,
    _current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> dict[str, Any]:
    race = db.get(Race, race_id)
    if race is None:
        raise HTTPException(status_code=404, detail=f"Race not found: {race_id}")
    context = db.get(RaceContext, race_id)
    return {
        "race": serialize_race(race),
        "context": serialize_race_context(context) if context is not None else default_race_context(race),
    }


@router.get("/races/{race_id}/predictions/top10")
def get_top10_prediction(
    race_id: str,
    _current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> list[dict[str, Any]]:
    model_version_id = latest_model_version_id(db)
    if model_version_id is None:
        raise HTTPException(status_code=503, detail="No published Top-10 model version found.")
    rows = db.execute(select_top10_predictions(race_id, model_version_id)).all()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No prediction rows found for race {race_id}")
    return serialize_top10_rows(rows)


@router.get("/races/{race_id}/participants")
def get_race_participants(
    race_id: str,
    _current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> list[dict[str, Any]]:
    model_version_id = latest_model_version_id(db)
    if model_version_id is None:
        raise HTTPException(status_code=503, detail="No published Top-10 model version found.")
    rows = db.execute(select_participants_for_race(race_id, model_version_id)).all()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No participants found for race {race_id}")
    payload = [serialize_participant_row(participant, driver, prediction) for participant, driver, prediction in rows]
    payload.sort(
        key=lambda item: (
            item["_grid"] <= 0,
            item["_grid"] if item["_grid"] > 0 else 999,
            -item["_top10Probability"],
            item["name"],
        )
    )
    return [{k: v for k, v in item.items() if not k.startswith("_")} for item in payload]


@router.get("/races/{race_id}/racers/{racer_id}")
def get_racer_details(
    race_id: str,
    racer_id: str,
    _current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> dict[str, Any]:
    driver = db.get(Driver, racer_id)
    race = db.get(Race, race_id)
    if driver is None:
        raise HTTPException(status_code=404, detail=f"Racer not found: {racer_id}")
    if race is None:
        raise HTTPException(status_code=404, detail=f"Race not found: {race_id}")
    context_record = db.execute(
        select(RacerRaceContextRecord).where(
            RacerRaceContextRecord.race_id == race_id,
            RacerRaceContextRecord.driver_id == racer_id,
        )
    ).scalar_one_or_none()
    return {
        "profile": serialize_driver(driver),
        "raceContext": serialize_racer_race_context(context_record, race_id),
    }


@router.get("/racers")
def get_racers(
    _current_user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db_session),
) -> list[dict[str, Any]]:
    drivers = db.execute(select(Driver).order_by(Driver.name.asc())).scalars().all()
    return [serialize_driver(driver) for driver in drivers]
