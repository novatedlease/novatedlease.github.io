import { describe, expect, test } from "vitest";
import { decodeInputsFromUrlParam, encodeInputsToUrlParam } from "@engine/urlState";
import { advancedDefaultInputs, sentinelDefaultInputs } from "../src/state/defaultInputs";

/** The "first-year insurance already financed" field survives share links; older links read it as 0. */
describe("share links and the financed first-year insurance field", () => {
  test("a new link keeps it", () => {
    const withIns = { ...advancedDefaultInputs, insuranceFinancedFirstYear: 1537.92 };
    expect(decodeInputsFromUrlParam(encodeInputsToUrlParam(withIns), sentinelDefaultInputs).insuranceFinancedFirstYear).toBe(1537.92);
  });

  test("a link made before the field existed loads it as 0, so its result is unchanged", () => {
    const { insuranceFinancedFirstYear: _drop, ...older } = { ...advancedDefaultInputs, driveawayCost: 61234 };
    void _drop;
    const back = decodeInputsFromUrlParam(encodeInputsToUrlParam(older as typeof advancedDefaultInputs), sentinelDefaultInputs);
    expect(back.insuranceFinancedFirstYear).toBe(0);
    expect(back.driveawayCost).toBe(61234);
  });
});
