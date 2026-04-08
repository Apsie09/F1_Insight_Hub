from __future__ import annotations

from contextlib import asynccontextmanager
from secrets import token_urlsafe
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import authenticate_user, create_user
from config import DATA_ROOT, F1_SERVING_MODE, FEATURED_RACE_LIMIT, LEGACY_FALLBACK_ENABLED
from database import get_db_session
from db_queries import (
    default_race_context,
    get_db_backed_calculation_inputs,
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
from helpers import confidence_label, support_message
from legacy_state import BackendState
from models import AppUser, Driver, Race, RaceContext, RacerRaceContextRecord
from schemas import AuthResponsePayload, CalculatorInputPayload, LoginPayload, RegisterPayload


state = BackendState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    state.load()
    yield


app = FastAPI(
    title="F1 Insight Hub Backend",
    description="FastAPI backend serving F1 archive data and Top-10 model inference for the mobile app.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def healthcheck() -> dict[str, Any]:
    return {
        "status": "ok",
        "dataRoot": str(DATA_ROOT),
        "archiveReady": state.ready,
        "modelReady": state.model_ready,
        "featureCount": len(state.feature_columns),
        "trainingYears": state.model_training_years,
        "servingMode": F1_SERVING_MODE,
        "legacyFallbackEnabled": LEGACY_FALLBACK_ENABLED,
    }


def serialize_auth_user(user: AppUser) -> dict[str, Any]:
    return {
        "id": user.id,
        "email": user.email,
        "displayName": user.display_name,
    }


def auth_success_response(user: AppUser) -> dict[str, Any]:
    return {
        "token": token_urlsafe(32),
        "user": serialize_auth_user(user),
    }


@app.post("/auth/register", response_model=AuthResponsePayload, status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterPayload, db: Session = Depends(get_db_session)) -> dict[str, Any]:
    try:
        user = create_user(
            db,
            email=payload.email,
            password=payload.password,
            display_name=payload.displayName,
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error

    return auth_success_response(user)


@app.post("/auth/login", response_model=AuthResponsePayload)
def login_user(payload: LoginPayload, db: Session = Depends(get_db_session)) -> dict[str, Any]:
    user = authenticate_user(db, email=payload.email, password=payload.password)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    return auth_success_response(user)
@app.get("/seasons")
def get_seasons(db: Session = Depends(get_db_session)) -> list[dict[str, Any]]:
    state.require_ready()
    seasons = db.execute(select_from_seasons()).scalars().all()
    if seasons:
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
    return state.seasons


@app.get("/seasons/{year}/races")
def get_races_by_season(year: int, db: Session = Depends(get_db_session)) -> list[dict[str, Any]]:
    state.require_ready()
    races = db.execute(select_from_races(year)).scalars().all()
    if races:
        return [serialize_race(race) for race in races]
    return state.races_by_season.get(year, [])


@app.get("/races")
def get_all_races(db: Session = Depends(get_db_session)) -> list[dict[str, Any]]:
    state.require_ready()
    races = db.execute(select_from_races()).scalars().all()
    if races:
        return [serialize_race(race) for race in races]
    flattened_races: list[dict[str, Any]] = []
    for year in sorted(state.races_by_season.keys(), reverse=True):
        flattened_races.extend(state.races_by_season[year])
    return flattened_races


@app.get("/races/featured")
def get_featured_races(db: Session = Depends(get_db_session)) -> list[dict[str, Any]]:
    state.require_ready()
    races = db.execute(select_featured_races(FEATURED_RACE_LIMIT)).scalars().all()
    if races:
        return [serialize_race(race) for race in races]
    return state.featured_races


@app.get("/races/{race_id}")
def get_race_details(race_id: str, db: Session = Depends(get_db_session)) -> dict[str, Any]:
    state.require_ready()
    race = db.get(Race, race_id)
    if race is not None:
        context = db.get(RaceContext, race_id)
        return {
            "race": serialize_race(race),
            "context": serialize_race_context(context) if context is not None else default_race_context(race),
        }

    fallback_race = state.races_by_id.get(race_id)
    if fallback_race is None:
        raise HTTPException(status_code=404, detail=f"Race not found: {race_id}")
    return {"race": fallback_race, "context": state.race_context_by_id[race_id]}


@app.get("/races/{race_id}/predictions/top10")
def get_top10_prediction(race_id: str, db: Session = Depends(get_db_session)) -> list[dict[str, Any]]:
    state.require_ready()
    state.require_model()
    model_version_id = latest_model_version_id(db)
    if model_version_id is not None:
        rows = db.execute(select_top10_predictions(race_id, model_version_id)).all()
        if rows:
            return serialize_top10_rows(rows)

    predictions = state.race_predictions.get(race_id)
    if predictions is None:
        raise HTTPException(status_code=404, detail=f"No prediction rows found for race {race_id}")
    return predictions


@app.get("/races/{race_id}/participants")
def get_race_participants(race_id: str, db: Session = Depends(get_db_session)) -> list[dict[str, Any]]:
    state.require_ready()
    model_version_id = latest_model_version_id(db)
    if model_version_id is not None:
        rows = db.execute(select_participants_for_race(race_id, model_version_id)).all()
        if rows:
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

    participants = state.race_participants.get(race_id)
    if participants is None:
        raise HTTPException(status_code=404, detail=f"No participants found for race {race_id}")
    return participants


@app.get("/races/{race_id}/racers/{racer_id}")
def get_racer_details(race_id: str, racer_id: str, db: Session = Depends(get_db_session)) -> dict[str, Any]:
    state.require_ready()
    driver = db.get(Driver, racer_id)
    race = db.get(Race, race_id)
    if driver is not None and race is not None:
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

    profile = state.racer_profiles_by_id.get(racer_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Racer not found: {racer_id}")

    fallback_race = state.races_by_id.get(race_id)
    if fallback_race is None:
        raise HTTPException(status_code=404, detail=f"Race not found: {race_id}")

    race_context = state.racer_context_by_key.get(
        (racer_id, race_id),
        {
            "raceId": race_id,
            "lastFinish": 0,
            "avgFinishAtCircuit": 0.0,
            "constructorMomentum": 0,
            "note": "No model context available for this racer/race pair yet.",
        },
    )

    return {"profile": profile, "raceContext": race_context}


@app.get("/racers")
def get_racers(db: Session = Depends(get_db_session)) -> list[dict[str, Any]]:
    state.require_ready()
    drivers = db.execute(select(Driver).order_by(Driver.name.asc())).scalars().all()
    if drivers:
        return [serialize_driver(driver) for driver in drivers]
    return state.racer_profiles


@app.post("/predictions/calculate")
def calculate_prediction(payload: CalculatorInputPayload, db: Session = Depends(get_db_session)) -> dict[str, Any]:
    state.require_ready()
    state.require_model()

    race_id = payload.raceId
    racer_id = payload.racerId

    matching, race_payload = get_db_backed_calculation_inputs(db, race_id, racer_id)
    if matching is None:
        matching = state.race_probability_lookup.get((race_id, racer_id))
        race_payload = state.races_by_id.get(race_id, {})
    if matching is None:
        raise HTTPException(status_code=404, detail=f"Racer {racer_id} not found in race {race_id}")

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
                state.model_training_years.get("min_train_year"),
                state.model_training_years.get("train_end_year"),
                state.model_training_years.get("val_year"),
                state.model_training_years.get("test_start_year"),
            ),
        ),
        "reasoning": [
            f"Base backend model probability for {matching['racerName']} in race {race_id}: {round(probability * 100)}%.",
            f"Grid position {payload.gridPosition} and backend-derived recent form score {recent_form_score} adjusted the baseline estimate.",
            f"Weather scenario '{payload.weatherCondition}' applied a lightweight simulation penalty/boost for interactive use.",
        ],
    }






