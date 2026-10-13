import { describe, expect, it } from "vitest";
import { incomeTaxResident, lowBracketRate, marginalRateResident } from "@engine/tax_au";

// 16% bracket ($18,201–$45,000) was cut to 15% from 1 July 2026 and 14% from 1 July 2027
// (Treasury Laws Amendment (More Cost of Living Relief) Act 2025).
describe("resident tax brackets by financial year", () => {
  it("uses 16% up to 2025-26, 15% for 2026-27 and 14% from 2027-28", () => {
    expect(lowBracketRate(2026)).toBe(0.16);
    expect(lowBracketRate(2027)).toBe(0.15);
    expect(lowBracketRate(2028)).toBe(0.14);
    expect(lowBracketRate(2031)).toBe(0.14);
  });

  it("keeps the old 16% when no financial year is given", () => {
    expect(incomeTaxResident(100000)).toBeCloseTo(20788, 6);
  });

  it("matches published tax on $100,000", () => {
    expect(incomeTaxResident(100000, 2026)).toBeCloseTo(20788, 6);
    expect(incomeTaxResident(100000, 2027)).toBeCloseTo(20520, 6);
    expect(incomeTaxResident(100000, 2028)).toBeCloseTo(20252, 6);
  });

  it("carries the lower base into the higher brackets", () => {
    expect(incomeTaxResident(200000, 2027)).toBeCloseTo(4020 + 27000 + 20350 + 4500, 6);
    expect(marginalRateResident(30000, 2027)).toBe(0.15);
    expect(marginalRateResident(100000, 2028)).toBe(0.30);
  });
});
