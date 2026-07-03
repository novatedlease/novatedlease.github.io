import { useEffect, useRef, useState } from "react";
import type { Inputs } from "@engine/types";
import { financedAmountExGstFromInputs } from "@engine/effectiveinterest";
import { residualFractionForYears } from "@engine/ato";
import { computeDerived } from "@engine/derived";
import { URL_STATE_PARAM, getInputsFromLocationSearch, setUrlParamForInputs } from "@engine/urlState";
import { computeFinancialSummary } from "./engineAdapter";

import { advancedDefaultInputs } from "./state/defaultInputs";
import { ModeToggle, type CalcMode } from "./components/ui/ModeToggle";
import { VerdictBanner } from "./components/ui/VerdictBanner";
import { Section } from "./components/ui/Section";
import { CurrencyField, PillGroup } from "./components/ui/Field";
import { KV, StatGrid, Stat } from "./components/ui/shared";
import { Button } from "./components/ui/Button";
import { SimpleMode } from "./SimpleMode";
import { PALETTE } from "./palette";
import { LeaseReport } from "./components/reports/LeaseReport";
import { BasicInformationReport } from "./components/reports/BasicInformationReport";
import { EffectiveInterestReport } from "./components/reports/EffectiveInterestReport";
import { ATI } from "./components/reports/ATI";
import { SG } from "./components/reports/SG";
import { WhatIf } from "./components/reports/WhatIf";
import { WorstCase } from "./components/reports/WorstCase";
import { FinancialSummaryReport } from "./components/reports/FinancialSummaryReport";
import { QuotesPanel } from "./components/QuotesPanel";

const MODE_STORAGE_KEY = "nlc2-mode";

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

// Matches v1 App.tsx's buildAtiRowsFromFyBreakdown/buildSgRowsFromFyBreakdown —
// folds the luxury vehicle adjustment into the lease payment before computing
// FY breakdown, so ATI/SG figures align with LeaseReport's take-home impact.
function withLvFolded(inputs: Inputs): Inputs {
  return { ...inputs, vehicleLeasePerFn: inputs.vehicleLeasePerFn + inputs.luxuryVehicleAdjPerFn };
}
function buildAtiRows(inputs: Inputs) {
  return computeDerived(withLvFolded(inputs)).atiRows;
}
function buildSgRows(inputs: Inputs) {
  return computeDerived(withLvFolded(inputs)).sgRows;
}

function estMarketValueFromDriveaway(driveawayCost: number): number {
  return Math.round((driveawayCost * 0.4) / 1000) * 1000;
}

function AdvancedMode(props: { inputs: Inputs; setInputs: React.Dispatch<React.SetStateAction<Inputs>> }) {
  const { inputs, setInputs } = props;
  const lastAutoResidualRef = useRef<number | null>(null);
  const lastAutoFinancedRef = useRef<number | null>(null);
  const lastAutoEstMarketValueRef = useRef<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-sync residualValueExGst from the ATO-derived formula until the user overrides it —
  // mirrors calculator/src/App.tsx's residual auto-sync effect (lines ~771-798).
  useEffect(() => {
    const financedExGst = financedAmountExGstFromInputs(inputs);
    const leaseYears = Math.max(1, Math.min(5, Math.round(inputs.leaseDurationYears)));
    const auto = Math.max(0, financedExGst - inputs.leaseDocFee) * residualFractionForYears(leaseYears);
    const cur = inputs.residualValueExGst;
    const lastAuto = lastAutoResidualRef.current;
    const withinCent = (a: number, b: number) => Math.abs(a - b) < 0.01;

    const shouldSync = cur === 0 || (lastAuto !== null && withinCent(cur, lastAuto)) || (lastAuto === null && withinCent(cur, auto));

    if (shouldSync && !withinCent(cur, auto)) {
      setInputs((p) => ({ ...p, residualValueExGst: auto }));
    }
    lastAutoResidualRef.current = auto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.leaseDurationYears, inputs.vehicleCondition, inputs.vehicleBaseValue, inputs.driveawayCost, inputs.leaseDocFee]);

  // Auto-sync financedAmountForInterestCalcExGst until the user overrides it —
  // mirrors calculator/src/App.tsx lines ~744-769.
  useEffect(() => {
    const auto = financedAmountExGstFromInputs(inputs);
    const cur = inputs.financedAmountForInterestCalcExGst;
    const lastAuto = lastAutoFinancedRef.current;
    const withinCent = (a: number, b: number) => Math.abs(a - b) < 0.01;

    const shouldSync = cur === 0 || (lastAuto !== null && withinCent(cur, lastAuto)) || (lastAuto === null && withinCent(cur, auto));

    if (shouldSync && !withinCent(cur, auto)) {
      setInputs((p) => ({ ...p, financedAmountForInterestCalcExGst: auto }));
    }
    lastAutoFinancedRef.current = auto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.vehicleCondition, inputs.vehicleBaseValue, inputs.driveawayCost, inputs.leaseDocFee, inputs.financedAmountForInterestCalcExGst]);

  // Auto-fill estimatedMarketValueAtEnd from driveawayCost until the user overrides it —
  // mirrors calculator/src/App.tsx lines ~723-742.
  useEffect(() => {
    const auto = estMarketValueFromDriveaway(inputs.driveawayCost);
    const cur = inputs.estimatedMarketValueAtEnd;
    const lastAuto = lastAutoEstMarketValueRef.current;
    const withinCent = (a: number, b: number) => Math.abs(a - b) < 0.01;

    const shouldSync = cur === 0 || (lastAuto !== null && withinCent(cur, lastAuto)) || (lastAuto === null && withinCent(cur, auto));

    if (shouldSync && !withinCent(cur, auto)) {
      setInputs((p) => ({ ...p, estimatedMarketValueAtEnd: auto }));
    }
    lastAutoEstMarketValueRef.current = auto;
  }, [inputs.driveawayCost, inputs.estimatedMarketValueAtEnd]);

  const summary = computeFinancialSummary({ inputs, taxRateInclMedicarePct: 47 });
  const betterOffBy = summary.offsetTotalSpentAt5 - summary.nlTotalSpentAt5;

  async function copyShareLink() {
    const url = `${window.location.origin}${window.location.pathname}${setUrlParamForInputs(window.location.search, inputs)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <div>
      <VerdictBanner
        betterOffBy={betterOffBy}
        comparedTo="buying with cash"
        sub={`Over a ${inputs.leaseDurationYears}-year lease, standardised to a 5-year horizon.`}
      >
        <Stat label="Lease payments" value={fmtMoney(summary.leasePaymentsOverLease)} color={PALETTE.blue} />
        <Stat label="Residual at lease end" value={fmtMoney(summary.residualPayableIncGst)} color={PALETTE.purple} />
        <Stat label="Vehicle value at lease end" value={fmtMoney(summary.newEvValueAtLeaseEnd)} color={PALETTE.teal} />
      </VerdictBanner>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, fontSize: 13, color: "var(--nlc-text-muted)", gap: 12, flexWrap: "wrap" }}>
        <span>Advanced mode is still being ported from the full v1 calculator (remaining: side-by-side comparator).</span>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={copyShareLink}>
            {copiedLink ? "Link copied!" : "Copy share link"}
          </Button>
          <QuotesPanel inputs={inputs} defaultInputs={advancedDefaultInputs} onLoadQuote={setInputs} />
        </div>
      </div>

      <div className="nlc-layout">
        <div className="nlc-input-col">
          <Section title="Vehicle & lease" description="Core numbers that drive the comparison." defaultOpen>
            <PillGroup
              label="Vehicle type"
              value={inputs.vehicleType}
              onChange={(v) => setInputs((p) => ({ ...p, vehicleType: v }))}
              options={[
                { value: "EV", label: "EV" },
                { value: "Non-EV", label: "Petrol / diesel / hybrid" },
              ]}
            />
            <CurrencyField
              label="Vehicle dutiable value (FBT base value)"
              value={inputs.vehicleBaseValue}
              onChange={(v) => setInputs((p) => ({ ...p, vehicleBaseValue: v }))}
            />
            <CurrencyField
              label="Driveaway cost"
              value={inputs.driveawayCost}
              onChange={(v) => setInputs((p) => ({ ...p, driveawayCost: v }))}
            />
            <CurrencyField
              label="Fortnightly lease payment"
              value={inputs.vehicleLeasePerFn}
              onChange={(v) => setInputs((p) => ({ ...p, vehicleLeasePerFn: v }))}
            />
            <CurrencyField
              label="Total taxable income"
              value={inputs.totalTaxableIncome}
              onChange={(v) => setInputs((p) => ({ ...p, totalTaxableIncome: v }))}
            />
          </Section>
        </div>

        <div className="nlc-output-col">
          <Section title="Financial summary" description="Novated lease vs buying the same car with cash." defaultOpen>
            <StatGrid>
              <Stat label="NL total spend @ 5y" value={fmtMoney(summary.nlTotalSpentAt5)} color={PALETTE.blue} />
              <Stat label="Cash total spend @ 5y" value={fmtMoney(summary.offsetTotalSpentAt5)} color="#37474f" />
            </StatGrid>
            <KV label="Lease payments over lease" value={fmtMoney(summary.leasePaymentsOverLease)} />
            <KV label="Residual payable (inc GST)" value={fmtMoney(summary.residualPayableIncGst)} />
            <KV label="Total spent at lease end" value={fmtMoney(summary.nlTotalSpentAtLeaseEnd)} bold />
          </Section>
        </div>
      </div>

      <Section title="Basic information" description="Key derived figures at a glance: financed amount, residual, effective rate, ECM, and EV charging." defaultOpen>
        <BasicInformationReport inputs={inputs} taxRateInclMedicarePct={47} />
      </Section>

      <Section
        title="Section 1: Lease payments"
        description="Pre-tax lease payments and their impact on take-home pay (fortnightly, annual, and total), with a year-by-year breakdown."
      >
        <LeaseReport inputs={inputs} />
      </Section>

      <Section
        title="Section 2: Financial summary"
        description="Total cost comparison across novated lease, cash, loan, and keep-current-car pathways, standardised to a 5-year horizon."
        defaultOpen
      >
        <FinancialSummaryReport inputs={inputs} />
      </Section>

      <Section
        title="Section 3: Effective interest rate"
        description="Back-calculates the implied interest rate hidden in your lease payment and residual, with an optional amortisation schedule."
      >
        <EffectiveInterestReport inputs={inputs} />
      </Section>

      <Section
        title="Section 4: Adjusted taxable income"
        description="Estimates how novated leasing changes your Adjusted Taxable Income — relevant for HECS repayments, childcare subsidy, and Medicare levy surcharge."
      >
        <ATI
          inputs={inputs}
          originalTaxableIncomePreNL={inputs.totalTaxableIncome}
          leaseStartDate={new Date(inputs.leaseStartDate)}
          leaseTermYears={inputs.leaseDurationYears}
          fbtBaseValue={inputs.vehicleBaseValue}
          rows={buildAtiRows(inputs)}
        />
      </Section>

      <Section
        title="Section 5: Super guarantee"
        description={
          inputs.superFromPreNlIncome === "Yes"
            ? "Not applicable — you indicated your employer pays Super Guarantee based on your pre-novated-lease income."
            : "Estimates the reduction in Super Guarantee contributions when employer calculates SG on post-NL income."
        }
        muted={inputs.superFromPreNlIncome === "Yes"}
      >
        {inputs.superFromPreNlIncome === "Yes" ? (
          <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.9 }}>No Super Guarantee loss is expected under this assumption.</div>
        ) : (
          <SG rows={buildSgRows(inputs)} />
        )}
      </Section>

      <Section title="Section 6: Rate sensitivity check" description="Stress-tests your quoted lease by comparing it with the same car financed at an assumed wholesale interest rate.">
        <WhatIf inputs={inputs} />
      </Section>

      <Section title="Section 7: Early termination risk" description="Illustrates the worst-case extra cost if a novated lease ends early (e.g. redundancy), compared with buying the car outright with cash.">
        <WorstCase inputs={inputs} />
      </Section>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<CalcMode>(() => {
    if (typeof window === "undefined") return "simple";
    const fromUrl = new URLSearchParams(window.location.search).get(URL_STATE_PARAM);
    if (fromUrl) return "advanced"; // arriving via a share link goes straight to Advanced
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    return stored === "advanced" ? "advanced" : "simple";
  });
  // Same codec as v1 (engine/urlState.ts) — share links generated by either version
  // load correctly in the other.
  const [inputs, setInputs] = useState<Inputs>(() => {
    if (typeof window === "undefined") return advancedDefaultInputs;
    return getInputsFromLocationSearch(window.location.search, advancedDefaultInputs);
  });

  function changeMode(next: CalcMode) {
    setMode(next);
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
  }

  return (
    <div className="nlc-root nlc-app">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Novated Lease Calculator — preview</h1>
        <ModeToggle mode={mode} onChange={changeMode} />
      </div>

      {mode === "simple" ? (
        <SimpleMode
          onGoAdvanced={(derivedInputs) => {
            setInputs(derivedInputs);
            changeMode("advanced");
          }}
        />
      ) : (
        <AdvancedMode inputs={inputs} setInputs={setInputs} />
      )}
    </div>
  );
}
