# Leakage-aware calibrated candidate validation

**Dataset:** Mendeley Data — Backorder Prediction, CC BY 4.0  
**File:** `bopredict.csv`  
**Rows:** 1,929,935  
**Features:** 21 numeric model features; `SKU` excluded; original `BO` preserved  
**SHA-256:** `70604707896dc5eb03e68a907962246f786b464d7ba4ccf3964c139de55c4c99`

## Split and leakage controls

Identical rows were grouped using a stable hash of the 21 model features, excluding `SKU` and `BO`. A reproducible `StratifiedGroupKFold` split used 20 shuffled folds with seed 42: folds 0–13 for training, 14–16 for validation, and 17–19 for test. The resulting partitions were 1,354,083 train rows, 301,486 validation rows, and 274,366 test rows. Positive rates were 0.726%, 0.677%, and 0.767%, respectively.

There were 1,090,641 unique feature groups and 155,454 duplicated groups containing 994,748 rows. **962 groups contained conflicting BO labels.** No feature group crossed a split boundary.

## Results

The existing SGD baseline was retrained only for comparison on the same group-aware split. Its validation-selected threshold was 0.804674. Test results were precision **6.13%**, recall **61.26%**, F1 **11.14%**, and PR-AUC **0.0533**. The test confusion matrix was `[[252511, 19751], [815, 1289]]`.

Uncalibrated HistGradientBoosting achieved validation PR-AUC **0.1806**, F1 **27.76%**, and ECE **0.1514**. Its probabilities remained strongly overconfident.

Calibration was fitted only from group-aware out-of-fold predictions inside the training split. Sigmoid calibration achieved validation Brier score **0.00609** and ECE **0.00184**. Isotonic calibration achieved validation Brier score **0.00598** and ECE **0.00041**, so it was selected using validation data only. The selected validation threshold was **0.151196**.

The selected isotonic-calibrated HistGradientBoosting model was evaluated once on the untouched group-aware test set:

- Precision: **24.18%**
- Recall: **40.64%**
- F1-score: **30.32%**
- PR-AUC: **0.2005**
- Brier score: **0.00665**
- 10-bin ECE: **0.00047**
- Confusion matrix: `[[269581, 2681], [1249, 855]]`

## Decision and limitations

The calibrated candidate is suitable for a **bounded prototype demonstration as a ranking and risk-band signal**, provided the UI clearly labels it as public Mendeley data and not Tata Motors data. The calibration diagnostics are much better than the uncalibrated candidate, but they do not establish production reliability. The data contains 962 conflicting-label groups, the split is derived from one dataset snapshot, and calibration quality can degrade under distribution shift.

The candidate was **not integrated into the live Risk Engine**, and no production application, deployment, or publication was performed. Existing SGD artifacts and the prior validation report were preserved.

## Files created

- `validate_candidate.py` — reproducible validation runner
- `group_calibrated_validation_report.json` — detailed metrics, split, leakage, and calibration report
- `summary.md` — this summary
