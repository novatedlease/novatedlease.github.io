import {
  useContext,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Inputs } from "@engine/types";
import { Button } from "../components/ui/Button";
import { KV, NoteBox } from "../components/ui/shared";
import { Section } from "../components/ui/Section";
import { InfoTooltip } from "../components/ui/InfoTooltip";
import { LeaseAdjustModal } from "../components/LeaseAdjustModal";
import { SelectField } from "../components/ui/Field";
import {
  POPULAR,
  PROVIDERS,
  guideFor,
  guideMayHaveChanged,
  isNamedProvider,
  isSmartOrMillarx,
  pointersFor,
  providerLabel,
  seenLabel,
  type GuideField,
  type ProviderId,
} from "./providerGuide";
import { SummaryView } from "../components/SummaryView";
import { NextSteps } from "../components/NextSteps";
import { trackEvent, trackOncePerSession } from "../utils/analytics";
import { copyShareLink } from "../utils/shareLink";
import { summaryFigures } from "../components/summaryFigures";
import { ASSUMED_EFFECTIVE_RATE } from "../assumptions";
import { COFFEE_NUDGE_GUIDED_RESULTS_DWELL_MS, noteInputChange } from "../state/engagement";
import { newQuoteId, safeSaveQuotes, type SavedQuoteV1 } from "../state/savedQuotes";
import {
  CAR_LIMIT_FY2027,
  GST_RATE,
  STEP_IDS,
  STEP_TITLES,
  annualOf,
  asksMarketValueEnd,
  atoMinimumResidualExGst,
  guessedResidualBasis,
  residualBasisUsed,
  buildInputs,
  currentCarFuelAnnual,
  currentCarValueEnd,
  effectiveStartDate,
  emptyDraft,
  emptyMoney,
  estimateAssumptions,
  fbtCategoryOf,
  fbtLabel,
  financedExGst,
  isLuxuryRange,
  marketValueEndEntered,
  missingForStep,
  missingItems,
  moneyValue,
  nearEvThreshold,
  needsExploreStart,
  needsUsedEvChecks,
  parseAmount,
  paymentPerFn,
  residualExGstEntered,
  runningFactor,
  smartMillarxAsked,
  PERIOD_UNIT,
  paymentToEngineFn,
  typicalCurrentCar,
  typicalFigures,
  typicalMarketValueAtLeaseEnd,
  visibleSteps,
  type GuidedDraft,
  type Money,
  type RunningPeriod,
  type StepId,
  type YesNoUnsure,
} from "./draft";
import {
  checkAnnualCost,
  checkChargingRate,
  checkCurrentCarValueEnd,
  checkCurrentCarValueNow,
  checkDocFee,
  checkEvThresholdEstimate,
  checkIncome,
  checkMarketValueEnd,
  checkMileage,
  checkPaymentCorrected,
  checkPrices,
  checkRate,
  checkResidual,
  diagnosePayment,
  type Finding,
} from "./checks";
import { Choices, FindingList, Help, MoneyInput, Tip } from "./parts";
import { MissingFields } from "./missing";
import { QuoteDiagram, type QuoteKey } from "./QuoteDiagram";
import { DriveawayHelper } from "./DriveawayHelper";

const HOW_TO_USE = "/start-here/use-nl-calculator/#your-financial-details";
const FAQ_TERMS = "/calculator/#faq-fractional-terms";
const GST_ARTICLE = "/running-costs/failure-to-pass-gst-saving/";
const NSW_ARTICLE = "/special-and-policy/nsw-health-employer-share/";
import "./guided.css";

/** Kept in localStorage so a reader can come back to a half-entered quote later; "Start over" clears it. */
const STORAGE_KEY = "nlc2-guided-draft-v3";
/** Passed as the anchor to open Advanced mode on the Details tab, at its top. */
export const ADVANCED_DETAILS_TOP = "details-top";
/** Anchor for "Assumptions we made for you", opened from the note at the top of an estimate. */
const ASSUMPTIONS_ID = "gd-assumptions";
const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

type Stored = { draft: GuidedDraft; step: StepId; visited: StepId[] };

function loadStored(): Stored | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (!parsed?.draft || !parsed.step || !STEP_IDS.includes(parsed.step))
      return null;
    const visited = (parsed.visited ?? [parsed.step]).filter((v) =>
      STEP_IDS.includes(v),
    );
    return {
      draft: { ...emptyDraft(), ...parsed.draft },
      step: parsed.step,
      visited,
    };
  } catch {
    return null;
  }
}

function paymentDiagnosisFor(d: GuidedDraft) {
  const financed = financedExGst(d);
  const residual = residualExGstEntered(d);
  const typed = moneyValue(d.payment);
  if (
    !financed ||
    !residual ||
    !d.leaseYears ||
    d.monthsDeferred === null ||
    !typed
  )
    return null;
  return diagnosePayment(
    {
      financedExGst: financed,
      residualExGst: residual,
      leaseYears: d.leaseYears,
      deferMonths: d.monthsDeferred,
    },
    typed,
    d.paymentPeriod,
    d.paymentBasis,
  );
}

/** Findings by field, so each can sit directly under its input. */
function findingsFor(d: GuidedDraft) {
  const typical = typicalFigures(d);
  const base = moneyValue(d.baseValue);
  const drive = moneyValue(d.driveaway);
  const income = moneyValue(d.income);
  return {
    prices: checkPrices(base, drive),
    docFee: checkDocFee(moneyValue(d.docFee)),
    residual: checkResidual({
      entered: moneyValue(d.residual),
      basis: residualBasisUsed(d),
      expectedExGst: atoMinimumResidualExGst(d),
    }),
    marketValue: asksMarketValueEnd(d)
      ? checkMarketValueEnd({
          value: d.marketValueEnd.estimated
            ? null
            : moneyValue(d.marketValueEnd),
          driveaway: drive,
          years: d.leaseYears,
        })
      : [],
    evThreshold: checkEvThresholdEstimate(nearEvThreshold(d)),
    payment: paymentDiagnosisFor(d)?.findings ?? [],
    paymentCorrected: checkPaymentCorrected({
      smartMillarx: d.smartMillarx,
      corrected: d.paymentCorrected,
      typed: moneyValue(d.payment),
      period: d.paymentPeriod,
    }),
    curValueEnd: d.compareCurrent
      ? checkCurrentCarValueEnd({
          now: moneyValue(d.curValueNow),
          end: currentCarValueEnd(d),
          years: d.leaseYears,
        })
      : [],
    curValueNow: d.compareCurrent ? checkCurrentCarValueNow(moneyValue(d.curValueNow), drive) : [],
    ...currentCarCostFindings(d),
    mileage: checkMileage(moneyValue(d.mileage)),
    service: checkAnnualCost(
      "service",
      d.service.estimated ? null : annualOf(d, d.service),
      typical?.service ?? null,
    ),
    rego: checkAnnualCost(
      "rego",
      d.rego.estimated ? null : annualOf(d, d.rego),
      typical?.rego ?? null,
    ),
    insurance: checkAnnualCost(
      "insurance",
      d.insurance.estimated ? null : annualOf(d, d.insurance),
      typical?.insurance ?? null,
    ),
    mgmt: checkAnnualCost(
      "mgmt",
      d.mgmt.estimated ? null : annualOf(d, d.mgmt),
      typical?.mgmt ?? null,
    ),
    fuel: checkAnnualCost(
      "fuel",
      d.fuel.estimated ? null : annualOf(d, d.fuel),
      typical?.fuel ?? null,
    ),
    charging: checkChargingRate(moneyValue(d.chargingRate)),
    income: checkIncome(income),
    offset: checkRate("offset", moneyValue(d.offsetRate), 12),
    savings: checkRate("savings", moneyValue(d.savingsRatePreTax), 12),
    invested: checkRate("invested", moneyValue(d.investedRate), 10),
    loan: checkRate("loan", moneyValue(d.loanRate), 20),
  };
}

/** The current car's yearly costs, checked like the lease's own. Fuel isn't flagged low: an EV charged at home or on solar costs little. */
function currentCarCostFindings(d: GuidedDraft) {
  const t = typicalCurrentCar(d);
  const check = (code: string, m: Money, typical: number | null, skipLow = false) =>
    d.compareCurrent && !m.estimated
      ? checkAnnualCost(code, moneyValue(m), typical, { yearlyBox: true, skipLow })
      : [];
  return {
    curService: check("cur_service", d.curService, t.service),
    curRego: check("cur_rego", d.curRego, t.rego),
    curFuel: check("cur_fuel", d.curFuel, t.fuel, true),
    curInsurance: check("cur_insurance", d.curInsurance, t.insurance),
  };
}

type FindingMap = ReturnType<typeof findingsFor>;

const STEP_FIELDS: Partial<Record<StepId, (keyof FindingMap)[]>> = {
  quick: ["evThreshold", "mileage"],
  price: ["prices"],
  lease: ["docFee", "residual"],
  payment: ["payment", "paymentCorrected"],
  running: [
    "mileage",
    "service",
    "rego",
    "insurance",
    "mgmt",
    "fuel",
    "charging",
  ],
  you: ["income", "offset", "savings", "invested"],
  alternatives: ["loan", "marketValue", "curValueNow", "curValueEnd", "curService", "curRego", "curFuel", "curInsurance"],
};

/** Findings that only make sense on the screens the reader actually sees. */
function visibleFindings(d: GuidedDraft, f: FindingMap): Finding[] {
  return visibleSteps(d).flatMap((s) => stepFindings(s, f));
}

function stepFindings(step: StepId, f: FindingMap): Finding[] {
  return (STEP_FIELDS[step] ?? []).flatMap((k) => f[k]);
}

export type GuidedModeProps = {
  /** Copy these answers into Advanced mode, replacing what is there, and switch across. */
  onOpenAdvanced: (inputs: Inputs, anchorId?: string) => void;
  /** Switch to Advanced mode without copying anything. */
  onSwitchToAdvanced?: () => void;
  /** Advanced mode holds figures of its own that copying would replace. */
  advancedEdited?: boolean;
  /** Reports the finished inputs (or null) so the header toggle can carry them across. */
  onInputsChange?: (inputs: Inputs | null) => void;
  /**
   * The reader has spent COFFEE_NUDGE_GUIDED_RESULTS_DWELL_MS of visible time on a complete result
   * (the coffee nudge waits for this in Guided mode). Called once.
   */
  onResultsSeen?: (path: "quote" | "exploring") => void;
  /** Which path the reader is on, as soon as they choose it. */
  onPathChange?: (path: "quote" | "exploring" | null) => void;
  savedQuotes?: SavedQuoteV1[];
  onQuotesChange?: (quotes: SavedQuoteV1[]) => void;
};

export function GuidedMode({
  onOpenAdvanced,
  onSwitchToAdvanced,
  advancedEdited = false,
  onInputsChange,
  onResultsSeen,
  onPathChange,
  savedQuotes,
  onQuotesChange,
}: GuidedModeProps) {
  const stored = useMemo(() => loadStored(), []);
  const [draft, setDraft] = useState<GuidedDraft>(
    () => stored?.draft ?? emptyDraft(),
  );
  const [step, setStep] = useState<StepId>(() => stored?.step ?? "intro");
  const [visited, setVisited] = useState<StepId[]>(
    () => stored?.visited ?? ["intro"],
  );
  const [resumed, setResumed] = useState(
    () => !!stored && stored.step !== "intro",
  );
  const [tried, setTried] = useState(false);
  /** Per step, the exact set of errors the reader ticked past. A different error needs a fresh tick. */
  const [acked, setAcked] = useState<Partial<Record<StepId, string>>>({});
  const topRef = useRef<HTMLDivElement>(null);

  // Every answer goes through here, so it also counts towards the coffee nudge's "distinct fields edited".
  const set = <K extends keyof GuidedDraft>(key: K, value: GuidedDraft[K]) => {
    noteInputChange(`guided.${String(key)}`);
    setDraft((p) => ({ ...p, [key]: value }));
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ draft, step, visited } satisfies Stored),
      );
    } catch {
      // storage unavailable: the wizard still works, it just won't survive a refresh
    }
  }, [draft, step, visited]);

  const findings = useMemo(() => findingsFor(draft), [draft]);
  const steps = visibleSteps(draft);
  const stepIndex = Math.max(0, steps.indexOf(step));
  const missingList = missingItems(step, draft);
  const missing = missingList.map((m) => m.label);
  /** Questions to mark on screen: only once the reader has pressed Next with some left. */
  const missingFields = new Set<string>(tried ? missingList.map((m) => m.field) : []);
  const current = stepFindings(step, findings);
  const errors = current.filter((f) => f.level === "error");
  const errorSig = errors.map((e) => e.message).join("|");
  const blocked = errors.length > 0 && acked[step] !== errorSig;

  useEffect(() => {
    for (const f of current) {
      if (f.level === "error" || f.level === "warn")
        trackOncePerSession(`guided_${f.code}`, "guided_finding_shown", {
          code: f.code,
          level: f.level,
        });
    }
  }, [current]);

  function go(next: StepId) {
    setStep(next);
    setTried(false);
    setResumed(false);
    setVisited((p) => (p.includes(next) ? p : [...p, next]));
    trackEvent("guided_step", { step: next });
    requestAnimationFrame(() =>
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  /** Scrolls to a question on this screen and puts the cursor in it. */
  function jumpTo(field: string) {
    const el = topRef.current?.querySelector<HTMLElement>(`[data-field="${field}"]`);
    if (!el) return;
    el.scrollIntoView?.({ behavior: "smooth", block: "center" });
    el.querySelector<HTMLElement>("input:not([disabled]), button")?.focus({ preventScroll: true });
  }

  function next() {
    if (missing.length > 0 || blocked) {
      setTried(true);
      // Take the reader to the first unanswered question, not just a list at the bottom.
      if (missingList.length > 0) {
        const first = missingList[0].field;
        requestAnimationFrame(() => jumpTo(first));
      }
      return;
    }
    go(steps[Math.min(steps.length - 1, stepIndex + 1)]);
  }
  function back() {
    go(steps[Math.max(0, stepIndex - 1)]);
  }

  const inputs = useMemo(() => buildInputs(draft), [draft]);

  useEffect(() => {
    onInputsChange?.(inputs);
  }, [inputs, onInputsChange]);

  const onResults = step === "review" && !!inputs;
  const path = draft.hasQuote === null ? null : draft.hasQuote ? "quote" : "exploring";

  useEffect(() => {
    if (onResults) trackOncePerSession("guided_completed", "guided_completed");
  }, [onResults]);

  useEffect(() => {
    onPathChange?.(path);
  }, [path, onPathChange]);

  // Visible time on the results page, kept across visits to other steps.
  const resultsMsRef = useRef(0);
  const resultsSeenRef = useRef(false);
  useEffect(() => {
    if (!onResults || resultsSeenRef.current || !onResultsSeen || !path) return;
    const TICK = 1000;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") resultsMsRef.current += TICK;
      if (resultsMsRef.current >= COFFEE_NUDGE_GUIDED_RESULTS_DWELL_MS) {
        resultsSeenRef.current = true;
        window.clearInterval(timer);
        onResultsSeen(path);
      }
    }, TICK);
    return () => window.clearInterval(timer);
  }, [onResults, onResultsSeen, path]);

  function startOver() {
    setDraft(emptyDraft());
    setAcked({});
    setVisited(["intro"]);
    go("intro");
  }

  const isLast = step === "review";

  return (
    <div className="gd" ref={topRef}>
      {resumed && (
        <div className="gd-banner" role="status">
          <span>
            Welcome back. We kept your answers from last time on this device.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              trackEvent("guided_start_fresh");
              startOver();
            }}
          >
            Start fresh
          </Button>
        </div>
      )}
      {advancedEdited && onSwitchToAdvanced && (
        <div className="gd-banner" role="status">
          <span>
            Advanced mode has its own figures (from your edits there, a saved
            quote or a shared link). They aren't shown here, and your guided
            answers won't replace them unless you choose to.
          </span>
          <Button variant="ghost" size="sm" onClick={onSwitchToAdvanced}>
            Back to Advanced mode
          </Button>
        </div>
      )}
      <ol
        className="gd-steps"
        aria-label="Progress"
        data-tour-id="guided-steps"
      >
        {steps.map((id, i) => (
          <li key={id} className="gd-steps__item">
            <button
              type="button"
              className="gd-steps__btn"
              aria-current={id === step ? "step" : undefined}
              data-done={i < stepIndex ? "true" : undefined}
              disabled={id !== step && !visited.includes(id)}
              onClick={() => go(id)}
            >
              <span className="gd-steps__dot">
                {i < stepIndex ? "✓" : i + 1}
              </span>
              <span className="gd-steps__text">{STEP_TITLES[id]}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="gd-steps__count">
        Step {stepIndex + 1} of {steps.length}
      </div>

      <div className="gd-card" data-tour-id="guided-card">
        <h2 className="gd-title">{STEP_TITLES[step]}</h2>

        <MissingFields.Provider value={missingFields}>
        {step === "intro" && (
          <Intro
            d={draft}
            onChoose={(hasQuote) => {
              set("hasQuote", hasQuote);
              trackEvent("guided_path", { has_quote: hasQuote });
            }}
            onSwitchToAdvanced={onSwitchToAdvanced}
          />
        )}
        {step === "compare" && <CompareStep d={draft} set={set} />}
        {step === "car" && <CarStep d={draft} set={set} />}
        {step === "quick" && <QuickStep d={draft} set={set} f={findings} />}
        {step === "price" && <PriceStep d={draft} set={set} f={findings} />}
        {step === "lease" && <LeaseStep d={draft} set={set} f={findings} />}
        {step === "payment" && <PaymentStep d={draft} set={set} f={findings} />}
        {step === "running" && <RunningStep d={draft} set={set} f={findings} />}
        {step === "you" && <YouStep d={draft} set={set} f={findings} />}
        {step === "alternatives" && (
          <AlternativesStep d={draft} set={set} f={findings} />
        )}
        {step === "review" && (
          <ReviewStep
            d={draft}
            inputs={inputs}
            f={findings}
            onEdit={go}
            onOpenAdvanced={onOpenAdvanced}
            onSwitchToAdvanced={onSwitchToAdvanced}
            advancedEdited={advancedEdited}
            savedQuotes={savedQuotes}
            onQuotesChange={onQuotesChange}
            set={set}
            onHaveQuote={() => {
              set("hasQuote", true);
              go("car");
            }}
          />
        )}
        </MissingFields.Provider>

        {errors.length > 0 && (
          <label className="gd-ack">
            <input
              type="checkbox"
              checked={acked[step] === errorSig}
              onChange={(e) =>
                setAcked((p) => ({
                  ...p,
                  [step]: e.target.checked ? errorSig : undefined,
                }))
              }
            />
            <span>
              {draft.hasQuote === false
                ? "I've double-checked these figures and want to continue anyway."
                : "I've double-checked these figures against my quote and want to continue anyway."}
            </span>
          </label>
        )}

        {tried && missing.length > 0 && (
          <div className="gd-missing" role="alert">
            <strong>Still to answer:</strong>
            <ul className="gd-missing__list">
              {missingList.map((m) => (
                <li key={m.field}>
                  <button type="button" className="gd-linkbtn" onClick={() => jumpTo(m.field)}>
                    {m.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {tried && missing.length === 0 && blocked && (
          <div className="gd-missing" role="alert">
            Please fix the highlighted figure, or tick the box to continue
            anyway.
          </div>
        )}
        {/* Stays in place once everything is answered, so the Next button doesn't jump under the pointer. */}
        {tried && missing.length === 0 && !blocked && (
          <div className="gd-missing gd-missing--done" role="status">
            ✓ All answered. Press {steps[stepIndex + 1] === "review" ? "See my results" : "Next"} to continue.
          </div>
        )}

        {!isLast && (
          <div className="gd-nav">
            {stepIndex > 0 ? (
              <Button variant="ghost" onClick={back}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button variant="primary" onClick={next}>
              {steps[stepIndex + 1] === "review"
                  ? "See my results"
                  : "Next"}
            </Button>
          </div>
        )}
        {isLast && (
          <div className="gd-nav">
            <Button variant="ghost" onClick={back}>
              Back
            </Button>
            <span />
          </div>
        )}
        {step !== "intro" && <StartOverLink onConfirm={startOver} />}
      </div>
    </div>
  );
}

function StartOverLink({ onConfirm }: { onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <div className="gd-startover">
        <button
          type="button"
          className="gd-linkbtn"
          onClick={() => setAsking(true)}
        >
          Start over
        </button>
      </div>
    );
  return (
    <div className="gd-startover" role="group" aria-label="Confirm start over">
      <span>Clear all your answers?</span>
      <Button
        variant="primary"
        onClick={() => {
          trackEvent("guided_start_over");
          setAsking(false);
          onConfirm();
        }}
      >
        Yes, clear them
      </Button>
      <Button variant="ghost" onClick={() => setAsking(false)}>
        Cancel
      </Button>
    </div>
  );
}

// ─── Steps ──────────────────────────────────────────────────────────────────

type StepProps = {
  d: GuidedDraft;
  set: <K extends keyof GuidedDraft>(k: K, v: GuidedDraft[K]) => void;
};
type StepPropsF = StepProps & { f: FindingMap };

function Lead({ children }: { children: ReactNode }) {
  return <p className="gd-lead">{children}</p>;
}

/** The reader's own answers, so the example quote reads like theirs once they have entered a figure. */
function quoteValues(d: GuidedDraft): Partial<Record<QuoteKey, string>> {
  const out: Partial<Record<QuoteKey, string>> = {};
  const base = moneyValue(d.baseValue);
  const drive = moneyValue(d.driveaway);
  const doc =
    d.docFee.none || d.docFee.text.trim() ? moneyValue(d.docFee) : null;
  const residual = moneyValue(d.residual);
  const payment = moneyValue(d.payment);
  if (base) out.baseValue = money(base);
  if (drive) out.driveaway = money(drive);
  if (d.leaseYears) out.term = `${d.leaseYears * 12} months`;
  if (d.monthsDeferred !== null && !d.monthsDeferredUnsure)
    out.defer =
      d.monthsDeferred === 0
        ? "from the start"
        : `after ${d.monthsDeferred} month${d.monthsDeferred > 1 ? "s" : ""}`;
  if (doc !== null) out.docFee = money(doc);
  const residualBasis = residualBasisUsed(d);
  if (residual && residualBasis)
    out.residual = `${money(residual)} ${residualBasis === "incGst" ? "inc" : "ex"} GST`;
  else if (d.residualBasis === "unknown") {
    const ato = atoMinimumResidualExGst(d);
    if (ato) out.residual = `${money(ato)} ex GST`;
  }
  if (payment && d.paymentPeriod)
    out.payment = `${money(payment)} per ${PERIOD_UNIT[d.paymentPeriod]}${d.paymentBasis === "incGst" ? " inc GST" : d.paymentBasis === "exGst" ? " ex GST" : ""}`;
  const luxAdj = d.luxAdj.none || d.luxAdj.text.trim() ? moneyValue(d.luxAdj) : null;
  if (isLuxuryRange(d) && luxAdj !== null && d.paymentPeriod)
    // Small amounts, so cents matter here.
    out.luxAdj = `$${luxAdj.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per ${PERIOD_UNIT[d.paymentPeriod]}`;
  // The reader's own running costs (not our typical estimates), in the period they chose.
  const runningKeys = RUNNING_FIELDS.filter((k) => k !== "fuel" || d.vehicleType !== "EV");
  const entered = runningKeys.filter((k) => !d[k].estimated && (d[k].none || d[k].text.trim()));
  if (d.runningPeriod && entered.length) {
    const total = entered.reduce((sum, k) => sum + (moneyValue(d[k]) ?? 0), 0);
    out.running = `${money(total)} ${PERIOD_WORD[d.runningPeriod]}`;
  }
  return out;
}

function Side({
  highlight,
  d,
  children,
}: {
  highlight: QuoteKey[];
  d: GuidedDraft;
  children: ReactNode;
}) {
  // Phones: the example quote is reference material, so it starts collapsed above the
  // questions instead of taking half the screen. Desktop keeps it open beside them.
  const narrow = useNarrowScreen();
  const diagram = <QuoteDiagram highlight={highlight} values={quoteValues(d)} />;
  return (
    <div className="gd-split">
      <div className="gd-split__main">{children}</div>
      <aside className="gd-split__side">
        {narrow ? (
          <details className="gd-help gd-quote-toggle">
            <summary>Where is this on my quote?</summary>
            <div className="gd-help__body">{diagram}</div>
          </details>
        ) : (
          diagram
        )}
      </aside>
    </div>
  );
}

/** True on single-column layouts (matches the .gd-split breakpoint in guided.css). */
function useNarrowScreen(): boolean {
  const query = "(max-width: 820px)";
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return narrow;
}

/** Today plus n calendar months, as yyyy-mm-dd in local time. */
function monthsFromNow(n: number): string {
  const t = new Date();
  const day = t.getDate();
  t.setDate(1);
  t.setMonth(t.getMonth() + n);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(day, last));
  return t.toLocaleDateString("en-CA");
}

function Intro({
  d,
  onChoose,
  onSwitchToAdvanced,
}: {
  d: GuidedDraft;
  onChoose: (hasQuote: boolean) => void;
  onSwitchToAdvanced?: () => void;
}) {
  return (
    <>
      <Choices
        field="hasQuote"
        label="Do you have a novated lease quote?"
        value={d.hasQuote}
        onChange={onChoose}
        options={[
          {
            value: true,
            label: "Yes, I have a quote",
            sub: "Most accurate, 5–10 minutes",
          },
          {
            value: false,
            label: "No, I'm just exploring",
            sub: "Typical figures, about 2 minutes",
          },
        ]}
        columns={2}
        hint="You can add your quote later without losing your answers."
      />
      {d.hasQuote === true && (
        <div className="gd-checklist">
          <strong>Have your quote open.</strong> Most answers come straight
          from it.
        </div>
      )}
      {onSwitchToAdvanced && (
        <div className="gd-skip">
          Used this calculator before?{" "}
          <button
            type="button"
            className="gd-linkbtn"
            onClick={() => {
              trackEvent("guided_skip_to_advanced");
              onSwitchToAdvanced();
            }}
          >
            Go to Advanced mode
          </button>
          .
        </div>
      )}
    </>
  );
}

function QuickStep({ d, set, f }: StepPropsF) {
  return (
    <>
      <Lead>Three rough figures are enough for an estimate.</Lead>
      <NoteBox mb={18}>
        We fill in the rest with typical figures and list them on the results
        page.
      </NoteBox>
      <MoneyInput
        field="driveaway"
        label="Approximate drive-away price"
        value={d.driveaway}
        onChange={(m) => set("driveaway", m)}
        where="The car plus CTP, stamp duty and rego."
        tooltip={<Tip>No quote yet? Use the drive-away price on the dealer or manufacturer's website.</Tip>}
        findings={f.evThreshold}
      />
      <Choices
        field="leaseYears"
        label="Lease term"
        value={d.leaseYears}
        onChange={(v) => set("leaseYears", v)}
        options={[1, 2, 3, 4, 5].map((y) => ({
          value: y,
          label: `${y} year${y > 1 ? "s" : ""}`,
        }))}
        columns={5}
        hint="Whole years only."
        tooltip={
          <Tip>
            Partial-year leases (such as 13 months) aren't supported.{" "}
            <a href={FAQ_TERMS} target="_blank" rel="noreferrer">
              Why
            </a>
          </Tip>
        }
      />
      <MoneyInput
        field="mileage"
        label="Kilometres per year"
        prefix=""
        suffix="km"
        value={d.mileage}
        onChange={(m) => set("mileage", m)}
        where="Your best estimate. The average Australian drives about 12,000 km."
        findings={f.mileage}
      />
    </>
  );
}

function CompareStep({ d, set }: StepProps) {
  return (
    <>
      <Lead>Select the choice that's most realistic for you.</Lead>
      <NoteBox color="var(--nlc-warn)" mb={20}>
        <strong>This choice matters most.</strong> The same lease can beat a car
        loan yet lose to keeping a paid-off car. Paying cash is always shown too.
      </NoteBox>
      <Choices
        field="compareLoan"
        label="If you didn't lease, what would you do?"
        value={d.compareLoan}
        onChange={(v) => set("compareLoan", v)}
        options={[
          {
            value: true,
            label: "Buy this car with a loan",
          },
          { value: false, label: "Pay cash for this car" },
        ]}
        columns={2}
      />
      <Choices
        field="compareCurrent"
        label="And your current car?"
        value={d.compareCurrent}
        onChange={(v) => set("compareCurrent", v)}
        options={[
          {
            value: true,
            label: "Keep my current car",
          },
          { value: false, label: "Replace my car either way" },
        ]}
        columns={2}
        hint="Only if keeping it is a real option, not if it's dying or already gone."
      />
    </>
  );
}

function CarStep({ d, set }: StepProps) {
  const missingNow = useContext(MissingFields);
  const showUsedEv = needsUsedEvChecks(d);
  const fbt = fbtCategoryOf(d);
  return (
    <>
      <Choices
        field="vehicleType"
        label="Vehicle type"
        value={d.vehicleType}
        onChange={(v) => set("vehicleType", v)}
        options={[
          { value: "EV", label: "Electric (EV)", sub: "Fully electric only" },
          {
            value: "Non-EV",
            label: "Petrol, diesel or any hybrid",
            sub: "Including plug-in hybrids (PHEVs)",
          },
        ]}
        hint="Plug-in hybrids no longer qualify for the EV FBT exemption."
      />
      <Choices
        field="vehicleCondition"
        label="Condition"
        value={d.vehicleCondition}
        onChange={(v) => set("vehicleCondition", v)}
        options={[
          { value: "New", label: "New" },
          {
            value: "Used – dealer sale (GST inc)",
            label: "Dealer used",
            sub: "Price includes GST",
          },
          {
            value: "Used – private sale (no GST)",
            label: "Private sale",
            sub: "No GST in the price",
          },
        ]}
        columns={3}
      />
      {d.hasQuote !== false && (
        <div
          className={`nlc-field${missingNow.has("leaseStartDate") ? " gd-field--missing" : ""}`}
          data-field="leaseStartDate"
        >
          <label className="nlc-field__label" htmlFor="gd-start">
            Lease start date
            <Tip>
              It sets which{" "}
              <a
                href="/special-and-policy/ev-fbt-exemption-phase-out-budget-2026/"
                target="_blank"
                rel="noreferrer"
              >
                EV FBT phase-out tier
              </a>{" "}
              applies, splits the lease into FBT years (1 April to 31 March) and
              financial years, and decides whether the used-EV questions apply.
              Sourcing a car and finishing the paperwork usually takes one to two
              months. Under the exposure draft (not yet law), the EV phase-out may
              instead follow when your lease becomes a binding financial
              commitment, which is still a grey area. If that's near 1 April 2027,
              ask your provider when it's binding.{" "}
              <a href="/special-and-policy/ev-fbt-exemption-phase-out-budget-2026/#its-the-commitment-date-that-counts" target="_blank" rel="noreferrer">
                How the commitment date works
              </a>
            </Tip>
          </label>
          <div className="gd-where">
            When the car is delivered and the lease begins, usually one to two
            months from now.
          </div>
          <div className="gd-inline">
            <input
              id="gd-start"
              type="date"
              className="nlc-input gd-date"
              value={d.leaseStartDate}
              onChange={(e) => set("leaseStartDate", e.target.value)}
            />
            {[1, 2].map((n) => (
              <button
                key={n}
                type="button"
                className="gd-suggest"
                onClick={() => set("leaseStartDate", monthsFromNow(n))}
              >
                Use {n === 1 ? "one" : "two"} month{n > 1 ? "s" : ""} from now
              </button>
            ))}
          </div>
          {missingNow.has("leaseStartDate") && <div className="gd-missing-note">Not answered yet</div>}
        </div>
      )}
      {needsExploreStart(d) && (
        <Choices<"before" | "after">
        field="exploreStart"
          label="When would the lease roughly start?"
          value={d.exploreStart}
          onChange={(v) => set("exploreStart", v)}
          options={[
            {
              value: "before",
              label: "Before 1 April 2027",
              sub: "Under the current EV rules",
            },
            {
              value: "after",
              label: "On or after 1 April 2027",
              sub: "Under the EV phase-out rules",
            },
          ]}
          columns={2}
          hint="The EV FBT exemption starts phasing out from 1 April 2027."
          tooltip={
            <Tip>
              This can change the result a lot.{" "}
              <a
                href="/special-and-policy/ev-fbt-exemption-phase-out-budget-2026/"
                target="_blank"
                rel="noreferrer"
              >
                Read about the phase-out
              </a>
            </Tip>
          }
        />
      )}
      {showUsedEv && (
        <>
          <Choices
        field="usedAfter2022"
            label="Was the car first held and used on or after 1 July 2022?"
            value={d.usedAfter2022}
            onChange={(v) => set("usedAfter2022", v)}
            options={[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ]}
            hint="To be FBT-exempt, nobody can have used it before this date."
          />
          <Choices
        field="usedLctNever"
            label="Has Luxury Car Tax ever been payable on it?"
            value={d.usedLctNever === null ? null : !d.usedLctNever}
            onChange={(v) => set("usedLctNever", !v)}
            options={[
              { value: true, label: "Yes, or not sure" },
              { value: false, label: "No, never" },
            ]}
            hint="Unsure? Ask the dealer. A car that attracted LCT doesn't qualify."
          />
        </>
      )}
      {showUsedEv && fbt && d.hasQuote === false && (
        <FbtNote d={d} cat={fbt} />
      )}
    </>
  );
}

function FbtNote({
  d,
  cat,
}: {
  d: GuidedDraft;
  cat: NonNullable<ReturnType<typeof fbtCategoryOf>>;
}) {
  return (
    <div className="gd-stat gd-fbt">
      <span className="gd-stat__label">Tax treatment</span>
      <span className="gd-stat__sub" style={{ fontSize: 14, color: "var(--nlc-text)" }}>
        {fbtLabel(d, cat)}
      </span>
    </div>
  );
}

function PriceStep({ d, set, f }: StepPropsF) {
  const luxury = isLuxuryRange(d);
  return (
    <Side highlight={["baseValue", "driveaway"]} d={d}>
      <Lead>Two different prices from your quote. They're easy to mix up.</Lead>
      <ProviderSelect d={d} set={set} />
      <MoneyInput
        field="baseValue"
        label="FBT base value (including GST)"
        tooltip={
          <InfoTooltip
            text={
              "Listed before stamp duty, rego and CTP insurance. Quotes also call it FBT value, vehicle base value or value for FBT purposes. On a dealer invoice it's often the vehicle subtotal.\n\n" +
              "Not on your quote? Add up the car, options and delivery, including GST.\n\n" +
              "✅ Included: the car's price, GST on the car, delivery fee, optional add-ons (e.g. floor mats, tow bar), and any Luxury Car Tax (LCT) if payable.\n\n" +
              "❌ Not included: compulsory third party (CTP) insurance, registration, stamp duty."
            }
          />
        }
        value={d.baseValue}
        onChange={(m) => set("baseValue", m)}
        where="Before stamp duty, rego and CTP."
        hint="Also called FBT value or vehicle base value. Includes GST."
        findings={f.prices.filter((x) => x.code === "base_exceeds_driveaway")}
      />
      <ProviderPointers d={d} field="baseValue" />
      <MoneyInput
        field="driveaway"
        label="Drive-away price"
        tooltip={
          <InfoTooltip
            text={
              "Quotes also call it on-road cost, on-road price, drive-away total, vehicle purchase price or car price.\n\n" +
              "Some quotes also show a lower \"novated\" or \"effective\" price with the GST saving taken off. Don't use that one: the calculator takes the GST saving off for you."
            }
          />
        }
        value={d.driveaway}
        onChange={(m) => set("driveaway", m)}
        where="The base value plus CTP, stamp duty and rego."
        hint="The full price including GST, not a lower “novated” price with GST taken off."
        estimatedNote="Worked out from your residual. Usually within about 1%; replace it if you find the actual figure."
        findings={f.prices.filter((x) => x.code !== "base_exceeds_driveaway")}
      />
      <ProviderPointers d={d} field="driveaway" />
      <DriveawayHelper d={d} set={set} />
      {d.vehicleType === "EV" && fbtCategoryOf(d) && (
        <FbtNote d={d} cat={fbtCategoryOf(d)!} />
      )}
      {luxury && (
        <NoteBox color="var(--nlc-warn)">
          This is above the {money(CAR_LIMIT_FY2027)} ATO car limit for 2026-27,
          so your quote may include a "luxury vehicle adjustment". We'll ask
          about it on the payment screen.
        </NoteBox>
      )}
    </Side>
  );
}

function LeaseStep({ d, set, f }: StepPropsF) {
  const atoMin = atoMinimumResidualExGst(d);
  const guessed = guessedResidualBasis(d);
  const typedResidual = moneyValue(d.residual);
  const deferValue = d.monthsDeferredUnsure
    ? "unsure"
    : d.monthsDeferred === null
      ? null
      : String(d.monthsDeferred);
  return (
    <Side highlight={["term", "defer", "docFee", "residual"]} d={d}>
      <Lead>The finance terms from your quote.</Lead>
      <Choices
        field="leaseYears"
        label="Lease term"
        value={d.leaseYears}
        onChange={(v) => set("leaseYears", v)}
        options={[1, 2, 3, 4, 5].map((y) => ({
          value: y,
          label: `${y} year${y > 1 ? "s" : ""}`,
        }))}
        columns={5}
        hint="Whole years only."
        tooltip={
          <Tip>
            Partial-year leases (such as 13 months) aren't supported.{" "}
            <a href={FAQ_TERMS} target="_blank" rel="noreferrer">
              Why
            </a>
          </Tip>
        }
      />
      <Choices<string>
        field="monthsDeferred"
        label="How many months until your first finance payment?"
        value={deferValue}
        onChange={(v) => {
          if (v === "unsure") {
            setDraftDefer(set, 2, true);
          } else {
            setDraftDefer(set, Number(v), false);
          }
        }}
        options={[
          { value: "0", label: "Straight away" },
          { value: "1", label: "After 1 month" },
          { value: "2", label: "After 2 months", sub: "Most common" },
          { value: "unsure", label: "Not sure" },
        ]}
        columns={4}
        hint={
          d.monthsDeferredUnsure
            ? "We'll assume 2 months, the most common."
            : "Quotes often say “deferred 2 months”. Or count the payments: 58 on a 60-month lease means 2."
        }
      />
      <ProviderPointers d={d} field="defer" />
      <MoneyInput
        field="docFee"
        label="Documentation fee"
        value={d.docFee}
        onChange={(m) => set("docFee", m)}
        where="One-off fees in the amount financed, such as establishment, set-up or PPSR fees. Add them together."
        tooltip={
          <InfoTooltip
            text={
              "Also called a documentation or entry fee, or a security interest fee. Some quotes only show it in the small print or under “Other fees”. Use the ex-GST amount if both are shown.\n\n" +
              "If your quote charges it per month (for example “Lease establishment fee $8.87” in a monthly list), leave this at $0 and add the monthly amount to your lease management fees on the running-costs screen. Don't enter it in both places."
            }
          />
        }
        noneLabel="My quote has no documentation fee ($0)"
        findings={f.docFee}
      />
      <ProviderPointers d={d} field="docFee" />
      <MoneyInput
        field="residual"
        label="Residual (balloon) value"
        value={d.residual}
        onChange={(m) => set("residual", m)}
        where="Type the figure exactly as printed."
        findings={f.residual}
      />
      <Choices
        field="residualBasis"
        label="On your quote, is the residual (balloon) value"
        value={d.residualBasis}
        onChange={(v) => set("residualBasis", v)}
        options={[
          { value: "exGst", label: "Excluding GST" },
          {
            value: "incGst",
            label: "Including GST",
            sub: "Most quotes print this one",
          },
          {
            value: "unknown",
            label: "I'm not sure",
            sub: "We'll work it out",
          },
        ]}
        columns={3}
        hint="Look for “GST” next to the figure. This is the most common slip."
        tooltip={
          <Tip>
            If a separate “GST on residual” line sits beside the figure, the
            figure excludes GST.
          </Tip>
        }
      />
      <ProviderPointers d={d} field="residual" />
      {d.residualBasis === "unknown" && (
        <NoteBox mb={20}>
          {guessed && typedResidual && atoMin ? (
            <>
              {money(typedResidual)} is closest to the ATO minimum for a{" "}
              {d.leaseYears}-year lease{" "}
              {guessed === "incGst" ? "including" : "excluding"} GST (about{" "}
              {money(guessed === "incGst" ? atoMin * 1.1 : atoMin)}), so we'll
              treat it as {guessed === "incGst" ? "including" : "excluding"} GST.
            </>
          ) : (
            <>
              We'll use the ATO minimum for a {d.leaseYears ?? "?"}-year lease
              {atoMin
                ? `, about ${money(atoMin)} excluding GST (${money(atoMin * 1.1)} including GST)`
                : ""}
              . Almost every lease uses it.
            </>
          )}
        </NoteBox>
      )}
    </Side>
  );
}

function setDraftDefer(set: StepProps["set"], months: number, unsure: boolean) {
  set("monthsDeferred", months);
  set("monthsDeferredUnsure", unsure);
}

function PaymentStep({ d, set, f }: StepPropsF) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const diag = paymentDiagnosisFor(d);
  const perFn = paymentPerFn(d);
  const luxury = isLuxuryRange(d);
  const luxUnit = PERIOD_UNIT[d.paymentPeriod ?? "perFn"];
  // Smart Leasing / MillarX: only a per-pay figure carries the budget reserve. A monthly figure is
  // the financier's own payment, which Guided spreads over the term itself.
  const needsCorrection = !!d.smartMillarx && d.paymentPeriod !== "perMonth";
  return (
    <Side highlight={["payment", "luxAdj", "running"]} d={d}>
      <Lead>
        Enter only the <strong>vehicle finance</strong> payment. Running costs
        come next.
      </Lead>
      <Choices
        field="paymentPeriod"
        label="How does your quote show the payment?"
        value={d.paymentPeriod}
        onChange={(v) => {
          // A corrected payment is our own figure, so keep it costing the same in the new period.
          const typed = moneyValue(d.payment);
          if (d.paymentCorrected && typed && d.paymentPeriod && v !== d.paymentPeriod) {
            const engineFn = paymentToEngineFn(typed, d.paymentPeriod, d.leaseYears, d.monthsDeferred);
            set("payment", {
              ...d.payment,
              text: (engineFn / paymentToEngineFn(1, v, d.leaseYears, d.monthsDeferred)).toFixed(2),
            });
          }
          set("paymentPeriod", v);
        }}
        options={[
          { value: "perWeek", label: "Per week" },
          { value: "perFn", label: "Per fortnight" },
          { value: "perMonth", label: "Per month" },
          { value: "perYear", label: "Per year (total)" },
        ]}
        columns={4}
        tooltip={
          <Tip>
            If your quote shows the finance payment both per pay and per month, either works. We
            treat a monthly figure as the payment to the financier and spread it over the lease for
            you.
          </Tip>
        }
      />
      <Choices<"exGst" | "incGst" | "unknown">
        field="paymentBasis"
        label="Does the payment include or exclude GST?"
        value={d.paymentBasis}
        onChange={(v) => {
          // As with the period above: a corrected payment is our own figure, so keep it the same amount.
          const typed = moneyValue(d.payment);
          const from = d.paymentBasis;
          if (d.paymentCorrected && typed && from !== "unknown" && from && v !== "unknown" && v !== from)
            set("payment", {
              ...d.payment,
              text: (v === "incGst" ? typed * (1 + GST_RATE) : typed / (1 + GST_RATE)).toFixed(2),
            });
          set("paymentBasis", v);
        }}
        options={[
          { value: "exGst", label: "Excluding GST" },
          { value: "incGst", label: "Including GST" },
          {
            value: "unknown",
            label: "I'm not sure",
            sub: "We'll assume ex GST and check it",
          },
        ]}
        columns={3}
        hint="Check next to the payment, its table heading and the footnotes."
        tooltip={<Tip>If your quote shows the payment twice, once with GST and once without, the smaller figure is ex GST.</Tip>}
      />
      {smartMillarxAsked(d) && <Choices
        field="smartMillarx"
        label="Is your lease with Smart Leasing or MillarX?"
        value={d.smartMillarx}
        onChange={(v) => {
          // A corrected figure only makes sense for those two providers; don't leave it behind.
          if (!v && d.paymentCorrected) {
            set("payment", emptyMoney());
            set("paymentCorrected", false);
          }
          set("smartMillarx", v);
        }}
        options={[
          { value: true, label: "Yes", sub: "Smart Leasing or MillarX" },
          { value: false, label: "No", sub: "Any other provider" },
        ]}
        columns={2}
        hint="Their per-pay figure needs a quick correction. A monthly one doesn't."
        tooltip={<Tip>Smart Leasing and MillarX work out the per-pay figure as if every month of the lease had a finance payment, and hold the extra as a budget reserve. Entered as printed, it makes the lease look dearer than it is. Their monthly figure is the actual payment, so it can go in as printed.</Tip>}
      />}
      {d.smartMillarx &&
        (d.paymentCorrected ? (
          <div className="gd-callout gd-callout--done" role="status">
            <div className="gd-callout__title">
              ✓ Corrected payment entered below
            </div>
            <p>
              This is the finance-only figure from the correction tool, not the
              one printed on your quote.{" "}
              <button
                type="button"
                className="gd-linkbtn"
                onClick={() => setAdjustOpen(true)}
              >
                Run the correction again
              </button>
            </p>
          </div>
        ) : needsCorrection ? (
          <div className="gd-callout gd-callout--must" role="status">
            <div className="gd-callout__title">
              You need to correct your Smart Leasing / MillarX payment first
            </div>
            <p>
              The printed payment usually includes a budget reserve. The tool works
              out the finance-only payment and fills it in below.
            </p>
            {d.leaseYears ? (
              <Button
                variant="primary"
                onClick={() => {
                  trackEvent("guided_smart_correction_opened");
                  setAdjustOpen(true);
                }}
              >
                Open the correction tool
              </Button>
            ) : (
              <p>
                <strong>Choose the lease term on the previous screen first.</strong>
              </p>
            )}
          </div>
        ) : (
          <div className="gd-callout gd-callout--done" role="status">
            <div className="gd-callout__title">
              ✓ No correction needed for a monthly figure
            </div>
            <p>Type the monthly finance payment below, as printed.</p>
          </div>
        ))}
      {adjustOpen && d.leaseYears && (
        <LeaseAdjustModal
          leaseDurationYears={d.leaseYears}
          initialPeriod={d.paymentPeriod === "perFn" || d.paymentPeriod === "perMonth" ? d.paymentPeriod : null}
          initialGst={d.paymentBasis}
          initialDeferMonths={d.monthsDeferred}
          initialProvider={d.provider === "millarx" ? "millarx" : undefined}
          monthlyIsFinancierPayment
          onClose={() => setAdjustOpen(false)}
          onApply={(_perFn, shown) => {
            // Keep the figure in the period and GST basis the reader's quote uses, so the answers
            // above still describe what's in the box. Choosing in the tool counts as answering.
            set("paymentPeriod", shown.period);
            set("paymentBasis", shown.gst);
            set("payment", { text: shown.amount.toFixed(2), none: false, estimated: false });
            // A monthly figure goes through unchanged, so there's nothing to call "corrected".
            set("paymentCorrected", shown.period !== "perMonth");
            setAdjustOpen(false);
          }}
        />
      )}
      <MoneyInput
        field="payment"
        label="Finance (lease) payment"
        value={d.payment}
        onChange={(m) => {
          set("payment", m);
          set("paymentCorrected", false);
        }}
        where={
          needsCorrection
            ? "Filled in by the correction tool above, not the printed figure."
            : "The car's pre-tax payment, before running costs. Type it as printed."
        }
        suffix={d.paymentPeriod ? `per ${PERIOD_UNIT[d.paymentPeriod]}` : undefined}
        findings={[...f.payment, ...f.paymentCorrected]}
      />
      <ProviderPointers d={d} field="payment" />
      {diag?.status === "ok" && diag.rate !== null && (
        <div className="gd-stat">
          <span className="gd-stat__label">Effective interest rate</span>
          <span className="gd-stat__value">
            {(diag.rate * 100).toFixed(2)}%
          </span>
          {perFn && (d.paymentPeriod !== "perFn" || d.paymentBasis === "incGst") && (
            <span className="gd-stat__sub">
              about {money(perFn)} per fortnight ex GST
            </span>
          )}
        </div>
      )}
      {luxury && (
        <MoneyInput
        field="luxAdj"
          label={`Luxury vehicle adjustment (per ${luxUnit})`}
          tooltip={
            <InfoTooltip
              text={
                `Only applies to vehicles costing more than the ATO car limit ($${CAR_LIMIT_FY2027.toLocaleString("en-AU")} for FY2026-27, indexed each July), due to complex employer accounting reasons. It is a separate concept from the Luxury Car Tax (LCT) threshold. Listed separately on some quotes.\n\n` +
                "Quotes may call it a luxury levy, luxury car charge, luxury vehicle non-deductible or non-deductible depreciation.\n\n" +
                "[Read sgfleet's explainer on the luxury vehicle adjustment](https://www.sgfleet.com/docs/australialibraries/novated/novated-support/7-sgf-oct2024-luxury-vehicle-adjustment.pdf)"
              }
            />
          }
          value={d.luxAdj}
          onChange={(m) => set("luxAdj", m)}
          where="A separate line for cars above the ATO car limit. May be called a luxury levy or non-deductible depreciation."
          noneLabel="No luxury vehicle adjustment on my quote"
          suffix={`per ${luxUnit}`}
          hint={`An extra cost on top of the finance payment, per ${luxUnit} like the payment above.`}
        />
      )}
      {luxury && <ProviderPointers d={d} field="luxAdj" />}
    </Side>
  );
}

/** Optional "Who is your quote from?", before the first quote figures. */
function ProviderSelect({ d, set }: Pick<StepPropsF, "d" | "set">) {
  const popular = PROVIDERS.filter((p) => POPULAR.includes(p.id));
  const rest = PROVIDERS.filter((p) => !POPULAR.includes(p.id) && p.id !== "other")
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));
  return (
    <SelectField<ProviderId | "">
      label="Who is your quote from? (optional)"
      hint="Helps us point to the right lines. Your quote stays on your device."
      value={d.provider ?? ""}
      onChange={(v) => {
        const next = v === "" ? null : v;
        set("provider", next);
        // The correction depends on the provider's quote structure. Never carry it to another choice.
        if (d.paymentCorrected && next !== d.provider) {
          set("payment", emptyMoney());
          set("paymentCorrected", false);
        }
        if (isNamedProvider(next)) {
          const sm = isSmartOrMillarx(next);
          set("smartMillarx", sm);
        } else if (isNamedProvider(d.provider)) {
          // Back to "not named": that answer was ours, so ask the question again.
          set("smartMillarx", null);
        }
        if (next) trackEvent("guided_provider", { provider: next });
      }}
      options={[
        { value: "", label: "Choose, or skip" },
        ...popular.map((p) => ({ value: p.id, label: p.label })),
        ...rest.map((p) => ({ value: p.id, label: p.label })),
        { value: "other", label: providerLabel("other") },
      ]}
    />
  );
}

/** Dated "If you see X" pointers for the chosen provider, under the matching field. */
function ProviderPointers({
  d,
  field,
}: {
  d: GuidedDraft;
  field: GuideField;
}) {
  const guide = guideFor(d.provider);
  if (!guide) return null;
  const list = pointersFor(d.provider, field);
  if (list.length === 0) return null;
  return (
    <div className="gd-pointers" data-provider={guide.id}>
      {list.map((p) => (
        <div key={p.text} className="gd-pointer">
          <span>{p.text}</span>
          {p.more && <Tip>{p.more}</Tip>}
        </div>
      ))}
      <div className="gd-pointer__seen">
        As seen on {providerLabel(guide.id)} quotes, {seenLabel(guide.seen)}.
        {guideMayHaveChanged(guide.seen) && " The layout may have changed."}
      </div>
    </div>
  );
}

const PERIOD_WORD: Record<RunningPeriod, string> = {
  perWeek: "per week",
  perFn: "per fortnight",
  perMonth: "per month",
  perYear: "per year",
};
const RUNNING_FIELDS = [
  "service",
  "rego",
  "insurance",
  "mgmt",
  "fuel",
] as const;

function GstMock() {
  return (
    <div
      className="gd-gstmock"
      aria-label="Two examples of how a quote can show running costs"
    >
      <div className="gd-gstmock__card">
        <div className="gd-gstmock__title">Quote A: excluding GST</div>
        <div className="gd-gstmock__head">
          <span>Item</span>
          <span>Amount ex GST</span>
        </div>
        <div className="gd-gstmock__row">
          <span>Servicing and tyres</span>
          <span>$1,000.00</span>
        </div>
        <div className="gd-gstmock__row">
          <span>Insurance</span>
          <span>$1,300.00</span>
        </div>
        <div className="gd-gstmock__row gd-gstmock__row--sum">
          <span>Total</span>
          <span>$2,300.00</span>
        </div>
      </div>
      <div className="gd-gstmock__card">
        <div className="gd-gstmock__title">Quote B: including GST</div>
        <div className="gd-gstmock__head">
          <span>Item</span>
          <span>Amount inc GST</span>
        </div>
        <div className="gd-gstmock__row">
          <span>Servicing and tyres</span>
          <span>$1,100.00</span>
        </div>
        <div className="gd-gstmock__row">
          <span>Insurance</span>
          <span>$1,430.00</span>
        </div>
        <div className="gd-gstmock__row gd-gstmock__row--sum">
          <span>Total</span>
          <span>$2,530.00</span>
        </div>
      </div>
    </div>
  );
}

function GstCreditMock() {
  return (
    <div className="gd-gstmock" aria-label="Example of a quote that takes a GST credit off its running costs">
      <div className="gd-gstmock__card">
        <div className="gd-gstmock__title">Including GST, with a credit taken off</div>
        <div className="gd-gstmock__head">
          <span>Item</span>
          <span>Amount inc GST</span>
        </div>
        <div className="gd-gstmock__row">
          <span>Servicing and tyres</span>
          <span>$1,100.00</span>
        </div>
        <div className="gd-gstmock__row">
          <span>Insurance</span>
          <span>$1,430.00</span>
        </div>
        <div className="gd-gstmock__row">
          <span>Less GST credit</span>
          <span>−$230.00</span>
        </div>
        <div className="gd-gstmock__row gd-gstmock__row--sum">
          <span>Total</span>
          <span>$2,300.00</span>
        </div>
      </div>
    </div>
  );
}

function RunningStep({ d, set, f }: StepPropsF) {
  const typical = typicalFigures(d);
  const isEv = d.vehicleType === "EV";
  const period = d.runningPeriod;
  const suffix = period ? PERIOD_WORD[period] : undefined;
  const factor = runningFactor(period);

  // Switching period rescales what is already typed so the yearly total stays the same.
  function changePeriod(next: RunningPeriod) {
    const from = runningFactor(period);
    const to = runningFactor(next);
    if (period && from !== to) {
      for (const k of RUNNING_FIELDS) {
        const m: Money = d[k];
        const v = m.none ? null : parseAmount(m.text);
        if (v !== null) {
          set(k, {
            ...m,
            text: String(Math.round(((v * from) / to) * 100) / 100),
          });
        }
      }
    }
    set("runningPeriod", next);
  }
  const heading = d.runningGstHeading;
  const credit = d.runningGstCredit;
  const gstTag = heading ? (
    <span className="gd-gsttag">
      {heading === "incGst" ? "inc GST" : "ex GST"}
    </span>
  ) : null;
  const typicalIn = (annual?: number | null) =>
    annual && period ? annual / factor : null;

  return (
    <>
      <Lead>From your quote's running-cost budget.</Lead>
      <MoneyInput
        field="mileage"
        label="Kilometres per year"
        prefix=""
        suffix="km"
        value={d.mileage}
        onChange={(m) => set("mileage", m)}
        where="Your best estimate. The average Australian drives about 12,000 km."
        findings={f.mileage}
      />
      <Help title="How do I use my current driving to estimate this?">
        Check your last two service records for the odometer reading, subtract,
        and divide by the years between. Or multiply a typical weekly total by
        52.
      </Help>
      <Choices<RunningPeriod>
        field="runningPeriod"
        label="How are costs shown on your quote?"
        value={period}
        onChange={changePeriod}
        options={[
          { value: "perWeek", label: "Per week" },
          { value: "perFn", label: "Per fortnight" },
          { value: "perMonth", label: "Per month" },
          { value: "perYear", label: "Per year" },
        ]}
        columns={4}
        hint="Use whichever your quote shows. All the boxes below use it."
      />
      <ProviderPointers d={d} field="running" />
      <Choices<"exGst" | "incGst" | "unknown">
        field="runningGstHeading"
        label="What does the running-cost heading on your quote say?"
        value={heading}
        onChange={(v) => {
          set("runningGstHeading", v);
          if (v === "incGst") {
            set("gstPassedOn", credit === "No" ? "No" : credit ? "Yes" : null);
          } else {
            set("runningGstCredit", null);
            set("gstPassedOn", v === "exGst" ? "Yes" : "Unsure");
          }
        }}
        options={[
          { value: "exGst", label: "Excluding GST", sub: "e.g. “Amount ex GST”" },
          { value: "incGst", label: "Including GST", sub: "e.g. “Amount inc GST”" },
          {
            value: "unknown",
            label: "I can't see it",
            sub: "We'll assume excluding GST",
          },
        ]}
        columns={3}
      />
      <Help title="See how the two look on a quote">
        <GstMock />
      </Help>
      {heading === "incGst" && (
        <>
          <Choices<YesNoUnsure>
            field="runningGstCredit"
            label="Anywhere on the quote, is a GST credit taken off the running costs?"
            value={credit}
            onChange={(v) => {
              set("runningGstCredit", v);
              set("gstPassedOn", v === "No" ? "No" : "Yes");
            }}
            options={[
              {
                value: "Yes",
                label: "Yes",
                sub: "A line such as “Less GST credit”",
              },
              { value: "No", label: "No", sub: "The amounts stay as they are" },
              {
                value: "Unsure",
                label: "I'm not sure",
                sub: "We'll assume yes, as for most employers",
              },
            ]}
            columns={3}
            tooltip={
              <Tip>
                Some employers (Victorian hospitals in particular) don't pass the
                GST saving on to you, so no credit comes off.{" "}
                <a href={GST_ARTICLE} target="_blank" rel="noreferrer">
                  Read more about the GST saving
                </a>
              </Tip>
            }
          />
          <Help title="What a GST credit looks like on a quote">
            <GstCreditMock />
          </Help>
          {credit && credit !== "No" && (
            <p className="nlc-field__hint">
              Type the amounts as printed (inc GST). We'll take the GST off.
            </p>
          )}
        </>
      )}
      <Help title="Where do other lines on my quote go?">
        <ul className="gd-otherlines">
          <li>
            <strong>Other fees</strong> (salary packaging, licence, admin): add
            them to Lease management fees.
          </li>
          <li>
            <strong>Roadside, incidentals, car wash</strong> and similar: add
            them to Servicing.
          </li>
          <li>
            <strong>Optional cover</strong> (lease protection, GAP, minor damage
            repair): include it only if you're keeping it.
          </li>
          <li>
            <strong>A contingency or reserve budget</strong>: leave it out.
            It's a buffer, and unspent money normally comes back to you.
          </li>
        </ul>
      </Help>
      <div className="gd-rows">
        {!period && (
          <div className="nlc-field__hint">
            Choose how costs are shown on your quote (above) to see a typical
            figure for each.
          </div>
        )}
        <MoneyInput
        field="service"
          row
          label={<>Servicing, maintenance and tyres{gstTag}</>}
          value={d.service}
          onChange={(m) => set("service", m)}
          suffix={suffix}
          suggestion={typicalIn(typical?.service)}
          findings={f.service}
          estimatedNote="Typical estimate"
        />
        <MoneyInput
        field="rego"
          row
          label={<>Registration and CTP{gstTag}</>}
          value={d.rego}
          onChange={(m) => set("rego", m)}
          suffix={suffix}
          suggestion={typicalIn(typical?.rego)}
          findings={f.rego}
          estimatedNote="Typical estimate"
        />
        <MoneyInput
        field="insurance"
          row
          label={<>Insurance{gstTag}</>}
          value={d.insurance}
          onChange={(m) => set("insurance", m)}
          suffix={suffix}
          suggestion={typicalIn(typical?.insurance)}
          hint="Comprehensive cover. Compare with your own insurer's quote."
          tooltip={
            <Tip>
              Some quotes pay the first year's insurance upfront, inside the
              amount financed, and only budget for renewals. Enter the full
              yearly premium here anyway: the calculator counts insurance in
              every year of the lease.
            </Tip>
          }
          findings={f.insurance}
          estimatedNote="Typical estimate"
        />
        <ProviderPointers d={d} field="insurance" />
        <MoneyInput
        field="mgmt"
          row
          label={<>Lease management fees{gstTag}</>}
          value={d.mgmt}
          onChange={(m) => set("mgmt", m)}
          suffix={suffix}
          suggestion={typicalIn(typical?.mgmt)}
          findings={f.mgmt}
          estimatedNote="Typical estimate"
          where="Admin, membership and management fees, added together."
        />
        <ProviderPointers d={d} field="fees" />
        {!isEv && (
          <MoneyInput
        field="fuel"
            row
            label={<>Fuel{gstTag}</>}
            value={d.fuel}
            onChange={(m) => set("fuel", m)}
            suffix={suffix}
            suggestion={typicalIn(typical?.fuel)}
            findings={f.fuel}
            estimatedNote="Typical estimate"
            where="As shown for fuel in the running-costs section."
          />
        )}
        {isEv && (
          <MoneyInput
        field="chargingRate"
            row
            label="Electricity price you pay to charge, per kWh"
            suffix="per kWh"
            value={d.chargingRate}
            onChange={(m) => set("chargingRate", m)}
            where="Your blended home and public charging price."
            noneLabel="Fully solar or free charging ($0)"
            tooltip={<Tip>Only used to estimate your real charging cost. The tax claim itself uses the ATO's 5.47c/km shortcut rate.</Tip>}
            findings={f.charging}
            extra={
              <div className="gd-presets" aria-label="Typical charging prices">
                {[
                  { v: 0.01, l: "Mostly solar, about 1c" },
                  { v: 0.08, l: "Home off-peak, about 8c" },
                  { v: 0.3, l: "Home standard, about 30c" },
                  { v: 0.5, l: "Public chargers, about 50c" },
                ].map((p) => (
                  <button
                    key={p.v}
                    type="button"
                    className="gd-suggest"
                    onClick={() =>
                      set("chargingRate", {
                        text: String(p.v),
                        none: false,
                        estimated: true,
                      })
                    }
                  >
                    {p.l}
                  </button>
                ))}
              </div>
            }
          />
        )}
      </div>
      {RUNNING_FIELDS.some((k) => d[k].estimated && !d[k].none) && (
        <div className="gd-estimated">
          Typical estimates aren't from your quote. Replace any where you have
          the real figure.
        </div>
      )}
    </>
  );
}

function YouStep({ d, set, f }: StepPropsF) {
  const quote = d.hasQuote !== false;
  return (
    <>
      <MoneyInput
        field="income"
        label="Your annual taxable income"
        value={d.income}
        onChange={(m) => set("income", m)}
        where="From ALL your jobs and income, after deductions: the ‘taxable income’ line on your tax return."
        tooltip={<Tip>Not just the employer arranging this lease. Use the yearly figure before tax, as it is before the lease. A recent tax return or payslip helps.</Tip>}
        findings={f.income}
      />
      {quote && <SuperQuestion d={d} set={set} />}
      <CashQuestion d={d} set={set} f={f} />
      {quote && <NswQuestions d={d} set={set} />}
    </>
  );
}

/** Asked on the full path only; the estimate assumes super is unaffected and lists that assumption. */
function SuperQuestion({ d, set }: StepProps) {
  return (
    <Choices<YesNoUnsure>
        field="superPreNl"
      label="How does your employer calculate super?"
      value={d.superPreNl}
      onChange={(v) => set("superPreNl", v)}
      options={[
        { value: "Yes", label: "Before lease salary", sub: "Super is unaffected" },
        { value: "No", label: "After lease salary", sub: "Super falls with the lease" },
        { value: "Unsure", label: "I'm not sure", sub: "We'll assume before lease salary" },
      ]}
      columns={3}
      hint={
        <>
          Usually before lease salary, but worth checking with payroll.{" "}
          <strong>
            If it's after lease salary, the lost super can add up to many
            thousands of dollars over the lease.
          </strong>
        </>
      }
      tooltip={
        <Tip>
          In roughly 10% of cases the employer calculates super on the lower
          post-lease salary, which can cost thousands over a lease.{" "}
          <a
            href="/costs-and-savings/super-guarantee-and-payroll-risks/"
            target="_blank"
            rel="noreferrer"
          >
            Why it matters
          </a>
        </Tip>
      }
    />
  );
}

function CashQuestion({ d, set, f }: StepPropsF) {
  return (
    <>
      <Choices
        field="cashHome"
        label="If you were to pay cash for the car, where would the money come from?"
        value={d.cashHome}
        onChange={(v) => {
          // Savings and investment-offset share one rate box, but a savings rate isn't a loan rate.
          if (
            d.cashHome !== v &&
            (v === "savings" || v === "ipOffset") &&
            (d.cashHome === "savings" || d.cashHome === "ipOffset")
          )
            set("savingsRatePreTax", emptyMoney());
          set("cashHome", v);
        }}
        options={[
          {
            value: "offset",
            label: "Home loan offset",
            sub: "On the home you live in",
          },
          {
            value: "ipOffset",
            label: "Investment property offset",
            sub: "Against an investment loan",
          },
          {
            value: "savings",
            label: "Savings account",
            sub: "e.g. a high-interest account",
          },
          {
            value: "invested",
            label: "Investments",
            sub: "Shares, crypto etc",
          },
          {
            value: "none",
            label: "I don't have the cash to pay outright",
          },
        ]}
        columns={5}
        hint="If it's invested, pick the safe place it would otherwise sit instead."
        tooltip={
          <Tip>
            The cash comparison needs to know what that money would otherwise
            earn. Investment returns are uncertain, so we recommend the next
            best safe return (a savings account or a loan offset) rather than an
            expected share or crypto return. If you still choose “Investments”,
            enter a cautious post-tax figure.{" "}
            <a href={HOW_TO_USE} target="_blank" rel="noreferrer">
              How to use the calculator
            </a>
          </Tip>
        }
      />
      {d.cashHome === "offset" && (
        <MoneyInput
        field="offsetRate"
          label="Home loan interest rate"
          prefix=""
          suffix="% a year"
          value={d.offsetRate}
          onChange={(m) => set("offsetRate", m)}
          where="Your home loan rate, for example 6.2."
          tooltip={<Tip>Use it as is: interest on the home you live in isn't tax-deductible. If the offset sits against an investment loan, choose that option instead.</Tip>}
          findings={f.offset}
        />
      )}
      {d.cashHome === "ipOffset" && (
        <MoneyInput
        field="savingsRatePreTax"
          label="Investment property loan interest rate"
          prefix=""
          suffix="% a year"
          value={d.savingsRatePreTax}
          onChange={(m) => set("savingsRatePreTax", m)}
          where="The investment loan's rate, for example 6.5. We adjust it for tax."
          tooltip={<Tip>The interest you avoid would otherwise be tax-deductible, so it's worth less to you than the headline rate. We take your tax off it.</Tip>}
          findings={f.savings}
        />
      )}
      {d.cashHome === "savings" && (
        <MoneyInput
        field="savingsRatePreTax"
          label="Savings account interest rate (before tax)"
          prefix=""
          suffix="% a year"
          value={d.savingsRatePreTax}
          onChange={(m) => set("savingsRatePreTax", m)}
          where="The headline rate. We take your tax off it for you."
          findings={f.savings}
        />
      )}
      {d.cashHome === "invested" && (
        <MoneyInput
        field="investedRate"
          label="Assumed return after tax"
          prefix=""
          suffix="% a year"
          value={d.investedRate}
          onChange={(m) => set("investedRate", m)}
          where="A cautious post-tax figure, for example 3."
          tooltip={<Tip>Returns on these assets aren't guaranteed and can be negative.</Tip>}
          findings={f.invested}
        />
      )}
    </>
  );
}

function NswQuestions({ d, set }: StepProps) {
  return (
    <>
      <Choices
        field="nswHealth"
        label="Are you a doctor or nurse employed by NSW Health?"
        value={d.nswHealth}
        onChange={(v) => set("nswHealth", v)}
        options={[
          { value: false, label: "No" },
          { value: true, label: "Yes" },
        ]}
        columns={2}
        hint="If that's not you, answer No."
        tooltip={
          <Tip>
            NSW Health doctors and nurses must share some of their tax savings
            with their employer.{" "}
            <a href={NSW_ARTICLE} target="_blank" rel="noreferrer">
              Read more
            </a>
          </Tip>
        }
      />
      {d.nswHealth && (
        <>
          <Choices<RunningPeriod>
        field="nswPeriod"
            label="I want to enter the employer share as a"
            value={d.nswPeriod}
            onChange={(v) => set("nswPeriod", v)}
            options={[
              { value: "perFn", label: "Fortnightly figure" },
              { value: "perMonth", label: "Monthly figure" },
              { value: "perYear", label: "Yearly figure" },
            ]}
            columns={3}
          />
          <MoneyInput
        field="nswAmount"
            label="Employer share of your tax savings"
            value={d.nswAmount}
            onChange={(m) => set("nswAmount", m)}
            suffix={d.nswPeriod ? PERIOD_WORD[d.nswPeriod] : undefined}
            where="Your NSW Health salary-packaging statement shows this."
            tooltip={<Tip>We don't work this out from your role and hours: the rules are applied inconsistently, and we'd rather not guess. Use the figure your employer gives you.</Tip>}
          />
        </>
      )}
    </>
  );
}

function AlternativesStep({ d, set, f }: StepPropsF) {
  return (
    <>
      <Lead>
        You chose to compare against{" "}
        {d.compareLoan && d.compareCurrent
          ? "a car loan and keeping your current car"
          : d.compareLoan
            ? "a car loan"
            : "keeping your current car"}
        . Use real figures where you have them; typical ones are offered.
      </Lead>
      {d.compareLoan && (
        <section className="gd-sub">
          <h3 className="gd-sub__title">Car loan</h3>
          <p className="gd-small">
            The loan runs for the same term as the lease
            {d.leaseYears
              ? ` (${d.leaseYears} year${d.leaseYears > 1 ? "s" : ""})`
              : ""}
            .
          </p>
          <MoneyInput
        field="loanDeposit"
            label="Deposit paid up front"
            value={d.loanDeposit}
            onChange={(m) => set("loanDeposit", m)}
            noneLabel="No deposit ($0)"
          />
          <MoneyInput
        field="loanRate"
            label="Loan interest rate"
            prefix=""
            suffix="% a year"
            value={d.loanRate}
            onChange={(m) => set("loanRate", m)}
            where="From a loan offer, for example 7.5. The interest rate, not the comparison rate."
            placeholder="e.g. 7.5"
            findings={f.loan}
          />
          <MoneyInput
        field="loanFee"
            label="Loan monthly account fee"
            value={d.loanFee}
            onChange={(m) => set("loanFee", m)}
            noneLabel="No monthly fee ($0)"
          />
        </section>
      )}
      {d.compareCurrent && d.hasQuote !== false && d.leaseYears && moneyValue(d.driveaway) ? (
        <section className="gd-sub">
          <h3 className="gd-sub__title">The new car at the end</h3>
          <MoneyInput
          field="marketValueEnd"
            label={`Estimated market value at lease end (after ${d.leaseYears} year${d.leaseYears > 1 ? "s" : ""})`}
            value={
              d.marketValueEnd.estimated
                ? {
                    ...d.marketValueEnd,
                    text: String(typicalMarketValueAtLeaseEnd(d) ?? ""),
                  }
                : d.marketValueEnd
            }
            onChange={(m) => set("marketValueEnd", m)}
            where="What you could sell it for then. Used-car listings are a good guide."
            tooltip={<Tip>Not on your quote. Against keeping your current car, what each car is worth at the end is part of the comparison.</Tip>}
            suggestion={typicalMarketValueAtLeaseEnd(d)}
            estimatedNote="A typical estimate. Replace it if used-car listings for your model suggest a different figure."
            findings={f.marketValue}
          />
        </section>
      ) : null}
      {d.compareCurrent && <CurrentCarFields d={d} set={set} f={f} />}
    </>
  );
}

/** Shown under the current car's fuel once the km answer has moved away from the one it was typed at. */
function curFuelScaledNote(d: GuidedDraft): string | undefined {
  const typed = moneyValue(d.curFuel);
  const km = moneyValue(d.mileage);
  if (d.curFuel.estimated || !typed || !d.curFuelBasisKm || !km || km === d.curFuelBasisKm)
    return undefined;
  return `You entered this for ${d.curFuelBasisKm.toLocaleString("en-AU")} km a year. At your current ${km.toLocaleString("en-AU")} km we count ${money(currentCarFuelAnnual(d) ?? typed)} a year.`;
}

const CUR_TYPICAL = "Typical estimate";
const CUR_COSTS = ["curService", "curRego", "curFuel", "curInsurance"] as const;

function CurrentCarFields({ d, set, f }: StepPropsF) {
  const t = typicalCurrentCar(d);
  const years = d.leaseYears;
  return (
    <section className="gd-sub">
      <h3 className="gd-sub__title">Keeping your current car</h3>
      <p className="gd-small">
        Yearly running costs of the car you own now, including GST.
      </p>
      <div className="gd-rows">
        <MoneyInput
        field="curValueNow"
          row
          label="Market value today"
          value={d.curValueNow}
          onChange={(m) => set("curValueNow", m)}
          findings={f.curValueNow}
          where="What you could sell it for (carsales.com.au or similar)."
        />
        <MoneyInput
        field="curValueEnd"
          row
          label={`Market value at the end of the lease${years ? ` (after ${years} year${years > 1 ? "s" : ""})` : ""}`}
          value={
            d.curValueEnd.estimated
              ? { ...d.curValueEnd, text: String(t.valueEnd ?? "") }
              : d.curValueEnd
          }
          onChange={(m) => set("curValueEnd", m)}
          where="What it would be worth when the new car's lease would end."
          suggestion={t.valueEnd}
          estimatedNote="A typical estimate from today's value. Replace it if you have a better figure."
          findings={f.curValueEnd}
        />
        <MoneyInput
        field="curService"
          row
          label="Servicing, maintenance and tyres"
          value={d.curService}
          onChange={(m) => set("curService", m)}
          suffix="per year"
          suggestion={t.service}
          findings={f.curService}
          estimatedNote={CUR_TYPICAL}
        />
        <MoneyInput
        field="curRego"
          row
          label="Registration and CTP"
          value={d.curRego}
          onChange={(m) => set("curRego", m)}
          suffix="per year"
          suggestion={t.rego}
          findings={f.curRego}
          estimatedNote={CUR_TYPICAL}
        />
        <MoneyInput
        field="curFuel"
          row
          label="Fuel or electricity"
          value={d.curFuel}
          onChange={(m) => {
            set("curFuel", m);
            set("curFuelBasisKm", m.estimated || m.none ? null : moneyValue(d.mileage));
          }}
          hint={curFuelScaledNote(d)}
          suffix="per year"
          suggestion={t.fuel}
          findings={f.curFuel}
          estimatedNote={CUR_TYPICAL}
        />
        <MoneyInput
        field="curInsurance"
          row
          label="Insurance"
          value={d.curInsurance}
          onChange={(m) => set("curInsurance", m)}
          suffix="per year"
          suggestion={t.insurance}
          findings={f.curInsurance}
          estimatedNote={CUR_TYPICAL}
        />
      </div>
      {CUR_COSTS.some((k) => d[k].estimated && !d[k].none) && (
        <div className="gd-estimated">
          Typical estimates aren't your car's real costs. Replace any you know.
        </div>
      )}
    </section>
  );
}

// ─── Review & results ───────────────────────────────────────────────────────

function ReviewStep({
  d,
  inputs,
  f,
  onEdit,
  onOpenAdvanced,
  onSwitchToAdvanced,
  advancedEdited,
  savedQuotes,
  onQuotesChange,
  onHaveQuote,
  set,
}: {
  set: StepProps["set"];
  d: GuidedDraft;
  inputs: Inputs | null;
  f: FindingMap;
  onEdit: (s: StepId) => void;
  onOpenAdvanced: (inputs: Inputs, anchorId?: string) => void;
  onSwitchToAdvanced?: () => void;
  advancedEdited: boolean;
  savedQuotes?: SavedQuoteV1[];
  onQuotesChange?: (quotes: SavedQuoteV1[]) => void;
  onHaveQuote: () => void;
}) {
  const exploring = d.hasQuote === false;
  const narrow = useNarrowScreen();
  const [horizon, setHorizon] = useState<"five_year" | "lease_end">(
    "five_year",
  );
  /** A pending "open in Advanced" that would replace figures already there. */
  const [confirming, setConfirming] = useState<{ anchorId?: string } | null>(
    null,
  );
  const assumptions = exploring ? estimateAssumptions(d) : null;
  /** Bumped to open "Assumptions we made for you" from the note at the top. */
  const [assumptionsNonce, setAssumptionsNonce] = useState<number>();
  function showAssumptions() {
    setAssumptionsNonce(Date.now());
    requestAnimationFrame(() =>
      document.getElementById(ASSUMPTIONS_ID)?.scrollIntoView?.({ behavior: "smooth", block: "start" }),
    );
  }
  const assumedRate = (d.estimateRatePct ?? ASSUMED_EFFECTIVE_RATE * 100).toFixed(2).replace(/\.?0+$/, "");
  const incomplete = visibleSteps(d).filter(
    (s) => s !== "intro" && s !== "review" && missingForStep(s, d).length > 0,
  );
  const diag = paymentDiagnosisFor(d);
  const fbt = fbtCategoryOf(d);
  const flagged = visibleFindings(d, f).filter(
    (x) => x.level === "error" || x.level === "warn",
  );
  const cashNone = d.cashHome === "none";
  const alternatives = [
    ...(cashNone ? [] : ["buying with cash"]),
    ...(d.compareLoan ? ["a car loan"] : []),
    ...(d.compareCurrent ? ["keeping your current car"] : []),
    ...(cashNone ? ["buying with cash (for reference only)"] : []),
  ];
  const comparedWith =
    alternatives.length === 1
      ? alternatives[0]
      : `${alternatives.slice(0, -1).join(", ")} and ${alternatives[alternatives.length - 1]}`;
  const leaseYears = d.leaseYears ?? 5;
  const effectiveHorizon = leaseYears < 5 ? horizon : "five_year";

  const confirmRef = useRef<HTMLDivElement>(null);
  function openAdvanced(anchorId?: string) {
    if (!inputs) return;
    if (advancedEdited) {
      setConfirming({ anchorId });
      // The choice sits below the results; bring it into view from whichever card was clicked.
      requestAnimationFrame(() =>
        confirmRef.current?.scrollIntoView?.({ behavior: "smooth", block: "center" }),
      );
      return;
    }
    trackEvent(anchorId ? "guided_open_details" : "guided_open_advanced");
    // The "full workings" buttons open the Details tab: the Summary would repeat these results.
    onOpenAdvanced(inputs, anchorId ?? ADVANCED_DETAILS_TOP);
  }

  const cashRow: [string, string, StepId] = [
    "Cash you'd otherwise use",
    d.cashHome === "offset"
      ? `In a home loan offset at ${moneyValue(d.offsetRate) ?? "?"}%`
      : d.cashHome === "ipOffset"
        ? `In an investment property offset at ${moneyValue(d.savingsRatePreTax) ?? "?"}% before tax`
        : d.cashHome === "savings"
        ? `In savings at ${moneyValue(d.savingsRatePreTax) ?? "?"}% before tax`
        : d.cashHome === "invested"
          ? `Invested, ${moneyValue(d.investedRate) ?? 0}% after tax`
          : d.cashHome === "none"
            ? "No cash to pay outright"
            : "?",
    "you",
  ];
  const carRow: [string, string, StepId] = [
    "Car",
    `${d.vehicleType === "EV" ? "Electric" : "Petrol/diesel/hybrid"}, ${d.vehicleCondition?.split(" ")[0].toLowerCase() ?? ""}`,
    "car",
  ];
  const fbtRow: [string, string, StepId] | null = fbt
    ? ["Tax treatment", fbtLabel(d, fbt), "car"]
    : null;
  const incomeRow: [string, string, StepId] = [
    "Taxable income",
    money(moneyValue(d.income) ?? 0),
    "you",
  ];
  const comparedRow: [string, string, StepId] = [
    "Compared against",
    [
      "Cash purchase",
      d.compareLoan ? "car loan" : null,
      d.compareCurrent ? "keeping your current car" : null,
    ]
      .filter(Boolean)
      .join(", "),
    "compare",
  ];
  const startRow: [string, string, StepId] | null =
    exploring && d.exploreStart
      ? [
          "Lease start",
          d.exploreStart === "after"
            ? "On or after 1 April 2027"
            : "Before 1 April 2027",
          "car",
        ]
      : null;
  const rows = (
    exploring
      ? [
          carRow,
          startRow,
          fbtRow,
          [
            "Approximate drive-away price",
            money(moneyValue(d.driveaway) ?? 0),
            "quick",
          ],
          ["Term", `${d.leaseYears ?? "?"} years`, "quick"],
          [
            "Kilometres per year",
            `${(moneyValue(d.mileage) ?? 0).toLocaleString("en-AU")} km`,
            "quick",
          ],
          incomeRow,
          cashRow,
          comparedRow,
        ]
      : [
          carRow,
          ["Lease start", effectiveStartDate(d) ?? "?", "car"],
          fbtRow,
          ["FBT base value", money(moneyValue(d.baseValue) ?? 0), "price"],
          ["Drive-away price", money(moneyValue(d.driveaway) ?? 0), "price"],
          [
            "Term",
            `${d.leaseYears ?? "?"} years, first payment after ${d.monthsDeferred ?? "?"} months`,
            "lease",
          ],
          ["Documentation fee", money(moneyValue(d.docFee) ?? 0), "lease"],
          [
            "Residual (ex GST)",
            residualExGstEntered(d)
              ? `${money(residualExGstEntered(d)!)}${d.residualBasis === "unknown" ? (guessedResidualBasis(d) ? ` (read as ${guessedResidualBasis(d) === "incGst" ? "inc" : "ex"} GST)` : " (ATO minimum)") : ""}`
              : "?",
            "lease",
          ],
          asksMarketValueEnd(d)
            ? [
                "Market value at lease end",
                marketValueEndEntered(d)
                  ? `${money(marketValueEndEntered(d)!)}${d.marketValueEnd.estimated ? " (typical estimate)" : ""}`
                  : "?",
                "alternatives",
              ]
            : null,
          [
            "Lease payment",
            paymentPerFn(d)
              ? `${money(moneyValue(d.payment) ?? 0)} per ${d.paymentPeriod ? PERIOD_UNIT[d.paymentPeriod] : "fortnight"}${d.paymentBasis === "incGst" ? " inc GST" : d.paymentBasis === "exGst" ? " ex GST" : " (GST not stated, taken as ex GST)"}`
              : "?",
            "payment",
          ],
          [
            "Effective interest rate",
            diag?.rate != null ? `${(diag.rate * 100).toFixed(2)}%` : "?",
            "payment",
          ],
          incomeRow,
          cashRow,
          comparedRow,
        ]
  ).filter(Boolean) as [string, string, StepId][];

  /** Your answers and, on an estimate, what we filled in: everything the result rests on, in one place. */
  const basedOn = (n: number) => (
    <Part
      n={n}
      title="What this is based on"
      sub={
        assumptions
          ? "What you told us, and the typical figures we filled in for the rest."
          : "What you told us. Edit takes you back to that screen."
      }
    >
      <Section
        title={`Your answers (${rows.length})`}
        description="What you told us on each screen. Edit takes you back to it."
        defaultOpen={!inputs}
      >
        <dl className="gd-answers__list">
          {rows.map(([k, v, s]) => (
            <div key={k} className="gd-answers__row">
              <dt>{k}</dt>
              <dd>{v}</dd>
              <button
                type="button"
                className="gd-linkbtn"
                onClick={() => onEdit(s)}
              >
                Edit
              </button>
            </div>
          ))}
        </dl>
      </Section>
      {inputs && assumptions && (
        <Section
          title={`What we assumed (${assumptions.length})`}
          description="Typical figures, since you don't have a quote yet. Enter a real quote to replace them."
          anchorId={ASSUMPTIONS_ID}
          forceOpenNonce={assumptionsNonce}
        >
          <div className="gd-kvlist">
            {assumptions.map((a) => (
              <KV
                key={a.field}
                label={a.label}
                value={a.value}
                tooltip={a.tooltip ? <InfoTooltip text={a.tooltip} /> : undefined}
              />
            ))}
          </div>
        </Section>
      )}
    </Part>
  );

  // Dragging a "Try different numbers" slider recomputes everything; let the cards lag a frame
  // behind the thumb rather than make the drag stutter.
  const shownInputs = useDeferredValue(inputs);
  const results = inputs && (
    <>
      {leaseYears < 5 && (
        <div className="gd-horizon">
          <span className="gd-horizon__label">Compare over</span>
          <div className="nlc-pill-group">
            <button
              type="button"
              className="nlc-pill-group__btn"
              aria-pressed={effectiveHorizon === "five_year"}
              onClick={() => setHorizon("five_year")}
            >
              5 years
            </button>
            <button
              type="button"
              className="nlc-pill-group__btn"
              aria-pressed={effectiveHorizon === "lease_end"}
              onClick={() => setHorizon("lease_end")}
            >
              The {leaseYears}-year lease
            </button>
          </div>
        </div>
      )}
      <ResultHeadline
        inputs={shownInputs ?? inputs}
        horizon={effectiveHorizon}
        approx={exploring}
        cashNone={cashNone}
        ratePct={
          exploring
            ? Number(assumedRate)
            : diag?.status === "ok" && diag.rate !== null
              ? diag.rate * 100
              : null
        }
        onEditCompare={() => onEdit("compare")}
        onOpenAdvanced={() => openAdvanced()}
      />
      <Section
        title="Show how we got this"
        description="The breakdown behind each figure."
        defaultOpen={!narrow}
        analyticsId="guided_breakdown"
      >
        <div className="gd-results">
          <SummaryView
            inputs={shownInputs ?? inputs}
            horizon={effectiveHorizon}
            onNavigateToDetails={(anchorId) => openAdvanced(anchorId)}
            hideDisclaimers
            compactMoreDetails
            cashLast={cashNone}
            onMoreDetails={(anchorId) => {
              trackEvent("guided_more_details_clicked");
              openAdvanced(anchorId);
            }}
          />
        </div>
      </Section>
    </>
  );

  return (
    <>
      {exploring && (
        <NoteBox color="var(--nlc-warn)" mb={16}>
          <strong>Rough estimate.</strong>{" "}
          {assumptions ? `We filled in ${assumptions.length} figures for you. ` : ""}
          The ones that matter most: a {assumedRate}% lease interest rate,
          typical running costs for this car, and super that isn't reduced by
          the lease. Any of these can move the result by thousands.{" "}
          {assumptions && (
            <>
              <button type="button" className="gd-linkbtn" onClick={showAssumptions}>
                See all assumptions
              </button>
              {" · "}
            </>
          )}
          <button type="button" className="gd-linkbtn" onClick={onHaveQuote}>
            Enter a quote
          </button>{" "}
          (your answers are kept).
        </NoteBox>
      )}

      {incomplete.length > 0 && (
        <NoteBox color="var(--nlc-warn)" mb={16}>
          Some answers are missing:{" "}
          {incomplete.map((s, i) => (
            <span key={s}>
              {i > 0 && ", "}
              <button
                type="button"
                className="gd-linkbtn"
                onClick={() => onEdit(s)}
              >
                {STEP_TITLES[s]}
              </button>
            </span>
          ))}
          .
        </NoteBox>
      )}

      {flagged.length > 0 && (
        <div className="gd-review-flags">
          <strong>Worth another look before you rely on the result</strong>
          <FindingList findings={flagged} />
        </div>
      )}

      {inputs && (
        <>
          <Part
            n={1}
            title="Your result"
            sub={`Compared with ${comparedWith}.`}
          >
            {results}
          </Part>
          {basedOn(2)}
          {exploring && (
            <Part
              n={3}
              title="Try different numbers"
              sub="Drag the rough figures. Your result updates as you go."
            >
              <TryNumbers
                d={d}
                set={set}
                cashNone={cashNone}
                inputs={shownInputs ?? inputs}
                horizon={effectiveHorizon}
              />
            </Part>
          )}
          <Part
            n={exploring ? 4 : 3}
            title="What to do next"
            sub="Each opens in a new tab, so your results stay here."
          >
            <NextSteps mode="guided" />
          </Part>
          <Part
            n={exploring ? 5 : 4}
            title="Save, share or see the full workings"
          >
          <ResultTools
            inputs={inputs}
            exploring={exploring}
            savedQuotes={savedQuotes}
            onQuotesChange={onQuotesChange}
          />
          <div className="gd-actions">
            {confirming ? (
              <div ref={confirmRef} className="gd-confirm" role="group" aria-label="Confirm replacing Advanced mode figures">
                <span>
                  Advanced mode already has figures of its own (from your edits
                  there, a saved quote or a shared link). Replace them with
                  these guided answers?
                </span>
                <Button
                  variant="primary"
                  onClick={() => {
                    trackEvent("guided_open_advanced", { replaced: true });
                    onOpenAdvanced(inputs, confirming.anchorId ?? ADVANCED_DETAILS_TOP);
                  }}
                >
                  Replace with my guided answers
                </Button>
                {onSwitchToAdvanced && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      trackEvent("guided_open_advanced", { replaced: false });
                      onSwitchToAdvanced();
                    }}
                  >
                    Keep my Advanced figures
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="primary" onClick={() => openAdvanced()}>
                Open full workings in Advanced mode
              </Button>
            )}
          </div>
          <p className="gd-small">
            Advanced mode gets a copy of these answers. Changes you make there
            don't flow back here.
          </p>
          </Part>
        </>
      )}
      {!inputs && basedOn(1)}

    </>
  );
}

/** A numbered, titled part of the results screen, so answers, results and next steps read as separate stages. */
function Part({
  n,
  title,
  sub,
  children,
}: {
  n: number;
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="gd-part" aria-label={title}>
      <header className="gd-part__head">
        <span className="gd-part__num" aria-hidden="true">
          {n}
        </span>
        <div>
          <h3 className="gd-part__title">{title}</h3>
          {sub && <p className="gd-part__sub">{sub}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  hint,
}: {
  hint?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="gd-slider">
      <div className="gd-slider__head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format(value)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={Math.min(min, value)}
        max={Math.max(max, value)}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <div className="nlc-field__hint">{hint}</div>}
    </div>
  );
}

const TRY_KEYS = [
  "driveaway",
  "mileage",
  "income",
  "leaseYears",
  "estimateRatePct",
] as const;

/** Above this, the lease's interest rate is high enough to explain a poor result on its own. */
const HIGH_LEASE_RATE_PCT = 12;

/**
 * One plain sentence per "worse off" line where the figures show the cause. Nothing is said when
 * they don't: a guess at the reason would be worse than none.
 */
function worseOffReasons(
  inputs: Inputs,
  fig: ReturnType<typeof summaryFigures>,
  ratePct: number | null,
  approx: boolean,
): ReactNode[] {
  const out: ReactNode[] = [];
  const amount = (n: number) => (approx ? `about ${money(Math.round(n / 1000) * 1000)}` : money(n));
  const financeWorse =
    fig.totalSaving < 0 || (inputs.compareWithCarLoan && fig.totalSavingVsLoan < 0);
  if (financeWorse && ratePct !== null && ratePct > HIGH_LEASE_RATE_PCT) {
    out.push(
      <>
        <strong>A big reason:</strong> the lease's interest rate is about{" "}
        {ratePct.toFixed(1).replace(/\.0$/, "")}%. Competitive leases tend to
        be around 10% or lower.{" "}
        <a href="/tools/byo-employer-check/" target="_blank" rel="noreferrer">
          Check whether your employer lets you bring your own finance
        </a>
        .
      </>,
    );
  }
  if (inputs.compareWithCurrentCar && fig.nlVsKeepSaving < 0 && fig.cashDelta < 0 && fig.assetDelta > 0) {
    out.push(
      <>
        <strong>Against keeping your current car:</strong> the lease means
        spending {amount(-fig.cashDelta)} more over {fig.years} years, and the
        new car is worth only {amount(fig.assetDelta)} more at the end.
      </>,
    );
  }
  return out;
}

/** One line per chosen comparison. With no cash to pay outright, paying cash is kept for reference and goes last. */
function comparisonLines(
  inputs: Inputs,
  fig: ReturnType<typeof summaryFigures>,
  cashNone: boolean,
  cashLabel: string,
): [string, number][] {
  const cash: [string, number] = [
    cashNone ? `${cashLabel} (for reference: you said you don't have the cash)` : cashLabel,
    fig.totalSaving,
  ];
  const others: [string, number][] = [
    ...(inputs.compareWithCarLoan ? [["a car loan", fig.totalSavingVsLoan] as [string, number]] : []),
    ...(inputs.compareWithCurrentCar
      ? [["keeping your current car", fig.nlVsKeepSaving] as [string, number]]
      : []),
  ];
  return cashNone ? [...others, cash] : [cash, ...others];
}

/** "$36,000 better off", rounded to the nearest $1,000 when approx; followed by "than …" when given. */
function Outcome({ net, approx, what }: { net: number; approx: boolean; what?: string }) {
  const shown = approx ? Math.round(Math.abs(net) / 1000) * 1000 : Math.abs(net);
  if (approx && shown === 0)
    return (
      <>
        <strong>about the same</strong>
        {what && <span> as {what} (within $1,000)</span>}
      </>
    );
  return (
    <>
      <strong className={net >= 0 ? "gd-pos" : "gd-neg"}>
        {approx ? "about " : ""}
        {money(shown)} {net >= 0 ? "better off" : "worse off"}
      </strong>
      {what && <span> than {what}</span>}
    </>
  );
}

/**
 * The answer first: one line per comparison, then the caveats once (not on every card).
 * The full breakdown sits in "Show how we got this" below.
 */
function ResultHeadline({
  inputs,
  horizon,
  approx = false,
  cashNone = false,
  ratePct = null,
  onEditCompare,
  onOpenAdvanced,
}: {
  /** The lease's effective interest rate, as a percentage, when known. */
  ratePct?: number | null;
  inputs: Inputs;
  horizon: "five_year" | "lease_end";
  /** "I don't have the cash to pay outright": paying cash is shown last, for reference. */
  cashNone?: boolean;
  onEditCompare?: () => void;
  /** Round to the nearest $1,000: an estimate from typical figures shouldn't look exact to the dollar. */
  approx?: boolean;
  /** Opens Advanced mode at the top, like the "Open full workings" button. */
  onOpenAdvanced: () => void;
}) {
  const fig = summaryFigures(inputs, horizon);
  const lines = comparisonLines(inputs, fig, cashNone, "paying cash");
  const reasons = worseOffReasons(inputs, fig, ratePct, approx);
  return (
    <div className="gd-headline" role="status">
      <div className="gd-headline__lead">Over {fig.years} years, a novated lease leaves you:</div>
      {lines.map(([what, net]) => (
        <div key={what} className="gd-headline__line">
          <Outcome net={net} approx={approx} what={what} />
        </div>
      ))}
      {reasons.map((r, i) => (
        <p key={i} className="gd-headline__why">
          {r}
        </p>
      ))}
      {cashNone && !inputs.compareWithCarLoan && (
        <p className="gd-headline__caveat">
          You said you'd pay cash if you didn't lease, but also that you don't
          have the cash.{" "}
          {onEditCompare && (
            <>
              If you'd borrow instead,{" "}
              <button type="button" className="gd-linkbtn" onClick={onEditCompare}>
                change what you're comparing
              </button>
              .
            </>
          )}
        </p>
      )}
      <p className="gd-headline__caveat">
        Not counted in these figures: changes to HECS repayments, childcare
        subsidy, the Medicare levy surcharge or Division 293 tax. Advanced mode
        works out the adjusted taxable income they're based on.{" "}
        {inputs.superFromPreNlIncome === "No" && <>Your super may also be reduced under this setup. </>}
        <button type="button" className="gd-linkbtn" onClick={onOpenAdvanced}>
          See the full workings
        </button>
        , and{" "}
        <a
          href="/start-here/is-it-worth-it/#start-with-a-holistic-view-rather-than-the-savings-figure"
          target="_blank"
          rel="noreferrer"
        >
          check the risks
        </a>{" "}
        before deciding.
      </p>
    </div>
  );
}

/**
 * Exploring only: sliders over the rough figures, so "what if I bought a cheaper car / drove less /
 * earned more?" doesn't mean clicking back through the screens. They change the reader's actual
 * answers, so Your answers, the cards below and Advanced mode all stay in step.
 */
function TryNumbers({
  d,
  set,
  inputs,
  horizon,
  cashNone = false,
}: StepProps & { inputs: Inputs; horizon: "five_year" | "lease_end"; cashNone?: boolean }) {
  const [original] = useState(() =>
    Object.fromEntries(TRY_KEYS.map((k) => [k, d[k]])),
  );
  const usedRef = useRef(false);
  const used = () => {
    if (usedRef.current) return;
    usedRef.current = true;
    trackEvent("guided_try_numbers_used");
  };
  const setMoney = (k: "driveaway" | "mileage" | "income", v: number) => {
    used();
    set(k, { text: String(v), none: false, estimated: false });
  };
  const changed = TRY_KEYS.some(
    (k) => JSON.stringify(d[k]) !== JSON.stringify(original[k]),
  );
  // The same totals the result cards show, one line per comparison the reader chose.
  const fig = summaryFigures(inputs, horizon);
  const lines = comparisonLines(inputs, fig, cashNone, "buying with cash");
  const ratePct = d.estimateRatePct ?? ASSUMED_EFFECTIVE_RATE * 100;
  const km = (v: number) => `${v.toLocaleString("en-AU")} km`;

  return (
    <section className="gd-try" aria-label="Try different numbers">
      <div className="gd-try__head">
        {changed && (
          <button
            type="button"
            className="gd-linkbtn"
            onClick={() => {
              for (const k of TRY_KEYS)
                set(k, original[k] as never);
            }}
          >
            Back to my answers
          </button>
        )}
      </div>
      <div className="gd-try__grid">
        <Slider
          label="Drive-away price"
          value={moneyValue(d.driveaway) ?? 0}
          min={20000}
          max={150000}
          step={500}
          format={money}
          onChange={(v) => setMoney("driveaway", v)}
        />
        <Slider
          label="Kilometres per year"
          value={moneyValue(d.mileage) ?? 0}
          min={2000}
          max={40000}
          step={500}
          format={km}
          onChange={(v) => setMoney("mileage", v)}
        />
        <Slider
          label="Taxable income"
          value={moneyValue(d.income) ?? 0}
          min={30000}
          max={300000}
          step={1000}
          format={money}
          onChange={(v) => setMoney("income", v)}
        />
        <Slider
          label="Lease term"
          value={d.leaseYears ?? 5}
          min={1}
          max={5}
          step={1}
          format={(v) => `${v} year${v > 1 ? "s" : ""}`}
          onChange={(v) => {
            used();
            set("leaseYears", v);
          }}
        />
        <Slider
          label="Effective interest rate"
          hint="Competitive leases tend to be around 10% or lower."
          value={ratePct}
          min={6}
          max={20}
          step={0.25}
          format={(v) => `${v.toFixed(2)}%`}
          onChange={(v) => {
            used();
            set(
              "estimateRatePct",
              Math.abs(v - ASSUMED_EFFECTIVE_RATE * 100) < 1e-9 ? null : v,
            );
          }}
        />
      </div>
      <div className="gd-try__result" role="status">
        <div className="gd-try__result-title">
          Novated lease over {fig.years} years, compared with:
        </div>
        {lines.map(([what, net]) => (
          <div key={what} className="gd-try__line">
            <span>{what}</span>
            <Outcome net={net} approx />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Copy link and save, so a guided result can be kept or shared without opening Advanced mode. */
function ResultTools({
  inputs,
  exploring,
  savedQuotes,
  onQuotesChange,
}: {
  inputs: Inputs;
  exploring: boolean;
  savedQuotes?: SavedQuoteV1[];
  onQuotesChange?: (quotes: SavedQuoteV1[]) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  async function copy() {
    trackEvent("copy_link_clicked", { source: "guided" });
    trackOncePerSession("copy_link_clicked", "copy_link_clicked");
    if (await copyShareLink(inputs)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function save() {
    if (!savedQuotes || !onQuotesChange) return;
    trackEvent("save_quote_clicked", { source: "guided" });
    trackOncePerSession("save_quote_clicked", "save_quote_clicked");
    const q: SavedQuoteV1 = {
      v: 1,
      id: newQuoteId(),
      name:
        name.trim() ||
        `${exploring ? "Estimate" : "Quote"} ${savedQuotes.length + 1}`,
      createdAtIso: new Date().toISOString(),
      inputs,
    };
    const next = [q, ...savedQuotes];
    onQuotesChange(next);
    safeSaveQuotes(next);
    setSaved(q.name);
    setNaming(false);
    setName("");
  }

  return (
    <div className="gd-actions">
      <Button variant="secondary" onClick={copy}>
        {copied ? "Link copied!" : "Copy share link"}
      </Button>
      {savedQuotes && onQuotesChange && !naming && (
        <Button variant="secondary" onClick={() => setNaming(true)}>
          Save this result
        </Button>
      )}
      {naming && (
        <div className="gd-save">
          <input
            className="nlc-input"
            aria-label="Name for this saved result"
            placeholder={exploring ? "e.g. EV estimate" : "e.g. Provider A quote"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
            }}
          />
          <Button variant="primary" onClick={save}>
            Save
          </Button>
          <Button variant="ghost" onClick={() => setNaming(false)}>
            Cancel
          </Button>
        </div>
      )}
      {saved && (
        <span className="gd-small" role="status">
          Saved as "{saved}". Saved results are listed under Saved quotes in
          Advanced mode, where you can compare them side by side.
        </span>
      )}
    </div>
  );
}
