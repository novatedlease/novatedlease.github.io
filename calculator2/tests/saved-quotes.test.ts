import { describe, expect, test } from "vitest";
import { coerceInputs, parseImportedQuotesFile, QUOTES_STORE_KEY } from "../src/state/savedQuotes";
import { baseEvInputs } from "./fixtures";

describe("saved quotes data layer", () => {
  test("localStorage key matches calculator/src/App.tsx exactly, so quotes are shared with v1", () => {
    expect(QUOTES_STORE_KEY).toBe("nl_saved_quotes_v1");
  });

  test("coerceInputs merges a partial saved quote over defaults with type coercion", () => {
    const defaults = baseEvInputs();
    const saved = { totalTaxableIncome: "150000" as unknown as number, vehicleType: "Non-EV" as const };
    const merged = coerceInputs(saved, defaults);
    expect(merged.totalTaxableIncome).toBe(150000);
    expect(merged.vehicleType).toBe("Non-EV");
    // Unset fields fall back to defaults untouched.
    expect(merged.leaseDurationYears).toBe(defaults.leaseDurationYears);
  });

  test("coerceInputs drops null/undefined fields and falls back to defaults", () => {
    const defaults = baseEvInputs();
    const merged = coerceInputs({ totalTaxableIncome: undefined }, defaults);
    expect(merged.totalTaxableIncome).toBe(defaults.totalTaxableIncome);
  });

  test("parseImportedQuotesFile rejects malformed JSON and wrong-shape payloads", () => {
    expect(parseImportedQuotesFile("not json")).toBeNull();
    expect(parseImportedQuotesFile(JSON.stringify({ v: 2, quotes: [] }))).toBeNull();
    expect(parseImportedQuotesFile(JSON.stringify({ v: 1, quotes: "not an array" }))).toBeNull();
  });

  test("parseImportedQuotesFile accepts a valid export and filters malformed entries", () => {
    const payload = {
      v: 1,
      quotes: [
        { v: 1, id: "q_1", name: "My quote", createdAtIso: "2026-01-01T00:00:00Z", inputs: {} },
        { v: 1, id: "q_2" }, // missing name — should be filtered out
      ],
    };
    const result = parseImportedQuotesFile(JSON.stringify(payload));
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0]!.id).toBe("q_1");
  });
});
