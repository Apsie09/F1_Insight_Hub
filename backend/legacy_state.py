from __future__ import annotations

import json
from typing import Any

import joblib
import pandas as pd
from fastapi import HTTPException
from sqlalchemy import select

from config import (
    ARCHIVE_DIR,
    CSV_NA_VALUES,
    DB_SERVING_ENABLED,
    FEATURE_DF_PATH,
    LEGACY_FALLBACK_ENABLED,
    TOP10_METADATA_PATH,
    TOP10_PIPELINE_PATH,
)
from database import SessionLocal
from helpers import (
    confidence_label,
    estimated_laps,
    overtake_difficulty,
    prediction_support_label,
    racer_note,
    recent_form_score,
    safe_int,
    season_hint,
    support_message,
    track_length_km,
    trend_label,
    weather_for_country,
)
from models import Season


class BackendState:
    def __init__(self) -> None:
        self.pipeline = None
        self.feature_columns: list[str] = []
        self.feature_df: pd.DataFrame | None = None
        self.model_training_years: dict[str, int] = {}
        self.seasons: list[dict[str, Any]] = []
        self.races_by_id: dict[str, dict[str, Any]] = {}
        self.races_by_season: dict[int, list[dict[str, Any]]] = {}
        self.featured_races: list[dict[str, Any]] = []
        self.race_context_by_id: dict[str, dict[str, Any]] = {}
        self.race_predictions: dict[str, list[dict[str, Any]]] = {}
        self.race_participants: dict[str, list[dict[str, Any]]] = {}
        self.race_probability_lookup: dict[tuple[str, str], dict[str, Any]] = {}
        self.racer_profiles: list[dict[str, Any]] = []
        self.racer_profiles_by_id: dict[str, dict[str, Any]] = {}
        self.racer_context_by_key: dict[tuple[str, str], dict[str, Any]] = {}
        self.ready = False
        self.model_ready = False

    def load(self) -> None:
        self._load_model_assets()
        if DB_SERVING_ENABLED:
            self._verify_database_access()
        if LEGACY_FALLBACK_ENABLED or not DB_SERVING_ENABLED:
            tables = self._load_archive_tables()
            self._build_domain_cache(tables)
        self.ready = True

    def _load_archive_tables(self) -> dict[str, pd.DataFrame]:
        required_files = {
            "races": ARCHIVE_DIR / "races.csv",
            "circuits": ARCHIVE_DIR / "circuits.csv",
            "drivers": ARCHIVE_DIR / "drivers.csv",
            "constructors": ARCHIVE_DIR / "constructors.csv",
            "results": ARCHIVE_DIR / "results.csv",
            "qualifying": ARCHIVE_DIR / "qualifying.csv",
            "driver_standings": ARCHIVE_DIR / "driver_standings.csv",
        }
        missing = [str(path) for path in required_files.values() if not path.exists()]
        if missing:
            raise RuntimeError(f"Missing archive file(s): {missing}")

        return {
            name: pd.read_csv(path, na_values=CSV_NA_VALUES, keep_default_na=True, low_memory=False)
            for name, path in required_files.items()
        }

    def _load_model_assets(self) -> None:
        if not TOP10_METADATA_PATH.exists():
            self.model_ready = False
            self.pipeline = None
            self.feature_df = None
            self.feature_columns = []
            self.model_training_years = {}
            return

        with TOP10_METADATA_PATH.open("r", encoding="utf-8") as handle:
            metadata = json.load(handle)
        self.feature_columns = metadata.get("features_used", [])
        self.model_training_years = metadata.get("training_years", {})
        if LEGACY_FALLBACK_ENABLED:
            if not TOP10_PIPELINE_PATH.exists() or not FEATURE_DF_PATH.exists():
                self.model_ready = False
                self.pipeline = None
                self.feature_df = None
                return
            self.pipeline = joblib.load(TOP10_PIPELINE_PATH)
            self.feature_df = pd.read_parquet(FEATURE_DF_PATH)
        else:
            self.pipeline = None
            self.feature_df = None
        self.model_ready = True

    def _verify_database_access(self) -> None:
        with SessionLocal() as session:
            session.execute(select(Season).limit(1)).all()

    def _build_domain_cache(self, tables: dict[str, pd.DataFrame]) -> None:
        races_raw = tables["races"].copy()
        circuits = tables["circuits"][["circuitId", "name", "country", "alt"]].copy()
        results = tables["results"][["raceId", "driverId", "constructorId", "grid", "positionOrder", "points"]].copy()
        drivers = tables["drivers"][["driverId", "forename", "surname", "number", "nationality"]].copy()
        constructors = tables["constructors"][["constructorId", "name"]].copy()
        qualifying = tables["qualifying"][["raceId", "driverId", "position"]].copy()
        driver_standings = tables["driver_standings"][["raceId", "driverId", "points", "wins"]].copy()

        races_raw["year"] = pd.to_numeric(races_raw["year"], errors="coerce").fillna(0).astype(int)
        races_raw["round"] = pd.to_numeric(races_raw["round"], errors="coerce").fillna(0).astype(int)
        races_raw["raceId"] = pd.to_numeric(races_raw["raceId"], errors="coerce").astype(int)
        circuits["circuitId"] = pd.to_numeric(circuits["circuitId"], errors="coerce").astype(int)
        results["raceId"] = pd.to_numeric(results["raceId"], errors="coerce").astype(int)
        results["driverId"] = pd.to_numeric(results["driverId"], errors="coerce").astype(int)
        results["constructorId"] = pd.to_numeric(results["constructorId"], errors="coerce").astype(int)
        results["grid"] = pd.to_numeric(results["grid"], errors="coerce")
        results["positionOrder"] = pd.to_numeric(results["positionOrder"], errors="coerce")
        results["points"] = pd.to_numeric(results["points"], errors="coerce").fillna(0.0)
        drivers["driverId"] = pd.to_numeric(drivers["driverId"], errors="coerce").astype(int)
        drivers["number"] = pd.to_numeric(drivers["number"], errors="coerce")
        constructors["constructorId"] = pd.to_numeric(constructors["constructorId"], errors="coerce").astype(int)
        qualifying["raceId"] = pd.to_numeric(qualifying["raceId"], errors="coerce").astype(int)
        qualifying["driverId"] = pd.to_numeric(qualifying["driverId"], errors="coerce").astype(int)
        qualifying["position"] = pd.to_numeric(qualifying["position"], errors="coerce")
        driver_standings["raceId"] = pd.to_numeric(driver_standings["raceId"], errors="coerce").astype(int)
        driver_standings["driverId"] = pd.to_numeric(driver_standings["driverId"], errors="coerce").astype(int)
        driver_standings["points"] = pd.to_numeric(driver_standings["points"], errors="coerce").fillna(0.0)
        driver_standings["wins"] = pd.to_numeric(driver_standings["wins"], errors="coerce").fillna(0).astype(int)

        races_df = races_raw.merge(circuits, how="left", on="circuitId")
        races_df["raceId"] = races_df["raceId"].astype(str)
        races_df["id"] = races_df["raceId"]
        races_df["season"] = races_df["year"]
        races_df["circuit"] = races_df["name_y"].fillna("Unknown Circuit")
        races_df["name"] = races_df["name_x"]
        races_df["country"] = races_df["country"].fillna("Unknown")
        races_df["weatherForecast"] = races_df["country"].map(weather_for_country).fillna("Dry")
        races_df["spotlight"] = False

        race_counts = races_df.groupby("season")["raceId"].count().to_dict()
        seasons_desc = sorted(races_df["season"].dropna().astype(int).unique().tolist(), reverse=True)
        self.seasons = [
            {
                "year": season,
                "label": f"Season {season}",
                "totalRaces": int(race_counts.get(season, 0)),
                "championHint": season_hint(season),
                "predictionSupport": prediction_support_label(season, self.model_training_years.get("min_train_year")),
                "supportMessage": support_message(
                    season,
                    self.model_training_years.get("min_train_year"),
                    self.model_training_years.get("train_end_year"),
                    self.model_training_years.get("val_year"),
                    self.model_training_years.get("test_start_year"),
                ),
            }
            for season in seasons_desc
        ]

        race_records = []
        for _, row in races_df.sort_values(["season", "round"], ascending=[False, True]).iterrows():
            record = {
                "id": row["id"],
                "season": int(row["season"]),
                "round": int(row["round"]),
                "name": row["name"],
                "circuit": row["circuit"],
                "country": row["country"],
                "date": row["date"],
                "weatherForecast": row["weatherForecast"],
                "spotlight": bool(row["spotlight"]),
                "predictionSupport": prediction_support_label(int(row["season"]), self.model_training_years.get("min_train_year")),
                "supportMessage": support_message(
                    int(row["season"]),
                    self.model_training_years.get("min_train_year"),
                    self.model_training_years.get("train_end_year"),
                    self.model_training_years.get("val_year"),
                    self.model_training_years.get("test_start_year"),
                ),
                "_circuitId": int(row["circuitId"]),
                "_altitude": safe_int(row.get("alt"), default=0),
            }
            race_records.append(record)

        self.races_by_id = {record["id"]: {k: v for k, v in record.items() if not k.startswith("_")} for record in race_records}
        self.races_by_season = {}
        for record in race_records:
            public_record = {k: v for k, v in record.items() if not k.startswith("_")}
            self.races_by_season.setdefault(record["season"], []).append(public_record)
        for season in self.races_by_season:
            self.races_by_season[season].sort(key=lambda item: item["round"])

        self.featured_races = [{k: v for k, v in item.items() if not k.startswith("_")} for item in sorted(
            race_records, key=lambda item: (item["season"], item["round"]), reverse=True
        )[:6]]

        latest_points = (
            driver_standings.sort_values(["raceId", "driverId"])
            .groupby("driverId", as_index=False)
            .tail(1)[["driverId", "points", "wins"]]
            .rename(columns={"points": "careerPoints", "wins": "wins"})
        )
        podiums = (
            results.assign(positionOrder=pd.to_numeric(results["positionOrder"], errors="coerce"))
            .assign(is_podium=lambda df: (df["positionOrder"] <= 3).astype(int))
            .groupby("driverId", as_index=False)["is_podium"]
            .sum()
            .rename(columns={"is_podium": "podiums"})
        )
        latest_constructor = (
            results.sort_values(["raceId", "driverId"])
            .groupby("driverId", as_index=False)
            .tail(1)[["driverId", "constructorId"]]
            .merge(constructors, how="left", on="constructorId")
            .rename(columns={"name": "team"})
        )

        driver_profiles_df = (
            drivers.assign(name=lambda df: (df["forename"].fillna("") + " " + df["surname"].fillna("")).str.strip())
            .merge(latest_points, how="left", on="driverId")
            .merge(podiums, how="left", on="driverId")
            .merge(latest_constructor[["driverId", "team"]], how="left", on="driverId")
        )
        driver_profiles_df["wins"] = driver_profiles_df["wins"].fillna(0).astype(int)
        driver_profiles_df["podiums"] = driver_profiles_df["podiums"].fillna(0).astype(int)
        driver_profiles_df["careerPoints"] = driver_profiles_df["careerPoints"].fillna(0.0)
        driver_profiles_df["championships"] = 0
        driver_profiles_df["style"] = driver_profiles_df["team"].fillna("Unknown team").map(
            lambda team: f"Current team context: {team}. Race-specific narrative comes from backend ML outputs."
        )
        driver_profiles_df["id"] = driver_profiles_df["driverId"].astype(str)
        self.racer_profiles = [
            {
                "id": row["id"],
                "name": row["name"] or f"Driver {row['id']}",
                "team": row["team"] if pd.notna(row["team"]) else "Unknown Team",
                "number": safe_int(row["number"], default=0),
                "nationality": row["nationality"] if pd.notna(row["nationality"]) else "Unknown",
                "wins": int(row["wins"]),
                "podiums": int(row["podiums"]),
                "championships": int(row["championships"]),
                "careerPoints": int(round(float(row["careerPoints"]))),
                "style": row["style"],
            }
            for _, row in driver_profiles_df.sort_values("name").iterrows()
        ]
        self.racer_profiles_by_id = {profile["id"]: profile for profile in self.racer_profiles}

        if self.model_ready and self.feature_df is not None and self.pipeline is not None:
            model_df = self.feature_df.copy()
            model_df["raceId"] = model_df["raceId"].astype(str)
            model_df["driverId"] = model_df["driverId"].astype(str)
            model_df["constructorId"] = model_df["constructorId"].astype(str)
            prediction_input = model_df[self.feature_columns].copy()
            model_df["top10_probability"] = self.pipeline.predict_proba(prediction_input)[:, 1]
            model_df["grid"] = pd.to_numeric(model_df["grid"], errors="coerce")
            model_df["quali_position"] = pd.to_numeric(model_df["quali_position"], errors="coerce")

            constructor_names = constructors.rename(columns={"constructorId": "constructorId_int", "name": "constructor_name_csv"})
            model_df = model_df.assign(constructorId_int=pd.to_numeric(model_df["constructorId"], errors="coerce"))
            model_df = model_df.merge(
                constructor_names[["constructorId_int", "constructor_name_csv"]],
                how="left",
                on="constructorId_int",
            )

            race_meta_df = races_df.copy()
            race_meta_df["raceId"] = race_meta_df["raceId"].astype(str)
            model_df = model_df.merge(
                race_meta_df[["raceId", "season", "round", "name", "circuit", "country", "date", "circuitId", "alt"]],
                how="left",
                on="raceId",
                suffixes=("", "_race"),
            )

            qual_lookup = qualifying.rename(columns={"position": "qualifyingPosition"}).copy()
            qual_lookup["raceId"] = qual_lookup["raceId"].astype(str)
            qual_lookup["driverId"] = qual_lookup["driverId"].astype(str)
            model_df = model_df.merge(
                qual_lookup[["raceId", "driverId", "qualifyingPosition"]],
                how="left",
                on=["raceId", "driverId"],
            )

            results_lookup = results.copy()
            results_lookup["raceId"] = results_lookup["raceId"].astype(str)
            results_lookup["driverId"] = results_lookup["driverId"].astype(str)
            latest_finish_map = (
                results_lookup.sort_values(["raceId", "driverId"])
                .groupby("driverId", as_index=False)
                .tail(1)[["driverId", "positionOrder"]]
                .rename(columns={"positionOrder": "lastFinish"})
            )
            driver_circuit_avg = (
                model_df.groupby(["driverId", "circuitId"], as_index=False)["driver_avg_finish_at_circuit"]
                .last()
                .rename(columns={"driver_avg_finish_at_circuit": "avgFinishAtCircuit"})
            )
            team_momentum = (
                model_df.groupby(["raceId", "constructorId"], as_index=False)["team_top10_rate_last10"]
                .mean()
                .rename(columns={"team_top10_rate_last10": "constructorMomentum"})
            )

            for race_id, group in model_df.groupby("raceId"):
                ranked_records = []
                participant_records = []
                for idx, (_, row) in enumerate(group.sort_values("top10_probability", ascending=False).iterrows(), start=1):
                    driver_id = row["driverId"]
                    team_name = row["constructor_name"] if pd.notna(row.get("constructor_name")) else row.get("constructor_name_csv")
                    entry = {
                        "rank": idx,
                        "racerId": driver_id,
                        "racerName": row["driver_name"] if pd.notna(row.get("driver_name")) else self.racer_profiles_by_id.get(driver_id, {}).get("name", driver_id),
                        "team": team_name if pd.notna(team_name) else "Unknown Team",
                        "grid": safe_int(row.get("grid"), default=0),
                        "qualifyingPosition": safe_int(row.get("qualifyingPosition") or row.get("quali_position"), default=0),
                        "top10Probability": round(float(row["top10_probability"]), 4),
                        "formTrend": trend_label(float(row.get("driver_points_mean_last5", 0.0) or 0.0)),
                    }
                    ranked_records.append(entry)

                    base_profile = self.racer_profiles_by_id.get(driver_id, {})
                    participant_records.append(
                        {
                            "id": driver_id,
                            "name": entry["racerName"],
                            "team": entry["team"],
                            "number": base_profile.get("number", 0),
                            "nationality": base_profile.get("nationality", "Unknown"),
                            "wins": base_profile.get("wins", 0),
                            "podiums": base_profile.get("podiums", 0),
                            "championships": base_profile.get("championships", 0),
                            "careerPoints": base_profile.get("careerPoints", 0),
                            "style": base_profile.get("style", "Race-scoped backend participant."),
                            "recentFormScore": recent_form_score(
                                float(row.get("driver_points_mean_last5", 0.0) or 0.0),
                                float(row.get("driver_top10_rate_last10", 0.0) or 0.0),
                            ),
                            "_grid": entry["grid"],
                            "_qualifyingPosition": entry["qualifyingPosition"],
                            "_top10Probability": entry["top10Probability"],
                        }
                    )
                    self.race_probability_lookup[(race_id, driver_id)] = {
                        "racerId": driver_id,
                        "racerName": entry["racerName"],
                        "team": entry["team"],
                        "grid": entry["grid"],
                        "qualifyingPosition": entry["qualifyingPosition"],
                        "top10Probability": entry["top10Probability"],
                        "recentFormScore": recent_form_score(
                            float(row.get("driver_points_mean_last5", 0.0) or 0.0),
                            float(row.get("driver_top10_rate_last10", 0.0) or 0.0),
                        ),
                    }

                    last_finish = latest_finish_map.loc[latest_finish_map["driverId"] == driver_id, "lastFinish"]
                    avg_finish = driver_circuit_avg.loc[
                        (driver_circuit_avg["driverId"] == driver_id)
                        & (driver_circuit_avg["circuitId"] == row["circuitId"]),
                        "avgFinishAtCircuit",
                    ]
                    momentum = team_momentum.loc[
                        (team_momentum["raceId"] == race_id) & (team_momentum["constructorId"] == row["constructorId"]),
                        "constructorMomentum",
                    ]
                    self.racer_context_by_key[(driver_id, race_id)] = {
                        "raceId": race_id,
                        "lastFinish": safe_int(last_finish.iloc[0] if not last_finish.empty else None, default=0),
                        "avgFinishAtCircuit": round(float(avg_finish.iloc[0]), 1) if not avg_finish.empty and pd.notna(avg_finish.iloc[0]) else 0.0,
                        "constructorMomentum": safe_int(
                            (float(momentum.iloc[0]) * 100) if not momentum.empty and pd.notna(momentum.iloc[0]) else None,
                            default=0,
                        ),
                        "note": racer_note(
                            driver_name=entry["racerName"],
                            team_name=entry["team"],
                            probability=entry["top10Probability"],
                            grid=entry["grid"],
                        ),
                    }

                self.race_predictions[race_id] = ranked_records[:10]
                self.race_participants[race_id] = [
                    {k: v for k, v in record.items() if not k.startswith("_")}
                    for record in sorted(
                        participant_records,
                        key=lambda item: (
                            item["_grid"] <= 0,
                            item["_grid"] if item["_grid"] > 0 else 999,
                            -item["_top10Probability"],
                            item["name"],
                        ),
                    )
                ]
                if race_id in self.races_by_id:
                    self.races_by_id[race_id]["spotlight"] = race_id in self.race_predictions

                race_row = group.iloc[0]
                self.race_context_by_id[race_id] = {
                    "trackLengthKm": round(track_length_km(str(race_row.get("circuit", ""))), 1),
                    "laps": safe_int(estimated_laps(str(race_row.get("circuit", ""))), default=57),
                    "altitudeM": safe_int(race_row.get("alt"), default=0),
                    "overtakeDifficulty": overtake_difficulty(str(race_row.get("circuit", ""))),
                    "notes": [
                        f"Predictions are generated from the Top-10 XGBoost pipeline using pre-race features for race {race_id}.",
                        f"Backend currently serves the top {len(self.race_predictions[race_id])} probabilities from local model artifacts.",
                        support_message(
                            safe_int(race_row.get("season"), default=0),
                            self.model_training_years.get("min_train_year"),
                            self.model_training_years.get("train_end_year"),
                            self.model_training_years.get("val_year"),
                            self.model_training_years.get("test_start_year"),
                        ),
                    ],
                }

        for race_id, race in self.races_by_id.items():
            self.race_context_by_id.setdefault(
                race_id,
                {
                    "trackLengthKm": round(track_length_km(race["circuit"]), 1),
                    "laps": safe_int(estimated_laps(race["circuit"]), default=57),
                    "altitudeM": 0,
                    "overtakeDifficulty": overtake_difficulty(race["circuit"]),
                    "notes": ["ML race context unavailable. Backend served archive-only metadata."],
                },
            )

    def require_ready(self) -> None:
        if not self.ready:
            raise HTTPException(status_code=503, detail="Backend state is not loaded.")

    def require_model(self) -> None:
        if not self.model_ready:
            raise HTTPException(
                status_code=503,
                detail="Top-10 model artifacts are unavailable. Configure F1_TOP10_* paths first.",
            )
