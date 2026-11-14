import importlib.util
from pathlib import Path

import numpy as np
from sklearn.metrics import f1_score

MODULE_PATH = Path(__file__).with_name('audit_validation.py')
spec = importlib.util.spec_from_file_location('audit_validation', MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def test_threshold_aggregates_tied_probabilities_and_matches_reported_f1():
    y = np.array([1, 0, 1, 0, 0, 1], dtype=np.int8)
    p = np.array([0.9, 0.9, 0.5, 0.5, 0.5, 0.2], dtype=float)
    threshold, reported_f1 = module.threshold_by_validation_f1(y, p)
    actual_f1 = f1_score(y, p >= threshold, zero_division=0)
    assert actual_f1 == reported_f1
    assert threshold in {0.9, 0.5, 0.2}
    assert threshold != 0.5 or np.all((p >= threshold) == (p == 0.5) | (p == 0.9))


def test_group_kfold_and_stratified_group_kfold_isolate_groups():
    rng = np.random.default_rng(42)
    X = rng.normal(size=(90, 3)).astype('float32')
    y = np.tile(np.array([0, 0, 0, 1, 0], dtype=np.int8), 18)
    groups = np.repeat(np.arange(30), 3)
    for strategy in ('GroupKFold', 'StratifiedGroupKFold'):
        folds = module.make_inner_folds(strategy, X, y, groups)
        report = module.describe_folds(folds, y, groups)
        assert report['all_groups_isolated']
        assert all(row['group_overlap'] == 0 for row in report['folds'])
        assert all(row['holdout_positive'] + row['holdout_negative'] == row['holdout_rows'] for row in report['folds'])


def test_paired_calibration_ensemble_returns_finite_probabilities():
    rng = np.random.default_rng(7)
    X = rng.normal(size=(180, 4)).astype('float32')
    y = np.tile(np.array([0, 0, 0, 0, 1], dtype=np.int8), 36)
    groups = np.repeat(np.arange(60), 3)
    ensemble, fold_report = module.fit_calibrated_ensemble('StratifiedGroupKFold', X, y, groups)
    assert fold_report['all_groups_isolated']
    for method in ('raw', 'sigmoid', 'isotonic'):
        p = module.predict_ensemble(ensemble, X[:30], method)
        assert p.shape == (30,)
        assert np.isfinite(p).all()
        assert ((p >= 0) & (p <= 1)).all()
