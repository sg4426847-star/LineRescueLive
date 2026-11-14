#import "report-theme.typ": report-accent, report-theme

#show: report-theme.with(
  title: "LineRescue AI - Project Brief",
  author: "LineRescue AI",
  rhythm: "report",
  running-header: true,
)

#page(margin: (top: 30%, x: 2.2cm), numbering: none, header: none)[
  #set par(first-line-indent: 0em)
  #align(center)[
    #text(size: 27pt, weight: "bold", fill: report-accent)[LineRescue AI]
    #v(0.45em)
    #text(size: 15pt, fill: luma(80))[Project Brief]
    #v(0.7em)
    #text(size: 12pt)[Predict Shortages. Protect Production. Recover Smarter.]
    #v(1.8em)
    #line(length: 42%, stroke: 0.6pt + luma(160))
    #v(1.8em)
    #text(size: 11pt)[
      Synthetic Data, Uniqueness, Architecture and Safe Expansion \
      Prepared for SAP Hackfest Bengaluru 2026 \
      #datetime.today().display("[year]-[month]-[day]")
    ]
    #v(2em)
    #box(width: 82%, inset: 12pt, radius: 7pt, fill: rgb("E7F7F5"), stroke: 0.7pt + rgb("39BFAE"))[
      #text(weight: "bold", fill: rgb("075B55"))[Important disclosure]
      #v(0.35em)
      #text(size: 10pt, fill: rgb("16413D"))[Illustrative Tata Nexon EV Manufacturing Scenario - Not Official Tata Motors Data.]
    ]
  ]
]

#page(numbering: none, header: none)[
  #outline(title: [Contents], indent: 1.5em)
]

#counter(page).update(1)

= 1. What LineRescue AI is

LineRescue AI is an independent manufacturing-intelligence prototype for a battery-pack assembly control tower. It helps a planner detect a possible shortage, protect safety stock, compare recovery paths, and understand the downstream effect before making a decision.

The product uses an illustrative case study:

#table(
  columns: (1.2fr, 2fr),
  inset: 8pt,
  fill: (x, y) => if y == 0 { rgb("DDF3F0") } else if calc.rem(y, 2) == 0 { rgb("F4F8F9") } else { white },
  table.header([*Case-study field*], [*Value*]),
  [Company], [Tata Motors - illustrative target only],
  [Product], [Tata Nexon EV],
  [Process], [Battery Pack Assembly],
  [Components], [Battery Modules; Battery Enclosure; Wiring Harness; Cooling Plates; Battery Management System (BMS)],
  [Operating mode], [Synthetic demonstration data; no live plant access],
)

#box(width: 100%, inset: 10pt, radius: 6pt, fill: rgb("FFF4DE"), stroke: 0.6pt + rgb("E6AE52"))[
  #text(weight: "bold")[What the prototype does not claim]
  #v(0.25em)
  It does not claim an official Tata Motors partnership, official Tata inventory, live supplier data, live plant access, measured savings, or a verified Sarvam connection unless an authorized server-side request succeeds.
]

= 2. Synthetic data: what was used and why

All operational values in the current public prototype are synthetic. They are realistic-looking demonstration records created to make the decision flow understandable without exposing confidential company information.

#table(
  columns: (1.25fr, 1.9fr, 1.75fr),
  inset: 7pt,
  fill: (x, y) => if y == 0 { rgb("DDF3F0") } else { white },
  table.header([*Data area*], [*Synthetic examples*], [*How it is used*]),
  [Inventory], [on-hand, reserved, committed and safety stock], [SafeStock calculation and component posture],
  [Forecast], [supplier delay, demand change, expected demand and shortage date], [Predictive risk estimate; clearly marked as forecast],
  [Production], [synthetic PO-NEXON IDs, quantities, deadlines and statuses], [Affected-order and ripple analysis],
  [Network], [Pune, Bengaluru, Hosur and downstream relationships], [Illustrative impact map and recovery routes],
  [Recovery], [arrival times, costs and transfer options], [Scenario comparison; labelled demo estimates],
  [Voice], [demo shortage report and fallback answer], [UI testing when Sarvam credentials are absent],
)

Synthetic data is useful here because it enables safe demonstrations, repeatable tests, and transparent evaluation. It also prevents accidental exposure of real inventory, supplier, employee, customer, or production information.

= 3. Core decision logic

The deterministic SafeStock engine is preserved and explainable:

#align(center)[
  #box(inset: 13pt, radius: 7pt, fill: rgb("E7F7F5"), stroke: 0.8pt + rgb("39BFAE"))[
    #text(size: 14pt, weight: "bold", fill: rgb("075B55"))[Transferable stock = max(0, on-hand - reserved - committed - safety stock)]
  ]
]

The application distinguishes deterministic calculations from estimates. Missing downstream information is not treated as zero; it is shown as “Risk unknown - insufficient data.” Recovery options are not forced to succeed: they can be Approved, Review, or Rejected/Infeasible with reasons.

Each evaluated scenario can produce an explainable decision receipt containing the inputs, calculations, constraints, warnings, downstream effect, options considered, recommendation, and data-quality limitations.

= 4. Product features

- *Executive Overview:* control-tower KPIs, risk posture, stock protection, and recommended action.
- *3D Factory Digital Twin:* interactive Three.js battery-pack factory with five station/component mappings, risk colors, selection details, and a dashboard fallback.
- *SafeStock Validator and Scenario Simulator:* editable quantities, lead time, demand, safety stock, and shortage assumptions.
- *AI Risk Engine and Impact Analysis:* forecast risk, affected orders, downstream commitments, and evidence-aware ripple effects.
- *Recovery Planner:* compares transfer, buffer, and replenishment paths without hiding infeasibility.
- *Sarvam AI Assistant:* server-side chat, Saaras v4 voice transcription, Bulbul v4 Flash playback, language selectors, editable transcript, structured extraction, and confirmation before planner use.
- *Audit Trail and Data Management:* decision receipt, provenance, assumptions, synthetic-data disclosure, and limitations.

= 5. What makes it unique

#table(
  columns: (1.4fr, 2.6fr),
  inset: 8pt,
  fill: (x, y) => if y == 0 { rgb("DDF3F0") } else if calc.rem(y, 2) == 0 { rgb("F4F8F9") } else { white },
  table.header([*Distinctive quality*], [*Why it matters*]),
  [Explainability first], [A planner can trace a recommendation back to stock quantities, constraints, warnings, and evidence instead of receiving an opaque score.],
  [SafeStock protection], [The prototype protects reserved, committed, and safety-stock quantities before suggesting a transfer.],
  [3D linked to data], [The factory twin is not only decoration: selecting a station reveals the same component inventory and risk model used by the dashboard.],
  [Honest AI boundaries], [Sarvam Demo Mode is visibly separate from a verified connection; no fake response or fake live status is shown.],
  [Worker-friendly voice flow], [A worker can speak naturally, review/edit the transcript, inspect structured fields, and confirm a planner-ready report.],
  [Evidence-aware uncertainty], [Unknown data remains unknown, preventing false confidence when downstream commitments are unavailable.],
)

= 6. Sarvam AI integration status

The implementation keeps credentials server-side in `SARVAM_API_KEY`. The frontend never receives the key. The protected backend adapter uses these official resources:

- Saaras v4: `POST /speech-to-text`, including `language_code: "unknown"` for automatic detection and domain keyterms for the five battery-pack components.
- Bulbul v4 Flash: `POST /text-to-speech`, exposing only the supported response-language list in the UI.
- Sarvam-105B: `POST /v1/chat/completions` for context-aware assistant responses.

Without an authorized key, the application correctly reports *Sarvam Demo Mode* and returns HTTP 503 for protected live operations. The language selectors and synthetic demo report remain available for interface testing. Per-language live audio verification must be completed only after a real key and representative audio files are provided.

= 7. Adding real data safely

The prototype can be extended with a read-only CSV/Excel import, secured database connection, or protected ERP/MES/WMS API. A first production dataset should include:

#box(width: 100%, inset: 10pt, radius: 5pt, fill: rgb("F4F8F9"), stroke: 0.5pt + luma(190))[
  #text(font: "Noto Sans Mono", size: 8.5pt)[component, location, on_hand, reserved, committed, safety_stock \ daily_requirement, supplier_lead_time_days, production_order_id \ production_order_units, due_in_hours]
]

Recommended rollout:

1. Validate a fake or masked sample against the schema.
2. Add source status: *Synthetic*, *Real Operational*, or *Mixed*.
3. Keep credentials and tokens server-side.
4. Start with read-only access and audit every request.
5. Reject missing, negative, duplicate, or malformed values.
6. Keep the synthetic scenario available as a safe fallback.

= 8. Validation and limitations

At the latest reviewed checkpoint, the project passed TypeScript diagnostics, 30 automated tests, and the production build. Preview and public routes were checked, including the voice-reporting flow and Demo Mode status.

Remaining limitations are intentional: current inventory is synthetic; Sarvam live behavior depends on an authorized key; real-language audio coverage has not been claimed without test audio; and the prototype does not mutate inventory, release production orders, or change plant systems.

#box(width: 100%, inset: 11pt, radius: 7pt, fill: rgb("E7F7F5"), stroke: 0.7pt + rgb("39BFAE"))[
  #text(weight: "bold", fill: rgb("075B55"))[Bottom line]
  LineRescue AI is a safe, explainable, and visually distinctive prototype. Its strongest differentiator is the combination of deterministic stock protection, evidence-aware recovery planning, an interactive 3D factory view, and honest multilingual worker input - all while keeping the demonstration data clearly synthetic.
]
