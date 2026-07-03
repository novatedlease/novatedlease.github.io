import { describe, expect, test } from "vitest";
import { encodeInputsToUrlParam, decodeInputsFromUrlParam, getInputsFromLocationSearch, setUrlParamForInputs } from "@engine/urlState";
import { baseEvInputs, withOverrides } from "./fixtures";

// Share links must round-trip identically whether generated/consumed by v1 or v2 —
// both import this exact same engine/urlState.ts codec, so this is really a test of
// the shared codec's correctness rather than anything calculator2-specific, but it's
// the guarantee the redesign plan (§2.6) depends on.
describe("share link codec (shared between v1 and v2)", () => {
  test("round-trips a full Inputs object through encode -> decode", () => {
    const original = withOverrides(baseEvInputs(), { totalTaxableIncome: 155000, vehicleType: "Non-EV", electricityAnnual: 0, fuelAnnual: 2500 });
    const encoded = encodeInputsToUrlParam(original);
    const decoded = decodeInputsFromUrlParam(encoded, baseEvInputs());
    expect(decoded).toEqual(original);
  });

  test("setUrlParamForInputs -> getInputsFromLocationSearch round-trip via a query string", () => {
    const original = withOverrides(baseEvInputs(), { leaseDurationYears: 3, compareWithCarLoan: true });
    const search = setUrlParamForInputs("", original);
    expect(search.startsWith("?c=")).toBe(true);
    const decoded = getInputsFromLocationSearch(search, baseEvInputs());
    expect(decoded).toEqual(original);
  });

  test("missing/invalid param falls back to defaults rather than throwing", () => {
    const defaults = baseEvInputs();
    expect(decodeInputsFromUrlParam(null, defaults)).toEqual(defaults);
    expect(decodeInputsFromUrlParam("not-valid-base64!!!", defaults)).toEqual(defaults);
  });
});
