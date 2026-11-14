import importlib.util
import json
import math
from pathlib import Path

import numpy as np
import pytest

MODULE_PATH = Path(__file__).with_name('public_backorder_demo.py')
spec = importlib.util.spec_from_file_location('public_backorder_demo', MODULE_PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def valid_record():
    return {name: float(index + 1) for index, name in enumerate(module.REQUIRED_PUBLIC_FEATURES)}


def test_accepts_exact_finite_real_feature_contract():
    result = module.validate_public_features(valid_record())
    assert tuple(result) == module.REQUIRED_PUBLIC_FEATURES
    assert all(isinstance(value, float) and math.isfinite(value) for value in result.values())


@pytest.mark.parametrize('bad_value', [None, '1.0', True, complex(1, 0), float('nan'), float('inf'), float('-inf')])
def test_rejects_invalid_values(bad_value):
    record = valid_record()
    record['INV'] = bad_value
    with pytest.raises(module.PublicFeatureValidationError) as error:
        module.validate_public_features(record)
    assert 'INV' in error.value.issues


def test_rejects_missing_and_unexpected_fields_without_zero_substitution():
    record = valid_record()
    del record['INV']
    record['unexpected'] = 3.0
    with pytest.raises(module.PublicFeatureValidationError) as error:
        module.validate_public_features(record)
    assert 'missing' in error.value.issues
    assert 'extra' in error.value.issues


def test_can_explicitly_allow_metadata_fields_but_still_requires_features():
    record = valid_record(); record['SKU'] = 123
    result = module.validate_public_features(record, reject_extra_fields=False)
    assert result['INV'] == 1.0
    assert 'SKU' not in result


def test_rejects_non_mapping_input():
    with pytest.raises(module.PublicFeatureValidationError):
        module.validate_public_features([])


def test_readiness_gate_is_closed_without_serialized_package(tmp_path):
    status = module.inspect_model_package(tmp_path)
    assert not status['ready']
    assert 'manifest.json is missing' in status['reasons']
    with pytest.raises(module.ModelPackageNotReadyError):
        module.score_public_backorder_demo(valid_record(), tmp_path)


def test_readiness_gate_requires_manifest_files_and_exact_schema(tmp_path):
    (tmp_path / 'manifest.json').write_text(json.dumps({
        'ready': True,
        'feature_columns': list(module.REQUIRED_PUBLIC_FEATURES),
        'model_files': ['model-0.joblib'],
        'calibrator_files': ['calibrator-0.json'],
        'parity_test_file': ['parity.json'],
    }))
    status = module.inspect_model_package(tmp_path)
    assert not status['ready']
    assert any('missing package file' in reason for reason in status['reasons'])


def test_nan_like_numpy_values_are_rejected():
    record = valid_record(); record['TIM'] = np.float64(np.nan)
    with pytest.raises(module.PublicFeatureValidationError):
        module.validate_public_features(record)
