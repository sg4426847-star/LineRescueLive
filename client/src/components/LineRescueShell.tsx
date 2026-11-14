import { Link, useLocation } from "wouter";
import {
  Activity,
  AudioLines,
  Archive,
  ArrowRight,
  BarChart3,
  Bot,
  BookOpenCheck,
  Boxes,
  ChevronRight,
  CircleHelp,
  Database,
  Factory,
  FileCheck2,
  Gauge,
  BrainCircuit,
  Layers3,
  Map,
  Network,
  PackageCheck,
  Radar,
  Route,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";
import { CASE_STUDY_DISCLOSURE } from "@/lib/manufacturing";

const navItems = [
  { href: "/", label: "Executive Overview", meta: "Control tower", icon: Gauge },
  { href: "/factory", label: "3D Factory Digital Twin", meta: "Battery-pack line", icon: Factory },
  { href: "/simulator", label: "SafeStock Validator", meta: "What-if lab", icon: SlidersHorizontal },
  { href: "/risk", label: "AI Risk Engine", meta: "Forecast + ripple", icon: BrainCircuit },
  { href: "/recovery", label: "Recovery Planner", meta: "3 options", icon: Route },
  { href: "/impact", label: "Impact Analysis", meta: "Ripple view", icon: Network },
  { href: "/assistant", label: "Sarvam AI Assistant", meta: "23 STT · 11 TTS languages", icon: Bot },
  { href: "/voice", label: "Voice Shortage Reporting", meta: "Worker input", icon: AudioLines },
  { href: "/scenario", label: "Scenario Simulator", meta: "Stress test", icon: Workflow },
  { href: "/audit", label: "Audit Trail", meta: "Receipt trail", icon: FileCheck2 },
  { href: "/data", label: "Data Management", meta: "Synthetic basis", icon: Database },
  { href: "/public-backorder-demo", label: "Public Backorder Model", meta: "Offline package", icon: PackageCheck },
];

export function StatusPill({ tone = "cyan", children, dot = true }: { tone?: "cyan" | "amber" | "coral" | "violet" | "slate" | "green"; children: ReactNode; dot?: boolean }) {
  return <span className={`status-pill ${tone}`}>{dot && <span className="status-dot" />}{children}</span>;
}

export function SectionEyebrow({ children, icon: Icon = Activity }: { children: ReactNode; icon?: typeof Activity }) {
  return <div className="section-eyebrow"><Icon size={14} strokeWidth={2.4} /><span>{children}</span></div>;
}

export function StatCard({ label, value, detail, tone = "cyan", icon: Icon = Activity }: { label: string; value: ReactNode; detail: string; tone?: "cyan" | "amber" | "coral" | "violet"; icon?: typeof Activity }) {
  return <div className={`stat-card ${tone}`}>
    <div className="stat-card-head"><span>{label}</span><Icon size={16} /></div>
    <div className="stat-value">{value}</div>
    <div className="stat-detail">{detail}</div>
  </div>;
}

export function Panel({ title, eyebrow, action, children, className = "" }: { title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>
    <div className="panel-head">
      <div>{eyebrow && <div className="panel-eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>
      {action}
    </div>
    {children}
  </section>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: ReactNode; description: string; action?: ReactNode }) {
  return <header className="page-header">
    <div><SectionEyebrow>{eyebrow}</SectionEyebrow><h1>{title}</h1><p>{description}</p></div>
    {action && <div className="page-header-action">{action}</div>}
  </header>;
}

export function LineRescueShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const isPublicBackorderDemo = location === "/public-backorder-demo";
  return <div className="app-frame">
    <aside className="side-rail">
      <div className="brand-lockup">
        <div className="brand-mark"><span /><span /><span /></div>
        <div><div className="brand-name">LineRescue</div><div className="brand-sub">AI / CONTROL TOWER</div></div>
      </div>
      <div className="rail-caption">Decision support</div>
      <nav className="rail-nav" aria-label="Primary navigation">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = item.href === "/" ? location === "/" : location.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={`rail-link ${active ? "active" : ""}`}>
            <Icon size={17} /><span className="rail-link-copy"><strong>{item.label}</strong><small>{item.meta}</small></span>{active && <ChevronRight size={14} className="rail-chevron" />}
          </Link>;
        })}
      </nav>
      <div className="rail-footer">
        <div className="rail-footer-card"><div className="rail-footer-icon"><ShieldCheck size={17} /></div><div><strong>Guardrails active</strong><span>Synthetic manufacturing demo</span></div></div><div className="rail-footer-disclosure">{CASE_STUDY_DISCLOSURE}</div>
        <div className="rail-footer-meta"><span>BUILD 0.3.0</span><span>·</span><span>EV-PACK</span></div>
      </div>
    </aside>
    <div className="main-column">
      <header className="top-bar">
        <div className="breadcrumb"><span>CONTROL TOWER</span><ChevronRight size={13} /><span className="breadcrumb-current">{navItems.find(item => item.href === location)?.label ?? "LineRescue AI"}</span></div>
        <div className="top-actions">{isPublicBackorderDemo ? <><StatusPill tone="violet">Mendeley public dataset</StatusPill><StatusPill tone="coral">Predictions disabled</StatusPill></> : <><StatusPill tone="cyan">Synthetic manufacturing data</StatusPill><StatusPill tone="green">SafeStock engine ready</StatusPill></>}<div className="top-avatar">AI</div></div>
      </header>
      <main className="page-content">{children}</main>
      <footer className="app-footer"><span><span className="footer-signal" />{isPublicBackorderDemo ? "Mendeley Data — Backorder Prediction · CC BY 4.0" : CASE_STUDY_DISCLOSURE}</span><span>{isPublicBackorderDemo ? "Offline presentation · No inference" : "Decision support only · No live plant mutations"}</span></footer>
    </div>
  </div>;
}

export function InlineAction({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-action">{children}<ArrowRight size={15} /></Link>;
}

export const iconSet = { Boxes, Archive, CircleHelp, PackageCheck, Radar, Map, BookOpenCheck, Layers3, Settings2 };
