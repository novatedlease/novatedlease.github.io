import { describe, expect, test } from "vitest";
import { summaryFigures } from "../src/components/summaryFigures";
import { formatForumSummary } from "../src/guided/forumSummary";
import { baseEvInputs, withOverrides } from "./fixtures";

const aud = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString("en-AU")}`;

describe("Guided forum summary", () => {
  test("includes the selected horizon, comparison, quote context and warnings", () => {
    const inputs = withOverrides(baseEvInputs(), { compareWithCarLoan: true, leaseDurationYears: 3 });
    const figures = summaryFigures(inputs, "lease_end");
    const text = formatForumSummary({
      inputs,
      exploring: false,
      provider: "SG Fleet",
      horizon: "lease_end",
      cashNone: false,
      paymentPeriod: "perMonth",
      answers: [["Drive-away price", "$65,000"], ["Lease payment", "$550 per fortnight ex GST"]],
      assumptions: [["Residual GST", "Read as excluding GST"]],
      warnings: ["Check the period beside your payment."],
    });
    expect(text).toContain("Provider: SG Fleet");
    expect(text).toContain(`RESULT — over ${figures.years} years`);
    expect(text).toContain(`Versus a car loan: ${aud(figures.totalSavingVsLoan)}`);
    expect(text).toContain("Drive-away price: $65,000");
    expect(text).toContain("Residual GST: Read as excluding GST");
    expect(text).toContain("Check the period beside your payment.");
    expect(text).toContain("less per month");
  });

  test("marks exploratory results as approximate and omits provider", () => {
    const text = formatForumSummary({
      inputs: baseEvInputs(), exploring: true, provider: null, horizon: "five_year",
      cashNone: false, paymentPeriod: null,
      answers: [["Car", "Electric, new"]],
      assumptions: [["Lease rate", "Assumed"]], warnings: [],
    });
    expect(text).toContain("estimate (no quote yet)");
    expect(text).toContain("rough estimate");
    expect(text).not.toContain("Provider:");
    expect(text).toContain("What I'd like checked:");
  });
});
