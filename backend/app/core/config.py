from __future__ import annotations

import os
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
COURSE_ROOT = BACKEND_DIR.parent.parent
DEFAULT_DS_ROOT = COURSE_ROOT / "Data_Science_and_ML_part"

DATA_ROOT = Path(os.getenv("F1_DATA_ROOT", str(DEFAULT_DS_ROOT))).resolve()
ARCHIVE_DIR = Path(os.getenv("F1_ARCHIVE_DIR", str(DATA_ROOT / "data" / "archive"))).resolve()
FEATURE_DF_PATH = Path(os.getenv("F1_FEATURE_DF_PATH", str(DATA_ROOT / "data" / "feature_df.parquet"))).resolve()
TOP10_PIPELINE_PATH = Path(
    os.getenv("F1_TOP10_PIPELINE_PATH", str(DATA_ROOT / "artifacts" / "top10_pipeline.joblib"))
).resolve()
TOP10_METADATA_PATH = Path(
    os.getenv("F1_TOP10_METADATA_PATH", str(DATA_ROOT / "artifacts" / "top10_metadata.json"))
).resolve()

CSV_NA_VALUES = ["\\N", "", "NA", "N/A", "null", "None"]
FEATURED_RACE_LIMIT = 6

F1_SERVING_MODE = os.getenv("F1_SERVING_MODE", "db").strip().lower()
LEGACY_FALLBACK_ENABLED = os.getenv("F1_ENABLE_LEGACY_FALLBACK", "false").strip().lower() == "true"
DB_SERVING_ENABLED = F1_SERVING_MODE != "legacy"
