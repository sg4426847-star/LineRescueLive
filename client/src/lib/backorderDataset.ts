import { metricsArtifact, modelArtifact, samplesArtifact } from "./backorderArtifacts";

export type BackorderDatasetMode = "synthetic" | "public";

export const BACKORDER_SOURCE = {
  name: metricsArtifact.source.name,
  license: metricsArtifact.source.license,
  url: metricsArtifact.source.source_url,
  fileName: metricsArtifact.source.file_name,
  sha256: metricsArtifact.source.sha256,
  disclosure: "Mendeley Data — Backorder Prediction · CC BY 4.0 · Not Tata Motors Internal Data.",
} as const;

export const BACKORDER_SOURCE_COLUMNS = metricsArtifact.source.source_columns;
export const BACKORDER_FEATURE_COLUMNS = metricsArtifact.training.feature_columns;
export const BACKORDER_MODEL = modelArtifact;
export const BACKORDER_METRICS = metricsArtifact;
export const BACKORDER_SAMPLE_PREDICTIONS = samplesArtifact;

export type BackorderSourceRecord = Record<string, string | number>;

export type PublicBackorderValidation = {
  valid: boolean;
  missing: string[];
  invalid: string[];
};

export function validatePublicBackorderRecord(record: BackorderSourceRecord): PublicBackorderValidation {
  const missing: string[] = [];
  const invalid: string[] = [];
  for (const column of BACKORDER_FEATURE_COLUMNS) {
    if (!(column in record) || record[column] === "") {
      missing.push(column);
      continue;
    }
    if (!Number.isFinite(Number(record[column]))) invalid.push(column);
  }
  return { valid: missing.length === 0 && invalid.length === 0, missing, invalid };
}

export function scorePublicBackorder(record: BackorderSourceRecord) {
  const validation = validatePublicBackorderRecord(record);
  if (!validation.valid) {
    throw new Error(`Public backorder record rejected: missing [${validation.missing.join(", ")}] invalid [${validation.invalid.join(", ")}]`);
  }
  const values = BACKORDER_FEATURE_COLUMNS.map(column => Number(record[column]));
  const scaled = values.map((value, index) => (value - BACKORDER_MODEL.scaler_mean[index]) / Math.max(BACKORDER_MODEL.scaler_scale[index], Number.EPSILON));
  const logit = BACKORDER_MODEL.intercept + scaled.reduce((sum, value, index) => sum + value * BACKORDER_MODEL.coefficients[index], 0);
  const probability = 1 / (1 + Math.exp(-Math.max(-40, Math.min(40, logit))));
  return {
    probability,
    predictedBackorder: probability >= BACKORDER_MODEL.threshold,
    risk: probability >= 0.75 ? "critical" : probability >= 0.4 ? "high" : probability >= 0.15 ? "watch" : "stable",
    usesFeatures: BACKORDER_FEATURE_COLUMNS,
    excludedFromTraining: ["SKU", "BO"],
  } as const;
}

export function publicBackorderPercent(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}
