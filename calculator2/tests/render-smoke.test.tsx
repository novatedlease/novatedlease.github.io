import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { computeDerived } from "@engine/derived";
import App from "../src/App";
import { SimpleMode } from "../src/SimpleMode";
import { LeaseReport } from "../src/components/reports/LeaseReport";
import { BasicInformationReport } from "../src/components/reports/BasicInformationReport";
import { EffectiveInterestReport } from "../src/components/reports/EffectiveInterestReport";
import { ATI } from "../src/components/reports/ATI";
import { SG } from "../src/components/reports/SG";
import { WhatIf } from "../src/components/reports/WhatIf";
import { WorstCase } from "../src/components/reports/WorstCase";
import { FinancialSummaryReport } from "../src/components/reports/FinancialSummaryReport";
import { QuotesPanel } from "../src/components/QuotesPanel";
import { baseEvInputs, withOverrides } from "./fixtures";

// Server-side render smoke test: catches runtime crashes (undefined props, thrown
// errors in derived state, etc.) that tsc's type-checking can't — there's no browser
// available in this environment to click through the app manually. Report sections
// render collapsed by default inside <Section>, so exercise them directly rather
// than through App/AdvancedMode (which wouldn't actually mount their bodies).
describe("render smoke test", () => {
  test("App renders without throwing (defaults to Simple mode)", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain("Novated Lease Calculator");
    expect(html.length).toBeGreaterThan(500);
  });

  test("SimpleMode renders without throwing and shows a verdict", () => {
    const html = renderToStaticMarkup(<SimpleMode onGoAdvanced={() => {}} />);
    expect(html).toMatch(/Better off by|Worse off by/);
  });

  const inputs = baseEvInputs();
  const fbtApplicableInputs = withOverrides(baseEvInputs(), { vehicleType: "Non-EV", electricityAnnual: 0, fuelAnnual: 2200 });

  test("LeaseReport renders for both FBT-exempt and FBT-applicable inputs", () => {
    expect(renderToStaticMarkup(<LeaseReport inputs={inputs} />).length).toBeGreaterThan(100);
    expect(renderToStaticMarkup(<LeaseReport inputs={fbtApplicableInputs} />).length).toBeGreaterThan(100);
  });

  test("BasicInformationReport renders for both FBT-exempt and FBT-applicable inputs", () => {
    expect(renderToStaticMarkup(<BasicInformationReport inputs={inputs} taxRateInclMedicarePct={47} />).length).toBeGreaterThan(100);
    expect(renderToStaticMarkup(<BasicInformationReport inputs={fbtApplicableInputs} taxRateInclMedicarePct={47} />).length).toBeGreaterThan(100);
  });

  test("EffectiveInterestReport renders without throwing", () => {
    const html = renderToStaticMarkup(<EffectiveInterestReport inputs={inputs} />);
    expect(html).not.toMatch(/\(error\)/);
    expect(html.length).toBeGreaterThan(100);
  });

  test("ATI renders for EXEMPT (non-zero RFBA) and APPLICABLE (zeroed RFBA) categories", () => {
    const atiRowsExempt = computeDerived(inputs).atiRows;
    const htmlExempt = renderToStaticMarkup(
      <ATI
        inputs={inputs}
        originalTaxableIncomePreNL={inputs.totalTaxableIncome}
        leaseStartDate={new Date(inputs.leaseStartDate)}
        leaseTermYears={inputs.leaseDurationYears}
        fbtBaseValue={inputs.vehicleBaseValue}
        rows={atiRowsExempt}
      />
    );
    expect(htmlExempt.length).toBeGreaterThan(100);

    const atiRowsApplicable = computeDerived(fbtApplicableInputs).atiRows;
    const htmlApplicable = renderToStaticMarkup(
      <ATI
        inputs={fbtApplicableInputs}
        originalTaxableIncomePreNL={fbtApplicableInputs.totalTaxableIncome}
        leaseStartDate={new Date(fbtApplicableInputs.leaseStartDate)}
        leaseTermYears={fbtApplicableInputs.leaseDurationYears}
        fbtBaseValue={fbtApplicableInputs.vehicleBaseValue}
        rows={atiRowsApplicable}
      />
    );
    // FBT-applicable leases zero out RFBA (ECM assumed to offset it) — see ATI.tsx's doc comment.
    expect(htmlApplicable).toContain("RFBA is shown as $0");
  });

  test("SG renders without throwing", () => {
    const sgRows = computeDerived(inputs).sgRows;
    const html = renderToStaticMarkup(<SG rows={sgRows} />);
    expect(html.length).toBeGreaterThan(100);
  });

  test("WhatIf renders without throwing", () => {
    const html = renderToStaticMarkup(<WhatIf inputs={inputs} />);
    expect(html.length).toBeGreaterThan(100);
  });

  test("WorstCase renders without throwing (chart degrades gracefully with no ResizeObserver in SSR)", () => {
    const html = renderToStaticMarkup(<WorstCase inputs={inputs} />);
    expect(html.length).toBeGreaterThan(100);
    expect(html).toContain("Total spent vs termination timepoint");
  });

  test("FinancialSummaryReport renders scenario comparison rows, including optional loan/keep scenarios", () => {
    const withComparators = withOverrides(baseEvInputs(), { compareWithCarLoan: true, compareWithCurrentCar: true });
    const html = renderToStaticMarkup(<FinancialSummaryReport inputs={withComparators} />);
    expect(html).toContain("Novated Lease");
    expect(html).toContain("Car loan");
    expect(html).toContain("Keep current car");
    expect(html.match(/\bNaN\b|>undefined</g)).toBeNull();
  });

  test("QuotesPanel renders without throwing (no window/localStorage in SSR)", () => {
    const html = renderToStaticMarkup(<QuotesPanel inputs={inputs} defaultInputs={inputs} onLoadQuote={() => {}} />);
    expect(html).toContain("Saved quotes");
  });
});
