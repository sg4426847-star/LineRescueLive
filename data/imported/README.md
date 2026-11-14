# Public backorder dataset input

This directory is reserved for an optional local copy of `bopredict.csv` used by `scripts/train_backorder_model.py`.

- Source: [Mendeley Data — Backorder Prediction](https://data.mendeley.com/datasets/krnbcxksn3/1)
- License: CC BY 4.0
- Source file: `bopredict.csv`
- SHA-256 inspected input: `70604707896dc5eb03e68a907962246f786b464d7ba4ccf3964c139de55c4c99`
- Target: original `BO` column; the training pipeline derives `project_target` without changing `BO`.
- Identifier: original `SKU` is preserved but excluded from model features.

The raw 200 MB CSV is intentionally not committed to the application bundle. Re-run the pipeline with a local path:

```bash
python3 scripts/train_backorder_model.py \
  --input /path/to/bopredict.csv \
  --artifact-dir client/src/lib/backorder_artifacts
```

The application consumes only the generated model, metrics, and compact traceable sample artifacts. Public records remain separate from the illustrative Tata Nexon EV manufacturing data and are not presented as Tata Motors data.
