from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import joblib
import pandas as pd
from sqlalchemy import select

from config import ARCHIVE_DIR, CSV_NA_VALUES, FEATURE_DF_PATH, TOP10_METADATA_PATH, TOP10_PIPELINE_PATH
from database import SessionLocal
from helpers import confidence_label, prediction_support_label, racer_note, recent_form_score
from models import Constructor, Driver, ModelVersion, Race, RaceParticipant, RacePrediction, RacerRaceContextRecord


def load_required_inputs() -> tuple[pd.DataFrame, dict[str, Any], Any, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    if not TOP10_PIPELINE_PATH.exists() or not TOP10_METADATA_PATH.exists() or not FEATURE_DF_PATH.exists():
        raise RuntimeError("Model artifacts are missing. Expected feature_df, metadata, and pipeline files.")

    pipeline = joblib.load(TOP10_PIPELINE_PATH)
    with TOP10_METADATA_PATH.open("r", encoding="utf-8") as handle:
        metadata = json.load(handle)

    feature_df = pd.read_parquet(FEATURE_DF_PATH)
    qualifying = pd.read_csv(
        ARCHIVE_DIR / "qualifying.csv",
        na_values=CSV_NA_VALUES,
        keep_default_na=True,
        low_memory=False,
    )
    constructors = pd.read_csv(
        ARCHIVE_DIR / "constructors.csv",
        na_values=CSV_NA_VALUES,
        keep_default_na=True,
        low_memory=False,
    )
    results = pd.read_csv(
        ARCHIVE_DIR / "results.csv",
        na_values=CSV_NA_VALUES,
        keep_default_na=True,
        low_memory=False,
    )
    return feature_df, metadata, pipeline, qualifying, constructors, results


def get_or_create_model_version(session, metadata: dict[str, Any]) -> ModelVersion:
    task = metadata.get("task", "top10")
    timestamp = metadata.get("timestamp", "unknown")
    version_label = str(timestamp)
    model_name = f"{task}_xgboost"

    existing = session.scalar(
        select(ModelVersion).where(
            ModelVersion.model_name == model_name,
            ModelVersion.version_label == version_label,
        )
    )
    if existing is not None:
        existing.artifact_path = str(TOP10_PIPELINE_PATH)
        existing.metadata_path = str(TOP10_METADATA_PATH)
        existing.feature_count = len(metadata.get("features_used", []))
        existing.min_train_year = metadata.get("training_years", {}).get("min_train_year")
        existing.train_end_year = metadata.get("training_years", {}).get("train_end_year")
        existing.val_year = metadata.get("training_years", {}).get("val_year")
        existing.test_start_year = metadata.get("training_years", {}).get("test_start_year")
        existing.notes = "Batch-published from local feature parquet and saved pipeline artifacts."
        return existing

    trained_at = None
    if timestamp and timestamp != "unknown":
        try:
            trained_at = datetime.fromisoformat(str(timestamp).replace("Z", "+00:00"))
        except ValueError:
            trained_at = None

    model_version = ModelVersion(
        model_name=model_name,
        version_label=version_label,
        artifact_path=str(TOP10_PIPELINE_PATH),
        metadata_path=str(TOP10_METADATA_PATH),
        feature_count=len(metadata.get("features_used", [])),
        min_train_year=metadata.get("training_years", {}).get("min_train_year"),
        train_end_year=metadata.get("training_years", {}).get("train_end_year"),
        val_year=metadata.get("training_years", {}).get("val_year"),
        test_start_year=metadata.get("training_years", {}).get("test_start_year"),
        trained_at=trained_at,
        notes="Batch-published from local feature parquet and saved pipeline artifacts.",
    )
    session.add(model_version)
    session.flush()
    return model_version


def build_model_frame(
    feature_df: pd.DataFrame,
    metadata: dict[str, Any],
    pipeline: Any,
    qualifying: pd.DataFrame,
    constructors: pd.DataFrame,
    results: pd.DataFrame,
) -> pd.DataFrame:
    feature_columns = metadata.get("features_used", [])
    model_df = feature_df.copy()
    model_df["raceId"] = model_df["raceId"].astype(str)
    model_df["driverId"] = model_df["driverId"].astype(str)
    model_df["constructorId"] = model_df["constructorId"].astype(str)

    prediction_input = model_df[feature_columns].copy()
    probabilities = pipeline.predict_proba(prediction_input)[:, 1]
    model_df["top10_probability"] = probabilities
    model_df["grid"] = pd.to_numeric(model_df["grid"], errors="coerce")
    model_df["quali_position"] = pd.to_numeric(model_df["quali_position"], errors="coerce")
    model_df["year"] = pd.to_numeric(model_df["year"], errors="coerce").fillna(0).astype(int)

    qualifying = qualifying.rename(columns={"position": "qualifyingPosition"}).copy()
    qualifying["raceId"] = pd.to_numeric(qualifying["raceId"], errors="coerce").fillna(0).astype(int).astype(str)
    qualifying["driverId"] = pd.to_numeric(qualifying["driverId"], errors="coerce").fillna(0).astype(int).astype(str)
    qualifying["qualifyingPosition"] = pd.to_numeric(qualifying["qualifyingPosition"], errors="coerce")
    model_df = model_df.merge(
        qualifying[["raceId", "driverId", "qualifyingPosition"]],
        how="left",
        on=["raceId", "driverId"],
    )

    constructors = constructors.rename(columns={"name": "constructor_name_csv"}).copy()
    constructors["constructorId"] = pd.to_numeric(constructors["constructorId"], errors="coerce").fillna(0).astype(int).astype(str)
    model_df = model_df.merge(
        constructors[["constructorId", "constructor_name_csv"]],
        how="left",
        on="constructorId",
    )
    results = results.copy()
    results["raceId"] = pd.to_numeric(results["raceId"], errors="coerce").fillna(0).astype(int).astype(str)
    results["driverId"] = pd.to_numeric(results["driverId"], errors="coerce").fillna(0).astype(int).astype(str)
    results["positionOrder"] = pd.to_numeric(results["positionOrder"], errors="coerce")

    latest_finish_map = (
        results.sort_values(["raceId", "driverId"])
        .groupby("driverId", as_index=False)
        .tail(1)[["driverId", "positionOrder"]]
        .rename(columns={"positionOrder": "lastFinish"})
    )
    model_df = model_df.merge(latest_finish_map, how="left", on="driverId")

    driver_circuit_avg = (
        model_df.groupby(["driverId", "circuitId"], as_index=False)["driver_avg_finish_at_circuit"]
        .last()
        .rename(columns={"driver_avg_finish_at_circuit": "avgFinishAtCircuit"})
    )
    model_df = model_df.merge(driver_circuit_avg, how="left", on=["driverId", "circuitId"])

    team_momentum = (
        model_df.groupby(["raceId", "constructorId"], as_index=False)["team_top10_rate_last10"]
        .mean()
        .rename(columns={"team_top10_rate_last10": "constructorMomentum"})
    )
    model_df = model_df.merge(team_momentum, how="left", on=["raceId", "constructorId"])

    model_df = (
        model_df.sort_values(["raceId", "driverId"])
        .drop_duplicates(subset=["raceId", "driverId"], keep="last")
        .reset_index(drop=True)
    )

    return model_df


def ensure_references_exist(session, model_df: pd.DataFrame) -> None:
    race_ids = {row[0] for row in session.execute(select(Race.id))}
    driver_ids = {row[0] for row in session.execute(select(Driver.id))}
    constructor_ids = {row[0] for row in session.execute(select(Constructor.id))}

    missing_races = sorted(set(model_df["raceId"].unique()) - race_ids)
    missing_drivers = sorted(set(model_df["driverId"].unique()) - driver_ids)
    missing_constructors = sorted(set(model_df["constructorId"].unique()) - constructor_ids)

    issues = []
    if missing_races:
        issues.append(f"missing races: {missing_races[:5]}")
    if missing_drivers:
        issues.append(f"missing drivers: {missing_drivers[:5]}")
    if missing_constructors:
        issues.append(f"missing constructors: {missing_constructors[:5]}")

    if issues:
        raise RuntimeError(
            "Prediction publish requires archive ingestion first; unresolved foreign keys detected: "
            + "; ".join(issues)
        )


def main() -> None:
    feature_df, metadata, pipeline, qualifying, constructors, results = load_required_inputs()
    model_df = build_model_frame(feature_df, metadata, pipeline, qualifying, constructors, results)

    with SessionLocal() as session:
        ensure_references_exist(session, model_df)
        model_version = get_or_create_model_version(session, metadata)
        model_version_label = model_version.version_label

        existing_participants = {
            (participant.race_id, participant.driver_id): participant
            for participant in session.scalars(select(RaceParticipant)).all()
        }
        existing_predictions = {
            (prediction.race_id, prediction.driver_id, prediction.model_version_id): prediction
            for prediction in session.scalars(
                select(RacePrediction).where(RacePrediction.model_version_id == model_version.id)
            ).all()
        }
        existing_racer_context = {
            (record.race_id, record.driver_id): record
            for record in session.scalars(select(RacerRaceContextRecord)).all()
        }

        participant_count = 0
        prediction_count = 0
        racer_context_count = 0

        for _, row in model_df.iterrows():
            race_id = str(row["raceId"])
            driver_id = str(row["driverId"])
            constructor_id = str(row["constructorId"])
            qualifying_position = row.get("qualifyingPosition")
            if pd.isna(qualifying_position):
                qualifying_position = row.get("quali_position")

            recent_form = recent_form_score(
                float(row.get("driver_points_mean_last5", 0.0) or 0.0),
                float(row.get("driver_top10_rate_last10", 0.0) or 0.0),
            )
            participant_key = (race_id, driver_id)
            participant = existing_participants.get(participant_key)
            if participant is None:
                participant = RaceParticipant(race_id=race_id, driver_id=driver_id)
                session.add(participant)
                existing_participants[participant_key] = participant
            participant.constructor_id = constructor_id
            participant.grid = _coerce_int(row.get("grid"))
            participant.qualifying_position = _coerce_int(qualifying_position)
            participant.recent_form_score = recent_form
            participant_count += 1

            prediction_key = (race_id, driver_id, model_version.id)
            prediction = existing_predictions.get(prediction_key)
            if prediction is None:
                prediction = RacePrediction(
                    race_id=race_id,
                    driver_id=driver_id,
                    model_version_id=model_version.id,
                )
                session.add(prediction)
                existing_predictions[prediction_key] = prediction
            prediction.constructor_id = constructor_id
            prediction.grid = _coerce_int(row.get("grid"))
            prediction.qualifying_position = _coerce_int(qualifying_position)
            prediction.recent_form_score = recent_form
            prediction.top10_probability = float(row["top10_probability"])
            prediction.confidence = confidence_label(float(row["top10_probability"]))
            prediction.prediction_support = prediction_support_label(
                int(row["year"]),
                metadata.get("training_years", {}).get("min_train_year"),
            )
            prediction_count += 1

            context_key = (race_id, driver_id)
            racer_context = existing_racer_context.get(context_key)
            if racer_context is None:
                racer_context = RacerRaceContextRecord(race_id=race_id, driver_id=driver_id)
                session.add(racer_context)
                existing_racer_context[context_key] = racer_context
            racer_context.last_finish = _coerce_int(row.get("lastFinish"))
            racer_context.avg_finish_at_circuit = _coerce_float(row.get("avgFinishAtCircuit"))
            constructor_momentum = row.get("constructorMomentum")
            racer_context.constructor_momentum = (
                _coerce_int(float(constructor_momentum) * 100)
                if constructor_momentum is not None and not pd.isna(constructor_momentum)
                else 0
            )
            team_name = row.get("constructor_name_csv")
            racer_context.note = racer_note(
                driver_name=row.get("driver_name", driver_id),
                team_name=team_name if team_name is not None and not pd.isna(team_name) else "Unknown Team",
                probability=float(row["top10_probability"]),
                grid=_coerce_int(row.get("grid")) or 0,
            )
            racer_context_count += 1

        session.commit()

    print(
        "Prediction publish completed: "
        f"{participant_count} participant rows processed, "
        f"{prediction_count} prediction rows processed, "
        f"{racer_context_count} racer-context rows processed, "
        f"model version='{model_version_label}'."
    )


def _coerce_int(value: Any) -> int | None:
    if value is None or pd.isna(value):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _coerce_float(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


if __name__ == "__main__":
    main()
