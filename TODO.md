# LineRescue AI — Upgrade Outcomes

## Existing engine and application continuity

- [x] Existing React/TypeScript/Vite/Express project is upgraded in place; no replacement application is created.
- [x] SafeStock remains `MAX(0, on-hand − reserved − committed − safety stock)` and existing validation, ripple-effect, recovery-option, decision-receipt, export, and simulator tests continue to pass.
- [x] Existing Executive Overview, SafeStock Validator, Recovery Plans, Impact Map, Evidence & Audit, and Data & Assumptions behavior remains functional and synthetic-data labels remain visible.

## SAP removal

- [x] Remove the SAP Material Stock API, `API_MATERIAL_STOCK_SRV`, `A_MaterialStock`, `A_MatlStkInAcctMod`, OAuth client-credentials flow, token endpoint configuration, SAP environment variables, SAP adapter files/tests, `/api/sap/status`, and `/api/sap/material-stock`.
- [x] Remove SAP navigation, connection status, configuration screens, SAP documentation, SAP-specific frontend/backend imports, and SAP-only receipt limitations.
- [x] The application runs without an SAP tenant or SAP credentials and does not claim Tata Motors partnership, live inventory, or internal-system access.

## Sarvam AI integration

- [x] Server-side Sarvam integration uses only `SARVAM_API_KEY`, never frontend variables, browser storage, source code, or logs.
- [x] Implement `GET /api/sarvam/status`, `POST /api/sarvam/chat`, `POST /api/sarvam/transcribe`, and `POST /api/sarvam/speak` with validation, timeouts, authentication-error handling, rate-limit handling, and no fake success.
- [x] Use official current REST resources: `/v1/chat/completions` with `sarvam-105b`, `/speech-to-text` with `saaras:v4`, and `/text-to-speech` with `bulbul:v4-flash`.
- [x] Sarvam status is Demo Mode until a real request succeeds; only a successful authorized request may display Connected.
- [x] Multilingual assistant supports English and Hindi context-aware questions about the available LineRescue data.
- [x] Voice shortage reporting supports audio upload, transcript review, extraction of component/quantity/location/urgency, and a synthetic demo fallback when the API is unavailable.
- [x] Optional text-to-speech playback works only after a real Sarvam response; failures remain visible and actionable.

## Automobile manufacturing intelligence

- [x] Product identity is “Predict Shortages. Protect Production. Recover Smarter.” for an independent, illustrative Tata Motors case-study target.
- [x] Synthetic data models one automobile manufacturing facility and one assembly line with components, inventory, reserved/committed quantities, safety stock, supplier delay, production orders, material requirements, deadlines, risk levels, and recovery recommendations.
- [x] Predictive shortage detection distinguishes calculated inventory facts from forecast estimates and explains supplier-delay and safety-stock risk.
- [x] Ripple analysis maps affected components, production orders, assembly operations, and downstream dependencies.
- [x] Recovery planning compares feasible allocation, transfer, supported alternatives, expedited supplier delivery, and rescheduling scenarios without recommending an alternative component without compatibility evidence.
- [x] What-if controls simulate supplier delay, demand increase, component shortage, inventory reduction, and safety-stock change, showing before/after risk.
- [x] Every recommendation shows detected problem, data used, calculation/reasoning, affected orders, recommended action, feasibility, and expected outcome.

## 3D control-tower experience

- [x] Executive Overview includes a premium deep-navy factory-control-tower hero with working Explore Dashboard and Run Simulation actions.
- [x] Interactive Three.js factory twin shows warehouse, inventory bins, conveyor flow, production stations, assembly operations, and animated components.
- [x] Selecting a station reveals material availability, shortage risk, affected production orders, and recovery recommendations.
- [x] Supply-chain visualization shows supplier, inventory, warehouse, assembly-line, and order nodes with understandable risk indicators.
- [x] Mobile, reduced-motion, unsupported-WebGL, and loading states provide a clear 2D fallback; no static screenshot is used as fake interactivity.
- [x] Dashboard KPIs and charts are based on application data and visibly label synthetic estimates versus deterministic calculations.

## Navigation and QA

- [x] Navigation includes Executive Overview, 3D Factory Digital Twin, SafeStock Validator, AI Risk Engine, Recovery Planner, Impact Analysis, Sarvam AI Assistant, Voice Shortage Reporting, Scenario Simulator, Audit Trail, and Data Management; every item opens a functional route, with legacy aliases preserved.
- [x] The illustrative case study models five Nexon EV battery-pack components: Battery Modules, Battery Enclosure, Wiring Harness, Cooling Plates, and BMS, with synthetic inventory, supplier lead time, predicted shortage dates, and affected production orders.
- [x] The factory twin supports station selection, five battery-pack operations, an in-canvas Reset Camera control, a 3D/dashboard toggle, and a dashboard fallback.
- [x] SAP is absent from navigation and the route manifest.
- [x] `pnpm test`, `pnpm check`, and `pnpm build` pass; `/api/health` works; all declared routes load; Sarvam Demo Mode works without credentials; and a source scan finds no SAP integration references.
- [x] No real credentials, fake API responses, fake Tata Motors facts, or unlabelled live claims are committed.

## Isolated Public Backorder Model Demo

- [x] `/public-backorder-demo` presents the verified three-model HGB ensemble, test metrics, packaging parity, Mendeley Data CC BY 4.0 attribution, and the exact 21-feature public schema.
- [x] The public-model page visibly states MODEL INACTIVE and PREDICTIONS DISABLED, never loads joblib files in the browser, and remains disconnected from the Risk Engine, Tata Nexon EV inventory, and Synthetic Demo Data.
- [ ] Preview and user approval are required before any future publication; this route does not activate inference.
