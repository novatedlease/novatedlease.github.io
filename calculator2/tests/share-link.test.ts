import { describe, expect, test } from "vitest";
import { encodeInputsToUrlParam, decodeInputsFromUrlParam, getInputsFromLocationSearch, setUrlParamForInputs } from "@engine/urlState";
import { baseEvInputs, withOverrides } from "./fixtures";

// v1's App.tsx does NOT import this module — it has its own separate inline
// encoder/decoder (readInputsFromUrl/encodeInputsToUrlParam, ~lines 232-316). The
// two payloads must therefore be constructed independently to actually prove
// cross-version compatibility, not just that this module round-trips with itself.
// v1's payload shape: `{ v: 1, inputs: Partial<Inputs> }`, base64url-encoded via
// `btoa(unescape(encodeURIComponent(json)))` — replicated verbatim below.
function encodeLikeV1(inputs: unknown): string {
  const json = JSON.stringify({ v: 1, inputs });
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

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

  // Regression test for a real cross-version bug: a v2-generated link previously fell back
  // to defaults when opened in v1 (and vice versa) because the two payloads used different
  // JSON keys (`i` vs `inputs`) despite otherwise-identical base64url encoding. Pinned by
  // decoding a payload built the way v1 actually builds it, independent of this module.
  test("decodes a payload encoded the way v1's own inline encoder does it", () => {
    const original = withOverrides(baseEvInputs(), { totalTaxableIncome: 88000, leaseDurationYears: 4, vehicleType: "Non-EV", electricityAnnual: 0, fuelAnnual: 1800 });
    const v1Encoded = encodeLikeV1(original);
    const decoded = decodeInputsFromUrlParam(v1Encoded, baseEvInputs());
    expect(decoded).toEqual(original);
  });
});
