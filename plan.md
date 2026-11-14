# LineRescue AI — In-Place Upgrade Plan

## Scope and guardrails

Upgrade the existing LineRescue AI React/TypeScript/Vite/Express application in place. Preserve the current SafeStock formula, ripple-risk rules, recovery engine, decision receipts, simulator behavior, export action, existing working page logic, and responsive command-center visual language. Remove the obsolete SAP integration completely; do not create a replacement application and do not claim Tata Motors partnership, live inventory, or internal access.

The upgraded product identity is **LineRescue AI — Predict Shortages. Protect Production. Recover Smarter.** It is an independent AI-powered manufacturing-intelligence prototype for an illustrative Tata Motors automobile case study. Every dataset is labelled synthetic demonstration data.

## Design direction

Three candidate directions considered:

- **Digital-twin control room** (0.06): deep navy command centre with electric cyan flows, glass surfaces, and a live factory twin.
- **Automotive blueprint** (0.08): technical blueprint grids, assembly-line traces, and high-contrast operational labels.
- **Quiet industrial glass** (0.07): calm enterprise panels with subtle depth, low-motion charts, and muted status color.

Chosen style: **Digital-twin control room**.

- **Design Movement:** premium industrial SaaS control tower fused with a restrained automotive digital twin.
- **Core Principles:** operational clarity; explainability before automation; real versus synthetic evidence is always explicit; 3D depth supports decisions rather than decoration.
- **Color Philosophy:** deep navy and charcoal create focus; electric cyan marks healthy flow and confirmed calculations; amber signals uncertainty or supplier delay; coral marks production risk; violet marks planning alternatives.
- **Layout Paradigm:** fixed decision rail plus asymmetric command views. 3D visualizations occupy the decision surface while evidence panels anchor the bottom edge.
- **Signature Elements:** animated assembly-line lanes, pulsing risk nodes, and thin cyan signal traces that connect inventory to production orders.
- **Interaction Philosophy:** station selection, simulation inputs, chat prompts, and voice review must change or reveal actual application state. Demo-mode actions explain their limitation instead of pretending to be live.
- **Animation:** subtle camera drift and conveyor motion in the factory twin; short status transitions; no looping animation that competes with evidence; respect reduced-motion preferences.
- **Typography System:** existing Inter/system UI for body and navigation; monospace for quantities, IDs, API states, and timestamps; slightly larger editorial headlines for product identity.
- **Brand Essence:** manufacturing decision intelligence that predicts a shortage early and makes recovery safer. Personality: protective, precise, practical.
- **Brand Voice:** direct operational language. Example lines: “Predict the shortage before the line stops.” and “Choose the recovery path with evidence attached.”
- **Wordmark & Logo:** retain the existing line-and-node mark, extend the center node into a small production-station signal.
- **Signature Brand Color:** electric cyan `#39E6D0`.

## Implementation approach

1. Remove `server/_core/sap.ts`, its tests, all `/api/sap/*` routes, SAP page/navigation, SAP configuration, SAP copy, and SAP-only receipt limitations. Remove unused SAP imports and docs while preserving the Express health endpoint.
2. Add a server-only Sarvam adapter under `server/_core/sarvam.ts` using the official REST endpoints: `POST /v1/chat/completions` with `sarvam-105b`, `POST /speech-to-text` with `saaras:v4`, and `POST /text-to-speech` with `bulbul:v4-flash`. Credentials come only from `SARVAM_API_KEY`; missing credentials yield Demo Mode, not fake success.
3. Add protected internal endpoints `/api/sarvam/status`, `/api/sarvam/chat`, `/api/sarvam/transcribe`, and `/api/sarvam/speak` with validation, timeout handling, 403/429/5xx-safe errors, and no secret/token leakage. Use `multer` only for the voice upload boundary.
4. Add a manufacturing case-study data layer in `client/src/lib/manufacturing.ts` with synthetic Tata Motors illustrative facility data: components, inventory, supplier delay, production orders, assembly stations, deadlines, and predictive estimates explicitly separated from deterministic SafeStock calculations.
5. Add a real Three.js factory-twin canvas in `client/src/components/FactoryTwinCanvas.tsx`. Build the scene from primitive geometry (warehouse, conveyor, stations, robot arms, component bins), support station selection and risk coloring, animate only when motion is enabled, and keep a 2D CSS/network fallback for unsupported or reduced-motion environments.
6. Add `SarvamAssistant` with English/Hindi chat, context-aware server requests, browser audio capture/upload with transcript review, a synthetic demo report fallback when credentials are absent, and optional TTS playback when a real response succeeds.
7. Extend the existing LineRescue pages without removing the current engine views: Executive Overview gains the product identity, predictive risk KPIs, factory twin, and synthetic disclosures; the case study covers five Nexon EV battery-pack components; add explicit `/factory`, `/voice`, and `/scenario` aliases for the requested 11-area navigation while keeping `/production`, `/assistant`, and `/what-if` backward compatible; keep `/simulator`, `/recovery`, `/impact`, `/audit`, and `/data` functional; remove `/sap` from the route manifest and navigation.
8. Keep server mode, update `.env.example` to Sarvam-only placeholders, update `app.config.ts` metadata, and synchronize `client/public/manus-routes.json` with every page route.
9. Add a separate `/public-backorder-demo` presentation route that renders only verified static candidate metadata, keeps predictions disabled, never loads joblib files in the browser, and does not connect to the synthetic Tata Nexon EV workflow or Risk Engine.

## Project structure

- `client/src/lib/lineRescue.ts`: existing SafeStock and recovery rules; unchanged core formulas.
- `client/src/lib/manufacturing.ts`: synthetic automobile case-study data and predictive/risk view helpers.
- `client/src/components/LineRescueShell.tsx`: navigation and shared enterprise primitives.
- `client/src/components/FactoryTwinCanvas.tsx`: Three.js digital-twin scene with 2D fallback.
- `client/src/components/SarvamAssistant.tsx`: chat, voice report review, and optional speech playback UI.
- `client/src/pages/LineRescue.tsx`: existing pages plus new manufacturing and assistant views.
- `client/src/index.css`: preserved control-room tokens plus factory/assistant/predictive panels and responsive behavior.
- `server/_core/sarvam.ts`: server-only Sarvam REST adapter and verification state.
- `server/_core/index.ts`: health endpoint and Sarvam routes; no SAP routes.
- `.env.example`: `SARVAM_API_KEY` and optional non-secret configuration only.
- `client/public/manus-routes.json`: complete page route declarations.
- `client/src/pages/PublicBackorderDemo.tsx`: inactive, presentation-only public backorder candidate page with provenance, architecture, metrics, feature contract, and packaging status.

## Build workflow

Run diagnostics before edits, implement in small batches, add unit and server tests for SafeStock preservation, predictive views, Sarvam Demo Mode and API error envelopes, then run `pnpm test`, `pnpm check`, `pnpm build`, route/health checks, and a source scan proving SAP removal. Do not publish unless separately requested after review.
