#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.metrics import average_precision_score, brier_score_loss, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import GroupKFold, StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler

RANDOM_STATE = 42
DATASET = Path('/home/ubuntu/linerescue-unzipped/data/imported/bopredict.csv')
OUT = Path('/home/ubuntu/linerescue-unzipped/candidate-validation/2026-11-11-group-calibrated')
FEATURE_COLUMNS = ['INV','TIM','INQ','FOR3','FOR6','FOR9','SAL1','SAL3','SAL6','SAL9','MIN','RSK1','OVRP','SUP1','SUP2','OVRA','RSK2','RSK3','RSK4','RSK5','RSK6']


def make_hgb() -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(
        max_iter=100,
        learning_rate=0.1,
        max_leaf_nodes=31,
        l2_regularization=0.0,
        class_weight='balanced',
        random_state=RANDOM_STATE,
    )


def metrics(y: np.ndarray, p: np.ndarray, threshold: float) -> dict:
    pred = (p >= threshold).astype(np.int8)
    return {
        'threshold': float(threshold),
        'precision': float(precision_score(y, pred, zero_division=0)),
        'recall': float(recall_score(y, pred, zero_division=0)),
        'f1': float(f1_score(y, pred, zero_division=0)),
        'pr_auc_average_precision': float(average_precision_score(y, p)),
        'brier_score': float(brier_score_loss(y, p)),
        'confusion_matrix_labels_0_1': confusion_matrix(y, pred, labels=[0, 1]).tolist(),
        'predicted_positive': int(pred.sum()),
        'support_positive': int(y.sum()),
        'support_negative': int((y == 0).sum()),
    }


def threshold_by_validation_f1(y: np.ndarray, p: np.ndarray) -> tuple[float, float]:
    order = np.argsort(-p, kind='mergesort')
    ys = y[order]
    ps = p[order]
    tp = np.cumsum(ys)
    fp = np.cumsum(1 - ys)
    fn = tp[-1] - tp
    f1 = 2 * tp / np.maximum(2 * tp + fp + fn, 1)
    i = int(np.argmax(f1))
    return float(ps[i]), float(f1[i])


def calibration_diagnostics(y: np.ndarray, p: np.ndarray, bins: int = 10) -> dict:
    edges = np.linspace(0.0, 1.0, bins + 1)
    rows = []
    ece = 0.0
    for i in range(bins):
        mask = (p >= edges[i]) & ((p < edges[i + 1]) if i < bins - 1 else (p <= edges[i + 1]))
        count = int(mask.sum())
        if count:
            mean_pred = float(p[mask].mean())
            observed = float(y[mask].mean())
            ece += count / len(y) * abs(mean_pred - observed)
            rows.append({'bin': i, 'lower': float(edges[i]), 'upper': float(edges[i + 1]), 'count': count, 'mean_predicted': mean_pred, 'observed_rate': observed})
    return {'brier_score': float(brier_score_loss(y, p)), 'ece_10_equal_width': float(ece), 'bins': rows}


def positive_balance(y: np.ndarray) -> dict:
    return {'rows': int(len(y)), 'positive': int(y.sum()), 'negative': int((y == 0).sum()), 'positive_rate': float(y.mean())}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    frame = pd.read_csv(DATASET, encoding='utf-8-sig', low_memory=False)
    y = frame['BO'].astype('int8').to_numpy()
    X = frame[FEATURE_COLUMNS].astype('float32').to_numpy()
    groups = pd.util.hash_pandas_object(frame[FEATURE_COLUMNS], index=False).to_numpy(dtype=np.uint64)
    n = len(y)

    # 20 reproducible stratified group folds, then 14/3/3 folds for approximately 70/15/15.
    sgkf = StratifiedGroupKFold(n_splits=20, shuffle=True, random_state=RANDOM_STATE)
    fold_for_row = np.full(n, -1, dtype=np.int8)
    fold_sizes = []
    fold_positives = []
    placeholder = np.zeros((n, 1), dtype=np.int8)
    for fold, (_, test_idx) in enumerate(sgkf.split(placeholder, y, groups)):
        fold_for_row[test_idx] = fold
        fold_sizes.append(int(len(test_idx)))
        fold_positives.append(int(y[test_idx].sum()))
    if (fold_for_row < 0).any():
        raise RuntimeError('Some rows were not assigned to a group-stratified fold')
    train_idx = np.flatnonzero(fold_for_row < 14)
    val_idx = np.flatnonzero((fold_for_row >= 14) & (fold_for_row < 17))
    test_idx = np.flatnonzero(fold_for_row >= 17)
    split_id = np.full(n, -1, dtype=np.int8)
    split_id[train_idx] = 0; split_id[val_idx] = 1; split_id[test_idx] = 2
    group_split_counts = {}
    for g in np.unique(groups):
        s = np.unique(split_id[groups == g])
        group_split_counts[str(int(g))] = s.tolist()
    crossing_groups = sum(len(s) != 1 for s in group_split_counts.values())
    if crossing_groups:
        raise RuntimeError(f'{crossing_groups} groups crossed split boundaries')

    result = {
        'source': {
            'file': str(DATASET),
            'sha256': hashlib.sha256(DATASET.read_bytes()).hexdigest(),
            'rows': n,
            'features': FEATURE_COLUMNS,
            'group_key': 'stable pandas hash of the 21 model features; SKU and BO excluded',
            'conflicting_label_groups': None,
        },
        'split': {
            'method': 'StratifiedGroupKFold(n_splits=20, shuffle=True, random_state=42); folds 0-13 train, 14-16 validation, 17-19 test',
            'random_state': RANDOM_STATE,
            'train': positive_balance(y[train_idx]),
            'validation': positive_balance(y[val_idx]),
            'test': positive_balance(y[test_idx]),
            'fold_sizes': fold_sizes,
            'fold_positive_counts': fold_positives,
            'unique_groups': {'train': int(np.unique(groups[train_idx]).size), 'validation': int(np.unique(groups[val_idx]).size), 'test': int(np.unique(groups[test_idx]).size)},
            'cross_boundary_groups': int(crossing_groups),
        },
    }
    # Conflicting labels are counted without changing any source labels.
    sorted_order = np.argsort(groups, kind='mergesort')
    gs = groups[sorted_order]; ys = y[sorted_order]
    starts = np.flatnonzero(np.r_[True, gs[1:] != gs[:-1]])
    ends = np.r_[starts[1:], len(gs)]
    conflicting = 0
    duplicate_groups = 0
    rows_in_duplicate_groups = 0
    for a, b in zip(starts, ends):
        size = b - a
        if size > 1:
            duplicate_groups += 1; rows_in_duplicate_groups += size
        if np.unique(ys[a:b]).size > 1:
            conflicting += 1
    result['source']['conflicting_label_groups'] = int(conflicting)
    result['duplicate_scan'] = {'unique_feature_groups': int(len(starts)), 'duplicate_feature_groups': int(duplicate_groups), 'rows_in_duplicate_feature_groups': int(rows_in_duplicate_groups), 'conflicting_label_groups': int(conflicting), 'cross_boundary_groups_verified': int(crossing_groups)}

    # Existing SGD baseline, fit/evaluated on exactly the same group-aware split.
    scaler = StandardScaler()
    Xtr = scaler.fit_transform(X[train_idx]); Xv = scaler.transform(X[val_idx]); Xt = scaler.transform(X[test_idx])
    sgd = SGDClassifier(loss='log_loss', penalty='l2', alpha=1e-5, class_weight='balanced', max_iter=40, tol=1e-3, random_state=RANDOM_STATE, n_jobs=-1)
    start = time.time(); sgd.fit(Xtr, y[train_idx]); sgd_seconds = time.time() - start
    sgd_v = sgd.predict_proba(Xv)[:, 1]; sgd_t = sgd.predict_proba(Xt)[:, 1]
    sgd_threshold, _ = threshold_by_validation_f1(y[val_idx], sgd_v)
    result['sgd_baseline_same_group_split'] = {'train_seconds': sgd_seconds, 'validation_threshold': sgd_threshold, 'validation': metrics(y[val_idx], sgd_v, sgd_threshold), 'test': metrics(y[test_idx], sgd_t, sgd_threshold)}

    # Uncalibrated HGB fit only on group-aware training rows.
    start = time.time(); raw_model = make_hgb(); raw_model.fit(X[train_idx], y[train_idx]); raw_seconds = time.time() - start
    raw_v = raw_model.predict_proba(X[val_idx])[:, 1]
    raw_threshold, _ = threshold_by_validation_f1(y[val_idx], raw_v)
    result['hist_gradient_boosting_uncalibrated'] = {'train_seconds': raw_seconds, 'validation_threshold': raw_threshold, 'validation': metrics(y[val_idx], raw_v, raw_threshold), 'validation_calibration': calibration_diagnostics(y[val_idx], raw_v)}

    # Explicit group-aware OOF calibration inside training only. This avoids
    # relying on a CalibratedClassifierCV/groups API combination that is not
    # supported consistently across scikit-learn versions.
    start = time.time()
    inner_cv = GroupKFold(n_splits=3)
    train_y = y[train_idx]
    train_X = X[train_idx]
    train_groups = groups[train_idx]
    oof_raw = np.full(len(train_idx), np.nan, dtype=np.float64)
    for inner_train, inner_holdout in inner_cv.split(train_X, train_y, train_groups):
        inner_model = make_hgb()
        inner_model.fit(train_X[inner_train], train_y[inner_train])
        oof_raw[inner_holdout] = inner_model.predict_proba(train_X[inner_holdout])[:, 1]
    if np.isnan(oof_raw).any():
        raise RuntimeError('Group-aware calibration OOF predictions are incomplete')
    final_raw_model = make_hgb()
    final_raw_model.fit(train_X, train_y)
    raw_val_for_calibration = final_raw_model.predict_proba(X[val_idx])[:, 1]
    raw_test_for_calibration = final_raw_model.predict_proba(X[test_idx])[:, 1]
    calibrators = {
        'sigmoid': LogisticRegression(C=1e6, solver='lbfgs', max_iter=1000, random_state=RANDOM_STATE),
        'isotonic': IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds='clip'),
    }
    calibration_results = {}
    calibrated_predictions = {}
    for method, calibrator in calibrators.items():
        calibration_input = oof_raw.reshape(-1, 1) if method == 'sigmoid' else oof_raw
        calibrator.fit(calibration_input, train_y)
        if method == 'sigmoid':
            p_val = calibrator.predict_proba(raw_val_for_calibration.reshape(-1, 1))[:, 1]
            p_test = calibrator.predict_proba(raw_test_for_calibration.reshape(-1, 1))[:, 1]
        else:
            p_val = calibrator.predict(raw_val_for_calibration)
            p_test = calibrator.predict(raw_test_for_calibration)
        threshold, _ = threshold_by_validation_f1(y[val_idx], p_val)
        calibration_results[method] = {'fit_seconds': time.time() - start, 'validation_threshold': threshold, 'validation': metrics(y[val_idx], p_val, threshold), 'validation_calibration': calibration_diagnostics(y[val_idx], p_val)}
        calibrated_predictions[method] = (p_test, threshold)
    result['calibrated_candidates'] = calibration_results

    # Selection is validation-only: lowest Brier score, then highest PR-AUC, then highest F1.
    selected = min(calibration_results, key=lambda m: (calibration_results[m]['validation']['brier_score'], -calibration_results[m]['validation']['pr_auc_average_precision'], -calibration_results[m]['validation']['f1']))
    selected_test_probability, selected_threshold = calibrated_predictions[selected]
    result['selection'] = {'criterion': 'validation Brier score, tie-break PR-AUC then F1; no test values used', 'selected_calibration': selected, 'selected_threshold': selected_threshold}
    result['selected_model_test_once'] = {'calibration': selected, 'metrics': metrics(y[test_idx], selected_test_probability, selected_threshold), 'calibration_diagnostics': calibration_diagnostics(y[test_idx], selected_test_probability)}
    result['limitations'] = ['Duplicate feature groups are kept intact across splits, but 962 groups contain conflicting BO labels.', 'Calibration methods are trained only from the group-aware training split using group-aware 3-fold CV.', 'The test partition is used once for the selected calibrated candidate and once for the separate SGD comparison.', 'The candidate is not integrated into the application and is not production-ready or official Tata Motors data.']

    (OUT / 'group_calibrated_validation_report.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
