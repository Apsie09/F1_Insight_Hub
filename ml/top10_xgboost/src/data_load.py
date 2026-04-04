from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

CSV_NA_VALUES = ["\\N", "", "NA", "N/A", "null", "None"]

CORE_TABLES = [
    "results",
    "races",
    "circuits",
    "qualifying",
    "status",
    "drivers",
    "constructors",
]


def list_csv_files(data_dir: str | Path) -> list[str]:
    data_path = Path(data_dir)
    return sorted(file.name for file in data_path.glob("*.csv"))


def get_csv_columns(csv_path: str | Path) -> list[str]:
    header = pd.read_csv(csv_path, nrows=0)
    return header.columns.tolist()


def load_table(csv_path: str | Path) -> pd.DataFrame:
    return pd.read_csv(
        csv_path,
        na_values=CSV_NA_VALUES,
        keep_default_na=True,
        low_memory=False,
    )


def load_raw_tables(data_dir: str | Path, table_names: list[str] | None = None) -> dict[str, pd.DataFrame]:
    data_path = Path(data_dir)
    available = {file.stem: file for file in data_path.glob("*.csv")}

    if table_names is None:
        selected_names = sorted(available.keys())
    else:
        selected_names = [name.replace(".csv", "") for name in table_names]

    tables: dict[str, pd.DataFrame] = {}
    for name in selected_names:
        if name not in available:
            continue
        tables[name] = load_table(available[name])

    return tables


def summarize_archive_schema(data_dir: str | Path) -> dict[str, Any]:
    data_path = Path(data_dir)
    summary: dict[str, Any] = {}
    for csv_path in sorted(data_path.glob("*.csv")):
        summary[csv_path.name] = get_csv_columns(csv_path)
    return summary


def get_year_coverage(races_df: pd.DataFrame, year_col: str = "year") -> dict[str, Any]:
    years = (
        pd.to_numeric(races_df[year_col], errors="coerce")
        .dropna()
        .astype(int)
        .sort_values()
        .unique()
        .tolist()
    )
    if not years:
        return {"min_year": None, "max_year": None, "years": []}
    return {"min_year": years[0], "max_year": years[-1], "years": years}
