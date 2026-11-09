import { describe, expect, test } from "vitest";
import { driveawayFromResidual, gstSavedFromDraft, emptyDraft } from "../src/guided/draft";

// Figures from a reader's real quotes (Zeekr 7X, 5-year lease, drive-away $70,275).
describe("driveawayFromResidual", () => {
  test("NLA quote: residual set on drive-away less GST saving, so the price comes back exactly", () => {
    // Residual $18,025.86 ex GST at 28.13%; GST saving $6,194.45 (FBT base value $68,139 / 11).
    expect(driveawayFromResidual(18025.86, 28.13, 68139 / 11)).toBeCloseTo(70275, 0);
  });

  test("Smart quote: a slightly different residual base lands within 1%", () => {
    const derived = driveawayFromResidual(17930.1, 28.13, 67604.95 / 11)!;
    expect(Math.abs(derived - 70275) / 70275).toBeLessThan(0.01);
  });

  test("rejects missing or nonsensical inputs", () => {
    expect(driveawayFromResidual(0, 28.13, 6000)).toBeNull();
    expect(driveawayFromResidual(18000, 0, 6000)).toBeNull();
    expect(driveawayFromResidual(18000, 100, 6000)).toBeNull();
    expect(driveawayFromResidual(18000, 28.13, -1)).toBeNull();
  });
});

describe("gstSavedFromDraft", () => {
  test("FBT base value / 11, capped, and null until base value and condition are known", () => {
    const d = emptyDraft();
    expect(gstSavedFromDraft(d)).toBeNull();
    const withBase = { ...d, vehicleCondition: "New" as const, baseValue: { text: "68139", none: false, estimated: false } };
    expect(gstSavedFromDraft(withBase)).toBeCloseTo(6194.45, 2);
    const pricey = { ...withBase, baseValue: { text: "120000", none: false, estimated: false } };
    expect(gstSavedFromDraft(pricey)).toBe(6353);
  });
});
