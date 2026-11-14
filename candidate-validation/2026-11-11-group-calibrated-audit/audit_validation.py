#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import platform
import time
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import sklearn
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import GroupKFold, StratifiedGroupKFold

RANDOM_SEED = 42
DATASET = Path('/home/ubuntu/linerescue-unzipped/data/imported/bopredict.csv')
OUT = Path('/home/ubuntu/linerescue-unzipped/candidate-validation/2026-11-11-group-calibrated-audit')
FEATURE_COLUMNS = ['INV','TIM','INQ','FOR3','FOR6','FOR9','SAL1','SAL3','SAL6','SAL9','MIN','RSK1','OVRP','SUP1','SUP2','OVRA','RSK2','RSK3','RSK4','RSK5','RSK6']
MODEL_CONFIG = {'algorithm': 'HistGradientBoostingClassifier', 'max_iter': 100, 'learning_rate': 0.1, 'max_leaf_nodes': 31, 'l2_regularization': 0.0, 'class_weight': 'balanced', 'random_state': RANDOM_SEED}
SMALL_BIN_COUNT = 1000


def make_hgb() -> HistGradientBoostingClassifier:
    return HistGradientBoostingClassifier(**{k: v for k, v in MODEL_CONFIG.items() if k != 'algorithm'})


def threshold_by_validation_f1(y: np.ndarray, probabilities: np.ndarray) -> tuple[float, float]:
    """Choose a threshold at a distinct probability value, aggregating ties first."""
    y = np.asarray(y, dtype=np.int8)
    p = np.asarray(probabilities, dtype=np.float64)
    if len(y) == 0 or len(y) != len(p):
        raise ValueError('y and probabilities must be non-empty and equal length')
    order = np.argsort(-p, kind='mergesort')
    ps = p[order]
    ys = y[order]
    ends = np.flatnonzero(np.r_[ps[1:] != ps[:-1], True])
    tp_at = np.cumsum(ys)[ends]
    fp_at = np.cumsum(1 - ys)[ends]
    fn_at = int(ys.sum()) - tp_at
    f1_at = 2.0 * tp_at / np.maximum(2.0 * tp_at + fp_at + fn_at, 1.0)
    best = int(np.argmax(f1_at))
    threshold = float(ps[ends[best]])
    predicted = (p >= threshold).astype(np.int8)
    actual_f1 = float(f1_score(y, predicted, zero_division=0))
    if not np.isclose(actual_f1, float(f1_at[best]), rtol=0.0, atol=1e-12):
        raise AssertionError('tie-safe threshold F1 does not match predictions using p >= threshold')
    return threshold, actual_f1


def calibration_bins(y: np.ndarray, p: np.ndarray, mode: str, bins: int = 10) -> list[dict[str, Any]]:
    y = np.asarray(y, dtype=np.int8); p = np.asarray(p, dtype=np.float64)
    if mode == 'equal_width':
        edges = np.linspace(0.0, 1.0, bins + 1)
        assignments = np.searchsorted(edges, p, side='right') - 1
        assignments = np.clip(assignments, 0, bins - 1)
    elif mode == 'equal_frequency':
        order = np.argsort(p, kind='mergesort')
        assignments = np.empty(len(p), dtype=np.int8)
        assignments[order] = np.minimum((np.arange(len(p)) * bins) // max(len(p), 1), bins - 1)
        edges = None
    else:
        raise ValueError(mode)
    result = []
    for b in range(bins):
        mask = assignments == b
        count = int(mask.sum())
        if not count:
            result.append({'bin': b, 'count': 0, 'small_count_flag': True})
            continue
        row = {'bin': b, 'count': count, 'mean_predicted': float(p[mask].mean()), 'observed_rate': float(y[mask].mean()), 'small_count_flag': count < SMALL_BIN_COUNT}
        if edges is not None:
            row.update({'lower': float(edges[b]), 'upper': float(edges[b + 1])})
        result.append(row)
    return result


def calibration_diagnostics(y: np.ndarray, p: np.ndarray) -> dict[str, Any]:
    prevalence = float(np.mean(y))
    reference_brier = prevalence * (1.0 - prevalence)
    out = {'brier_score': float(brier_score_loss(y, p)), 'constant_prevalence_brier_reference': float(reference_brier), 'equal_width': {}, 'equal_frequency': {}}
    for mode in ('equal_width', 'equal_frequency'):
        rows = calibration_bins(y, p, mode)
        ece = sum((row['count'] / len(y)) * abs(row.get('mean_predicted', 0.0) - row.get('observed_rate', 0.0)) for row in rows if row['count'])
        out[mode] = {'ece': float(ece), 'bins': rows, 'small_bin_count_threshold': SMALL_BIN_COUNT}
    return out


def classification_metrics(y: np.ndarray, p: np.ndarray, threshold: float) -> dict[str, Any]:
    pred = (p >= threshold).astype(np.int8)
    return {'threshold': float(threshold), 'precision': float(precision_score(y, pred, zero_division=0)), 'recall': float(recall_score(y, pred, zero_division=0)), 'f1': float(f1_score(y, pred, zero_division=0)), 'pr_auc_average_precision': float(average_precision_score(y, p)), 'brier_score': float(brier_score_loss(y, p)), 'confusion_matrix_labels_0_1': confusion_matrix(y, pred, labels=[0, 1]).tolist(), 'predicted_positive': int(pred.sum()), 'support_positive': int(y.sum()), 'support_negative': int((y == 0).sum())}


def describe_folds(folds: list[tuple[np.ndarray, np.ndarray]], y: np.ndarray, groups: np.ndarray) -> dict[str, Any]:
    rows = []
    for i, (train_idx, hold_idx) in enumerate(folds):
        train_groups = set(groups[train_idx].tolist()); hold_groups = set(groups[hold_idx].tolist())
        rows.append({'fold': i, 'train_rows': int(len(train_idx)), 'train_positive': int(y[train_idx].sum()), 'train_negative': int((y[train_idx] == 0).sum()), 'holdout_rows': int(len(hold_idx)), 'holdout_positive': int(y[hold_idx].sum()), 'holdout_negative': int((y[hold_idx] == 0).sum()), 'group_overlap': int(len(train_groups & hold_groups))})
    return {'folds': rows, 'all_groups_isolated': all(row['group_overlap'] == 0 for row in rows)}


def make_inner_folds(strategy: str, X: np.ndarray, y: np.ndarray, groups: np.ndarray) -> list[tuple[np.ndarray, np.ndarray]]:
    if strategy == 'GroupKFold':
        splitter = GroupKFold(n_splits=3)
    elif strategy == 'StratifiedGroupKFold':
        splitter = StratifiedGroupKFold(n_splits=3, shuffle=True, random_state=RANDOM_SEED)
    else:
        raise ValueError(strategy)
    return [(a, b) for a, b in splitter.split(X, y, groups)]


def fit_calibrated_ensemble(strategy: str, X: np.ndarray, y: np.ndarray, groups: np.ndarray) -> tuple[list[tuple[HistGradientBoostingClassifier, dict[str, Any]]], dict[str, Any]]:
    folds = make_inner_folds(strategy, X, y, groups)
    fold_report = describe_folds(folds, y, groups)
    ensemble = []
    for train_idx, hold_idx in folds:
        model = make_hgb()
        model.fit(X[train_idx], y[train_idx])
        raw_holdout = model.predict_proba(X[hold_idx])[:, 1]
        sigmoid = LogisticRegression(C=1e6, solver='lbfgs', max_iter=1000, random_state=RANDOM_SEED)
        sigmoid.fit(raw_holdout.reshape(-1, 1), y[hold_idx])
        isotonic = IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds='clip')
        isotonic.fit(raw_holdout, y[hold_idx])
        ensemble.append((model, {'sigmoid': sigmoid, 'isotonic': isotonic}))
    return ensemble, fold_report


def predict_ensemble(ensemble: list[tuple[HistGradientBoostingClassifier, dict[str, Any]]], X: np.ndarray, method: str) -> np.ndarray:
    predictions = []
    for model, calibrators in ensemble:
        raw = model.predict_proba(X)[:, 1]
        if method == 'raw':
            predictions.append(raw)
        elif method == 'sigmoid':
            predictions.append(calibrators['sigmoid'].predict_proba(raw.reshape(-1, 1))[:, 1])
        elif method == 'isotonic':
            predictions.append(calibrators['isotonic'].predict(raw))
        else:
            raise ValueError(method)
    return np.mean(np.vstack(predictions), axis=0)


def group_outer_split(X: np.ndarray, y: np.ndarray, groups: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, dict[str, Any]]:
    splitter = StratifiedGroupKFold(n_splits=20, shuffle=True, random_state=RANDOM_SEED)
    fold_for_row = np.full(len(y), -1, dtype=np.int8); fold_sizes=[]; fold_positives=[]
    for fold, (_, hold_idx) in enumerate(splitter.split(X, y, groups)):
        fold_for_row[hold_idx] = fold; fold_sizes.append(int(len(hold_idx))); fold_positives.append(int(y[hold_idx].sum()))
    train_idx = np.flatnonzero(fold_for_row < 14); val_idx = np.flatnonzero((fold_for_row >= 14) & (fold_for_row < 17)); test_idx = np.flatnonzero(fold_for_row >= 17)
    split_id = np.full(len(y), -1, dtype=np.int8); split_id[train_idx]=0; split_id[val_idx]=1; split_id[test_idx]=2
    unique_groups = np.unique(groups); crossing = int(sum(len(np.unique(split_id[groups == g])) != 1 for g in unique_groups))
    def balance(idx: np.ndarray) -> dict[str, Any]: return {'rows': int(len(idx)), 'positive': int(y[idx].sum()), 'negative': int((y[idx] == 0).sum()), 'positive_rate': float(y[idx].mean())}
    return train_idx, val_idx, test_idx, {'method':'StratifiedGroupKFold(n_splits=20, shuffle=True, random_state=42); folds 0-13 train, 14-16 validation, 17-19 test', 'random_seed':RANDOM_SEED, 'train':balance(train_idx), 'validation':balance(val_idx), 'test':balance(test_idx), 'fold_sizes':fold_sizes, 'fold_positive_counts':fold_positives, 'unique_groups':{'train':int(np.unique(groups[train_idx]).size),'validation':int(np.unique(groups[val_idx]).size),'test':int(np.unique(groups[test_idx]).size)}, 'cross_boundary_groups':crossing}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    frame = pd.read_csv(DATASET, encoding='utf-8-sig', low_memory=False)
    X = frame[FEATURE_COLUMNS].astype('float32').to_numpy(); y = frame['BO'].astype('int8').to_numpy(); groups = pd.util.hash_pandas_object(frame[FEATURE_COLUMNS], index=False).to_numpy(dtype=np.uint64)
    train_idx, val_idx, test_idx, split_report = group_outer_split(X, y, groups)
    train_X, train_y, train_groups = X[train_idx], y[train_idx], groups[train_idx]
    strategy_results = {}; ensembles = {}; start_all=time.time()
    for strategy in ('GroupKFold', 'StratifiedGroupKFold'):
        start=time.time(); ensemble, inner_report = fit_calibrated_ensemble(strategy, train_X, train_y, train_groups)
        strategy_results[strategy]={'fit_seconds':time.time()-start, 'inner_folds':inner_report}
        for method in ('raw','sigmoid','isotonic'):
            val_p = predict_ensemble(ensemble, X[val_idx], method)
            threshold, selected_f1 = threshold_by_validation_f1(y[val_idx], val_p)
            strategy_results[strategy][method]={'validation_threshold':threshold, 'validation_selected_f1':selected_f1, 'validation_metrics':classification_metrics(y[val_idx], val_p, threshold), 'validation_calibration':calibration_diagnostics(y[val_idx], val_p)}
            ensembles[(strategy,method)] = ensemble
    choices=[(strategy, method) for strategy in strategy_results for method in ('sigmoid','isotonic')]
    selected_strategy, selected_method = min(choices, key=lambda key:(strategy_results[key[0]][key[1]]['validation_metrics']['brier_score'], -strategy_results[key[0]][key[1]]['validation_metrics']['pr_auc_average_precision'], -strategy_results[key[0]][key[1]]['validation_metrics']['f1']))
    selected = strategy_results[selected_strategy][selected_method]
    selected_threshold=selected['validation_threshold']
    # Only now, after calibration/strategy/threshold choices are frozen, predict the untouched test set.
    test_p = predict_ensemble(ensembles[(selected_strategy, selected_method)], X[test_idx], selected_method)
    test_metrics = classification_metrics(y[test_idx], test_p, selected_threshold)
    test_metrics['calibration_diagnostics'] = calibration_diagnostics(y[test_idx], test_p)
    source_hash=hashlib.sha256(DATASET.read_bytes()).hexdigest()
    versions={'python':platform.python_version(),'numpy':np.__version__,'pandas':pd.__version__,'scikit_learn':sklearn.__version__}
    report={'source':{'dataset': 'Mendeley Data — Backorder Prediction','license':'CC BY 4.0','file':str(DATASET),'sha256':source_hash,'rows':int(len(y)),'feature_columns':FEATURE_COLUMNS,'target_column':'BO','group_key':'stable pandas hash of 21 features excluding SKU and BO'},'model_config':MODEL_CONFIG,'random_seeds':{'outer_split':RANDOM_SEED,'inner_stratified_group_split':RANDOM_SEED,'sigmoid_calibrator':RANDOM_SEED},'versions':versions,'split':split_report,'inner_cv_comparison':{k:v['inner_folds'] for k,v in strategy_results.items()},'validation_candidates':strategy_results,'selection':{'criterion':'validation Brier score, then validation PR-AUC, then validation F1; only sigmoid/isotonic candidates; test not used','selected_strategy':selected_strategy,'selected_calibration':selected_method,'selected_threshold':selected_threshold},'test_evaluation':{'evaluated_after_selection_only':True,'metrics':test_metrics},'runtime_seconds':time.time()-start_all,'limitations':['Calibrators are paired with the exact fold-trained HGB models that generated their calibration predictions; no OOF calibrator is applied to an all-training HGB model.','962 feature groups contain conflicting BO labels; labels are preserved unchanged.','Calibration diagnostics include small-bin flags and constant-prevalence Brier references, but finite-sample and distribution-shift uncertainty remain.','This is a candidate validation only; it is not integrated, deployed, production-ready, or official Tata Motors data.']}
    (OUT/'audit_validation_report.json').write_text(json.dumps(report,indent=2)+'\n')
    (OUT/'model_config.json').write_text(json.dumps({'model':MODEL_CONFIG,'calibration_methods':['sigmoid','isotonic'],'ensemble_strategy':'one calibrated predictor per group-aware inner fold; average predictions','small_bin_count_threshold':SMALL_BIN_COUNT},indent=2)+'\n')
    (OUT/'split_details.json').write_text(json.dumps({'outer':split_report,'inner':report['inner_cv_comparison']},indent=2)+'\n')
    (OUT/'test_metrics.json').write_text(json.dumps({'selection':report['selection'],'test':report['test_evaluation']},indent=2)+'\n')
    print(json.dumps(report,indent=2))

if __name__ == '__main__': main()
