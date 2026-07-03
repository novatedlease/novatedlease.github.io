import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ComparatorView, extractPathwayNumbers } from "../src/components/ComparatorView";
import { computeFinancialSummary } from "../src/engineAdapter";
import type { SavedQuoteV1 } from "../src/state/savedQuotes";
import { baseEvInputs, withOverrides } from "./fixtures";

function mkQuote(id: string, name: string, overrides: Partial<ReturnType<typeof baseEvInputs>> = {}): SavedQuoteV1 {
  return {
    v: 1,
    id,
    name,
    createdAtIso: "2026-01-01T00:00:00Z",
    inputs: withOverrides(baseEvInputs(), overrides),
  };
}

describe("ComparatorView", () => {
  const defaults = baseEvInputs();

  test("renders a helpful empty state with no saved quotes", () => {
    const html = renderToStaticMarkup(<ComparatorView savedQuotes={[]} defaultInputs={defaults} />);
    expect(html).toContain("Save at least two quotes");
  });

  test("renders the selection panel with one quote, but no comparison table (nothing selected yet)", () => {
    const quotes = [mkQuote("q1", "My EV lease")];
    const html = renderToStaticMarkup(<ComparatorView savedQuotes={quotes} defaultInputs={defaults} />);
    expect(html).toContain("My EV lease");
    expect(html).toContain("Select pathways to compare");
    // No ranking table yet since nothing is selected (selection is interactive, not testable via static render).
    expect(html).not.toContain("Net Financial Position");
  });

  test("does not throw when quotes have mismatched fields (loan/keep enabled differently)", () => {
    const quotes = [
      mkQuote("q1", "Quote A", { compareWithCarLoan: true }),
      mkQuote("q2", "Quote B", { compareWithCurrentCar: true, currentCarMarketValueNow: 15000 }),
    ];
    const html = renderToStaticMarkup(<ComparatorView savedQuotes={quotes} defaultInputs={defaults} />);
    expect(html.match(/\bNaN\b|>undefined</g)).toBeNull();
  });
});

describe("extractPathwayNumbers (pure pathway maths, used to rank comparator columns)", () => {
  const inputs = baseEvInputs();
  const s = computeFinancialSummary({ inputs, taxRateInclMedicarePct: 47 });

  test("nl pathway: cash total @ lease end = -(lease payments) + charging benefit - residual", () => {
    const nl = extractPathwayNumbers(s, inputs, "nl");
    expect(nl.cashTotalAtLeaseEnd).toBeCloseTo(-s.leasePaymentsOverLease + s.chargingDeltaBenefitOverLease - s.residualPayableIncGst, 2);
  });

  test("cash pathway: upfront cost is the full drive-away price (negative)", () => {
    const cash = extractPathwayNumbers(s, inputs, "cash");
    expect(cash.cashTotalAtLeaseEnd).toBeLessThanOrEqual(-inputs.driveawayCost);
  });

  test("keep pathway: no upfront cost, no residual — only running costs and asset value", () => {
    const keepInputs = withOverrides(inputs, { compareWithCurrentCar: true, currentCarMarketValueNow: 20000, currentCarMarketValueAtEnd: 11000 });
    const keepSummary = computeFinancialSummary({ inputs: keepInputs, taxRateInclMedicarePct: 47 });
    const keep = extractPathwayNumbers(keepSummary, keepInputs, "keep");
    expect(keep.carValueAtLeaseEnd).toBe(keepSummary.currentCarValueAtLeaseEnd);
    expect(keep.carValueAt5).toBe(keepInputs.currentCarMarketValueAtEnd);
  });

  test("interest figures come from the matching worksheet-130 scenario per pathway", () => {
    expect(extractPathwayNumbers(s, inputs, "nl").interestAt5).toBe(s.irNl.total);
    expect(extractPathwayNumbers(s, inputs, "cash").interestAt5).toBe(s.irCash.total);
  });
});
