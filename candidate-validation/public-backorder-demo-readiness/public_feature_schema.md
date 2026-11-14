# Public Backorder Model Demo feature contract

**Source:** Mendeley Data — Backorder Prediction  
**License:** CC BY 4.0  
**Source file:** `bopredict.csv`  
**Target:** `BO` (source label only; not an inference input)  
**Identifier:** `SKU` (retained for traceability; excluded from model training)

The candidate model requires exactly the following 21 numeric features. The archive inspection establishes that these columns are numeric in the source CSV. The source materials available in this project do not establish authoritative business definitions, time windows, units, or coding dictionaries for the abbreviations below. Those meanings and units are therefore marked **undocumented** rather than inferred from their names.

| Feature | Observed source type | Meaning | Unit | Integration note |
|---|---|---|---|---|
| `INV` | float64 | Undocumented | Undocumented | Do not map from synthetic `onHand` without source documentation. |
| `TIM` | float64 | Undocumented | Undocumented | Do not map from lead time or dates without source documentation. |
| `INQ` | float64 | Undocumented | Undocumented | No equivalent current LineRescue field established. |
| `FOR3` | float64 | Undocumented | Undocumented | Forecast horizon/scale undocumented. |
| `FOR6` | float64 | Undocumented | Undocumented | Forecast horizon/scale undocumented. |
| `FOR9` | float64 | Undocumented | Undocumented | Forecast horizon/scale undocumented. |
| `SAL1` | float64 | Undocumented | Undocumented | Sales horizon/scale undocumented. |
| `SAL3` | float64 | Undocumented | Undocumented | Sales horizon/scale undocumented. |
| `SAL6` | float64 | Undocumented | Undocumented | Sales horizon/scale undocumented. |
| `SAL9` | float64 | Undocumented | Undocumented | Sales horizon/scale undocumented. |
| `MIN` | float64 | Undocumented | Undocumented | Do not map from synthetic safety stock without documentation. |
| `RSK1` | int64 | Undocumented encoded signal | Undocumented | Do not interpret as current risk level. |
| `OVRP` | float64 | Undocumented | Undocumented | Do not assume overage/percentage semantics. |
| `SUP1` | float64 | Undocumented | Undocumented | Supplier signal meaning and unit undocumented. |
| `SUP2` | float64 | Undocumented | Undocumented | Supplier signal meaning and unit undocumented. |
| `OVRA` | float64 | Undocumented | Undocumented | Do not assume overage/amount semantics. |
| `RSK2` | int64 | Undocumented encoded signal | Undocumented | Do not interpret as current risk level. |
| `RSK3` | int64 | Undocumented encoded signal | Undocumented | Do not interpret as current risk level. |
| `RSK4` | int64 | Undocumented encoded signal | Undocumented | Do not interpret as current risk level. |
| `RSK5` | int64 | Undocumented encoded signal | Undocumented | Do not interpret as current risk level. |
| `RSK6` | int64 | Undocumented encoded signal | Undocumented | Do not interpret as current risk level. |

## Strict ingestion rules

A public-model inference record must contain all 21 fields, contain no unexpected fields in the strict mode, and provide real finite numeric values. Missing values, `null`, numeric strings, booleans, complex values, `NaN`, positive infinity, and negative infinity are rejected. The validator never substitutes zero.

No field from the current illustrative Tata Nexon EV inventory schema is a verified substitute for any public feature. The public record path must remain separate from `ComponentInventory` and `ManufacturingScenario`. Public predictions must never populate reserved stock, committed stock, safety stock, battery components, production orders, supplier delay, or Tata Nexon EV forecasts.
