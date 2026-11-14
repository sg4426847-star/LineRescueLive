import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleSlash2,
  Database,
  FileCheck2,
  GitBranch,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  Waypoints,
} from "lucide-react";
import { PageHeader, Panel, StatusPill } from "@/components/LineRescueShell";

const features = [
  "INV", "TIM", "INQ", "FOR3", "FOR6", "FOR9", "SAL1", "SAL3", "SAL6", "SAL9",
  "MIN", "RSK1", "OVRP", "SUP1", "SUP2", "OVRA", "RSK2", "RSK3", "RSK4", "RSK5", "RSK6",
];

const metrics = [
  { label: "Precision", value: "23.76%", detail: "threshold 0.13447", tone: "coral" },
  { label: "Recall", value: "40.64%", detail: "positive-class coverage", tone: "amber" },
  { label: "F1 score", value: "29.99%", detail: "frozen threshold", tone: "violet" },
  { label: "PR-AUC", value: "20.87%", detail: "average precision", tone: "cyan" },
  { label: "Brier score", value: "0.00664", detail: "lower is better", tone: "green" },
  { label: "Brier reference", value: "0.00761", detail: "constant prevalence", tone: "slate" },
];

const architecture = [
  { step: "01", title: "Group-aware folds", detail: "StratifiedGroupKFold · 3 folds · seed 42", tone: "cyan", icon: GitBranch },
  { step: "02", title: "HGB × 3", detail: "Each model trains on its fold-specific training rows", tone: "amber", icon: Layers3 },
  { step: "03", title: "Isotonic × 3", detail: "Each calibrator stays paired to its fold-trained model", tone: "violet", icon: SlidersHorizontal },
  { step: "04", title: "Average + threshold", detail: "Mean calibrated probability · p ≥ 0.13447", tone: "green", icon: Waypoints },
];

const packagingChecks = [
  "Feature order integrity",
  "Model / calibrator pairing",
  "Prediction order preservation",
  "Finite probabilities in [0, 1]",
  "Frozen threshold behavior",
  "Dataset SHA-256 integrity",
  "Fold isolation",
  "Serialization parity",
  "Strict schema validation",
];

function MetricCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return <div className={`public-metric-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

export default function PublicBackorderDemo() {
  return <>
    <PageHeader
      eyebrow="PUBLIC BACKORDER MODEL / OFFLINE PACKAGE"
      title={<>A calibrated candidate.<br /><em className="public-accent">Not an active predictor.</em></>}
      description="A presentation-only view of the isolated Mendeley Data Backorder Prediction candidate. The model package is verified offline, but inference remains disabled until feature documentation and a separately approved demo workflow are complete."
      action={<StatusPill tone="coral"><CircleSlash2 size={13} />MODEL INACTIVE</StatusPill>}
    />

    <section className="public-disabled-banner" aria-label="Model inactive notice">
      <div className="public-disabled-icon"><LockKeyhole size={20} /></div>
      <div><strong>PREDICTIONS DISABLED</strong><span>No joblib files are loaded in the browser. This page reads no inventory, Risk Engine, or Synthetic Demo Data.</span></div>
      <StatusPill tone="slate">OFFLINE PRESENTATION ONLY</StatusPill>
    </section>

    <section className="public-provenance-strip">
      <div className="public-provenance-mark"><Database size={18} /></div>
      <div><span className="public-label">DATA SOURCE</span><strong>Mendeley Data — Backorder Prediction</strong><small>CC BY 4.0 · source label BO · SKU retained for traceability and excluded from training</small></div>
      <div className="public-provenance-hash"><span className="public-label">SOURCE SHA-256</span><code>70604707…55c4c99</code></div>
    </section>

    <div className="public-stat-grid">
      <div className="public-stat-card"><span>Candidate status</span><strong className="coral-text">INACTIVE</strong><small>activation gate closed</small></div>
      <div className="public-stat-card"><span>Ensemble</span><strong>3 × HGB</strong><small>paired isotonic calibration</small></div>
      <div className="public-stat-card"><span>Required inputs</span><strong>21</strong><small>numeric public features</small></div>
      <div className="public-stat-card"><span>Parity error</span><strong className="good-text">0.0</strong><small>max absolute · round trip</small></div>
    </div>

    <div className="public-content-grid public-content-grid-wide">
      <Panel title="Ensemble architecture" eyebrow="VERIFIED OFFLINE DESIGN" action={<StatusPill tone="green"><CheckCircle2 size={13} />3 PAIRS VERIFIED</StatusPill>}>
        <p className="panel-copy">The selected candidate uses group-aware folds to avoid identical-feature leakage. Every isotonic calibrator is applied only to predictions from its corresponding fold-trained HGB model.</p>
        <div className="public-architecture-flow">
          {architecture.map((item, index) => { const Icon = item.icon; return <div key={item.step} className="public-arch-wrap"><div className={`public-arch-step ${item.tone}`}><div className="public-arch-top"><span>{item.step}</span><Icon size={17} /></div><strong>{item.title}</strong><p>{item.detail}</p></div>{index < architecture.length - 1 && <ArrowRight className="public-arch-arrow" size={17} />}</div>; })}
        </div>
        <div className="public-config-line"><span>HistGradientBoostingClassifier</span><span>max_iter 100</span><span>leaf nodes 31</span><span>seed 42</span><span>scikit-learn 1.6.1</span></div>
      </Panel>

      <Panel title="Packaging verification" eyebrow="SERIALIZATION PARITY" action={<StatusPill tone="green">PASSED</StatusPill>}>
        <div className="public-verification-hero"><div><strong>0.0</strong><span>maximum absolute parity error</span></div><div className="public-tolerance"><span>rtol</span><code>1e−7</code><span>atol</span><code>1e−9</code></div></div>
        <div className="public-check-list">{packagingChecks.map(check => <div key={check}><CheckCircle2 size={14} /><span>{check}</span></div>)}</div>
        <div className="public-note"><AlertTriangle size={15} /><span>Verification is packaging-only. Passing parity does not activate prediction or establish production readiness.</span></div>
      </Panel>
    </div>

    <Panel title="Untouched test-set results" eyebrow="SELECTION FROZEN BEFORE TEST EVALUATION" action={<StatusPill tone="violet"><BarChart3 size={13} />GROUP-AWARE TEST</StatusPill>}>
      <p className="panel-copy">Calibration strategy and threshold were selected using validation data only. The untouched test partition was evaluated once after all choices were frozen.</p>
      <div className="public-metric-grid">{metrics.map(metric => <MetricCard key={metric.label} {...metric} />)}</div>
      <div className="public-confusion-row"><div><span>Confusion matrix · labels 0 / 1</span><strong>269,519 · 2,743</strong><strong>1,249 · 855</strong></div><div><span>Test support</span><strong>272,262 negative</strong><strong>2,104 positive</strong></div><div><span>Predicted positive</span><strong>3,598 rows</strong><small>frozen threshold 0.134471</small></div></div>
    </Panel>

    <div className="public-content-grid public-content-grid-split">
      <Panel title="Required public feature schema" eyebrow="EXACT INPUT CONTRACT" action={<span className="mono muted">21 FEATURES</span>}>
        <p className="panel-copy">All fields are required, finite, numeric, and must arrive in this exact order. Meanings, units, and time windows remain undocumented; no synthetic-field mapping is allowed.</p>
        <div className="public-feature-cloud">{features.map((feature, index) => <span key={feature} className={index > 10 ? "encoded" : "numeric"}>{feature}</span>)}</div>
        <div className="public-schema-foot"><ShieldCheck size={15} /><span>Strict validator rejects missing, extra, nonnumeric, boolean, NaN, and infinite values. It never substitutes zero.</span></div>
      </Panel>

      <Panel title="Boundary of this demo" eyebrow="ISOLATION CONTRACT">
        <div className="public-boundary-list">
          <div><span className="public-boundary-icon green"><CheckCircle2 size={14} /></span><div><strong>Public dataset model</strong><span>Displayed here with verified offline metadata.</span></div></div>
          <div><span className="public-boundary-icon coral"><CircleSlash2 size={14} /></span><div><strong>Prediction path</strong><span>Disabled. No browser model loading or inference.</span></div></div>
          <div><span className="public-boundary-icon amber"><AlertTriangle size={14} /></span><div><strong>Illustrative Tata Nexon EV scenario</strong><span>Not connected. Its inventory fields are not public-model features.</span></div></div>
          <div><span className="public-boundary-icon violet"><FileCheck2 size={14} /></span><div><strong>Next gate</strong><span>Document feature semantics and approve a separate demo workflow.</span></div></div>
        </div>
        <div className="public-back-link"><ShieldCheck size={14} />Existing synthetic workflow remains separate <ArrowRight size={14} /></div>
      </Panel>
    </div>

    <div className="public-attribution"><Database size={15} /><span><strong>Attribution:</strong> Mendeley Data — Backorder Prediction, licensed under CC BY 4.0. This public dataset is not official Tata Motors data.</span></div>
  </>;
}
