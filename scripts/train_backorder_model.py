#!/usr/bin/env python3
"""Train an imbalance-aware public backorder baseline.

The raw source file is never rewritten. BO remains the original source target;
project_target is an explicit derived mapping used only for training/evaluation.
"""
from __future__ import annotations

import argparse
import json
import hashlib
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import SGDClassifier
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

RANDOM_STATE = 42
TARGET = "BO"
ID_COLUMN = "SKU"
SPECIAL_VALUES = {"", "na", "n/a", "null", "none", "?", "-", "unknown", "nan", "inf", "-inf"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def class_metrics(y_true: np.ndarray, probabilities: np.ndarray, threshold: float) -> dict:
    predictions = (probabilities >= threshold).astype(int)
    cm = confusion_matrix(y_true, predictions, labels=[0, 1]).tolist()
    report = {}
    for label, name in [(0, "class_0_not_backorder"), (1, "class_1_backorder")]:
        report[name] = {
            "precision": float(precision_score(y_true, predictions, pos_label=label, zero_division=0)),
            "recall": float(recall_score(y_true, predictions, pos_label=label, zero_division=0)),
            "f1": float(f1_score(y_true, predictions, pos_label=label, zero_division=0)),
            "support": int((y_true == label).sum()),
        }
    return {
        "threshold": float(threshold),
        "precision": float(precision_score(y_true, predictions, zero_division=0)),
        "recall": float(recall_score(y_true, predictions, zero_division=0)),
        "f1": float(f1_score(y_true, predictions, zero_division=0)),
        "pr_auc_average_precision": float(average_precision_score(y_true, probabilities)),
        "confusion_matrix_labels_0_1": cm,
        "class_metrics": report,
        "predicted_positive": int(predictions.sum()),
    }


def majority_metrics(y_true: np.ndarray) -> dict:
    probabilities = np.zeros(len(y_true), dtype=float)
    return class_metrics(y_true, probabilities, 0.5) | {
        "name": "majority-class baseline",
        "pr_auc_average_precision": float(y_true.mean()),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--artifact-dir", required=True, type=Path)
    args = parser.parse_args()
    args.artifact_dir.mkdir(parents=True, exist_ok=True)

    raw_bytes = args.input.read_bytes()
    encoding = "utf-8-sig"
    frame = pd.read_csv(args.input, encoding=encoding, low_memory=False)
    source_columns = frame.columns.tolist()
    if TARGET not in frame.columns:
        raise ValueError(f"Expected source target {TARGET!r} not found; columns={source_columns}")
    if ID_COLUMN not in frame.columns:
        raise ValueError(f"Expected identifier {ID_COLUMN!r} not found")

    missing = frame.isna().sum().to_dict()
    special_counts = {
        column: int(frame[column].astype(str).str.strip().str.lower().isin(SPECIAL_VALUES).sum())
        for column in source_columns
    }
    if any(missing.values()) or any(special_counts.values()):
        raise ValueError({"missing": missing, "special_values": special_counts})

    original_target = pd.to_numeric(frame[TARGET], errors="raise").astype(int)
    if not set(original_target.unique()).issubset({0, 1}):
        raise ValueError(f"Target must be binary 0/1; got={sorted(original_target.unique())}")
    frame["project_target"] = original_target  # derived mapping; BO remains unchanged
    feature_columns = [c for c in source_columns if c not in {ID_COLUMN, TARGET}]
    X = frame[feature_columns].apply(pd.to_numeric, errors="raise").astype("float32")
    y = frame["project_target"].to_numpy(dtype=np.int8)
    identifiers = frame[ID_COLUMN].astype(str).to_numpy()

    X_train, X_holdout, y_train, y_holdout, id_train, id_holdout = train_test_split(
        X, y, identifiers, test_size=0.30, stratify=y, random_state=RANDOM_STATE
    )
    X_val, X_test, y_val, y_test, id_val, id_test = train_test_split(
        X_holdout, y_holdout, id_holdout, test_size=0.50, stratify=y_holdout, random_state=RANDOM_STATE
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    model = SGDClassifier(
        loss="log_loss",
        penalty="l2",
        alpha=1e-5,
        class_weight="balanced",
        max_iter=40,
        tol=1e-3,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    model.fit(X_train_scaled, y_train)
    val_probabilities = model.predict_proba(X_val_scaled)[:, 1]
    test_probabilities = model.predict_proba(X_test_scaled)[:, 1]

    precision, recall, thresholds = precision_recall_curve(y_val, val_probabilities)
    f1_values = (2 * precision * recall) / np.maximum(precision + recall, 1e-12)
    best_index = int(np.nanargmax(f1_values[:-1]))
    threshold = float(thresholds[best_index])
    threshold = min(0.99, max(0.01, threshold))

    metrics = {
        "source": {
            "name": "Mendeley Data - Backorder Prediction",
            "license": "CC BY 4.0",
            "source_url": "https://data.mendeley.com/datasets/krnbcxksn3/1",
            "file_name": args.input.name,
            "sha256": sha256_file(args.input),
            "encoding": encoding,
            "source_columns": source_columns,
            "rows": int(len(frame)),
            "missing_values": {k: int(v) for k, v in missing.items()},
            "special_values": special_counts,
            "target_source_column": TARGET,
            "project_target_mapping": "BO -> project_target (derived; original BO preserved)",
            "identifier_column_excluded": ID_COLUMN,
        },
        "training": {
            "algorithm": "SGDClassifier(loss=log_loss)",
            "class_weight": "balanced",
            "standardization": "StandardScaler fit on train split only",
            "alpha": 1e-5,
            "max_iter": 40,
            "random_state": RANDOM_STATE,
            "split": "70% train / 15% validation / 15% test, stratified",
            "feature_columns": feature_columns,
            "excluded_columns": [ID_COLUMN, TARGET],
            "train_rows": int(len(y_train)),
            "validation_rows": int(len(y_val)),
            "test_rows": int(len(y_test)),
            "train_positive": int(y_train.sum()),
            "validation_positive": int(y_val.sum()),
            "test_positive": int(y_test.sum()),
            "threshold_selection": "validation threshold maximizing F1",
            "selected_threshold": threshold,
        },
        "evaluation": {
            "majority_baseline": majority_metrics(y_test),
            "model": class_metrics(y_test, test_probabilities, threshold),
        },
    }

    model_artifact = {
        "model_type": "standardized_linear_logistic_sgd",
        "feature_columns": feature_columns,
        "source_target_column": TARGET,
        "project_target_column": "project_target",
        "excluded_identifier": ID_COLUMN,
        "threshold": threshold,
        "scaler_mean": scaler.mean_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
        "coefficients": model.coef_[0].tolist(),
        "intercept": float(model.intercept_[0]),
        "source_sha256": metrics["source"]["sha256"],
    }

    # Keep a compact, traceable test sample for the UI. Original SKU and BO are retained.
    sample_indices = np.argsort(-test_probabilities)[:12]
    sample = []
    for idx in sample_indices:
        row = frame.loc[frame[ID_COLUMN].astype(str) == id_test[idx], source_columns].iloc[0].to_dict()
        row["project_target"] = int(y_test[idx])
        row["predicted_backorder_probability"] = float(test_probabilities[idx])
        row["predicted_backorder"] = int(test_probabilities[idx] >= threshold)
        sample.append(row)

    (args.artifact_dir / "metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")
    (args.artifact_dir / "model.json").write_text(json.dumps(model_artifact, indent=2) + "\n")
    (args.artifact_dir / "sample_predictions.json").write_text(json.dumps(sample, indent=2) + "\n")
    print(json.dumps({"metrics": metrics, "artifacts": [str(p) for p in args.artifact_dir.glob("*.json")]}, indent=2))


if __name__ == "__main__":
    main()
