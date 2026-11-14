import { describe, expect, it } from "vitest";
import { BACKORDER_FEATURE_COLUMNS, BACKORDER_METRICS, BACKORDER_MODEL, BACKORDER_SAMPLE_PREDICTIONS, BACKORDER_SOURCE_COLUMNS, scorePublicBackorder, validatePublicBackorderRecord } from "./backorderDataset";

describe("public backorder dataset integration", () => {
  it("preserves source columns and maps BO without training on SKU", () => {
    expect(BACKORDER_SOURCE_COLUMNS).toContain("SKU");
    expect(BACKORDER_SOURCE_COLUMNS).toContain("BO");
    expect(BACKORDER_FEATURE_COLUMNS).not.toContain("SKU");
    expect(BACKORDER_FEATURE_COLUMNS).not.toContain("BO");
    expect(BACKORDER_MODEL.excluded_identifier).toBe("SKU");
    expect(BACKORDER_MODEL.source_target_column).toBe("BO");
  });

  it("exposes actual held-out metrics and stratified split counts", () => {
    expect(BACKORDER_METRICS.source.rows).toBe(1929935);
    expect(BACKORDER_METRICS.training.train_rows + BACKORDER_METRICS.training.validation_rows + BACKORDER_METRICS.training.test_rows).toBe(1929935);
    expect(BACKORDER_METRICS.evaluation.model.pr_auc_average_precision).toBeGreaterThan(BACKORDER_METRICS.evaluation.majority_baseline.pr_auc_average_precision);
    expect(BACKORDER_METRICS.evaluation.model.confusion_matrix_labels_0_1).toHaveLength(2);
  });

  it("scores a traceable source record without inventing synthetic stock fields", () => {
    const result = scorePublicBackorder(BACKORDER_SAMPLE_PREDICTIONS[0]);
    expect(Number.isFinite(result.probability)).toBe(true);
    expect(result.usesFeatures).toEqual(BACKORDER_FEATURE_COLUMNS);
    expect(result.excludedFromTraining).toEqual(["SKU", "BO"]);
  });

  it("rejects incomplete, non-numeric, and non-finite public records", () => {
    const complete: Record<string, string | number> = { ...BACKORDER_SAMPLE_PREDICTIONS[0] };
    delete complete.INV;
    expect(validatePublicBackorderRecord(complete).missing).toContain("INV");
    expect(() => scorePublicBackorder(complete)).toThrow(/missing/);

    const nonNumeric = { ...BACKORDER_SAMPLE_PREDICTIONS[0], INV: "not-a-number" };
    expect(validatePublicBackorderRecord(nonNumeric).invalid).toContain("INV");
    expect(() => scorePublicBackorder(nonNumeric)).toThrow(/invalid/);

    const nonFinite = { ...BACKORDER_SAMPLE_PREDICTIONS[0], INV: Number.NaN };
    expect(validatePublicBackorderRecord(nonFinite).invalid).toContain("INV");
    expect(() => scorePublicBackorder(nonFinite)).toThrow(/invalid/);
  });
});
