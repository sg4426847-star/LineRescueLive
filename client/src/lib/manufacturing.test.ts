import { describe, expect, it } from "vitest";
import { CASE_STUDY_DISCLOSURE, DEFAULT_MANUFACTURING_SCENARIO, assemblyStations, componentInventory, componentTransferableStock, predictShortage, transferableManufacturingStock } from "./manufacturing";

describe("manufacturing intelligence", () => {
  it("keeps transferable stock deterministic and separate from forecast gap", () => {
    expect(transferableManufacturingStock(DEFAULT_MANUFACTURING_SCENARIO)).toBe(160);
    expect(predictShortage(DEFAULT_MANUFACTURING_SCENARIO).projectedGap).toBe(560);
  });

  it("updates forecast risk when supplier delay or demand changes", () => {
    const baseline = predictShortage(DEFAULT_MANUFACTURING_SCENARIO);
    const stressed = predictShortage({ ...DEFAULT_MANUFACTURING_SCENARIO, supplierDelayDays: 4, demandIncreasePct: 20 });
    expect(stressed.projectedGap).toBeGreaterThan(baseline.projectedGap);
    expect(stressed.risk).toBe("critical");
  });

  it("does not silently invent recovery compatibility", () => {
    const noStock = predictShortage({ ...DEFAULT_MANUFACTURING_SCENARIO, onHand: 300, reserved: 100, committed: 100, safetyStock: 150 });
    expect(noStock.transferable).toBe(0);
    expect(noStock.explanation).toContain("exposure");
  });

  it("keeps the Nexon EV component model and twin station IDs aligned", () => {
    expect(CASE_STUDY_DISCLOSURE).toBe("Illustrative Tata Nexon EV Manufacturing Scenario – Not Official Tata Motors Data.");
    expect(componentInventory.map(item => item.name)).toEqual([
      "Battery Modules",
      "Battery Enclosure",
      "Wiring Harness",
      "Cooling Plates",
      "Battery Management System (BMS)",
    ]);
    expect(assemblyStations.map(station => station.id)).toEqual(["module", "enclosure", "harness", "cooling", "bms"]);
    expect(assemblyStations.map(station => station.component)).toEqual(componentInventory.map(item => item.name));
    expect(componentTransferableStock(componentInventory[0])).toBe(160);
    expect(componentTransferableStock(componentInventory[3])).toBe(240);
  });
});
