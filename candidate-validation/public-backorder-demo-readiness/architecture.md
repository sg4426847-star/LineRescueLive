# Isolated Public Backorder Model Demo architecture

## Boundary

The Public Backorder Model Demo is a separate future route or view. It does not replace or call the existing Synthetic Demo Data workflow and does not feed the Tata Nexon EV Risk Engine. The synthetic workflow remains the source of illustrative component inventory, SafeStock calculations, supplier-delay what-if controls, production orders, and battery-pack scenario copy.

The public demo must display:

- **Mendeley Data — Backorder Prediction**
- **CC BY 4.0** attribution and source link
- **Public dataset model; not Tata Motors internal data**
- **Illustrative Tata Nexon EV scenario is separate and synthetic**
- Model version, calibration method, threshold, and validation limitations

## Proposed components

1. **Public record intake** — accepts a record containing the exact 21-feature contract. It must reject missing, extra, non-numeric, non-finite, or invalid values through `public_backorder_demo.py`.
2. **Package readiness gate** — requires a manifest declaring the exact feature order, source hash, model/calibrator files, library versions, and passing serialization-parity test. The current candidate is intentionally not ready because no serialized paired HGB models and calibrators exist.
3. **Inference adapter** — validates the public record and returns a model probability, thresholded prediction, and model risk band only after the package gate passes. It must not accept synthetic `ComponentInventory` or `ManufacturingScenario` objects.
4. **Public-only presentation** — renders public-model metrics and record-level outputs in a clearly separate panel. It must not write to synthetic inventory state or reuse Tata Nexon EV component fields.
5. **Audit/attribution panel** — links the Mendeley source and shows the model’s validation date, group-aware split, calibration choice, and limitations.

## Activation gate

Prediction remains inactive until all of the following are true:

- Serialized fold-trained HGB models exist.
- Matching sigmoid/isotonic calibrator artifacts exist for each fold.
- A manifest records exact feature order, source SHA-256, model configuration, random seeds, Python and library versions, and calibration threshold.
- Serialization round-trip parity tests reproduce in-memory probabilities within a documented tolerance.
- Strict input-schema tests pass.
- A human approves the separate demo scope.

The current readiness package intentionally fails this gate and must return a clear not-ready status rather than score records.

## Explicit non-mapping rule

The current LineRescue fields `onHand`, `reserved`, `committed`, `safetyStock`, `expectedDemand`, `supplierLeadTimeDays`, `predictedShortageDate`, and `risk` are illustrative scenario fields, not verified public-dataset features. They must not be renamed or transformed into `INV`, `MIN`, `TIM`, `FOR*`, `SAL*`, `SUP*`, `OVR*`, or `RSK*` inputs.
