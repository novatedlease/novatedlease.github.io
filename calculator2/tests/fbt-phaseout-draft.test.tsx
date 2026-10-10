import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeDerived } from "@engine/derived";
import { getLeaseFbtCategory, getRfbaStatutoryRate, usedEvHistoryTestsApply } from "@engine/types";
import { ATI } from "../src/components/reports/ATI";
import { baseEvInputs, withOverrides } from "./fixtures";

// Rules from the September 2026 exposure draft (Treasury Laws Amendment Bill 2026:
// Phased changes to the FBT electric car exemption).
describe("phase-out exposure draft", () => {
  test("RFBA fraction is 0.2 less the ECM contribution for each category", () => {
    expect(getRfbaStatutoryRate("EV_FBT_EXEMPT")).toBeCloseTo(0.2, 10);
    expect(getRfbaStatutoryRate("EV_FBT_DISCOUNTED")).toBeCloseTo(0.05, 10);
    expect(getRfbaStatutoryRate("EV_FBT_APPLICABLE")).toBe(0);
    expect(getRfbaStatutoryRate("NON_EV_FBT_APPLICABLE")).toBe(0);
  });

  test("used-EV history tests apply only to leases starting before 1 April 2027", () => {
    const used = { vehicleCondition: "Used – dealer sale (GST inc)" as const };
    expect(usedEvHistoryTestsApply(withOverrides(baseEvInputs(), { ...used, leaseStartDate: "2027-03-31" }))).toBe(true);
    expect(usedEvHistoryTestsApply(withOverrides(baseEvInputs(), { ...used, leaseStartDate: "2027-04-01" }))).toBe(false);
    expect(usedEvHistoryTestsApply(withOverrides(baseEvInputs(), { leaseStartDate: "2026-08-02" }))).toBe(false); // new car
  });

  test("an unticked used EV is FBT-applicable before April 2027 but tiered after", () => {
    const unticked = { vehicleCondition: "Used – dealer sale (GST inc)" as const, usedCarFirstHeldAfterJul2022: false, usedCarLctNeverPayable: false };
    expect(getLeaseFbtCategory(withOverrides(baseEvInputs(), { ...unticked, leaseStartDate: "2027-03-01", vehicleBaseValue: 60000 }))).toBe("EV_FBT_APPLICABLE");
    expect(getLeaseFbtCategory(withOverrides(baseEvInputs(), { ...unticked, leaseStartDate: "2027-06-01", vehicleBaseValue: 60000 }))).toBe("EV_FBT_EXEMPT");
    expect(getLeaseFbtCategory(withOverrides(baseEvInputs(), { ...unticked, leaseStartDate: "2027-06-01", vehicleBaseValue: 80000 }))).toBe("EV_FBT_DISCOUNTED");
    expect(getLeaseFbtCategory(withOverrides(baseEvInputs(), { ...unticked, leaseStartDate: "2029-06-01", vehicleBaseValue: 60000 }))).toBe("EV_FBT_DISCOUNTED");
  });

  test("ATI shows RFBA of 5% of base value, grossed up, for a 25%-discount car", () => {
    const inputs = withOverrides(baseEvInputs(), { leaseStartDate: "2027-06-01", vehicleBaseValue: 80000, driveawayCost: 85000 });
    expect(getLeaseFbtCategory(inputs)).toBe("EV_FBT_DISCOUNTED");
    const html = renderToStaticMarkup(
      <ATI
        inputs={inputs}
        originalTaxableIncomePreNL={inputs.totalTaxableIncome}
        leaseStartDate={new Date(inputs.leaseStartDate)}
        leaseTermYears={inputs.leaseDurationYears}
        fbtBaseValue={inputs.vehicleBaseValue}
        rows={computeDerived(inputs).atiRows}
      />
    );
    // 80,000 × 0.05 × 1.8868 = 7,547.20 per full FBT year
    expect(html).toContain("7,547");
    expect(html).not.toContain("RFBA is shown as $0");
    expect(html).toContain("5% of the base value");
  });
});
