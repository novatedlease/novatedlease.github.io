import { useEffect, useRef, useState } from "react";
import type { Inputs } from "@engine/types";
import { financedAmountExGstFromInputs } from "@engine/effectiveinterest";
import { residualFractionForYears } from "@engine/ato";
import { computeDerived } from "@engine/derived";
import { URL_STATE_PARAM, getInputsFromLocationSearch, setUrlParamForInputs } from "@engine/urlState";
import { advancedDefaultInputs } from "./state/defaultInputs";
import { ModeToggle, type CalcMode } from "./components/ui/ModeToggle";
import { Section } from "./components/ui/Section";
import { Tabs } from "./components/ui/Tabs";
import { Button } from "./components/ui/Button";
import { Footer } from "./components/ui/Footer";
import { SimpleMode } from "./SimpleMode";
import { SummaryView } from "./components/SummaryView";
import { LeaseReport } from "./components/reports/LeaseReport";
import { BasicInformationReport } from "./components/reports/BasicInformationReport";
import { EffectiveInterestReport } from "./components/reports/EffectiveInterestReport";
import { ATI } from "./components/reports/ATI";
import { SG } from "./components/reports/SG";
import { WhatIf } from "./components/reports/WhatIf";
import { WorstCase } from "./components/reports/WorstCase";
import { FinancialSummaryReport } from "./components/reports/FinancialSummaryReport";
import { QuotesPanel } from "./components/QuotesPanel";
import { ComparatorView } from "./components/ComparatorView";
import { InputsPanel } from "./components/InputsPanel";
import { type SavedQuoteV1, safeLoadQuotes } from "./state/savedQuotes";
import { trackEvent, trackOncePerSession } from "./utils/analytics";

const MODE_STORAGE_KEY = "nlc2-mode";

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

function AdvancedMode(props: {
  inputs: Inputs;
  setInputs: React.Dispatch<React.SetStateAction<Inputs>>;
  savedQuotes: SavedQuoteV1[];
  setSavedQuotes: React.Dispatch<React.SetStateAction<SavedQuoteV1[]>>;
}) {
  const { inputs, setInputs, savedQuotes, setSavedQuotes } = props;
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

  const [outputTab, setOutputTab] = useState<"summary" | "details" | "compare">("summary");
  const [summaryHorizon, setSummaryHorizon] = useState<"five_year" | "lease_end">("five_year");
  const leaseYearsRounded = Math.max(1, Math.min(5, Math.round(inputs.leaseDurationYears)));
  const offerLeaseEndOption = leaseYearsRounded < 5;
  const effectiveHorizon = offerLeaseEndOption ? summaryHorizon : "five_year";

  async function copyShareLink() {
    trackEvent("copy_link_clicked");
    trackOncePerSession("copy_link_clicked", "copy_link_clicked");
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
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
        <Button variant="secondary" size="sm" onClick={copyShareLink}>
          {copiedLink ? "Link copied!" : "Copy share link"}
        </Button>
        <QuotesPanel inputs={inputs} defaultInputs={advancedDefaultInputs} onLoadQuote={setInputs} quotes={savedQuotes} onQuotesChange={setSavedQuotes} />
      </div>

      <div className="nlc-layout">
        <div className="nlc-input-col">
          <InputsPanel inputs={inputs} setInputs={setInputs} />
        </div>

        <div className="nlc-output-col">
          <Tabs
            tabs={[
              { id: "summary", title: "Summary", desc: "The bottom line, explained" },
              { id: "details", title: "Details", desc: "Section-by-section breakdown" },
              { id: "compare", title: "Compare", desc: "Side-by-side across saved quotes" },
            ]}
            active={outputTab}
            onChange={(tab) => {
              setOutputTab(tab);
              if (tab === "details") trackOncePerSession("details_tab_opened", "details_tab_opened");
              if (tab === "compare") trackOncePerSession("compare_tab_opened", "compare_tab_opened");
            }}
          />

          {outputTab === "summary" && offerLeaseEndOption && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
              <span style={{ fontSize: 12, color: "var(--nlc-text-muted)", fontWeight: 600 }}>Horizon</span>
              <div className="nlc-pill-group">
                <button type="button" className="nlc-pill-group__btn" aria-pressed={effectiveHorizon === "five_year"} onClick={() => setSummaryHorizon("five_year")}>
                  @ 5y
                </button>
                <button type="button" className="nlc-pill-group__btn" aria-pressed={effectiveHorizon === "lease_end"} onClick={() => setSummaryHorizon("lease_end")}>
                  @ {leaseYearsRounded}y
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            {outputTab === "summary" && <SummaryView inputs={inputs} horizon={effectiveHorizon} />}

            {outputTab === "details" && (
              <>
                <Section title="Basic information" description="Key derived figures at a glance: financed amount, residual, effective rate, ECM, and EV charging." defaultOpen>
                  <BasicInformationReport inputs={inputs} taxRateInclMedicarePct={47} />
                </Section>

                <Section
                  title="Section 1: Lease payments"
                  description="Pre-tax lease payments and their impact on take-home pay (fortnightly, annual, and total), with a year-by-year breakdown."
                  analyticsId="section_1_lease_payments"
                >
                  <LeaseReport inputs={inputs} />
                </Section>

                <Section
                  title="Section 2: Financial summary"
                  description="Total cost comparison across novated lease, cash, loan, and keep-current-car pathways, standardised to a 5-year horizon."
                  defaultOpen
                  analyticsId="section_2_financial_summary"
                >
                  <FinancialSummaryReport inputs={inputs} />
                </Section>

                <Section
                  title="Section 3: Effective interest rate"
                  description="Back-calculates the implied interest rate hidden in your lease payment and residual, with an optional amortisation schedule."
                  analyticsId="section_3_effective_interest_rate"
                >
                  <EffectiveInterestReport inputs={inputs} />
                </Section>

                <Section
                  title="Section 4: Adjusted taxable income"
                  description="Estimates how novated leasing changes your Adjusted Taxable Income — relevant for HECS repayments, childcare subsidy, and Medicare levy surcharge."
                  analyticsId="section_4_ati"
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
                  analyticsId="section_5_sg"
                >
                  {inputs.superFromPreNlIncome === "Yes" ? (
                    <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.9 }}>No Super Guarantee loss is expected under this assumption.</div>
                  ) : (
                    <SG rows={buildSgRows(inputs)} />
                  )}
                </Section>

                <Section
                  title="Section 6: Rate sensitivity check"
                  description="Stress-tests your quoted lease by comparing it with the same car financed at an assumed wholesale interest rate."
                  analyticsId="section_6_what_if"
                >
                  <WhatIf inputs={inputs} />
                </Section>

                <Section
                  title="Section 7: Early termination risk"
                  description="Illustrates the worst-case extra cost if a novated lease ends early (e.g. redundancy), compared with buying the car outright with cash."
                  analyticsId="section_7_worst_case_scenario"
                >
                  <WorstCase inputs={inputs} />
                </Section>
              </>
            )}

            {outputTab === "compare" && <ComparatorView savedQuotes={savedQuotes} defaultInputs={advancedDefaultInputs} />}
          </div>
        </div>
      </div>
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
  const [savedQuotes, setSavedQuotes] = useState<SavedQuoteV1[]>(() => (typeof window === "undefined" ? [] : safeLoadQuotes()));

  function changeMode(next: CalcMode) {
    setMode(next);
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
    trackEvent("mode_switched", { mode: next });
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
            trackEvent("simple_mode_go_advanced_clicked");
            setInputs(derivedInputs);
            changeMode("advanced");
          }}
        />
      ) : (
        <AdvancedMode inputs={inputs} setInputs={setInputs} savedQuotes={savedQuotes} setSavedQuotes={setSavedQuotes} />
      )}
      <Footer />
    </div>
  );
}
