import { describe, it, expect } from "vitest";
import { layRate, productionStage, toCrates, vaccineStatus, flockAgeDays } from "./farm";

describe("farm rules", () => {
  it("lay rate is eggs ÷ live birds", () => {
    expect(layRate(450, 500)).toBe(90);
    expect(layRate(10, 0)).toBe(0);
  });
  it("a crate holds 30 eggs", () => {
    expect(toCrates(95)).toEqual({ crates: 3, loose: 5 });
  });
  it("production stages by age", () => {
    expect(productionStage(20)).toBe("Brooding");
    expect(productionStage(10 * 7)).toBe("Growing");
    expect(productionStage(17 * 7)).toBe("Pre-lay");
    expect(productionStage(30 * 7)).toBe("Laying");
    expect(productionStage(60 * 7)).toBe("Post-peak");
  });
  it("vaccine status", () => {
    expect(vaccineStatus("2026-01-01", false, "2026-02-01")).toBe("Overdue");
    expect(vaccineStatus("2026-03-01", false, "2026-02-01")).toBe("Due");
    expect(vaccineStatus("2026-01-01", true, "2026-02-01")).toBe("Done");
  });
  it("age includes age at placement", () => {
    expect(flockAgeDays("2026-01-01", 1, new Date("2026-01-11T12:00:00"))).toBe(11);
  });
});
