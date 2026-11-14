#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import platform
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import sklearn

ROOT = Path(__file__).parent
DATASET = Path('/home/ubuntu/linerescue-unzipped/data/imported/bopredict.csv')
AUDIT_DIR = Path('/home/ubuntu/linerescue-unzipped/candidate-validation/2026-11-11-group-calibrated-audit')
PACKAGE_DIR = ROOT / 'selected-package-v1'
FEATURE_COLUMNS = ['INV','TIM','INQ','FOR3','FOR6','FOR9','SAL1','SAL3','SAL6','SAL9','MIN','RSK1','OVRP','SUP1','SUP2','OVRA','RSK2','RSK3','RSK4','RSK5','RSK6']
EXPECTED_MODEL_CONFIG = {'algorithm': 'HistGradientBoostingClassifier', 'max_iter': 100, 'learning_rate': 0.1, 'max_leaf_nodes': 31, 'l2_regularization': 0.0, 'class_weight': 'balanced', 'random_state': 42}
EXPECTED_CALIBRATION = 'isotonic'
EXPECTED_THRESHOLD = 0.13447116453950167
RTOL = 1e-7
ATOL = 1e-9
FIXTURE_GLOBAL_ROWS = [0, 1, 2, 3, 4, 5, 100, 1000, 10000, 100000, 1000000, 1900000]


def load_audit_module():
    path = AUDIT_DIR / 'audit_validation.py'
    spec = importlib.util.spec_from_file_location('audit_validation_for_packaging', path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def sha256_json(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def versions() -> dict[str, str]:
    return {'python': platform.python_version(), 'numpy': np.__version__, 'pandas': pd.__version__, 'scikit_learn': sklearn.__version__, 'joblib': joblib.__version__, 'platform': platform.platform()}


def main() -> None:
    PACKAGE_DIR.mkdir(parents=True, exist_ok=True)
    audit = load_audit_module()
    frame = pd.read_csv(DATASET, encoding='utf-8-sig', low_memory=False)
    assert list(frame[FEATURE_COLUMNS].columns) == FEATURE_COLUMNS
    X = frame[FEATURE_COLUMNS].astype('float32').to_numpy()
    y = frame['BO'].astype('int8').to_numpy()
    groups = pd.util.hash_pandas_object(frame[FEATURE_COLUMNS], index=False).to_numpy(dtype=np.uint64)
    source_sha = sha256_file(DATASET)
    assert source_sha == '70604707896dc5eb03e68a907962246f786b464d7ba4ccf3964c139de55c4c99'

    train_idx, val_idx, test_idx, split_report = audit.group_outer_split(X, y, groups)
    assert split_report['cross_boundary_groups'] == 0
    train_X, train_y, train_groups = X[train_idx], y[train_idx], groups[train_idx]
    folds = audit.make_inner_folds('StratifiedGroupKFold', train_X, train_y, train_groups)
    fold_report = audit.describe_folds(folds, train_y, train_groups)
    assert fold_report['all_groups_isolated']
    inner_fold_for_global_row = np.full(len(y), -1, dtype=np.int8)
    for fold_id, (_, holdout_relative) in enumerate(folds):
        inner_fold_for_global_row[train_idx[holdout_relative]] = fold_id
    assert np.all(inner_fold_for_global_row[train_idx] >= 0)

    np.savez_compressed(PACKAGE_DIR / 'inner_fold_assignments.npz', global_row_index=train_idx.astype(np.int64), holdout_fold=inner_fold_for_global_row[train_idx].astype(np.int8))
    assignment_sha = sha256_file(PACKAGE_DIR / 'inner_fold_assignments.npz')

    pairs = []
    in_memory_models = []
    for fold_id, (inner_train_relative, holdout_relative) in enumerate(folds):
        global_train = train_idx[inner_train_relative]
        global_holdout = train_idx[holdout_relative]
        model = audit.make_hgb()
        model.fit(X[global_train], y[global_train])
        raw_holdout = model.predict_proba(X[global_holdout])[:, 1]
        calibrator = audit.IsotonicRegression(y_min=0.0, y_max=1.0, out_of_bounds='clip')
        calibrator.fit(raw_holdout, y[global_holdout])
        model_path = PACKAGE_DIR / f'fold-{fold_id}-hgb.joblib'
        calibrator_path = PACKAGE_DIR / f'fold-{fold_id}-isotonic.joblib'
        joblib.dump(model, model_path, compress=3)
        joblib.dump(calibrator, calibrator_path, compress=3)
        pair = {'fold_id': fold_id, 'model_file': model_path.name, 'calibrator_file': calibrator_path.name, 'train_rows': int(len(global_train)), 'holdout_rows': int(len(global_holdout)), 'holdout_positive': int(y[global_holdout].sum()), 'holdout_group_count': int(np.unique(groups[global_holdout]).size), 'calibration_raw_prediction_sha256': sha256_json([float(v) for v in raw_holdout]), 'model_sha256': sha256_file(model_path), 'calibrator_sha256': sha256_file(calibrator_path), 'model_bytes': model_path.stat().st_size, 'calibrator_bytes': calibrator_path.stat().st_size}
        pairs.append(pair)
        in_memory_models.append((model, calibrator))

    fixture = []
    for global_row in FIXTURE_GLOBAL_ROWS:
        feature_record = {name: float(frame.iloc[global_row][name]) for name in FEATURE_COLUMNS}
        # Strict validation is imported from the isolated readiness module.
        validator_path = ROOT / 'public_backorder_demo.py'
        validator_spec = importlib.util.spec_from_file_location('public_backorder_demo_for_packaging', validator_path)
        validator_module = importlib.util.module_from_spec(validator_spec); assert validator_spec.loader is not None; validator_spec.loader.exec_module(validator_module)
        validated = validator_module.validate_public_features(feature_record)
        fixture.append({'row_index': int(global_row), 'SKU': int(frame.iloc[global_row]['SKU']), 'features': validated})
    (PACKAGE_DIR / 'parity_fixture.json').write_text(json.dumps({'feature_columns': FEATURE_COLUMNS, 'rows': fixture}, indent=2) + '\n')

    def ensemble_predict(loaded_pairs, rows):
        values = np.asarray([[float(row['features'][name]) for name in FEATURE_COLUMNS] for row in rows], dtype=np.float32)
        per_fold = []
        for model, calibrator in loaded_pairs:
            raw = model.predict_proba(values)[:, 1]
            per_fold.append(calibrator.predict(raw))
        return np.mean(np.vstack(per_fold), axis=0)

    in_memory_predictions = ensemble_predict(in_memory_models, fixture)
    assert np.isfinite(in_memory_predictions).all() and ((in_memory_predictions >= 0) & (in_memory_predictions <= 1)).all()
    frozen_labels = (in_memory_predictions >= EXPECTED_THRESHOLD).astype(np.int8)
    (PACKAGE_DIR / 'parity_predictions_in_memory.json').write_text(json.dumps({'row_indices': FIXTURE_GLOBAL_ROWS, 'probabilities': in_memory_predictions.tolist(), 'threshold': EXPECTED_THRESHOLD, 'predicted_backorder': frozen_labels.tolist()}, indent=2) + '\n')

    reloaded_pairs = []
    for pair in pairs:
        assert pair['fold_id'] == len(reloaded_pairs)
        reloaded_pairs.append((joblib.load(PACKAGE_DIR / pair['model_file']), joblib.load(PACKAGE_DIR / pair['calibrator_file'])))
    reloaded_predictions = ensemble_predict(reloaded_pairs, fixture)
    np.testing.assert_allclose(in_memory_predictions, reloaded_predictions, rtol=RTOL, atol=ATOL)
    max_abs_error = float(np.max(np.abs(in_memory_predictions - reloaded_predictions)))
    reloaded_labels = (reloaded_predictions >= EXPECTED_THRESHOLD).astype(np.int8)
    assert np.array_equal(frozen_labels, reloaded_labels)
    assert [row['row_index'] for row in fixture] == FIXTURE_GLOBAL_ROWS

    audit_report = json.loads((AUDIT_DIR / 'audit_validation_report.json').read_text())
    metadata_report = json.loads((ROOT / 'audit_validation_report_with_metadata.json').read_text())
    assert audit_report['source']['feature_columns'] == FEATURE_COLUMNS
    assert audit_report['model_config'] == EXPECTED_MODEL_CONFIG
    assert metadata_report['versions']['scikit_learn'] == sklearn.__version__
    assert source_sha == audit_report['source']['sha256'] == metadata_report['source']['sha256']
    assert EXPECTED_THRESHOLD == json.loads((AUDIT_DIR / 'test_metrics.json').read_text())['selection']['selected_threshold']

    parity = {'passed': True, 'rtol': RTOL, 'atol': ATOL, 'max_absolute_error': max_abs_error, 'prediction_order_preserved': True, 'finite_probabilities_in_range': True, 'frozen_threshold_preserved': True, 'feature_order_preserved': True, 'model_calibrator_pairs': len(pairs), 'fold_isolation': fold_report['all_groups_isolated']}
    (PACKAGE_DIR / 'parity_test_results.json').write_text(json.dumps(parity, indent=2) + '\n')
    (PACKAGE_DIR / 'fold_details.json').write_text(json.dumps({'strategy': 'StratifiedGroupKFold', 'fold_report': fold_report, 'outer_split': split_report, 'assignment_file': 'inner_fold_assignments.npz', 'assignment_sha256': assignment_sha}, indent=2) + '\n')

    artifact_names = [pair['model_file'] for pair in pairs] + [pair['calibrator_file'] for pair in pairs] + ['inner_fold_assignments.npz', 'parity_fixture.json', 'parity_predictions_in_memory.json', 'parity_test_results.json', 'fold_details.json']
    artifact_inventory = [{'path': name, 'sha256': sha256_file(PACKAGE_DIR / name), 'bytes': (PACKAGE_DIR / name).stat().st_size} for name in artifact_names]
    package_manifest = {'ready': False, 'activation_allowed': False, 'status': 'verified_but_inactive', 'attribution': 'Mendeley Data — Backorder Prediction; CC BY 4.0', 'source_sha256': source_sha, 'feature_columns': FEATURE_COLUMNS, 'model_config': EXPECTED_MODEL_CONFIG, 'calibration_method': EXPECTED_CALIBRATION, 'frozen_threshold': EXPECTED_THRESHOLD, 'random_seed': 42, 'versions': versions(), 'outer_split_reference': 'existing group-aware split from audit report; unchanged', 'inner_split': {'strategy': 'StratifiedGroupKFold', 'n_splits': 3, 'shuffle': True, 'random_state': 42, 'fold_assignment_file': 'inner_fold_assignments.npz', 'fold_isolation_verified': True}, 'pairs': pairs, 'parity': parity, 'artifacts': artifact_inventory, 'activation_blockers': ['No application integration is permitted in this phase.', 'Feature meanings, units, and time windows remain undocumented.', 'Human approval and a separate demo route are still required.']}
    (PACKAGE_DIR / 'package_manifest.json').write_text(json.dumps(package_manifest, indent=2) + '\n')
    (PACKAGE_DIR / 'packaging_test_report.json').write_text(json.dumps({'passed': True, 'checks': ['feature_order_integrity', 'model_calibrator_pairing', 'prediction_order_preservation', 'finite_probability_range', 'frozen_threshold_behavior', 'dataset_sha256_integrity', 'configuration_integrity', 'fold_isolation', 'serialization_parity', 'strict_schema_fixture_validation'], 'parity': parity, 'package_manifest': 'package_manifest.json'}, indent=2) + '\n')
    # Update the isolated readiness manifest only after every assertion above passed.
    readiness_path = ROOT / 'readiness_manifest.json'
    readiness = json.loads(readiness_path.read_text())
    readiness.update({'ready': False, 'status': 'verified_but_inactive', 'activation_allowed': False, 'package_dir': 'selected-package-v1', 'package_manifest': 'selected-package-v1/package_manifest.json', 'verified_artifact_count': len(artifact_inventory), 'parity': parity, 'versions': versions(), 'model_config': EXPECTED_MODEL_CONFIG, 'calibration_method': EXPECTED_CALIBRATION, 'frozen_threshold': EXPECTED_THRESHOLD, 'source_sha256': source_sha, 'verification_note': 'Actual serialized artifacts passed offline parity checks; prediction remains inactive and unintegrated.'})
    readiness_path.write_text(json.dumps(readiness, indent=2) + '\n')
    print(json.dumps({'passed': True, 'package_dir': str(PACKAGE_DIR), 'pairs': pairs, 'parity': parity, 'artifact_inventory': artifact_inventory}, indent=2))


if __name__ == '__main__':
    main()
