# LineRescue AI — Portable Handoff

This package contains the LineRescue AI source code, public backorder dataset, candidate-validation artifacts, and project documentation.

## Requirements

- Node.js 20 or newer
- pnpm 10.x (`corepack enable` can enable the package manager)
- Optional: a Sarvam AI API key for live chat/STT/TTS testing

## Run locally

```bash
cd linerescue-unzipped
pnpm install
cp .env.example .env
# Optional: edit .env and set SARVAM_API_KEY to a real server-side key
pnpm test
pnpm check
pnpm dev
```

Then open:

- http://localhost:3000/
- http://localhost:3000/production
- http://localhost:3000/risk
- http://localhost:3000/assistant
- http://localhost:3000/voice
- http://localhost:3000/public-backorder-demo

For a production build:

```bash
pnpm build
pnpm start
```

## Important data disclosures

- The public backorder CSV is **Mendeley Data — Backorder Prediction**, licensed CC BY 4.0.
- The Tata Nexon EV manufacturing scenario in the UI is illustrative synthetic demo data, not official Tata Motors data and not live ERP data.
- The public backorder baseline is kept separate from the synthetic manufacturing workflow.
- The isolated calibrated HGB candidate is presentation-only, inactive, and predictions remain disabled.
- Do not put a Sarvam key in a `VITE_*` variable or commit a real `.env` file.

## Current demo behavior

Without `SARVAM_API_KEY`, the application correctly shows **Sarvam Demo Mode**. The app does not pretend that demo responses are live API responses.

The Factory Twin has a Dashboard mode fallback if 3D station hit-testing is unreliable.

## No deployment included

This handoff is a local project package. It has not been published or deployed.
