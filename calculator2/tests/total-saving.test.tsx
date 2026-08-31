import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeFinancialSummary, computeTotalSaving } from "../src/engineAdapter";
import { advancedDefaultInputs } from "../src/state/defaultInputs";
import { financedAmountExGstFromInputs } from "@engine/effectiveinterest";
import { residualFractionForYears } from "@engine/ato";
import { SummaryView } from "../src/components/SummaryView";
import { baseEvInputs, withOverrides } from "./fixtures";

/**
 * Regression test for a real bug: the headline "better off by" figure in both
 * App.tsx (Advanced mode) and SimpleMode.tsx originally only computed the raw
 * cashflow difference between pathways, omitting the home-loan-offset
 * opportunity-cost term that v1's SummaryView.tsx includes in its "totalSaving"
 * figure. Golden figures below are for the current advancedDefaultInputs
 * (derived from Simple mode's default answers) — re-derive them with the debug
 * snippet in this test's history if that default scenario changes again.
 */
describe("computeTotalSaving matches v1 SummaryView.tsx's totalSaving formula", () => {
  test("includes the interest/opportunity-cost term, not just cashflow", () => {
    // advancedDefaultInputs leaves residualValueExGst at the 0 sentinel (App.tsx's
    // auto-sync effect fills it in on mount) — recompute it here the same way, so
    // this test reflects what the live app actually shows, not the raw unfilled default.
    const financed = financedAmountExGstFromInputs(advancedDefaultInputs);
    const residual = Math.max(0, financed - advancedDefaultInputs.leaseDocFee) * residualFractionForYears(advancedDefaultInputs.leaseDurationYears);
    const inputs = { ...advancedDefaultInputs, residualValueExGst: residual };

    const summary = computeFinancialSummary({ inputs });
    const { cashflowSaving, interestSaving, totalSaving } = computeTotalSaving({ summary, horizon: "at5" });

    expect(cashflowSaving).toBeCloseTo(11972, -2);
    expect(interestSaving).toBeCloseTo(16506, -2);
    expect(totalSaving).toBeCloseTo(28478, -2);
    expect(totalSaving).toBeCloseTo(cashflowSaving + interestSaving, 6);
  });

  test("interest term is exactly zero when the home loan offset rate is zero (no opportunity cost to speak of)", () => {
    const inputs = withOverrides(baseEvInputs(), { homeLoanOffsetInterestRate: 0 });
    const summary = computeFinancialSummary({ inputs });
    const { interestSaving } = computeTotalSaving({ summary, horizon: "at5" });
    expect(interestSaving).toBeCloseTo(0, 6);
  });

  test("lease-end horizon uses the .first (not .total) interest figures", () => {
    const inputs = withOverrides(baseEvInputs(), { leaseDurationYears: 3 });
    const summary = computeFinancialSummary({ inputs });
    const atLeaseEnd = computeTotalSaving({ summary, horizon: "atLeaseEnd" });
    expect(atLeaseEnd.interestSaving).toBeCloseTo(summary.irNl.first - summary.irCash.first, 6);
  });

  test("SummaryView (the actual v1 Summary tab port) displays the same figure computeTotalSaving computes", () => {
    const financed = financedAmountExGstFromInputs(advancedDefaultInputs);
    const residual = Math.max(0, financed - advancedDefaultInputs.leaseDocFee) * residualFractionForYears(advancedDefaultInputs.leaseDurationYears);
    const inputs = { ...advancedDefaultInputs, residualValueExGst: residual };

    const summary = computeFinancialSummary({ inputs });
    const { totalSaving } = computeTotalSaving({ summary, horizon: "at5" });

    const html = renderToStaticMarkup(<SummaryView inputs={inputs} horizon="five_year" onNavigateToDetails={() => {}} />);
    const expectedDisplay = `$${Math.round(totalSaving).toLocaleString("en-AU")}`;
    expect(html).toContain(expectedDisplay);
  });
});
