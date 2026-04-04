from __future__ import annotations

from collections.abc import Iterable
import json
from typing import Any

import pandas as pd

from config import ARCHIVE_DIR, CSV_NA_VALUES, FEATURED_RACE_LIMIT, TOP10_METADATA_PATH
from database import SessionLocal
from helpers import (
    estimated_laps,
    overtake_difficulty,
    prediction_support_label,
    safe_int,
    season_hint,
    support_message,
    track_length_km,
    weather_for_country,
)
from models import Constructor, Driver, Race, RaceContext, Season


def load_archive_tables() -> dict[str, pd.DataFrame]:
    required_files = {
        "races": ARCHIVE_DIR / "races.csv",
        "circuits": ARCHIVE_DIR / "circuits.csv",
        "drivers": ARCHIVE_DIR / "drivers.csv",
        "constructors": ARCHIVE_DIR / "constructors.csv",
        "results": ARCHIVE_DIR / "results.csv",
        "driver_standings": ARCHIVE_DIR / "driver_standings.csv",
    }
    missing = [str(path) for path in required_files.values() if not path.exists()]
    if missing:
        raise RuntimeError(f"Missing archive file(s): {missing}")

    return {
        name: pd.read_csv(path, na_values=CSV_NA_VALUES, keep_default_na=True, low_memory=False)
        for name, path in required_files.items()
    }


def load_training_years() -> dict[str, int]:
    if not TOP10_METADATA_PATH.exists():
        return {}
    with TOP10_METADATA_PATH.open("r", encoding="utf-8") as handle:
        metadata = json.load(handle)
    return metadata.get("training_years", {})


def prepare_records(tables: dict[str, pd.DataFrame], training_years: dict[str, int]) -> dict[str, list[dict[str, Any]]]:
    races_raw = tables["races"].copy()
    circuits = tables["circuits"][["circuitId", "name", "country", "alt"]].copy()
    drivers = tables["drivers"][["driverId", "forename", "surname", "number", "nationality"]].copy()
    constructors = tables["constructors"][["constructorId", "name"]].copy()
    results = tables["results"][["raceId", "driverId", "constructorId", "positionOrder"]].copy()
    driver_standings = tables["driver_standings"][["raceId", "driverId", "points", "wins"]].copy()

    races_raw["year"] = pd.to_numeric(races_raw["year"], errors="coerce").fillna(0).astype(int)
    races_raw["round"] = pd.to_numeric(races_raw["round"], errors="coerce").fillna(0).astype(int)
    races_raw["raceId"] = pd.to_numeric(races_raw["raceId"], errors="coerce").astype(int)
    circuits["circuitId"] = pd.to_numeric(circuits["circuitId"], errors="coerce").astype(int)
    drivers["driverId"] = pd.to_numeric(drivers["driverId"], errors="coerce").astype(int)
    drivers["number"] = pd.to_numeric(drivers["number"], errors="coerce")
    constructors["constructorId"] = pd.to_numeric(constructors["constructorId"], errors="coerce").astype(int)
    results["raceId"] = pd.to_numeric(results["raceId"], errors="coerce").astype(int)
    results["driverId"] = pd.to_numeric(results["driverId"], errors="coerce").astype(int)
    results["constructorId"] = pd.to_numeric(results["constructorId"], errors="coerce").astype(int)
    results["positionOrder"] = pd.to_numeric(results["positionOrder"], errors="coerce")
    driver_standings["raceId"] = pd.to_numeric(driver_standings["raceId"], errors="coerce").astype(int)
    driver_standings["driverId"] = pd.to_numeric(driver_standings["driverId"], errors="coerce").astype(int)
    driver_standings["points"] = pd.to_numeric(driver_standings["points"], errors="coerce").fillna(0.0)
    driver_standings["wins"] = pd.to_numeric(driver_standings["wins"], errors="coerce").fillna(0).astype(int)

    races_df = races_raw.merge(circuits, how="left", on="circuitId")
    races_df["raceId"] = races_df["raceId"].astype(str)
    races_df["season"] = races_df["year"]
    races_df["circuit"] = races_df["name_y"].fillna("Unknown Circuit")
    races_df["name"] = races_df["name_x"]
    races_df["country"] = races_df["country"].fillna("Unknown")
    races_df["weatherForecast"] = races_df["country"].map(weather_for_country).fillna("Dry")

    featured_ids = set(
        races_df.sort_values(["season", "round"], ascending=[False, False])
        .head(FEATURED_RACE_LIMIT)["raceId"]
        .astype(str)
        .tolist()
    )
    race_counts = races_df.groupby("season")["raceId"].count().to_dict()
    seasons_desc = sorted(races_df["season"].dropna().astype(int).unique().tolist(), reverse=True)

    season_records = [
        {
            "year": season,
            "label": f"Season {season}",
            "total_races": int(race_counts.get(season, 0)),
            "champion_hint": season_hint(season),
            "prediction_support": prediction_support_label(season, training_years.get("min_train_year")),
            "support_message": support_message(
                season,
                training_years.get("min_train_year"),
                training_years.get("train_end_year"),
                training_years.get("val_year"),
                training_years.get("test_start_year"),
            ),
        }
        for season in seasons_desc
    ]

    race_records = []
    race_context_records = []
    for _, row in races_df.iterrows():
        season = int(row["season"])
        race_id = str(row["raceId"])
        race_date = pd.to_datetime(row.get("date"), errors="coerce")
        race_records.append(
            {
                "id": race_id,
                "season_year": season,
                "round": int(row["round"]),
                "name": row["name"],
                "circuit": row["circuit"],
                "country": row["country"],
                "date": race_date.date() if pd.notna(race_date) else None,
                "weather_forecast": row["weatherForecast"],
                "spotlight": race_id in featured_ids,
                "prediction_support": prediction_support_label(season, training_years.get("min_train_year")),
                "support_message": support_message(
                    season,
                    training_years.get("min_train_year"),
                    training_years.get("train_end_year"),
                    training_years.get("val_year"),
                    training_years.get("test_start_year"),
                ),
            }
        )
        race_context_records.append(
            {
                "race_id": race_id,
                "track_length_km": round(track_length_km(str(row["circuit"])), 1),
                "laps": safe_int(estimated_laps(str(row["circuit"])), default=57),
                "altitude_m": safe_int(row.get("alt"), default=0),
                "overtake_difficulty": overtake_difficulty(str(row["circuit"])),
                "notes_json": ["Archive-derived race context seeded from CSV data."],
            }
        )

    latest_points = (
        driver_standings.sort_values(["raceId", "driverId"])
        .groupby("driverId", as_index=False)
        .tail(1)[["driverId", "points", "wins"]]
        .rename(columns={"points": "careerPoints", "wins": "wins"})
    )
    podiums = (
        results.assign(is_podium=lambda df: (df["positionOrder"] <= 3).fillna(False).astype(int))
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

    driver_records = [
        {
            "id": str(int(row["driverId"])),
            "name": row["name"] or f"Driver {int(row['driverId'])}",
            "team": row["team"] if pd.notna(row["team"]) else "Unknown Team",
            "number": safe_int(row["number"], default=0),
            "nationality": row["nationality"] if pd.notna(row["nationality"]) else "Unknown",
            "wins": int(row["wins"]),
            "podiums": int(row["podiums"]),
            "championships": int(row["championships"]),
            "career_points": int(round(float(row["careerPoints"]))),
            "style": row["style"],
        }
        for _, row in driver_profiles_df.sort_values("name").iterrows()
    ]

    constructor_records = [
        {"id": str(int(row["constructorId"])), "name": row["name"]}
        for _, row in constructors.sort_values("name").iterrows()
    ]

    return {
        "seasons": season_records,
        "races": race_records,
        "constructors": constructor_records,
        "drivers": driver_records,
        "race_context": race_context_records,
    }


def merge_records(session, model_class, records: Iterable[dict[str, Any]]) -> int:
    count = 0
    for record in records:
        session.merge(model_class(**record))
        count += 1
    return count


def main() -> None:
    training_years = load_training_years()
    tables = load_archive_tables()
    records = prepare_records(tables, training_years)

    with SessionLocal() as session:
        season_count = merge_records(session, Season, records["seasons"])
        constructor_count = merge_records(session, Constructor, records["constructors"])
        driver_count = merge_records(session, Driver, records["drivers"])
        race_count = merge_records(session, Race, records["races"])
        context_count = merge_records(session, RaceContext, records["race_context"])
        session.commit()

    print(
        "Archive ingestion completed: "
        f"{season_count} seasons, "
        f"{race_count} races, "
        f"{constructor_count} constructors, "
        f"{driver_count} drivers, "
        f"{context_count} race context rows."
    )


if __name__ == "__main__":
    main()
