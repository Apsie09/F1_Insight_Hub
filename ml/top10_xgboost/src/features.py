from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd

ID_COLUMNS = ["raceId", "year", "round", "date", "driverId", "constructorId", "circuitId"]

DISPLAY_COLUMNS = ["driver_name", "constructor_name", "circuit_country"]

FEATURE_COLUMNS = [
    "year",
    "round",
    "circuitId",
    "circuit_country",
    "circuit_alt",
    "circuit_lat",
    "circuit_lng",
    "driverId",
    "constructorId",
    "grid",
    "grid_missing",
    "grid_zero",
    "quali_position",
    "q1_seconds",
    "q2_seconds",
    "q3_seconds",
    "quali_position_gap_to_best",
    "quali_position_gap_to_median",
    "q1_seconds_gap_to_best",
    "q1_seconds_gap_to_median",
    "q2_seconds_gap_to_best",
    "q2_seconds_gap_to_median",
    "q3_seconds_gap_to_best",
    "q3_seconds_gap_to_median",
    "q2_minus_q1_seconds",
    "q3_minus_q2_seconds",
    "grid_delta_vs_teammate",
    "quali_delta_vs_teammate",
    "has_qualifying_data",
    "qualifying_missing",
    "driver_points_mean_last5",
    "driver_finishpos_mean_last5",
    "driver_top10_rate_last10",
    "driver_dnf_rate_last20",
    "team_points_mean_last5",
    "team_top10_rate_last10",
    "team_dnf_rate_last20",
    "driver_avg_finish_at_circuit",
    "driver_top10_rate_at_circuit",
]

TARGET_COLUMNS = ["y_top10", "y_dnf"]

CATEGORICAL_FEATURES = ["driverId", "constructorId", "circuitId", "circuit_country"]


def parse_time_to_seconds(raw_value: object) -> float:
    if pd.isna(raw_value):
        return np.nan

    value = str(raw_value).strip()
    if not value or value == "\\N":
        return np.nan

    if ":" in value:
        parts = value.split(":")
        try:
            if len(parts) == 2:
                minutes, seconds = parts
                return float(minutes) * 60.0 + float(seconds)
            if len(parts) == 3:
                hours, minutes, seconds = parts
                return float(hours) * 3600.0 + float(minutes) * 60.0 + float(seconds)
        except ValueError:
            return np.nan

    try:
        return float(value)
    except ValueError:
        return np.nan


def _to_numeric(df: pd.DataFrame, columns: Iterable[str]) -> pd.DataFrame:
    for column in columns:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")
    return df


def _shifted_rolling_mean(series: pd.Series, window: int) -> pd.Series:
    return series.shift(1).rolling(window=window, min_periods=1).mean()


def _shifted_expanding_mean(series: pd.Series) -> pd.Series:
    return series.shift(1).expanding(min_periods=1).mean()


def build_modeling_table(tables: dict[str, pd.DataFrame]) -> pd.DataFrame:
    required_tables = ["results", "races", "circuits", "status"]
    missing_required = [name for name in required_tables if name not in tables]
    if missing_required:
        raise ValueError(f"Missing required table(s): {missing_required}")

    results = tables["results"].copy()
    races = tables["races"][["raceId", "year", "round", "circuitId", "date"]].copy()
    circuits = tables["circuits"][["circuitId", "country", "lat", "lng", "alt"]].copy()
    status = tables["status"][["statusId", "status"]].copy()

    _to_numeric(
        results,
        ["raceId", "driverId", "constructorId", "grid", "positionOrder", "points", "statusId"],
    )
    _to_numeric(races, ["raceId", "year", "round", "circuitId"])
    _to_numeric(circuits, ["circuitId", "lat", "lng", "alt"])
    _to_numeric(status, ["statusId"])

    races["date"] = pd.to_datetime(races["date"], errors="coerce")

    df = results.merge(races, how="left", on="raceId")
    df = df.merge(circuits, how="left", on="circuitId")
    df = df.merge(status, how="left", on="statusId")

    if "qualifying" in tables:
        qualifying = tables["qualifying"].copy()
        qualifying = qualifying[
            ["raceId", "driverId", "constructorId", "position", "q1", "q2", "q3"]
        ]
        qualifying = qualifying.rename(columns={"position": "quali_position"})
        qualifying = qualifying.drop_duplicates(subset=["raceId", "driverId"], keep="first")
        _to_numeric(qualifying, ["raceId", "driverId", "constructorId", "quali_position"])
        qualifying["q1_seconds"] = qualifying["q1"].map(parse_time_to_seconds)
        qualifying["q2_seconds"] = qualifying["q2"].map(parse_time_to_seconds)
        qualifying["q3_seconds"] = qualifying["q3"].map(parse_time_to_seconds)
        df = df.merge(
            qualifying[
                [
                    "raceId",
                    "driverId",
                    "quali_position",
                    "q1_seconds",
                    "q2_seconds",
                    "q3_seconds",
                ]
            ],
            how="left",
            on=["raceId", "driverId"],
        )
    else:
        for col in ["quali_position", "q1_seconds", "q2_seconds", "q3_seconds"]:
            df[col] = np.nan

    if "drivers" in tables:
        drivers = tables["drivers"][["driverId", "forename", "surname"]].copy()
        _to_numeric(drivers, ["driverId"])
        drivers["driver_name"] = (
            drivers["forename"].fillna("").str.strip()
            + " "
            + drivers["surname"].fillna("").str.strip()
        ).str.strip()
        df = df.merge(drivers[["driverId", "driver_name"]], on="driverId", how="left")
    else:
        df["driver_name"] = np.nan

    if "constructors" in tables:
        constructors = tables["constructors"][["constructorId", "name"]].copy()
        _to_numeric(constructors, ["constructorId"])
        constructors = constructors.rename(columns={"name": "constructor_name"})
        df = df.merge(constructors, on="constructorId", how="left")
    else:
        df["constructor_name"] = np.nan

    df = df.rename(
        columns={
            "country": "circuit_country",
            "lat": "circuit_lat",
            "lng": "circuit_lng",
            "alt": "circuit_alt",
        }
    )

    _to_numeric(df, ["quali_position", "q1_seconds", "q2_seconds", "q3_seconds"])
    df["grid"] = pd.to_numeric(df["grid"], errors="coerce")
    df["positionOrder"] = pd.to_numeric(df["positionOrder"], errors="coerce")
    df["points"] = pd.to_numeric(df["points"], errors="coerce").fillna(0.0)

    status_text = df["status"].fillna("")
    is_finished = status_text.eq("Finished") | status_text.str.startswith("+")

    df["y_dnf"] = (~is_finished).astype(int)
    df["y_top10"] = (df["positionOrder"].notna() & (df["positionOrder"] <= 10)).astype(int)

    has_quali = (
        df["quali_position"].notna()
        | df["q1_seconds"].notna()
        | df["q2_seconds"].notna()
        | df["q3_seconds"].notna()
    )
    df["has_qualifying_data"] = has_quali.astype(int)
    df["qualifying_missing"] = (~has_quali).astype(int)
    df["grid_missing"] = df["grid"].isna().astype(int)
    df["grid_zero"] = (df["grid"] == 0).astype(int)

    race_group = df.groupby("raceId", sort=False)
    for source_col in ["quali_position", "q1_seconds", "q2_seconds", "q3_seconds"]:
        best_col = f"{source_col}_gap_to_best"
        median_col = f"{source_col}_gap_to_median"
        df[best_col] = df[source_col] - race_group[source_col].transform("min")
        df[median_col] = df[source_col] - race_group[source_col].transform("median")

    # Positive values usually indicate slower progression through sessions.
    df["q2_minus_q1_seconds"] = df["q2_seconds"] - df["q1_seconds"]
    df["q3_minus_q2_seconds"] = df["q3_seconds"] - df["q2_seconds"]

    teammate_group_cols = ["raceId", "constructorId"]
    for source_col, output_col in [
        ("grid", "grid_delta_vs_teammate"),
        ("quali_position", "quali_delta_vs_teammate"),
    ]:
        grouped = df.groupby(teammate_group_cols, sort=False)[source_col]
        group_count = grouped.transform("count")
        group_sum = grouped.transform("sum")
        teammate_mean = (group_sum - df[source_col]) / (group_count - 1)
        teammate_mean = teammate_mean.where(group_count > 1)
        df[output_col] = df[source_col] - teammate_mean

    df = df.sort_values(["year", "round", "date", "raceId", "driverId"]).reset_index(drop=True)

    driver_group = df.groupby("driverId", sort=False)
    df["driver_points_mean_last5"] = driver_group["points"].transform(
        lambda s: _shifted_rolling_mean(s, 5)
    )
    df["driver_finishpos_mean_last5"] = driver_group["positionOrder"].transform(
        lambda s: _shifted_rolling_mean(s, 5)
    )
    df["driver_top10_rate_last10"] = driver_group["y_top10"].transform(
        lambda s: _shifted_rolling_mean(s, 10)
    )
    df["driver_dnf_rate_last20"] = driver_group["y_dnf"].transform(
        lambda s: _shifted_rolling_mean(s, 20)
    )

    constructor_group = df.groupby("constructorId", sort=False)
    df["team_points_mean_last5"] = constructor_group["points"].transform(
        lambda s: _shifted_rolling_mean(s, 5)
    )
    df["team_top10_rate_last10"] = constructor_group["y_top10"].transform(
        lambda s: _shifted_rolling_mean(s, 10)
    )
    df["team_dnf_rate_last20"] = constructor_group["y_dnf"].transform(
        lambda s: _shifted_rolling_mean(s, 20)
    )

    driver_circuit_group = df.groupby(["driverId", "circuitId"], sort=False)
    df["driver_avg_finish_at_circuit"] = driver_circuit_group["positionOrder"].transform(
        _shifted_expanding_mean
    )
    df["driver_top10_rate_at_circuit"] = driver_circuit_group["y_top10"].transform(
        _shifted_expanding_mean
    )

    return df


def build_pre_race_features(tables: dict[str, pd.DataFrame]) -> pd.DataFrame:
    model_df = build_modeling_table(tables)
    selected_columns = ID_COLUMNS + DISPLAY_COLUMNS + FEATURE_COLUMNS + TARGET_COLUMNS
    selected_columns = [column for column in selected_columns if column in model_df.columns]

    # Preserve order while preventing duplicate column names such as "year".
    unique_columns = list(dict.fromkeys(selected_columns))
    return model_df[unique_columns].copy()


def get_feature_columns(df: pd.DataFrame) -> list[str]:
    return [column for column in FEATURE_COLUMNS if column in df.columns]


def get_categorical_features(df: pd.DataFrame) -> list[str]:
    return [column for column in CATEGORICAL_FEATURES if column in df.columns]
