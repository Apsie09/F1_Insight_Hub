from __future__ import annotations

from typing import Any

import pandas as pd


def safe_int(value: Any, default: int = 0) -> int:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def weather_for_country(country: str) -> str:
    wet_countries = {"Singapore", "Belgium", "Brazil", "Netherlands", "United Kingdom"}
    mixed_countries = {"Italy", "Monaco", "Japan", "Canada", "USA"}
    if country in wet_countries:
        return "Wet"
    if country in mixed_countries:
        return "Mixed"
    return "Dry"


def season_hint(season: int) -> str:
    if season >= 2025:
        return "Current prediction-ready season"
    if season >= 2024:
        return "Recent archive benchmark"
    return "Historical benchmark season"


def prediction_support_label(season: int, min_train_year: int | None) -> str:
    if min_train_year is None:
        return "supported"
    if season < min_train_year:
        return "historical_estimate"
    return "supported"


def support_message(
    season: int,
    min_train_year: int | None,
    train_end_year: int | None,
    val_year: int | None,
    test_start_year: int | None,
) -> str:
    if min_train_year is None:
        return "Model support window metadata is unavailable."
    if season < min_train_year:
        return (
            f"This season is outside the model's validated training window. "
            f"The Top-10 model was trained on {min_train_year}-{train_end_year}, "
            f"validated on {val_year}, and tested on {test_start_year}+."
        )
    return (
        f"This season is within the model-supported era. "
        f"The Top-10 model was trained on {min_train_year}-{train_end_year}, "
        f"validated on {val_year}, and tested on {test_start_year}+."
    )


def track_length_km(circuit_name: str) -> float:
    overrides = {
        "Circuit de Monaco": 3.3,
        "Autodromo Nazionale di Monza": 5.8,
        "Silverstone Circuit": 5.9,
        "Bahrain International Circuit": 5.4,
    }
    return overrides.get(circuit_name, 5.4)


def estimated_laps(circuit_name: str) -> int:
    overrides = {
        "Circuit de Monaco": 78,
        "Autodromo Nazionale di Monza": 53,
        "Silverstone Circuit": 52,
        "Bahrain International Circuit": 57,
    }
    return overrides.get(circuit_name, 57)


def overtake_difficulty(circuit_name: str) -> str:
    hard = {"Circuit de Monaco", "Hungaroring", "Singapore Street Circuit"}
    easy = {"Bahrain International Circuit", "Autodromo Nazionale di Monza", "Red Bull Ring"}
    if circuit_name in hard:
        return "High"
    if circuit_name in easy:
        return "Low"
    return "Medium"


def confidence_label(probability: float) -> str:
    if probability >= 0.82:
        return "High"
    if probability >= 0.64:
        return "Medium"
    return "Low"


def recent_form_score(points_mean_last5: float, top10_rate_last10: float) -> int:
    if pd.isna(points_mean_last5):
        points_mean_last5 = 0.0
    if pd.isna(top10_rate_last10):
        top10_rate_last10 = 0.0
    points_component = min(max(points_mean_last5 / 25.0, 0.0), 1.0)
    top10_component = min(max(top10_rate_last10, 0.0), 1.0)
    blended = (0.6 * points_component) + (0.4 * top10_component)
    return int(round(100 * blended))


def trend_label(points_mean: float) -> str:
    if points_mean >= 12:
        return "Rising"
    if points_mean >= 6:
        return "Stable"
    return "Falling"


def racer_note(driver_name: str, team_name: str, probability: float, grid: int) -> str:
    return (
        f"{driver_name} enters with a modelled Top-10 probability of {round(probability * 100)}% "
        f"for {team_name}. Current projection assumes grid slot {grid} and pre-race-only history features."
    )


def trend_from_recent_form(recent_form_score_value: int | None) -> str:
    score = safe_int(recent_form_score_value, default=0)
    if score >= 70:
        return "Rising"
    if score >= 40:
        return "Stable"
    return "Falling"
