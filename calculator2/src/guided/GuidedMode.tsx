import {
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
import { SummaryView } from "../components/SummaryView";
import { trackEvent, trackOncePerSession } from "../utils/analytics";
import { copyShareLink } from "../utils/shareLink";
import { computeFinancialSummary, computeTotalSaving } from "../engineAdapter";
import { ASSUMED_EFFECTIVE_RATE } from "../assumptions";
import { COFFEE_NUDGE_GUIDED_RESULTS_DWELL_MS, noteInputChange } from "../state/engagement";
import { newQuoteId, safeSaveQuotes, type SavedQuoteV1 } from "../state/savedQuotes";
import {
  CAR_LIMIT_FY2027,
  STEP_IDS,
  STEP_TITLES,
  annualOf,
  asksMarketValueEnd,
  atoMinimumResidualExGst,
  buildInputs,
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
  moneyValue,
  nearEvThreshold,
  needsExploreStart,
  needsUsedEvChecks,
  paymentPerFn,
  residualExGstEntered,
  runningFactor,
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
import { Choices, FindingList, Help, MoneyInput } from "./parts";
import { QuoteDiagram, type QuoteKey } from "./QuoteDiagram";

const HOW_TO_USE = "/start-here/use-nl-calculator/#your-financial-details";
const FAQ_TERMS = "/calculator/#faq-fractional-terms";
const GST_ARTICLE = "/running-costs/failure-to-pass-gst-saving/";
const NSW_ARTICLE = "/special-and-policy/nsw-health-employer-share/";
import "./guided.css";

/** Kept in localStorage so a reader can come back to a half-entered quote later; "Start over" clears it. */
const STORAGE_KEY = "nlc2-guided-draft-v3";
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
      basis: d.residualBasis,
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
    }),
    curValueEnd: d.compareCurrent
      ? checkCurrentCarValueEnd({
          now: moneyValue(d.curValueNow),
          end: currentCarValueEnd(d),
          years: d.leaseYears,
        })
      : [],
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

type FindingMap = ReturnType<typeof findingsFor>;

const STEP_FIELDS: Partial<Record<StepId, (keyof FindingMap)[]>> = {
  quick: ["evThreshold", "mileage"],
  price: ["prices"],
  lease: ["docFee", "residual", "marketValue"],
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
  alternatives: ["loan", "curValueEnd"],
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
  const missing = missingForStep(step, draft);
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

  function next() {
    if (missing.length > 0 || blocked) {
      setTried(true);
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

      <div className="gd-card" data-tour-id="guided-card">
        <h2 className="gd-title">{STEP_TITLES[step]}</h2>

        {step === "intro" && (
          <Intro
            d={draft}
            onChoose={(hasQuote) => {
              set("hasQuote", hasQuote);
              trackEvent("guided_path", { has_quote: hasQuote });
              go("car");
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
              I've double-checked these figures against my quote and want to
              continue anyway.
            </span>
          </label>
        )}

        {tried && missing.length > 0 && (
          <div className="gd-missing" role="alert">
            <strong>Still to answer:</strong> {missing.join(", ")}.
          </div>
        )}
        {tried && missing.length === 0 && blocked && (
          <div className="gd-missing" role="alert">
            Please fix the highlighted figure, or tick the box to continue
            anyway.
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
              {step === "intro"
                ? "Continue"
                : steps[stepIndex + 1] === "review"
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
  if (d.residualBasis === "unknown") {
    const ato = atoMinimumResidualExGst(d);
    if (ato) out.residual = `${money(ato)} ex GST`;
  }
  if (residual && (d.residualBasis === "incGst" || d.residualBasis === "exGst"))
    out.residual = `${money(residual)} ${d.residualBasis === "incGst" ? "inc" : "ex"} GST`;
  if (payment && d.paymentPeriod)
    out.payment = `${money(payment)} per ${d.paymentPeriod === "perMonth" ? "month" : "fortnight"}${d.paymentBasis === "incGst" ? " inc GST" : d.paymentBasis === "exGst" ? " ex GST" : ""}`;
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
  return (
    <div className="gd-split">
      <div className="gd-split__main">{children}</div>
      <aside className="gd-split__side">
        <QuoteDiagram highlight={highlight} values={quoteValues(d)} />
      </aside>
    </div>
  );
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
      <Lead>
        We ask for one thing at a time, show you where each figure sits on a
        typical quote, and flag the slips that are easy to make.
      </Lead>
      <Choices
        label="Do you have a novated lease quote yet?"
        value={d.hasQuote}
        onChange={onChoose}
        options={[
          {
            value: true,
            label: "Yes, I have a quote",
            sub: "About five minutes. The most accurate result",
          },
          {
            value: false,
            label: "No, I'm just exploring",
            sub: "About two minutes. Far fewer questions, with the rest filled in with common, standard assumptions",
          },
        ]}
        columns={2}
        hint="You can start with an estimate and enter your quote later without losing your answers."
      />
      <div className="gd-checklist">
        <strong>If you have a quote, have these ready</strong>
        <ul>
          <li>
            Your <strong>novated lease quote</strong> (PDF or email). It has the
            drive-away price, residual, lease payment and fees.
          </li>
          <li>Your annual taxable income (a recent payslip or tax return).</li>
          <li>
            Rough servicing, registration and insurance costs, or we can
            suggest typical ones.
          </li>
        </ul>
      </div>
      {onSwitchToAdvanced && (
        <div className="gd-skip">
          Been here before, or prefer every input on one page?{" "}
          <button
            type="button"
            className="gd-linkbtn"
            onClick={() => {
              trackEvent("guided_skip_to_advanced");
              onSwitchToAdvanced();
            }}
          >
            Skip to Advanced mode
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
        We fill in the rest (finance rate, fees, running costs) with typical
        figures, which we list on the results page. The result is an estimate,
        so get a real quote before you decide anything.
      </NoteBox>
      <MoneyInput
        label="Approximate drive-away price"
        value={d.driveaway}
        onChange={(m) => set("driveaway", m)}
        where="The total on-road price: the car plus CTP, stamp duty and rego."
        hint="Look it up on the dealer or manufacturer's website if you don't have a quote yet."
        findings={f.evThreshold}
      />
      <Choices
        label="Lease term"
        value={d.leaseYears}
        onChange={(v) => set("leaseYears", v)}
        options={[1, 2, 3, 4, 5].map((y) => ({
          value: y,
          label: `${y} year${y > 1 ? "s" : ""}`,
        }))}
        columns={5}
        hint={
          <>
            Whole years only: we do not support partial years.{" "}
            <a href={FAQ_TERMS} target="_blank" rel="noreferrer">
              Read more about the rationale
            </a>
            .
          </>
        }
      />
      <MoneyInput
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
      <Lead>
        A lease is only better or worse than something else. What would you
        realistically do instead?
      </Lead>
      <NoteBox color="var(--nlc-warn)" mb={20}>
        <strong>This framing is very important.</strong> The same lease can look
        like a big saving against a car loan and a net cost against keeping a
        paid-off car. Answer for what you would realistically do if you did not
        take the lease. Buying the car outright with cash is always shown as
        well.
      </NoteBox>
      <Choices
        label="If you didn't lease, would you buy this car with a car loan?"
        value={d.compareLoan}
        onChange={(v) => set("compareLoan", v)}
        options={[
          {
            value: true,
            label: "Yes, compare with a car loan",
            sub: "We'll ask for the loan details later",
          },
          { value: false, label: "No, I would otherwise be paying cash" },
        ]}
        columns={2}
        hint="Pick this when you'd borrow to buy a similar car anyway."
      />
      <Choices
        label="Could you keep driving the car you own now instead?"
        value={d.compareCurrent}
        onChange={(v) => set("compareCurrent", v)}
        options={[
          {
            value: true,
            label: "Yes, compare with keeping it",
            sub: "We'll ask for its value and running costs later",
          },
          { value: false, label: "No, I'd replace it either way" },
        ]}
        columns={2}
        hint="Pick this when staying put is a real option, not when the car is about to die or is already gone."
      />
    </>
  );
}

function CarStep({ d, set }: StepProps) {
  const showUsedEv = needsUsedEvChecks(d);
  const fbt = fbtCategoryOf(d);
  return (
    <>
      <Lead>
        These answers decide which tax rules apply, so they matter even before
        any dollar figures.
      </Lead>
      <Choices
        label="What type of car is it?"
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
        hint="Since 1 April 2025 no hybrid qualifies for the EV FBT exemption, plug-in hybrids included. Only fully electric cars do."
      />
      <Choices
        label="Is it new or used?"
        value={d.vehicleCondition}
        onChange={(v) => set("vehicleCondition", v)}
        options={[
          { value: "New", label: "New" },
          {
            value: "Used – dealer sale (GST inc)",
            label: "Used, from a dealer",
            sub: "Price includes GST",
          },
          {
            value: "Used – private sale (no GST)",
            label: "Used, private sale",
            sub: "No GST in the price",
          },
        ]}
        columns={3}
      />
      {d.hasQuote !== false && (
        <div className="nlc-field">
          <label className="nlc-field__label" htmlFor="gd-start">
            When does the lease start?
          </label>
          <div className="gd-where">
            It sets which{" "}
            <a
              href="/special-and-policy/ev-fbt-exemption-phase-out-budget-2026/"
              target="_blank"
              rel="noreferrer"
            >
              EV FBT phase-out tier
            </a>{" "}
            applies, and it's also used to work out the precise FBT-year (1
            April to 31 March) and financial-year (1 July to 30 June) breakdown
            of income, tax and the rest.
          </div>
          <div className="gd-where">
            We ask it on this screen because, for a used electric car, it
            decides whether the history questions below apply. We suggest at
            least one or two months from now, as that's practically the time
            required for sourcing a car, finalising the paperwork and shipping.
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
        </div>
      )}
      {needsExploreStart(d) && (
        <Choices<"before" | "after">
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
          hint={
            <>
              The EV FBT exemption starts phasing out for leases from 1 April
              2027, so this can change the result a lot.{" "}
              <a
                href="/special-and-policy/ev-fbt-exemption-phase-out-budget-2026/"
                target="_blank"
                rel="noreferrer"
              >
                Read about the phase-out
              </a>
              .
            </>
          }
        />
      )}
      {showUsedEv && (
        <>
          <Choices
            label="Was the car first held and used on or after 1 July 2022?"
            value={d.usedAfter2022}
            onChange={(v) => set("usedAfter2022", v)}
            options={[
              { value: true, label: "Yes" },
              { value: false, label: "No" },
            ]}
            hint="For a used EV to be FBT-exempt, nobody can have held and used it before this date."
          />
          <Choices
            label="Has Luxury Car Tax ever been payable on it?"
            value={d.usedLctNever === null ? null : !d.usedLctNever}
            onChange={(v) => set("usedLctNever", !v)}
            options={[
              { value: true, label: "Yes, or not sure" },
              { value: false, label: "No, never" },
            ]}
            hint="If you're unsure, ask the dealer. A used car that has attracted LCT doesn't qualify."
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
      <Lead>
        Two prices from the vehicle section of your quote. They're often
        confused, and they're not the same number.
      </Lead>
      <MoneyInput
        label="FBT base value (including GST)"
        tooltip={
          <InfoTooltip
            text={
              "Listed on the car invoice prior to stamp duty, rego, and CTP insurance. Many invoices label this vehicle subtotal.\n\n" +
              "✅ Included: the car's RRP, GST on the car, delivery fee, optional add-ons (e.g. floor mats, tow bar), and any Luxury Car Tax (LCT) if payable.\n\n" +
              "❌ Not included: compulsory third party (CTP) insurance, registration, stamp duty."
            }
          />
        }
        value={d.baseValue}
        onChange={(m) => set("baseValue", m)}
        where="Before stamp duty, rego and on-road costs. This is the figure the FBT rules use."
        hint="Also known as: vehicle subtotal, vehicle cost, RRP etc. It includes GST."
        findings={f.prices.filter((x) => x.code === "base_exceeds_driveaway")}
      />
      <MoneyInput
        label="Drive-away price"
        value={d.driveaway}
        onChange={(m) => set("driveaway", m)}
        where="Everything above plus CTP, stamp duty and rego."
        hint="Always at least as high as the FBT base value, usually 3% to 10% higher."
        findings={f.prices.filter((x) => x.code !== "base_exceeds_driveaway")}
      />
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
  const deferValue = d.monthsDeferredUnsure
    ? "unsure"
    : d.monthsDeferred === null
      ? null
      : String(d.monthsDeferred);
  return (
    <Side highlight={["term", "defer", "docFee", "residual"]} d={d}>
      <Lead>The finance terms from your quote.</Lead>
      <Choices
        label="Lease term"
        value={d.leaseYears}
        onChange={(v) => set("leaseYears", v)}
        options={[1, 2, 3, 4, 5].map((y) => ({
          value: y,
          label: `${y} year${y > 1 ? "s" : ""}`,
        }))}
        columns={5}
        hint={
          <>
            Whole years only: we do not support partial years.{" "}
            <a href={FAQ_TERMS} target="_blank" rel="noreferrer">
              Read more about the rationale
            </a>
            .
          </>
        }
      />
      <Choices<string>
        label="Months before the first payment (deferred)"
        value={deferValue}
        onChange={(v) => {
          if (v === "unsure") {
            setDraftDefer(set, 2, true);
          } else {
            setDraftDefer(set, Number(v), false);
          }
        }}
        options={[
          { value: "0", label: "None" },
          { value: "1", label: "1 month" },
          { value: "2", label: "2 months", sub: "Most common" },
          { value: "unsure", label: "Not sure" },
        ]}
        columns={4}
        hint={
          d.monthsDeferredUnsure
            ? "We'll assume 2 months, the most common arrangement."
            : "Quotes often say 'first payment due after 2 months'."
        }
      />
      <MoneyInput
        label="Documentation fee"
        value={d.docFee}
        onChange={(m) => set("docFee", m)}
        where="Sometimes called an establishment or lease set-up fee. On some quotes it is mentioned only in the small print of the terms and conditions, so check there too."
        noneLabel="My quote has no documentation fee ($0)"
        findings={f.docFee}
      />
      <Choices
        label="How does your quote show the residual (balloon) value?"
        value={d.residualBasis}
        onChange={(v) => set("residualBasis", v)}
        options={[
          {
            value: "incGst",
            label: "Including GST",
            sub: "Most quotes print this one",
          },
          { value: "exGst", label: "Excluding GST", sub: "ex GST" },
          {
            value: "unknown",
            label: "I can't find it",
            sub: "Use the ATO minimum",
          },
        ]}
        columns={3}
        hint="Look for the word GST next to the figure. This is the most common entry mistake, so please check."
      />
      {d.residualBasis === "unknown" && (
        <NoteBox mb={20}>
          We'll use the ATO minimum for a {d.leaseYears ?? "?"}-year lease
          {atoMin
            ? `, about ${money(atoMin)} excluding GST (${money(atoMin * 1.1)} including GST)`
            : ""}
          . Almost every lease uses this figure. Check your quote when you can,
          because it should be printed there.
        </NoteBox>
      )}
      {(d.residualBasis === "exGst" || d.residualBasis === "incGst") && (
        <MoneyInput
          label={`Residual value (${d.residualBasis === "incGst" ? "including GST" : "excluding GST"})`}
          value={d.residual}
          onChange={(m) => set("residual", m)}
          where="Type the figure exactly as printed."
          findings={f.residual}
        />
      )}
      {asksMarketValueEnd(d) && d.leaseYears && moneyValue(d.driveaway) ? (
        <MoneyInput
          label={`Estimated market value of the car at the end of the lease (after ${d.leaseYears} year${d.leaseYears > 1 ? "s" : ""})`}
          value={
            d.marketValueEnd.estimated
              ? {
                  ...d.marketValueEnd,
                  text: String(typicalMarketValueAtLeaseEnd(d) ?? ""),
                }
              : d.marketValueEnd
          }
          onChange={(m) => set("marketValueEnd", m)}
          where="What you could sell it for at that point. Used-car listings for the same model and age are a good guide."
          hint="This is not on your quote. We ask because you're comparing with keeping your current car, where the value of each car at the end is part of the comparison."
          suggestion={typicalMarketValueAtLeaseEnd(d)}
          estimatedNote="A typical estimate. Replace it if used-car listings for your model suggest a different figure."
          findings={f.marketValue}
        />
      ) : null}
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
  return (
    <Side highlight={["payment", "luxAdj", "running"]} d={d}>
      <Lead>
        Use only the <strong>vehicle finance</strong> payment. Servicing,
        insurance, rego and fees are separate lines that we ask about next.
      </Lead>
      <Choices
        label="Is your quote's payment shown fortnightly or monthly?"
        value={d.paymentPeriod}
        onChange={(v) => {
          // A corrected payment is our own figure, so keep it meaning the same amount in the new period.
          const typed = moneyValue(d.payment);
          if (d.paymentCorrected && typed && d.paymentPeriod && v !== d.paymentPeriod)
            set("payment", {
              ...d.payment,
              text: (v === "perMonth" ? (typed * 26) / 12 : (typed * 12) / 26).toFixed(2),
            });
          set("paymentPeriod", v);
        }}
        options={[
          { value: "perFn", label: "Per fortnight" },
          { value: "perMonth", label: "Per month" },
        ]}
        columns={2}
      />
      <Choices<"exGst" | "incGst" | "unknown">
        label="Does the payment say including or excluding GST?"
        value={d.paymentBasis}
        onChange={(v) => set("paymentBasis", v)}
        options={[
          { value: "exGst", label: "Excluding GST" },
          { value: "incGst", label: "Including GST" },
          {
            value: "unknown",
            label: "It doesn't say",
            sub: "We'll assume ex GST and check it",
          },
        ]}
        columns={3}
        hint="Look for the word GST next to the payment."
      />
      <Choices
        label="Is your lease with Smart Leasing or MillarX?"
        value={d.smartMillarx}
        onChange={(v) => set("smartMillarx", v)}
        options={[
          { value: true, label: "Yes", sub: "Smart Leasing or MillarX" },
          { value: false, label: "No", sub: "Any other provider" },
        ]}
        columns={2}
        hint="These two providers quote a payment that includes a budget-reserve buffer, so their figure needs a correction before it is entered here."
      />
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
        ) : (
          <div className="gd-callout gd-callout--must" role="alert">
            <div className="gd-callout__title">
              You need to correct your Smart Leasing / MillarX payment first
            </div>
            <p>
              The payment printed on these quotes includes a budget-reserve
              buffer, so typing it in as is makes the lease look more expensive
              than it is. The correction tool turns it into the finance-only
              payment this calculator needs and fills it in below.
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
        ))}
      {adjustOpen && d.leaseYears && (
        <LeaseAdjustModal
          leaseDurationYears={d.leaseYears}
          onClose={() => setAdjustOpen(false)}
          onApply={(perFn) => {
            const inMonths = d.paymentPeriod === "perMonth";
            if (!d.paymentPeriod) set("paymentPeriod", "perFn");
            set("payment", {
              text: (inMonths ? (perFn * 26) / 12 : perFn).toFixed(2),
              none: false,
              estimated: false,
            });
            // The tool's output is the finance-only, ex GST figure the engine takes.
            set("paymentBasis", "exGst");
            set("paymentCorrected", true);
            setAdjustOpen(false);
          }}
        />
      )}
      <MoneyInput
        label="Finance (lease) payment"
        value={d.payment}
        onChange={(m) => {
          set("payment", m);
          set("paymentCorrected", false);
        }}
        where={
          d.smartMillarx
            ? "Filled in by the correction tool above. Don't type the figure printed on your Smart Leasing or MillarX quote."
            : "The pre-tax payment for the car itself, before the running-costs line. Type it exactly as printed."
        }
        suffix={
          d.paymentPeriod === "perMonth"
            ? "per month"
            : d.paymentPeriod === "perFn"
              ? "per fortnight"
              : undefined
        }
        findings={[...f.payment, ...f.paymentCorrected]}
      />
      {diag?.status === "ok" && diag.rate !== null && (
        <div className="gd-stat">
          <span className="gd-stat__label">Effective interest rate</span>
          <span className="gd-stat__value">
            {(diag.rate * 100).toFixed(2)}%
          </span>
          {perFn && (d.paymentPeriod === "perMonth" || d.paymentBasis === "incGst") && (
            <span className="gd-stat__sub">
              about {money(perFn)} per fortnight ex GST
            </span>
          )}
        </div>
      )}
      {luxury && (
        <MoneyInput
          label={`Luxury vehicle adjustment (${d.paymentPeriod === "perMonth" ? "per month" : "per fortnight"})`}
          tooltip={
            <InfoTooltip
              text={
                `Only applies to vehicles costing more than the ATO car limit ($${CAR_LIMIT_FY2027.toLocaleString("en-AU")} for FY2026-27, indexed each July), due to complex employer accounting reasons. It is a separate concept from the Luxury Car Tax (LCT) threshold. Listed separately on some quotes.\n\n` +
                "[Read sgfleet's explainer on the luxury vehicle adjustment](https://www.sgfleet.com/docs/australialibraries/novated/novated-support/7-sgf-oct2024-luxury-vehicle-adjustment.pdf)"
              }
            />
          }
          value={d.luxAdj}
          onChange={(m) => set("luxAdj", m)}
          where="A separate line on quotes for cars above the ATO car limit."
          noneLabel="No luxury vehicle adjustment on my quote"
          suffix={d.paymentPeriod === "perMonth" ? "per month" : "per fortnight"}
          hint={`It's an extra cost on top of the finance payment. Enter it per ${d.paymentPeriod === "perMonth" ? "month, like the payment above; we convert it to fortnightly for you" : "fortnight, like the payment above"}.`}
        />
      )}
    </Side>
  );
}

const PERIOD_WORD: Record<RunningPeriod, string> = {
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
        const v = m.none ? null : Number(m.text.replace(/[$,\s]/g, ""));
        if (v !== null && m.text.trim() !== "" && Number.isFinite(v)) {
          set(k, {
            ...m,
            text: String(Math.round(((v * from) / to) * 100) / 100),
          });
        }
      }
    }
    set("runningPeriod", next);
  }
  const gstTag = d.gstPassedOn ? (
    <span className="gd-gsttag">
      {d.gstPassedOn === "No" ? "inc GST" : "ex GST"}
    </span>
  ) : null;
  const typicalIn = (annual?: number | null) =>
    annual && period ? annual / factor : null;

  return (
    <>
      <Lead>
        Running costs from your quote's budget section, plus how far you expect
        to drive.
      </Lead>
      <GstMock />
      <Choices<YesNoUnsure>
        label="Does your quote's running-cost breakdown say inc GST or ex GST?"
        value={d.gstPassedOn}
        onChange={(v) => set("gstPassedOn", v)}
        options={[
          {
            value: "Yes",
            label: "Excluding GST",
            sub: "Table heading says amount exc GST",
          },
          {
            value: "No",
            label: "Including GST",
            sub: "Table heading says amount inc GST, with no obvious additional lines of GST / ITC being subtracted later",
          },
          {
            value: "Unsure",
            label: "Not sure",
            sub: "We'll assume excluding GST",
          },
        ]}
        columns={3}
        hint={
          <>
            We ask because some employers (Victorian hospitals in particular)
            don't pass the GST saving on to you.{" "}
            <a href={GST_ARTICLE} target="_blank" rel="noreferrer">
              Read more about the GST saving
            </a>
            .
          </>
        }
      />
      <MoneyInput
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
        label="I want to enter the running costs as a"
        value={period}
        onChange={changePeriod}
        options={[
          { value: "perFn", label: "Fortnightly figure" },
          { value: "perMonth", label: "Monthly figure" },
          { value: "perYear", label: "Yearly figure" },
        ]}
        columns={3}
        hint="Use whichever your quote shows, so there's no multiplying to do. All the boxes below use this period."
      />
      <div className="gd-grid2">
        <MoneyInput
          label={<>Servicing, maintenance and tyres{gstTag}</>}
          value={d.service}
          onChange={(m) => set("service", m)}
          suffix={suffix}
          suggestion={typicalIn(typical?.service)}
          findings={f.service}
        />
        <MoneyInput
          label={<>Registration and CTP{gstTag}</>}
          value={d.rego}
          onChange={(m) => set("rego", m)}
          suffix={suffix}
          suggestion={typicalIn(typical?.rego)}
          findings={f.rego}
        />
        <MoneyInput
          label={<>Insurance{gstTag}</>}
          value={d.insurance}
          onChange={(m) => set("insurance", m)}
          suffix={suffix}
          suggestion={typicalIn(typical?.insurance)}
          hint="Comprehensive insurance. Shop around and compare with your own provider's quote."
          findings={f.insurance}
        />
        <MoneyInput
          label={<>Lease management fees{gstTag}</>}
          value={d.mgmt}
          onChange={(m) => set("mgmt", m)}
          suffix={suffix}
          suggestion={typicalIn(typical?.mgmt)}
          findings={f.mgmt}
          where="Often called an admin or management fee. Add up all the membership and management fees on the quote."
        />
      </div>
      {!isEv && (
        <MoneyInput
          label={<>Fuel{gstTag}</>}
          value={d.fuel}
          onChange={(m) => set("fuel", m)}
          suffix={suffix}
          suggestion={typicalIn(typical?.fuel)}
          findings={f.fuel}
          where="As shown for fuel in the running-costs section."
        />
      )}
      {isEv && (
        <>
          <MoneyInput
            label="Electricity price you pay to charge, per kWh"
            suffix="per kWh"
            value={d.chargingRate}
            onChange={(m) => set("chargingRate", m)}
            where="Your blended price across home and public charging. Type any figure, down to 0.01."
            noneLabel="Fully solar or free charging ($0)"
            hint="Only used to estimate your real electricity cost. The tax claim itself uses the ATO's 5.47c/km shortcut rate."
            findings={f.charging}
          />
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
        </>
      )}
    </>
  );
}

function YouStep({ d, set, f }: StepPropsF) {
  const quote = d.hasQuote !== false;
  return (
    <>
      <Lead>Your tax position decides how much a lease saves you.</Lead>
      <MoneyInput
        label="Your annual taxable income (e.g. refer to recent tax return or payslip)"
        value={d.income}
        onChange={(m) => set("income", m)}
        where="Add up ALL your jobs and other taxable income, not just the workplace this novated lease is organised through. Then subtract your deductions. It's the yearly figure, before tax."
        hint="This is the 'taxable income' line on your tax return, before the lease."
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
      label="Does your employer calculate super on your pre-lease salary?"
      value={d.superPreNl}
      onChange={(v) => set("superPreNl", v)}
      options={[
        { value: "Yes", label: "Yes", sub: "Super is unaffected" },
        { value: "No", label: "No", sub: "Super falls with the lease" },
        { value: "Unsure", label: "Not sure", sub: "We'll assume yes" },
      ]}
      columns={3}
      hint={
        <>
          Usually yes, but in roughly 10% of cases the employer calculates
          super on the lower post-lease salary. It affects thousands of dollars
          over a lease, so it's worth checking with payroll.{" "}
          <a
            href="/costs-and-savings/super-guarantee-and-payroll-risks/"
            target="_blank"
            rel="noreferrer"
          >
            Why it matters
          </a>
          .
        </>
      }
    />
  );
}

function CashQuestion({ d, set, f }: StepPropsF) {
  return (
    <>
      <Choices
        label="If you paid cash for the car instead, where is that money now?"
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
            sub: "Against the loan on the home you live in",
          },
          {
            value: "ipOffset",
            label: "Investment property offset",
            sub: "Against an investment property loan",
          },
          {
            value: "savings",
            label: "Savings account",
            sub: "e.g. a high-interest savings account (HISA)",
          },
          {
            value: "invested",
            label: "Invested",
            sub: "Shares, crypto etc",
          },
          { value: "none", label: "It doesn't earn anything" },
        ]}
        columns={5}
        hint={
          <>
            The comparison against buying the car with cash needs to know what
            that cash would otherwise earn. If it would otherwise be invested in
            shares, crypto and the like, we recommend{" "}
            <strong>not</strong> using an expected return, because investment
            returns are uncertain and fluctuate. Choose the next best safe
            return instead, for example your savings account or a home or
            investment property loan offset. If you still insist, choose "Invested" and enter a post-tax
            figure, and understand the issue with that assumption. See{" "}
            <a href={HOW_TO_USE} target="_blank" rel="noreferrer">
              how to use the calculator
            </a>
            .
          </>
        }
      />
      {d.cashHome === "offset" && (
        <MoneyInput
          label="Home loan interest rate"
          prefix=""
          suffix="% a year"
          value={d.offsetRate}
          onChange={(m) => set("offsetRate", m)}
          where="The rate on your home loan, for example 6.2. Use that rate directly: interest on the home you live in isn't tax-deductible, so no adjustment is needed. If the offset is against an investment property loan, choose that option instead."
          findings={f.offset}
        />
      )}
      {d.cashHome === "ipOffset" && (
        <MoneyInput
          label="Investment property loan interest rate"
          prefix=""
          suffix="% a year"
          value={d.savingsRatePreTax}
          onChange={(m) => set("savingsRatePreTax", m)}
          where="The rate on the investment loan the offset account sits against, for example 6.5. The interest you avoid would otherwise be a tax deduction, so it's worth less to you than the headline rate. We take your tax off it for you."
          findings={f.savings}
        />
      )}
      {d.cashHome === "savings" && (
        <MoneyInput
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
          label="Assumed return after tax"
          prefix=""
          suffix="% a year"
          value={d.investedRate}
          onChange={(m) => set("investedRate", m)}
          where="A cautious post-tax figure, for example 3. Returns on these assets are not guaranteed and can be negative."
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
        label="Are you a doctor or nurse employed by NSW Health?"
        value={d.nswHealth}
        onChange={(v) => set("nswHealth", v)}
        options={[
          { value: false, label: "No" },
          { value: true, label: "Yes" },
        ]}
        columns={2}
        hint={
          <>
            NSW Health doctors and nurses are required to share some of their
            tax savings with their employer. If that's not you, answer No.{" "}
            <a href={NSW_ARTICLE} target="_blank" rel="noreferrer">
              Read more
            </a>
            .
          </>
        }
      />
      {d.nswHealth && (
        <>
          <Choices<RunningPeriod>
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
            label="Employer share of your tax savings"
            value={d.nswAmount}
            onChange={(m) => set("nswAmount", m)}
            suffix={d.nswPeriod ? PERIOD_WORD[d.nswPeriod] : undefined}
            where="Your NSW Health salary-packaging statement shows this."
            hint="In theory this could be worked out from your role and hours. We've chosen not to derive it automatically: the rules are applied inconsistently, and we don't want to present a confident projection we can't stand behind. Please enter the figure your employer gives you."
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
        . These figures decide how that comparison turns out, so use real
        figures where you have them. Typical figures are offered as a starting
        point.
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
            label="Deposit paid up front"
            value={d.loanDeposit}
            onChange={(m) => set("loanDeposit", m)}
            noneLabel="No deposit ($0)"
          />
          <MoneyInput
            label="Loan interest rate"
            prefix=""
            suffix="% a year"
            value={d.loanRate}
            onChange={(m) => set("loanRate", m)}
            where="From a loan offer or pre-approval, for example 7.5. Use the actual interest rate, not the comparison rate."
            findings={f.loan}
          />
          <MoneyInput
            label="Loan monthly account fee"
            value={d.loanFee}
            onChange={(m) => set("loanFee", m)}
            noneLabel="No monthly fee ($0)"
          />
        </section>
      )}
      {d.compareCurrent && <CurrentCarFields d={d} set={set} f={f} />}
    </>
  );
}

const CUR_TYPICAL =
  "Typical estimate. Replace it if you know what this car actually costs you.";

function CurrentCarFields({ d, set, f }: StepPropsF) {
  const t = typicalCurrentCar(d);
  const years = d.leaseYears;
  return (
    <section className="gd-sub">
      <h3 className="gd-sub__title">Keeping your current car</h3>
      <p className="gd-small">
        Yearly running costs of the car you own now, including GST.
      </p>
      <div className="gd-grid2">
        <MoneyInput
          label="Market value today"
          value={d.curValueNow}
          onChange={(m) => set("curValueNow", m)}
          where="What you could sell it for. Look it up on carsales.com.au or a similar site."
        />
        <MoneyInput
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
          label="Servicing, maintenance and tyres"
          value={d.curService}
          onChange={(m) => set("curService", m)}
          suffix="per year"
          noneLabel="None"
          suggestion={t.service}
          estimatedNote={CUR_TYPICAL}
        />
        <MoneyInput
          label="Registration and CTP"
          value={d.curRego}
          onChange={(m) => set("curRego", m)}
          suffix="per year"
          noneLabel="None"
          suggestion={t.rego}
          estimatedNote={CUR_TYPICAL}
        />
        <MoneyInput
          label="Fuel or electricity"
          value={d.curFuel}
          onChange={(m) => set("curFuel", m)}
          suffix="per year"
          noneLabel="None"
          suggestion={t.fuel}
          estimatedNote={CUR_TYPICAL}
        />
        <MoneyInput
          label="Insurance"
          value={d.curInsurance}
          onChange={(m) => set("curInsurance", m)}
          suffix="per year"
          noneLabel="None"
          suggestion={t.insurance}
          estimatedNote={CUR_TYPICAL}
        />
      </div>
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
  const [horizon, setHorizon] = useState<"five_year" | "lease_end">(
    "five_year",
  );
  /** A pending "open in Advanced" that would replace figures already there. */
  const [confirming, setConfirming] = useState<{ anchorId?: string } | null>(
    null,
  );
  const assumptions = exploring ? estimateAssumptions(d) : null;
  const incomplete = visibleSteps(d).filter(
    (s) => s !== "intro" && s !== "review" && missingForStep(s, d).length > 0,
  );
  const diag = paymentDiagnosisFor(d);
  const fbt = fbtCategoryOf(d);
  const flagged = visibleFindings(d, f).filter(
    (x) => x.level === "error" || x.level === "warn",
  );
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
    onOpenAdvanced(inputs, anchorId);
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
            ? "Earns nothing"
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
              ? `${money(residualExGstEntered(d)!)}${d.residualBasis === "unknown" ? " (ATO minimum)" : ""}`
              : "?",
            "lease",
          ],
          asksMarketValueEnd(d)
            ? [
                "Market value at lease end",
                marketValueEndEntered(d)
                  ? `${money(marketValueEndEntered(d)!)}${d.marketValueEnd.estimated ? " (typical estimate)" : ""}`
                  : "?",
                "lease",
              ]
            : null,
          [
            "Lease payment",
            paymentPerFn(d)
              ? `${money(moneyValue(d.payment) ?? 0)} per ${d.paymentPeriod === "perMonth" ? "month" : "fortnight"}${d.paymentBasis === "incGst" ? " inc GST" : d.paymentBasis === "exGst" ? " ex GST" : " (GST not stated, taken as ex GST)"}`
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
      <div className="gd-results">
        <SummaryView
          inputs={shownInputs ?? inputs}
          horizon={effectiveHorizon}
          onNavigateToDetails={(anchorId) => openAdvanced(anchorId)}
          onMoreDetails={(anchorId) => {
            trackEvent("guided_more_details_clicked");
            openAdvanced(anchorId);
          }}
        />
      </div>
    </>
  );

  return (
    <>
      {exploring && (
        <NoteBox color="var(--nlc-warn)" mb={16}>
          <strong>This is an estimate, not your quote.</strong> The finance
          rate, fees and running costs below are typical figures.{" "}
          <button type="button" className="gd-linkbtn" onClick={onHaveQuote}>
            I have a quote now: enter it
          </button>
          , and your answers so far are kept.
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

      <details className="gd-answers" open={!inputs}>
        <summary>Your answers</summary>
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
      </details>

      {inputs && (
        <>
          {assumptions && (
            <Section
              title="Assumptions we made for you"
              description="Since you don't have a quote yet, these typical figures were used. Enter a real quote to replace them."
            >
              {assumptions.map((a) => (
                <KV
                  key={a.field}
                  label={a.label}
                  value={a.value}
                  tooltip={
                    a.tooltip ? <InfoTooltip text={a.tooltip} /> : undefined
                  }
                />
              ))}
            </Section>
          )}
          {exploring && (
            <TryNumbers
              d={d}
              set={set}
              inputs={shownInputs ?? inputs}
              horizon={effectiveHorizon}
            />
          )}
          {results}
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
                    onOpenAdvanced(inputs, confirming.anchorId);
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
        </>
      )}
    </>
  );
}

/** Headline "novated lease vs cash" figure, as the first Summary card computes it. */
function netVsCash(inputs: Inputs, horizon: "five_year" | "lease_end"): number {
  return computeTotalSaving({
    summary: computeFinancialSummary({ inputs }),
    horizon: horizon === "five_year" ? "at5" : "atLeaseEnd",
  }).totalSaving;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
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
}: StepProps & { inputs: Inputs; horizon: "five_year" | "lease_end" }) {
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
  const net = netVsCash(inputs, horizon);
  const years = horizon === "five_year" ? 5 : (d.leaseYears ?? 5);
  const ratePct = d.estimateRatePct ?? ASSUMED_EFFECTIVE_RATE * 100;
  const km = (v: number) => `${v.toLocaleString("en-AU")} km`;

  return (
    <section className="gd-try" aria-label="Try different numbers">
      <div className="gd-try__head">
        <h3 className="gd-sub__title">Try different numbers</h3>
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
      <p className="gd-small">
        Drag to see how the result changes. The full results below update too.
      </p>
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
        Novated lease vs buying with cash over {years} years:{" "}
        <strong className={net >= 0 ? "gd-pos" : "gd-neg"}>
          {money(Math.abs(net))} {net >= 0 ? "better off" : "worse off"}
        </strong>
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
