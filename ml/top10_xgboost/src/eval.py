from __future__ import annotations

from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_score,
    recall_score,
    roc_auc_score,
)

from src.utils import ensure_dir


def compute_binary_metrics(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    threshold: float = 0.5,
) -> dict[str, Any]:
    y_true = np.asarray(y_true).astype(int)
    y_prob = np.asarray(y_prob, dtype=float)
    y_pred = (y_prob >= threshold).astype(int)

    metrics: dict[str, Any] = {}
    try:
        metrics["roc_auc"] = float(roc_auc_score(y_true, y_prob))
    except ValueError:
        metrics["roc_auc"] = np.nan

    try:
        metrics["pr_auc"] = float(average_precision_score(y_true, y_prob))
    except ValueError:
        metrics["pr_auc"] = np.nan

    try:
        metrics["log_loss"] = float(log_loss(y_true, y_prob, labels=[0, 1]))
    except ValueError:
        metrics["log_loss"] = np.nan

    try:
        metrics["brier_score"] = float(brier_score_loss(y_true, y_prob))
    except ValueError:
        metrics["brier_score"] = np.nan

    metrics["threshold"] = float(threshold)
    metrics["precision"] = float(precision_score(y_true, y_pred, zero_division=0))
    metrics["recall"] = float(recall_score(y_true, y_pred, zero_division=0))
    metrics["f1"] = float(f1_score(y_true, y_pred, zero_division=0))

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    metrics["confusion_matrix"] = {
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
    }

    # Backward compatibility for existing notebook/report naming.
    if np.isclose(threshold, 0.5):
        metrics["precision_at_0_5"] = metrics["precision"]
        metrics["recall_at_0_5"] = metrics["recall"]
        metrics["f1_at_0_5"] = metrics["f1"]
        metrics["confusion_matrix_at_0_5"] = metrics["confusion_matrix"]
    return metrics


def evaluate_split(
    pipeline,
    split_df: pd.DataFrame,
    feature_columns: list[str],
    target_column: str,
    threshold: float = 0.5,
) -> dict[str, Any]:
    x_split = split_df[feature_columns].copy()
    y_split = split_df[target_column].astype(int).values
    y_prob = pipeline.predict_proba(x_split)[:, 1]
    metrics = compute_binary_metrics(y_split, y_prob, threshold=threshold)
    metrics["rows"] = int(len(split_df))
    return {"metrics": metrics, "y_true": y_split, "y_prob": y_prob}


def evaluate_all_splits(
    pipeline,
    splits: dict[str, pd.DataFrame],
    feature_columns: list[str],
    target_column: str,
    threshold: float = 0.5,
) -> dict[str, Any]:
    results: dict[str, Any] = {}
    for split_name, split_df in splits.items():
        results[split_name] = evaluate_split(
            pipeline=pipeline,
            split_df=split_df,
            feature_columns=feature_columns,
            target_column=target_column,
            threshold=threshold,
        )
    return results


def metrics_table(evaluation_results: dict[str, Any]) -> pd.DataFrame:
    rows = []
    for split_name, split_result in evaluation_results.items():
        row = {"split": split_name}
        row.update(split_result["metrics"])
        rows.append(row)
    return pd.DataFrame(rows)


def threshold_sweep(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    thresholds: np.ndarray | None = None,
) -> pd.DataFrame:
    y_true = np.asarray(y_true).astype(int)
    y_prob = np.asarray(y_prob, dtype=float)

    if thresholds is None:
        thresholds = np.round(np.arange(0.05, 0.951, 0.01), 2)

    rows: list[dict[str, float]] = []
    for threshold in thresholds:
        y_pred = (y_prob >= threshold).astype(int)
        rows.append(
            {
                "threshold": float(threshold),
                "precision": float(precision_score(y_true, y_pred, zero_division=0)),
                "recall": float(recall_score(y_true, y_pred, zero_division=0)),
                "f1": float(f1_score(y_true, y_pred, zero_division=0)),
            }
        )

    return pd.DataFrame(rows)


def find_best_threshold(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    metric: str = "f1",
    thresholds: np.ndarray | None = None,
    min_precision: float | None = None,
    min_recall: float | None = None,
    min_threshold: float | None = None,
    max_threshold: float | None = None,
    fallback_threshold: float = 0.5,
) -> dict[str, float]:
    metric = metric.lower()
    if metric not in {"f1", "precision", "recall"}:
        raise ValueError("metric must be one of: 'f1', 'precision', 'recall'")

    sweep_df = threshold_sweep(y_true, y_prob, thresholds=thresholds)
    if sweep_df.empty:
        raise ValueError("Threshold sweep produced no candidate thresholds.")

    filtered_df = sweep_df.copy()
    if min_precision is not None:
        filtered_df = filtered_df.loc[filtered_df["precision"] >= min_precision]
    if min_recall is not None:
        filtered_df = filtered_df.loc[filtered_df["recall"] >= min_recall]
    if min_threshold is not None:
        filtered_df = filtered_df.loc[filtered_df["threshold"] >= min_threshold]
    if max_threshold is not None:
        filtered_df = filtered_df.loc[filtered_df["threshold"] <= max_threshold]

    used_fallback = False
    if filtered_df.empty:
        used_fallback = True
        fallback_row = sweep_df.iloc[(sweep_df["threshold"] - fallback_threshold).abs().argsort().iloc[0]]
        best_row = fallback_row
    else:
        best_row = filtered_df.sort_values([metric, "threshold"], ascending=[False, True]).iloc[0]

    return {
        "best_threshold": float(best_row["threshold"]),
        "best_metric_value": float(best_row[metric]),
        "used_fallback": used_fallback,
    }


def plot_calibration_curve(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    title: str,
    output_path: str | Path | None = None,
    n_bins: int = 10,
) -> tuple[np.ndarray, np.ndarray]:
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=n_bins, strategy="uniform")

    fig, axis = plt.subplots(figsize=(6, 6))
    axis.plot(prob_pred, prob_true, marker="o", label="Model")
    axis.plot([0, 1], [0, 1], linestyle="--", color="gray", label="Perfect")
    axis.set_xlabel("Predicted probability")
    axis.set_ylabel("Observed frequency")
    axis.set_title(title)
    axis.legend()
    axis.grid(alpha=0.25)

    if output_path is not None:
        output_path = Path(output_path)
        ensure_dir(output_path.parent)
        fig.savefig(output_path, dpi=160, bbox_inches="tight")
    plt.close(fig)
    return prob_true, prob_pred
