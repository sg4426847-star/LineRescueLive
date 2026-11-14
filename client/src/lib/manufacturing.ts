export type RiskLevel = "critical" | "high" | "watch" | "stable";

export type ProductionOrder = {
  id: string;
  model: string;
  line: string;
  dueInHours: number;
  units: number;
  component: string;
  status: RiskLevel;
};

export type ComponentInventory = {
  id: string;
  name: string;
  shortName: string;
  onHand: number;
  reserved: number;
  committed: number;
  safetyStock: number;
  expectedDemand: number;
  supplierLeadTimeDays: number;
  predictedShortageDate: string;
  risk: RiskLevel;
  availability: number;
  explanation: string;
};

export type ManufacturingScenario = {
  facility: string;
  line: string;
  component: string;
  supplier: string;
  onHand: number;
  reserved: number;
  committed: number;
  safetyStock: number;
  dailyRequirement: number;
  supplierDelayDays: number;
  demandIncreasePct: number;
  leadTimeDays: number;
  productionDeadlineHours: number;
};

export const CASE_STUDY_DISCLOSURE = "Illustrative Tata Nexon EV Manufacturing Scenario – Not Official Tata Motors Data.";
export const CASE_STUDY_COMPANY = "Tata Motors";
export const CASE_STUDY_PRODUCT = "Tata Nexon EV";
export const CASE_STUDY_PROCESS = "Battery Pack Assembly";

export const DEFAULT_MANUFACTURING_SCENARIO: ManufacturingScenario = {
  facility: "Pune Integrated EV Plant",
  line: "Tata Nexon EV Battery Pack Assembly",
  component: "Battery Modules",
  supplier: "Illustrative EV component supplier",
  onHand: 860,
  reserved: 180,
  committed: 220,
  safetyStock: 300,
  dailyRequirement: 360,
  supplierDelayDays: 2,
  demandIncreasePct: 0,
  leadTimeDays: 1,
  productionDeadlineHours: 24,
};

export const formatQty = (value: number) => new Intl.NumberFormat("en-IN").format(Math.max(0, Math.round(value)));

export const componentInventory: ComponentInventory[] = [
  { id: "battery-modules", name: "Battery Modules", shortName: "Modules", onHand: 860, reserved: 180, committed: 220, safetyStock: 300, expectedDemand: 720, supplierLeadTimeDays: 2, predictedShortageDate: "14 Nov 2026", risk: "critical", availability: 44, explanation: "Two-day supplier delay leaves the next battery-pack build window exposed." },
  { id: "battery-enclosure", name: "Battery Enclosure", shortName: "Enclosure", onHand: 420, reserved: 50, committed: 60, safetyStock: 180, expectedDemand: 260, supplierLeadTimeDays: 3, predictedShortageDate: "19 Nov 2026", risk: "watch", availability: 78, explanation: "Protected stock covers the near-term pack schedule, but the buffer is narrow." },
  { id: "wiring-harness", name: "Wiring Harness", shortName: "Harness", onHand: 510, reserved: 90, committed: 110, safetyStock: 160, expectedDemand: 330, supplierLeadTimeDays: 4, predictedShortageDate: "17 Nov 2026", risk: "high", availability: 62, explanation: "Supplier lead time is longer than the current assembly replenishment window." },
  { id: "cooling-plates", name: "Cooling Plates", shortName: "Cooling", onHand: 680, reserved: 120, committed: 140, safetyStock: 180, expectedDemand: 310, supplierLeadTimeDays: 2, predictedShortageDate: "22 Nov 2026", risk: "stable", availability: 91, explanation: "Cooling plate inventory is above the protected planning threshold." },
  { id: "bms", name: "Battery Management System (BMS)", shortName: "BMS", onHand: 305, reserved: 80, committed: 90, safetyStock: 100, expectedDemand: 240, supplierLeadTimeDays: 5, predictedShortageDate: "16 Nov 2026", risk: "high", availability: 57, explanation: "A five-day supplier lead time creates exposure if the next order is pulled forward." },
];

export function componentTransferableStock(component: ComponentInventory) {
  return Math.max(0, component.onHand - component.reserved - component.committed - component.safetyStock);
}

export const productionOrders: ProductionOrder[] = [
  { id: "PO-NEXON-1842", model: "Tata Nexon EV · illustrative", line: "Tata Nexon EV Battery Pack Assembly", dueInHours: 18, units: 120, component: "Battery Modules", status: "critical" },
  { id: "PO-NEXON-1843", model: "Tata Nexon EV · illustrative", line: "Tata Nexon EV Battery Pack Assembly", dueInHours: 30, units: 160, component: "Battery Modules", status: "high" },
  { id: "PO-NEXON-1844", model: "Tata Nexon EV · illustrative", line: "Tata Nexon EV Battery Pack Assembly", dueInHours: 48, units: 80, component: "Battery Modules", status: "watch" },
];

export const assemblyStations = [
  { id: "module", name: "Module loading", component: "Battery Modules", risk: "critical" as RiskLevel, availability: 44, detail: "Battery modules are the primary shortage signal in this illustrative scenario." },
  { id: "enclosure", name: "Enclosure fit", component: "Battery Enclosure", risk: "watch" as RiskLevel, availability: 78, detail: "Enclosure stock covers the near-term pack schedule with a narrow buffer." },
  { id: "harness", name: "Harness routing", component: "Wiring Harness", risk: "high" as RiskLevel, availability: 62, detail: "Long supplier lead time places harness replenishment inside the exposure window." },
  { id: "cooling", name: "Cooling plate fit", component: "Cooling Plates", risk: "stable" as RiskLevel, availability: 91, detail: "Cooling plate inventory is above the protected planning threshold." },
  { id: "bms", name: "BMS validation", component: "Battery Management System (BMS)", risk: "high" as RiskLevel, availability: 57, detail: "BMS availability is sensitive to a pull-forward in the next pack order." },
];

export function availableAfterProtection(scenario: ManufacturingScenario) {
  return scenario.onHand - scenario.reserved - scenario.committed - scenario.safetyStock;
}

export function transferableManufacturingStock(scenario: ManufacturingScenario) {
  return Math.max(0, availableAfterProtection(scenario));
}

export function predictShortage(scenario: ManufacturingScenario) {
  const transferable = transferableManufacturingStock(scenario);
  const projectedDailyNeed = Math.round(scenario.dailyRequirement * (1 + scenario.demandIncreasePct / 100));
  const projectedNeedUntilSupplier = projectedDailyNeed * Math.max(1, scenario.supplierDelayDays);
  const projectedGap = Math.max(0, projectedNeedUntilSupplier - transferable);
  const risk: RiskLevel = projectedGap >= 250 || scenario.supplierDelayDays >= 4 ? "critical" : projectedGap >= 100 || scenario.supplierDelayDays >= 2 ? "high" : projectedGap > 0 ? "watch" : "stable";
  return {
    transferable,
    projectedDailyNeed,
    projectedNeedUntilSupplier,
    projectedGap,
    risk,
    confidence: "Forecast estimate from illustrative demo inputs",
    explanation: projectedGap > 0
      ? `${scenario.supplierDelayDays}-day supplier delay and ${scenario.demandIncreasePct}% demand change create an estimated ${projectedGap}-unit battery-pack exposure before replenishment.`
      : "Illustrative inventory and supplier timing cover the projected battery-pack requirement window.",
  };
}

export function affectedOrders(scenario: ManufacturingScenario) {
  const prediction = predictShortage(scenario);
  return productionOrders.map(order => ({
    ...order,
    status: prediction.risk === "critical" && order.dueInHours <= scenario.productionDeadlineHours ? "critical" as RiskLevel : prediction.risk === "high" && order.dueInHours <= 36 ? "high" as RiskLevel : order.status === "critical" ? "watch" as RiskLevel : order.status,
  }));
}

export function recoveryRecommendations(scenario: ManufacturingScenario) {
  const prediction = predictShortage(scenario);
  const transferable = prediction.transferable;
  return [
    { id: "allocate", title: "Reallocate verified free battery modules", status: transferable >= 120 ? "approved" : "rejected", detail: `Move up to ${transferable} units after reserved, committed, and safety-stock protection.`, evidence: "Deterministic SafeStock calculation" },
    { id: "expedite", title: "Expedite illustrative module delivery", status: scenario.supplierDelayDays > 0 ? "review" : "stable", detail: `Request an expedited ${scenario.supplierDelayDays}-day recovery window from the illustrative supplier.`, evidence: "Forecast estimate; supplier confirmation required" },
    { id: "reschedule", title: "Reschedule exposed Nexon EV orders", status: "review", detail: "Move the latest due order outside the exposure window while the planner verifies pack-production priorities.", evidence: "Planner decision; no automatic schedule mutation" },
  ] as const;
}

export const riskTone: Record<RiskLevel, string> = {
  critical: "coral",
  high: "amber",
  watch: "violet",
  stable: "green",
};
