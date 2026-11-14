"""Strict, inactive readiness boundary for the Public Backorder Model Demo.

This module deliberately does not score records. A future implementation must
provide serialized paired HGB models and calibrators plus a parity-tested
manifest before prediction can be activated.
"""
from __future__ import annotations

import json
import math
import numbers
from pathlib import Path
from typing import Any, Mapping

REQUIRED_PUBLIC_FEATURES = (
    'INV', 'TIM', 'INQ', 'FOR3', 'FOR6', 'FOR9', 'SAL1', 'SAL3', 'SAL6', 'SAL9',
    'MIN', 'RSK1', 'OVRP', 'SUP1', 'SUP2', 'OVRA', 'RSK2', 'RSK3', 'RSK4', 'RSK5', 'RSK6',
)
PUBLIC_DATASET_ATTRIBUTION = 'Mendeley Data — Backorder Prediction; CC BY 4.0'


class PublicFeatureValidationError(ValueError):
    """Raised when a public-dataset inference record fails strict validation."""

    def __init__(self, issues: dict[str, str]):
        self.issues = issues
        super().__init__('Invalid public backorder feature record: ' + '; '.join(f'{k}: {v}' for k, v in issues.items()))


class ModelPackageNotReadyError(RuntimeError):
    """Raised because serialized model/calibrator artifacts are not ready."""


def validate_public_features(record: Mapping[str, Any], *, reject_extra_fields: bool = True) -> dict[str, float]:
    """Validate and normalize exactly the public model's 21 numeric inputs.

    Numeric strings are rejected intentionally. Callers must parse and validate
    at their ingestion boundary rather than silently coercing user input.
    """
    if not isinstance(record, Mapping):
        raise PublicFeatureValidationError({'record': 'expected a mapping/object'})
    issues: dict[str, str] = {}
    missing = [name for name in REQUIRED_PUBLIC_FEATURES if name not in record]
    if missing:
        issues['missing'] = ','.join(missing)
    if reject_extra_fields:
        extra = sorted(set(record) - set(REQUIRED_PUBLIC_FEATURES))
        if extra:
            issues['extra'] = ','.join(extra)
    normalized: dict[str, float] = {}
    for name in REQUIRED_PUBLIC_FEATURES:
        if name not in record:
            continue
        value = record[name]
        if isinstance(value, bool) or not isinstance(value, numbers.Real):
            issues[name] = 'must be a real numeric value, not a string, boolean, complex value, or null'
            continue
        numeric = float(value)
        if not math.isfinite(numeric):
            issues[name] = 'must be finite; NaN and infinity are rejected'
            continue
        normalized[name] = numeric
    if issues:
        raise PublicFeatureValidationError(issues)
    return normalized


def inspect_model_package(package_dir: str | Path) -> dict[str, Any]:
    """Return readiness status without loading or executing model artifacts."""
    root = Path(package_dir)
    manifest_path = root / 'manifest.json'
    reasons: list[str] = []
    manifest: dict[str, Any] | None = None
    if not manifest_path.is_file():
        reasons.append('manifest.json is missing')
    else:
        try:
            manifest = json.loads(manifest_path.read_text())
        except (OSError, json.JSONDecodeError):
            reasons.append('manifest.json is unreadable or invalid JSON')
    if manifest is not None:
        if manifest.get('ready') is not True:
            reasons.append('manifest.ready is not true')
        if tuple(manifest.get('feature_columns', ())) != REQUIRED_PUBLIC_FEATURES:
            reasons.append('manifest feature_columns do not exactly match the 21-feature contract')
        for key in ('model_files', 'calibrator_files', 'parity_test_file'):
            values = manifest.get(key)
            if not isinstance(values, list) or not values:
                reasons.append(f'manifest.{key} is missing or empty')
            else:
                for relative in values:
                    if not (root / relative).is_file():
                        reasons.append(f'missing package file: {relative}')
    return {'ready': not reasons, 'package_dir': str(root), 'attribution': PUBLIC_DATASET_ATTRIBUTION, 'reasons': reasons, 'manifest': manifest}


def score_public_backorder_demo(record: Mapping[str, Any], package_dir: str | Path) -> dict[str, Any]:
    """Validate input, then refuse scoring until the package gate is complete."""
    features = validate_public_features(record)
    status = inspect_model_package(package_dir)
    if not status['ready']:
        raise ModelPackageNotReadyError('Public Backorder Model Demo prediction is inactive: ' + '; '.join(status['reasons']))
    raise ModelPackageNotReadyError('Prediction activation is intentionally not implemented in this readiness phase.')
