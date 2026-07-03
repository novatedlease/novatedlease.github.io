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
import { LeaseRateGuard } from "../src/components/LeaseRateGuard";
import { InputsPanel } from "../src/components/InputsPanel";
import { SummaryView } from "../src/components/SummaryView";
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
    const html = renderToStaticMarkup(
      <QuotesPanel inputs={inputs} defaultInputs={inputs} onLoadQuote={() => {}} quotes={[]} onQuotesChange={() => {}} />
    );
    expect(html).toContain("Saved quotes");
  });

  test("LeaseRateGuard shows the live effective rate and no rejection message for a plausible payment", () => {
    const html = renderToStaticMarkup(<LeaseRateGuard inputs={inputs} setInputs={() => {}} vehicleLeasePeriodMode="perFn" onVehicleLeasePeriodModeChange={() => {}} />);
    expect(html).toContain("Effective interest rate");
    expect(html).not.toContain("Rejected:");
  });

  test("LeaseRateGuard flags a high (but accepted, >10%) rate with the BYO-lease note", () => {
    // 9.5% assumed rate baseline can be pushed above 10% with a higher payment that's
    // still inside the 0.1%-30% plausible band.
    const highRateInputs = withOverrides(inputs, { vehicleLeasePerFn: inputs.vehicleLeasePerFn * 1.15 });
    const html = renderToStaticMarkup(<LeaseRateGuard inputs={highRateInputs} setInputs={() => {}} vehicleLeasePeriodMode="perFn" onVehicleLeasePeriodModeChange={() => {}} />);
    expect(html).toContain("BYO");
  });

  test("InputsPanel renders every field group for an EV, including EV-only Electricity section", () => {
    const html = renderToStaticMarkup(<InputsPanel inputs={inputs} setInputs={() => {}} vehicleLeasePeriodMode="perFn" onVehicleLeasePeriodModeChange={() => {}} />);
    for (const label of [
      "Vehicle type",
      "Vehicle dutiable value",
      "Drive-away cost",
      "Total taxable income",
      "Home loan offset interest rate",
      "Lease start date",
      "Lease duration",
      "Residual value",
      "Luxury vehicle adjustment",
      "Financed amount reported",
      "Months deferred",
      "GST saving passed on",
      "Service / maintenance / tyres",
      "Average AUD per kWh",
      "Enable car loan comparison",
      "Enable keep-current-car comparison",
    ]) {
      expect(html).toContain(label);
    }
    expect(html.match(/\bNaN\b|>undefined</g)).toBeNull();
  });

  test("InputsPanel shows Fuel instead of Electricity, and hides the Electricity section, for a non-EV", () => {
    const nonEv = withOverrides(inputs, { vehicleType: "Non-EV", electricityAnnual: 0, fuelAnnual: 2200 });
    const html = renderToStaticMarkup(<InputsPanel inputs={nonEv} setInputs={() => {}} vehicleLeasePeriodMode="perFn" onVehicleLeasePeriodModeChange={() => {}} />);
    expect(html).toContain(">Fuel<");
    expect(html).not.toContain("Average AUD per kWh");
  });

  test("InputsPanel reveals car-loan and keep-current-car sub-fields when those comparators are enabled", () => {
    const withComparators = withOverrides(inputs, { compareWithCarLoan: true, compareWithCurrentCar: true });
    const html = renderToStaticMarkup(<InputsPanel inputs={withComparators} setInputs={() => {}} vehicleLeasePeriodMode="perFn" onVehicleLeasePeriodModeChange={() => {}} />);
    expect(html).toContain("Initial deposit amount");
    expect(html).toContain("Current market value");
  });

  test("SummaryView shows only the NL-vs-Cash card by default (no loan/keep comparators enabled)", () => {
    const html = renderToStaticMarkup(<SummaryView inputs={inputs} horizon="five_year" onNavigateToDetails={() => {}} />);
    expect(html).toContain("Novated Lease vs Offset Cash");
    expect(html).not.toContain("Novated Lease vs Car Loan");
    expect(html).not.toContain("Novated Lease vs Keeping Current Car");
    expect(html.match(/\bNaN\b|>undefined</g)).toBeNull();
  });

  test("SummaryView shows all three cards when both comparators are enabled", () => {
    const withComparators = withOverrides(inputs, { compareWithCarLoan: true, compareWithCurrentCar: true });
    const html = renderToStaticMarkup(<SummaryView inputs={withComparators} horizon="five_year" onNavigateToDetails={() => {}} />);
    expect(html).toContain("Novated Lease vs Offset Cash");
    expect(html).toContain("Novated Lease vs Car Loan");
    expect(html).toContain("Novated Lease vs Keeping Current Car");
    expect(html.match(/\bNaN\b|>undefined</g)).toBeNull();
  });

  test("SummaryView's total saving equals cashflow advantage + interest advantage, matching computeTotalSaving", () => {
    const html = renderToStaticMarkup(<SummaryView inputs={inputs} horizon="five_year" onNavigateToDetails={() => {}} />);
    expect(html).toContain("Cashflow advantage");
    expect(html).toContain("Home loan interest advantage");
    expect(html).toMatch(/Total saving \(NL\)|Total extra cost \(NL\)/);
  });
});
