import { useCallback, useEffect, useRef, useState } from "react";
import type { Inputs } from "@engine/types";
import { financedAmountExGstFromInputs } from "@engine/effectiveinterest";
import { residualFractionForYears } from "@engine/ato";
import { computeDerived } from "@engine/derived";
import { URL_STATE_PARAM, getInputsFromLocationSearch } from "@engine/urlState";
import { advancedDefaultInputs, sentinelDefaultInputs } from "./state/defaultInputs";
import { estMarketValueFromDriveaway, evElectricityClaimAnnual, nonEvFuelAnnual } from "./assumptions";
import { ModeToggle, type CalcMode } from "./components/ui/ModeToggle";
import { Section } from "./components/ui/Section";
import { Tabs } from "./components/ui/Tabs";
import { Button } from "./components/ui/Button";
import { Footer } from "./components/ui/Footer";
import { GuidedMode } from "./guided/GuidedMode";
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
import { Tour } from "./components/Tour";
import { CoffeeNudgeModal } from "./components/CoffeeNudgeModal";
import { useCoffeeNudge } from "./hooks/useCoffeeNudge";
import { COFFEE_NUDGE_AFTER_MODE_SWITCH_MS } from "./state/engagement";
import { type SavedQuoteV1, safeLoadQuotes } from "./state/savedQuotes";
import { trackEvent, trackOncePerSession } from "./utils/analytics";
import { copyShareLink } from "./utils/shareLink";

const MODE_STORAGE_KEY = "nlc2-mode";
const TOUR_HIDDEN_KEY = "nlc2-tour-hidden";

type OutputTab = "summary" | "details" | "compare";

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

function AdvancedMode(props: {
  inputs: Inputs;
  setInputs: React.Dispatch<React.SetStateAction<Inputs>>;
  savedQuotes: SavedQuoteV1[];
  setSavedQuotes: React.Dispatch<React.SetStateAction<SavedQuoteV1[]>>;
  outputTab: OutputTab;
  setOutputTab: React.Dispatch<React.SetStateAction<OutputTab>>;
  navigateToDetails: (anchorId?: string) => void;
  sectionForceOpenNonce: (anchorId: string) => number | undefined;
  /** The reader changed something here themselves (typed, loaded a saved quote, or reset). */
  onUserEdit: () => void;
}) {
  const { inputs, setInputs, savedQuotes, setSavedQuotes, outputTab, setOutputTab, navigateToDetails, sectionForceOpenNonce, onUserEdit } = props;
  const setInputsByUser: React.Dispatch<React.SetStateAction<Inputs>> = (u) => {
    onUserEdit();
    setInputs(u);
  };
  const lastAutoResidualRef = useRef<number | null>(null);
  const lastAutoFinancedRef = useRef<number | null>(null);
  const lastAutoEstMarketValueRef = useRef<number | null>(null);
  const lastAutoElectricityRef = useRef<number | null>(null);
  const lastAutoFuelRef = useRef<number | null>(null);
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
  }, [inputs.leaseDurationYears, inputs.vehicleCondition, inputs.vehicleBaseValue, inputs.driveawayCost, inputs.leaseDocFee, inputs.residualValueExGst]);

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

  // Auto-fill electricityAnnual (the packaged EV claim) from annualMileageKm × the ATO home-
  // charging shortcut rate until the user overrides it — mirrors calculator/src/components/
  // InputsPanel.tsx's electricity auto-fill effect (lines ~44-89), using the same lastAuto/
  // withinCent override-detection pattern as the three effects above (rather than v1's
  // separate `touched` boolean state, for consistency with this file). Formula imported from
  // assumptions.ts (not duplicated here) so this can never drift from the Simple-mode default.
  //
  // While vehicleType isn't EV, this field is hidden/irrelevant — deliberately leave
  // lastAutoElectricityRef untouched (frozen) rather than resetting it to null. If it were
  // reset, switching away, changing mileage, then switching back to EV would compare the
  // (unchanged, still-in-sync) stored value against a freshly-recomputed auto for the new
  // mileage, see a mismatch, and wrongly conclude the user had manually overridden it —
  // permanently disabling the auto-fill for a field the user never actually touched.
  useEffect(() => {
    if (inputs.vehicleType !== "EV") return;
    const auto = evElectricityClaimAnnual(inputs.annualMileageKm);
    const cur = inputs.electricityAnnual;
    const lastAuto = lastAutoElectricityRef.current;
    const withinCent = (a: number, b: number) => Math.abs(a - b) < 0.01;

    const shouldSync = cur === 0 || (lastAuto !== null && withinCent(cur, lastAuto)) || (lastAuto === null && withinCent(cur, auto));

    if (shouldSync && !withinCent(cur, auto)) {
      setInputs((p) => ({ ...p, electricityAnnual: auto }));
    }
    lastAutoElectricityRef.current = auto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.vehicleType, inputs.annualMileageKm, inputs.electricityAnnual]);

  // Auto-fill fuelAnnual from annualMileageKm using the same estimate Simple mode uses until
  // the user overrides it — mirrors the electricity effect above, but for the Non-EV side.
  // Formula imported from assumptions.ts (not duplicated here) for the same reason. Also
  // leaves lastAutoFuelRef frozen (not reset to null) while inactive, for the same reason
  // documented on the electricity effect above.
  useEffect(() => {
    if (inputs.vehicleType === "EV") return;
    const auto = nonEvFuelAnnual(inputs.annualMileageKm);
    const cur = inputs.fuelAnnual;
    const lastAuto = lastAutoFuelRef.current;
    const withinCent = (a: number, b: number) => Math.abs(a - b) < 0.01;

    const shouldSync = cur === 0 || (lastAuto !== null && withinCent(cur, lastAuto)) || (lastAuto === null && withinCent(cur, auto));

    if (shouldSync && !withinCent(cur, auto)) {
      setInputs((p) => ({ ...p, fuelAnnual: auto }));
    }
    lastAutoFuelRef.current = auto;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs.vehicleType, inputs.annualMileageKm, inputs.fuelAnnual]);

  const [summaryHorizon, setSummaryHorizon] = useState<"five_year" | "lease_end">("five_year");
  const leaseYearsRounded = Math.max(1, Math.min(5, Math.round(inputs.leaseDurationYears)));
  const offerLeaseEndOption = leaseYearsRounded < 5;
  const effectiveHorizon = offerLeaseEndOption ? summaryHorizon : "five_year";

  const [vehicleLeasePeriodMode, setVehicleLeasePeriodMode] = useState<"perFn" | "perMonth">("perFn");

  async function onCopyShareLink() {
    trackEvent("copy_link_clicked");
    trackOncePerSession("copy_link_clicked", "copy_link_clicked");
    if (await copyShareLink(inputs)) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 16, gap: 8, flexWrap: "wrap" }}>
        <Button variant="secondary" size="sm" onClick={onCopyShareLink}>
          {copiedLink ? "Link copied!" : "Copy share link"}
        </Button>
        <QuotesPanel inputs={inputs} defaultInputs={sentinelDefaultInputs} onLoadQuote={(q) => {
            onUserEdit();
            setInputs(q);
          }} quotes={savedQuotes} onQuotesChange={setSavedQuotes} />
      </div>

      <div className="nlc-layout">
        <div className="nlc-input-col" data-tour-id="advanced-inputs">
          <InputsPanel
            inputs={inputs}
            setInputs={setInputsByUser}
            vehicleLeasePeriodMode={vehicleLeasePeriodMode}
            onVehicleLeasePeriodModeChange={setVehicleLeasePeriodMode}
            onResetDefaults={() => {
              onUserEdit();
              setInputs(advancedDefaultInputs);
              setOutputTab("summary");
              setCopiedLink(false);
              setSummaryHorizon("five_year");
            }}
            onNavigateToDetails={navigateToDetails}
          />
        </div>

        <div className={`nlc-output-col${outputTab === "summary" ? " nlc-output-col--sticky" : ""}`}>
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
            {outputTab === "summary" && (
              <div data-tour-id="advanced-summary">
                <SummaryView inputs={inputs} horizon={effectiveHorizon} onNavigateToDetails={navigateToDetails} />
              </div>
            )}

            {outputTab === "details" && (
              <>
                <Section title="Basic information" description="Key derived figures at a glance: financed amount, residual, effective rate, Employee Contribution Method (ECM), and EV charging." defaultOpen>
                  <BasicInformationReport inputs={inputs} onNavigateToDetails={navigateToDetails} />
                </Section>

                <Section
                  title="Section 1: Lease payments"
                  description="Pre-tax lease payments and their impact on take-home pay (fortnightly, annual, and total), with a year-by-year breakdown."
                  analyticsId="section_1_lease_payments"
                  anchorId="details-section-1-lease-payments"
                  forceOpenNonce={sectionForceOpenNonce("details-section-1-lease-payments")}
                >
                  <LeaseReport inputs={inputs} vehicleLeasePeriodMode={vehicleLeasePeriodMode} />
                </Section>

                <Section
                  title="Section 2: Financial summary"
                  description="Total cost comparison across novated lease, cash, loan, and keep-current-car pathways, standardised to a 5-year horizon."
                  defaultOpen
                  analyticsId="section_2_financial_summary"
                  anchorId="details-section-2-financial-summary"
                  forceOpenNonce={sectionForceOpenNonce("details-section-2-financial-summary")}
                >
                  <FinancialSummaryReport inputs={inputs} />
                </Section>

                <Section
                  title="Section 3: Effective interest rate"
                  description="Back-calculates the implied interest rate hidden in your lease payment and residual, with an optional amortisation schedule."
                  analyticsId="section_3_effective_interest_rate"
                  anchorId="details-section-3-effective-interest-rate"
                  forceOpenNonce={sectionForceOpenNonce("details-section-3-effective-interest-rate")}
                >
                  <EffectiveInterestReport inputs={inputs} />
                </Section>

                <Section
                  title="Section 4: Adjusted taxable income"
                  description="Estimates how novated leasing changes your Adjusted Taxable Income — relevant for HECS repayments, childcare subsidy, and Medicare levy surcharge."
                  analyticsId="section_4_ati"
                  anchorId="details-section-4-ati"
                  forceOpenNonce={sectionForceOpenNonce("details-section-4-ati")}
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
                  anchorId="details-section-5-sg"
                  forceOpenNonce={sectionForceOpenNonce("details-section-5-sg")}
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
                  anchorId="details-section-6-what-if"
                  forceOpenNonce={sectionForceOpenNonce("details-section-6-what-if")}
                >
                  <WhatIf inputs={inputs} vehicleLeasePeriodMode={vehicleLeasePeriodMode} />
                </Section>

                <Section
                  title="Section 7: Early termination risk"
                  description="Illustrates the worst-case extra cost if a novated lease ends early (e.g. redundancy), compared with buying the car outright with cash."
                  analyticsId="section_7_worst_case_scenario"
                  anchorId="details-section-7-worst-case"
                  forceOpenNonce={sectionForceOpenNonce("details-section-7-worst-case")}
                >
                  <WorstCase inputs={inputs} />
                </Section>
              </>
            )}

            {outputTab === "compare" && (
              <div data-tour-id="compare-view">
                <ComparatorView savedQuotes={savedQuotes} defaultInputs={sentinelDefaultInputs} onNavigateToDetails={navigateToDetails} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<CalcMode>(() => {
    if (typeof window === "undefined") return "guided";
    const fromUrl = new URLSearchParams(window.location.search).get(URL_STATE_PARAM);
    if (fromUrl) return "advanced"; // arriving via a share link goes straight to Advanced
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    return stored === "advanced" ? "advanced" : "guided";
  });
  // Same codec as v1 (engine/urlState.ts) — share links generated by either version
  // load correctly in the other.
  const [inputs, setInputs] = useState<Inputs>(() => {
    if (typeof window === "undefined") return advancedDefaultInputs;
    const fromUrl = new URLSearchParams(window.location.search).get(URL_STATE_PARAM);
    if (!fromUrl) return advancedDefaultInputs;
    // Merge over sentinelDefaultInputs (not advancedDefaultInputs) so a field OMITTED
    // from the share link — e.g. an older link that never encoded residualValueExGst —
    // reads as the "not yet computed" 0 sentinel and gets properly recomputed by
    // AdvancedMode's auto-fill effects below, rather than silently inheriting today's
    // unrelated default scenario's own value for that field.
    return getInputsFromLocationSearch(window.location.search, sentinelDefaultInputs);
  });
  const [savedQuotes, setSavedQuotes] = useState<SavedQuoteV1[]>(() => (typeof window === "undefined" ? [] : safeLoadQuotes()));
  // Guided → Advanced is a one-way copy. advancedEdited records that Advanced now holds figures
  // the reader would lose if Guided's answers were copied over them: their own edits, a loaded
  // quote, or a scenario that arrived by share link.
  const [advancedEdited, setAdvancedEdited] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return !!new URLSearchParams(window.location.search).get(URL_STATE_PARAM);
  });
  const guidedInputsRef = useRef<Inputs | null>(null);
  const [pendingDetailsNav, setPendingDetailsNav] = useState<{ anchorId?: string; nonce: number } | null>(null);

  // Advanced-mode output tab and cross-navigation-to-Details state — lifted from AdvancedMode
  // so the Quick tour (rendered here, above both modes) can drive them directly.
  const [outputTab, setOutputTab] = useState<OutputTab>("summary");

  // Cross-navigation from Summary/Compare/Basic-info to a specific Details section — replaces
  // v1's window-level "nlguide:navigate" CustomEvent with a plain callback + local state, since
  // everything lives in one component tree here. `nonce` forces a specific Section open even if
  // the user had collapsed it (Sections default to collapsed except Basic info & Section 2).
  const [navTarget, setNavTarget] = useState<{ anchorId: string; nonce: number } | null>(null);
  function navigateToDetails(anchorId?: string) {
    setOutputTab("details");
    setNavTarget((prev) => ({ anchorId: anchorId ?? "details-section-2-financial-summary", nonce: (prev?.nonce ?? 0) + 1 }));
  }
  useEffect(() => {
    if (!navTarget) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(navTarget.anchorId);
        if (!el) return;
        const top = el.getBoundingClientRect().top + window.scrollY - 12;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      });
    });
  }, [navTarget]);

  // Arriving from Guided mode's "Go to Details" links (see pendingDetailsNav below) —
  // jump straight to the requested Details section once Advanced mode has mounted.
  useEffect(() => {
    if (!pendingDetailsNav) return;
    navigateToDetails(pendingDetailsNav.anchorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDetailsNav?.nonce]);

  // Force-opens one or more collapsed Details Sections without the scroll-to-anchor behaviour
  // of navigateToDetails — used by the Quick tour, which does its own scrollIntoView/spotlight.
  const [tourForceOpen, setTourForceOpen] = useState<{ ids: string[]; nonce: number } | null>(null);
  function tourForceOpenSections(ids: string[]) {
    setTourForceOpen((prev) => ({ ids, nonce: (prev?.nonce ?? 0) + 1 }));
  }
  function sectionForceOpenNonce(anchorId: string): number | undefined {
    if (navTarget?.anchorId === anchorId) return navTarget.nonce;
    if (tourForceOpen?.ids.includes(anchorId)) return tourForceOpen.nonce;
    return undefined;
  }

  function changeMode(next: CalcMode) {
    if (next !== mode) setModeSettled(false);
    setMode(next);
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
    trackEvent("mode_switched", { mode: next });
  }

  /** Copies Guided's answers into Advanced (replacing what was there) and switches across. */
  function openGuidedInAdvanced(guidedInputs: Inputs, anchorId?: string) {
    setInputs(guidedInputs);
    setAdvancedEdited(false);
    changeMode("advanced");
    if (anchorId) setPendingDetailsNav((prev) => ({ anchorId, nonce: (prev?.nonce ?? 0) + 1 }));
  }

  /**
   * The header toggle. From Guided it carries a finished set of answers across, unless Advanced
   * holds figures of its own: then it just switches, and the "open in Advanced" button on the
   * results screen is where the reader can choose to replace them.
   */
  function switchMode(next: CalcMode) {
    if (next === "advanced" && guidedInputsRef.current && !advancedEdited) {
      openGuidedInAdvanced(guidedInputsRef.current);
      return;
    }
    changeMode(next);
  }

  // Quick tour — entry button + guided walkthrough. tourHidden persists forever once dismissed;
  // tourSnapshotRef remembers the mode/tab the user was in so exiting mid-tour (or finishing)
  // restores it exactly.
  const [tourOpen, setTourOpen] = useState(false);
  const [tourHidden, setTourHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(TOUR_HIDDEN_KEY) === "1";
  });
  const tourSnapshotRef = useRef<{ mode: CalcMode; outputTab: OutputTab } | null>(null);

  function startTour() {
    tourSnapshotRef.current = { mode, outputTab };
    trackEvent("tour_started");
    setTourOpen(true);
  }
  function hideTourForever() {
    setTourHidden(true);
    window.localStorage.setItem(TOUR_HIDDEN_KEY, "1");
    trackEvent("tour_hidden_forever");
  }
  // One-time "buy me a coffee" message after sustained use (>= 4 min visible + >= 4 distinct
  // fields edited; see src/state/engagement.ts). Held back while the tour owns the screen.
  // In Guided mode it also waits until the reader has spent a little time on their results this visit.
  const [guidedResultsSeen, setGuidedResultsSeen] = useState(false);
  const [guidedPath, setGuidedPath] = useState<"quote" | "exploring" | null>(null);
  const onGuidedResultsSeen = useCallback(() => setGuidedResultsSeen(true), []);

  // Hold the nudge for a little visible time after any switch between modes (changeMode starts
  // the hold; nothing on first load). A further switch restarts the count.
  const [modeSettled, setModeSettled] = useState(true);
  useEffect(() => {
    if (modeSettled) return;
    let visibleMs = 0;
    const TICK = 1000;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") visibleMs += TICK;
      if (visibleMs >= COFFEE_NUDGE_AFTER_MODE_SWITCH_MS) {
        window.clearInterval(timer);
        setModeSettled(true);
      }
    }, TICK);
    return () => window.clearInterval(timer);
  }, [modeSettled, mode]);

  const nudgeContext = { mode, guided_path: mode === "guided" ? (guidedPath ?? "") : "" } as const;
  const coffeeNudge = useCoffeeNudge({
    paused: tourOpen || !modeSettled || (mode === "guided" && !guidedResultsSeen),
    context: nudgeContext,
  });

  function exitTour(reason: "completed" | "skipped", stepIndex: number) {
    setTourOpen(false);
    const snapshot = tourSnapshotRef.current;
    if (snapshot) {
      if (snapshot.mode !== mode) changeMode(snapshot.mode);
      setOutputTab(snapshot.outputTab);
    }
    if (reason === "completed") trackEvent("tour_completed");
    else trackEvent("tour_skipped", { step: stepIndex + 1 });
  }

  return (
    <div className="nlc-root nlc-app">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          {!tourHidden && (
            <div className="nlc-tour-cta-wrap">
              <button type="button" className="nlc-tour-cta" onClick={startTour}>
                New here? Take the quick tour
              </button>
              <button type="button" className="nlc-tour-cta__hide" aria-label="Hide the quick tour button" title="Don't show this again" onClick={hideTourForever}>
                ×
              </button>
            </div>
          )}
        </div>
        <ModeToggle mode={mode} onChange={switchMode} />
      </div>

      {mode === "guided" ? (
        <GuidedMode
          onOpenAdvanced={openGuidedInAdvanced}
          onSwitchToAdvanced={() => changeMode("advanced")}
          advancedEdited={advancedEdited}
          onInputsChange={(i) => {
            guidedInputsRef.current = i;
          }}
          onResultsSeen={onGuidedResultsSeen}
          onPathChange={setGuidedPath}
          savedQuotes={savedQuotes}
          onQuotesChange={setSavedQuotes}
        />
      ) : (
        <AdvancedMode
          inputs={inputs}
          setInputs={setInputs}
          savedQuotes={savedQuotes}
          setSavedQuotes={setSavedQuotes}
          outputTab={outputTab}
          setOutputTab={setOutputTab}
          navigateToDetails={navigateToDetails}
          sectionForceOpenNonce={sectionForceOpenNonce}
          onUserEdit={() => setAdvancedEdited(true)}
        />
      )}
      <Footer showTourLink={tourHidden} onStartTour={startTour} />

      {coffeeNudge.open && !tourOpen && <CoffeeNudgeModal onClose={() => coffeeNudge.close()} context={nudgeContext} />}

      {tourOpen && (
        <Tour
          currentMode={mode}
          currentTab={outputTab}
          onChangeMode={changeMode}
          onChangeTab={setOutputTab}
          onForceOpenSections={tourForceOpenSections}
          onExit={exitTour}
        />
      )}
    </div>
  );
}
