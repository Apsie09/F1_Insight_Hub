from __future__ import annotations

import pandas as pd


def select_race_rows(
    feature_df: pd.DataFrame,
    race_id: int | None = None,
    year: int | None = None,
    round_number: int | None = None,
) -> pd.DataFrame:
    if race_id is not None:
        race_rows = feature_df.loc[feature_df["raceId"] == race_id].copy()
    elif year is not None and round_number is not None:
        race_rows = feature_df.loc[
            (feature_df["year"] == year) & (feature_df["round"] == round_number)
        ].copy()
    else:
        raise ValueError("Provide either race_id OR both year and round_number.")

    if race_rows.empty:
        raise ValueError("No rows found for the provided race selector.")
    return race_rows


def predict_race_probabilities(
    pipeline,
    feature_df: pd.DataFrame,
    feature_columns: list[str],
    race_id: int | None = None,
    year: int | None = None,
    round_number: int | None = None,
    top_n: int = 20,
) -> pd.DataFrame:
    race_rows = select_race_rows(
        feature_df=feature_df,
        race_id=race_id,
        year=year,
        round_number=round_number,
    )
    race_features = race_rows[feature_columns].copy()
    race_rows["predicted_probability"] = pipeline.predict_proba(race_features)[:, 1]

    display_columns = [
        "raceId",
        "year",
        "round",
        "driverId",
        "driver_name",
        "constructorId",
        "constructor_name",
        "grid",
        "quali_position",
        "predicted_probability",
    ]
    display_columns = [column for column in display_columns if column in race_rows.columns]

    ranked = race_rows.sort_values("predicted_probability", ascending=False)
    return ranked[display_columns].head(top_n).reset_index(drop=True)
