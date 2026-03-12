from __future__ import annotations

import pandas as pd


def season_time_split(
    df: pd.DataFrame,
    train_end_year: int = 2021,
    min_train_year: int | None = None,
    val_year: int = 2022,
    test_start_year: int = 2023,
    year_col: str = "year",
) -> dict[str, pd.DataFrame]:
    if year_col not in df.columns:
        raise ValueError(f"Column '{year_col}' is required for time-based split.")
    if min_train_year is not None and min_train_year > train_end_year:
        raise ValueError("min_train_year cannot be greater than train_end_year.")

    year_values = df[year_col]
    if isinstance(year_values, pd.DataFrame):
        year_values = year_values.iloc[:, 0]

    years = pd.to_numeric(year_values, errors="coerce")
    train_mask = years <= train_end_year
    if min_train_year is not None:
        train_mask = train_mask & (years >= min_train_year)
    val_mask = years == val_year
    test_mask = years >= test_start_year

    splits = {
        "train": df.loc[train_mask].copy(),
        "val": df.loc[val_mask].copy(),
        "test": df.loc[test_mask].copy(),
    }
    return splits


def split_xy(
    split_df: pd.DataFrame,
    feature_columns: list[str],
    target_column: str,
) -> tuple[pd.DataFrame, pd.Series]:
    return split_df[feature_columns].copy(), split_df[target_column].astype(int).copy()


def split_all_xy(
    splits: dict[str, pd.DataFrame],
    feature_columns: list[str],
    target_column: str,
) -> dict[str, tuple[pd.DataFrame, pd.Series]]:
    return {
        split_name: split_xy(split_df, feature_columns, target_column)
        for split_name, split_df in splits.items()
    }
