from __future__ import annotations

import inspect
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from src.utils import ensure_dir, save_json, utc_timestamp

try:
    from xgboost import XGBClassifier
except ImportError as exc:  # pragma: no cover - handled at runtime in notebooks/scripts
    raise ImportError("xgboost is required. Install dependencies from requirements.txt.") from exc


DEFAULT_XGB_PARAMS: dict[str, Any] = {
    "objective": "binary:logistic",
    "n_estimators": 2000,
    "learning_rate": 0.05,
    "max_depth": 5,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "reg_lambda": 1.0,
    "reg_alpha": 0.0,
    "eval_metric": "logloss",
    "tree_method": "hist",
    "n_jobs": -1,
    "random_state": 42,
}


def _make_one_hot_encoder() -> OneHotEncoder:
    try:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=True)
    except TypeError:
        return OneHotEncoder(handle_unknown="ignore", sparse=True)


def get_feature_types(
    df: pd.DataFrame,
    feature_columns: list[str],
    categorical_columns: list[str] | None = None,
) -> tuple[list[str], list[str]]:
    if categorical_columns is None:
        inferred = [
            col
            for col in feature_columns
            if pd.api.types.is_object_dtype(df[col]) or pd.api.types.is_categorical_dtype(df[col])
        ]
        categorical_columns = inferred

    categorical_columns = [col for col in categorical_columns if col in feature_columns]
    numeric_columns = [col for col in feature_columns if col not in categorical_columns]
    return categorical_columns, numeric_columns


def build_preprocessor(
    categorical_columns: list[str],
    numeric_columns: list[str],
) -> ColumnTransformer:
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", _make_one_hot_encoder()),
        ]
    )
    numeric_pipeline = Pipeline(steps=[("imputer", SimpleImputer(strategy="median"))])

    return ColumnTransformer(
        transformers=[
            ("categorical", categorical_pipeline, categorical_columns),
            ("numeric", numeric_pipeline, numeric_columns),
        ],
        remainder="drop",
    )


def compute_scale_pos_weight(y_train: pd.Series | np.ndarray) -> float:
    y_array = np.asarray(y_train).astype(int)
    pos = int((y_array == 1).sum())
    neg = int((y_array == 0).sum())
    if pos == 0:
        return 1.0
    return neg / pos


def train_xgb_pipeline(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_val: pd.DataFrame,
    y_val: pd.Series,
    categorical_columns: list[str],
    numeric_columns: list[str],
    model_params: dict[str, Any] | None = None,
    early_stopping_rounds: int = 50,
    scale_pos_weight: float | None = None,
    fit_verbose: bool | int = False,
) -> dict[str, Any]:
    preprocessor = build_preprocessor(categorical_columns, numeric_columns)
    X_train_processed = preprocessor.fit_transform(X_train)
    X_val_processed = preprocessor.transform(X_val)

    params = DEFAULT_XGB_PARAMS.copy()
    if model_params:
        params.update(model_params)
    if scale_pos_weight is not None:
        params["scale_pos_weight"] = float(scale_pos_weight)
    if early_stopping_rounds is not None:
        params["early_stopping_rounds"] = int(early_stopping_rounds)

    model = XGBClassifier(**params)
    fit_kwargs: dict[str, Any] = {
        "eval_set": [(X_val_processed, y_val.values)],
        "verbose": fit_verbose,
    }
    fit_signature = inspect.signature(model.fit)
    # Compatibility across xgboost sklearn API versions.
    if "early_stopping_rounds" in fit_signature.parameters and early_stopping_rounds is not None:
        fit_kwargs["early_stopping_rounds"] = int(early_stopping_rounds)

    model.fit(X_train_processed, y_train.values, **fit_kwargs)

    pipeline = Pipeline(steps=[("preprocessor", preprocessor), ("model", model)])
    return {"pipeline": pipeline, "model": model, "preprocessor": preprocessor, "params": params}


def save_artifacts(
    trained: dict[str, Any],
    prefix: str,
    artifacts_dir: str | Path = "artifacts",
    metadata: dict[str, Any] | None = None,
) -> dict[str, str]:
    artifacts_path = ensure_dir(artifacts_dir)

    model_path = artifacts_path / f"{prefix}_model.joblib"
    pipeline_path = artifacts_path / f"{prefix}_pipeline.joblib"
    metadata_path = artifacts_path / f"{prefix}_metadata.json"

    joblib.dump(trained["model"], model_path)
    joblib.dump(trained["pipeline"], pipeline_path)

    metadata_payload = metadata.copy() if metadata else {}
    metadata_payload.setdefault("timestamp", utc_timestamp())
    metadata_payload.setdefault("xgb_params", trained.get("params", {}))
    save_json(metadata_payload, metadata_path)

    return {
        "model_path": str(model_path),
        "pipeline_path": str(pipeline_path),
        "metadata_path": str(metadata_path),
    }
