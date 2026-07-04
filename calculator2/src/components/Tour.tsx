import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsMobile } from "../hooks/useIsMobile";
import { trackEvent } from "../utils/analytics";
import type { CalcMode } from "./ui/ModeToggle";
import { Button } from "./ui/Button";

type OutputTab = "summary" | "details" | "compare";

type TourTarget = { kind: "none" } | { kind: "selector"; value: string } | { kind: "ids"; value: string[] };

type TourStep = {
  key: string;
  title: string;
  body: React.ReactNode;
  target: TourTarget;
  mode?: CalcMode;
  tab?: OutputTab;
  forceOpenIds?: string[];
};

const TOUR_STEPS: TourStep[] = [
  {
    key: "welcome",
    title: "Welcome to the novated lease calculator!",
    body: (
      <>
        In about a minute, this tour will show you around the two calculator modes and the main results. You can
        leave at any time with Esc or "Skip tour".
      </>
    ),
    target: { kind: "none" },
  },
  {
    key: "modes",
    title: "Simple or Advanced — pick your depth.",
    body: (
      <>
        <strong>Simple mode</strong> gives you a quick, rough answer from just the 7 inputs that matter most —
        perfect if you don't have an actual lease quote yet and just want a feel for the numbers.{" "}
        <strong>Advanced mode</strong> models everything in detail once you have real figures.
      </>
    ),
    target: { kind: "selector", value: "mode-toggle" },
    mode: "simple",
  },
  {
    key: "simple-inputs",
    title: "Tell us about the car — and about you.",
    body: (
      <>
        Just a handful of questions: the car's price and type, how far you drive, your income, the lease term, and
        whether you have a home-loan offset account. That's all Simple mode needs.
      </>
    ),
    target: { kind: "selector", value: "simple-inputs" },
    mode: "simple",
  },
  {
    key: "simple-assumptions",
    title: "We filled in the rest for you.",
    body: (
      <>
        Since you haven't entered a real quote, everything else — running costs, finance rate, fees — uses these
        standard assumptions. Hover or tap the tooltips to see each one, and switch to Advanced mode any time to override
        them.
      </>
    ),
    target: { kind: "selector", value: "simple-assumptions" },
    mode: "simple",
  },
  {
    key: "simple-outcome",
    title: "Your bottom line, five years out.",
    body: (
      <>
        This is the headline result: your overall financial position after 5 years with a novated lease, compared
        with buying the same car outright with cash. Unlike a typical novated lease company's own calculator, this
        one combines both the <strong>net cashflow difference</strong> and the{" "}
        <strong>effect on your home-loan offset account interest</strong> to arrive at your true global net worth
        comparison.
      </>
    ),
    target: { kind: "selector", value: "simple-outcome" },
    mode: "simple",
  },
  {
    key: "switch-advanced",
    title: "Now let's look at Advanced mode.",
    body: (
      <>
        Everything you entered in Simple mode comes with you — Advanced just lets you replace the assumptions with
        your real numbers.
      </>
    ),
    target: { kind: "selector", value: "mode-toggle" },
    mode: "advanced",
  },
  {
    key: "advanced-inputs",
    title: "Every number, under your control.",
    body: (
      <>
        This panel takes your full situation: the exact figures from your lease quote, your personal finances and
        tax details, and all the running costs — rego, insurance, servicing, tyres, fuel or charging.
      </>
    ),
    target: { kind: "selector", value: "advanced-inputs" },
    mode: "advanced",
  },
  {
    key: "extra-comparisons",
    title: "Not comparing against cash? No problem.",
    body: (
      <>
        Turn these on to add more pathways to the comparison: financing the same car with a <strong>car loan</strong>
        , or <strong>keeping your current car</strong> instead of getting a new one at all.
      </>
    ),
    target: { kind: "selector", value: "extra-comparisons" },
    mode: "advanced",
  },
  {
    key: "output-tabs",
    title: "Your results, three ways.",
    body: (
      <>
        <strong>Summary</strong> for the verdict at a glance, <strong>Details</strong> for the full breakdown, and{" "}
        <strong>Compare</strong> for lining up multiple saved scenarios side by side.
      </>
    ),
    target: { kind: "selector", value: "output-tabs" },
    mode: "advanced",
  },
  {
    key: "summary-tab",
    title: "The quick verdict.",
    body: (
      <>
        Summary shows which option comes out ahead and by how much — largely self-explanatory. As above, this
        combines both the <strong>net cashflow difference</strong> and the{" "}
        <strong>effect on your home-loan offset account interest</strong> to arrive at a true global net worth
        comparison.
      </>
    ),
    target: { kind: "selector", value: "advanced-summary" },
    mode: "advanced",
    tab: "summary",
  },
  {
    key: "details-1-2",
    title: "Every dollar, traced.",
    body: (
      <>
        Sections 1 and 2, in the Details tab, walk through all the figures behind the result — lease payments and the
        full financial summary, split into pre-tax and post-tax components — so you can check the maths yourself.
      </>
    ),
    target: { kind: "ids", value: ["details-section-1-lease-payments", "details-section-2-financial-summary"] },
    mode: "advanced",
    tab: "details",
    forceOpenIds: ["details-section-1-lease-payments", "details-section-2-financial-summary"],
  },
  {
    key: "details-3",
    title: "What is the under-the-hood interest?",
    body: (
      <>
        Section 3 uses the <strong>financed amount</strong>, <strong>lease term</strong>, and{" "}
        <strong>vehicle finance repayment</strong> figure from your quote to back-derive the{" "}
        <strong>effective interest rate</strong> baked into it. That rate is a crude surrogate for the profit margin
        the NL provider and financier are taking on the arrangement — and it's the main thing worth{" "}
        <strong>negotiating</strong> in a novated lease deal.
      </>
    ),
    target: { kind: "ids", value: ["details-section-3-effective-interest-rate"] },
    mode: "advanced",
    tab: "details",
    forceOpenIds: ["details-section-3-effective-interest-rate"],
  },
  {
    key: "details-4",
    title: "How this affects your means-tested subsidy and liability.",
    body: (
      <>
        Section 4 works out your <strong>adjusted taxable income</strong>, which drives flow-on effects like the
        childcare subsidy, HECS/HELP repayments and other income-tested items.
      </>
    ),
    target: { kind: "ids", value: ["details-section-4-ati"] },
    mode: "advanced",
    tab: "details",
    forceOpenIds: ["details-section-4-ati"],
  },
  {
    key: "details-5-7",
    title: "The fine print that can bite.",
    body: (
      <>
        Section 5 shows the hit to your <strong>super</strong> if your employer calculates it on your post-lease
        salary. Section 6 checks how much more your quote's finance rate costs compared with an assumed / approximate base rate.
        Section 7 charts the <strong>worst case</strong>: what you'd owe if you had to terminate the lease early.
      </>
    ),
    target: {
      kind: "ids",
      value: ["details-section-5-sg", "details-section-6-what-if", "details-section-7-worst-case"],
    },
    mode: "advanced",
    tab: "details",
    forceOpenIds: ["details-section-5-sg", "details-section-6-what-if", "details-section-7-worst-case"],
  },
  {
    key: "compare-tab",
    title: "Line up completely different scenarios.",
    body: (
      <>
        Moving on to the <strong>Compare</strong> tab. Want to weigh a novated lease arrangement on a $60k EV against
        a cash purchase of a $30k petrol car? Set each one up as its own quote, save them, and compare them side by
        side here.
      </>
    ),
    target: { kind: "selector", value: "compare-view" },
    mode: "advanced",
    tab: "compare",
  },
  {
    key: "finish",
    title: "That's the tour!",
    body: (
      <>
        You can replay it any time from the "Quick tour" button. Now plug in your own numbers and see where you
        land.
      </>
    ),
    target: { kind: "none" },
  },
];

function elementForTarget(target: TourTarget): HTMLElement | null {
  if (target.kind === "selector") return document.querySelector<HTMLElement>(`[data-tour-id="${target.value}"]`);
  if (target.kind === "ids") {
    for (const id of target.value) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }
  return null;
}

function resolveTargetRect(target: TourTarget): DOMRect | null {
  if (target.kind === "none") return null;
  if (target.kind === "selector") {
    const el = document.querySelector(`[data-tour-id="${target.value}"]`);
    return el ? el.getBoundingClientRect() : null;
  }
  const rects = target.value
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => !!el)
    .map((el) => el.getBoundingClientRect());
  if (rects.length === 0) return null;
  const top = Math.min(...rects.map((r) => r.top));
  const left = Math.min(...rects.map((r) => r.left));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), Math.max(min, max));
}

export function Tour(props: {
  currentMode: CalcMode;
  currentTab: OutputTab;
  onChangeMode: (m: CalcMode) => void;
  onChangeTab: (t: OutputTab) => void;
  onForceOpenSections: (ids: string[]) => void;
  onExit: (reason: "completed" | "skipped", stepIndex: number) => void;
}) {
  const { onChangeMode, onChangeTab, onForceOpenSections, onExit, currentMode, currentTab } = props;
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const isMobile = useIsMobile();
  const cardRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  function handleNext() {
    if (isLast) {
      onExit("completed", stepIndex);
      return;
    }
    setStepIndex((i) => i + 1);
  }
  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }
  function handleSkip() {
    onExit("skipped", stepIndex);
  }

  // Apply this step's required mode/tab/force-opened sections — only transitions
  // when it differs from the live current value, so replaying via Back/Next never
  // fires spurious mode switches or duplicate analytics events.
  useEffect(() => {
    if (step.mode !== undefined && step.mode !== currentMode) onChangeMode(step.mode);
    if (step.tab !== undefined && step.tab !== currentTab) onChangeTab(step.tab);
    if (step.forceOpenIds) onForceOpenSections(step.forceOpenIds);
    trackEvent("tour_step_viewed", { step: stepIndex + 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  // Locate the target, scroll it into view, and keep re-measuring every frame until
  // the target actually stops moving. Both a fixed settle delay and "stop once stable"
  // heuristics (frame-to-frame position delta, quiet-period since last scroll event) turned
  // out unreliable here: a mode/tab switch can remount a whole subtree, and a mobile
  // single-column layout means scrollIntoView often travels much further than on desktop —
  // and the browser's own scroll easing curve can plateau or under-fire scroll events
  // part-way through a long scroll, which fools early-exit checks into freezing the
  // spotlight at a mid-scroll position. So instead of guessing when it's "done", just keep
  // re-measuring on every frame for a fixed, generous window that comfortably covers both a
  // remount and a full-page mobile scroll — cheap to do, and immune to animation-curve
  // quirks since we simply take whatever the truth is on the last frame.
  useEffect(() => {
    const target = step.target;
    if (target.kind === "none") {
      setRect(null);
      return;
    }
    let cancelled = false;
    let rafId = 0;
    let scrolled = false;
    const start = performance.now();
    const MEASURE_WINDOW_MS = 1100;

    function tick() {
      if (cancelled) return;
      setRect(resolveTargetRect(target));
      if (!scrolled) {
        elementForTarget(target)?.scrollIntoView({ block: "center", behavior: "smooth" });
        scrolled = true;
      }
      if (performance.now() - start > MEASURE_WINDOW_MS) return;
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  // Window resize (e.g. orientation change) — re-measure without re-triggering scroll.
  useEffect(() => {
    function onResize() {
      setRect(resolveTargetRect(step.target));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  // Position the floating card beside the target, flipping side/edge as space allows.
  useLayoutEffect(() => {
    if (isMobile) {
      setCardPos(null);
      return;
    }
    const cardEl = cardRef.current;
    const cw = cardEl?.offsetWidth ?? 340;
    const ch = cardEl?.offsetHeight ?? 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 16;
    if (!rect) {
      setCardPos({ top: (vh - ch) / 2, left: (vw - cw) / 2 });
      return;
    }
    let top: number;
    let left: number;
    if (vw - rect.right >= cw + gap) {
      left = rect.right + gap;
      top = clamp(rect.top, gap, vh - ch - gap);
    } else if (rect.left >= cw + gap) {
      left = rect.left - gap - cw;
      top = clamp(rect.top, gap, vh - ch - gap);
    } else if (vh - rect.bottom >= ch + gap) {
      top = rect.bottom + gap;
      left = clamp(rect.left, gap, vw - cw - gap);
    } else {
      top = Math.max(gap, rect.top - gap - ch);
      left = clamp(rect.left, gap, vw - cw - gap);
    }
    setCardPos({ top, left });
  }, [rect, isMobile, stepIndex]);

  useEffect(() => {
    cardRef.current?.focus();
  }, [stepIndex]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleSkip();
        return;
      }
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "BUTTON") return;
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleBack();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  function onCardKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Tab") return;
    const root = cardRef.current;
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.hasAttribute("disabled"));
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className="nlc-tour-overlay">
      <div className="nlc-tour-dim" />
      {rect && (
        <div
          className="nlc-tour-spotlight"
          style={{ top: rect.top - 8, left: rect.left - 8, width: rect.width + 16, height: rect.height + 16 }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Product tour, step ${stepIndex + 1} of ${TOUR_STEPS.length}`}
        tabIndex={-1}
        className={["nlc-tour-card", isMobile && "nlc-tour-card--docked"].filter(Boolean).join(" ")}
        style={isMobile ? undefined : cardPos ? { top: cardPos.top, left: cardPos.left } : { visibility: "hidden" }}
        onKeyDown={onCardKeyDown}
      >
        <div className="nlc-tour-card__eyebrow">
          Step {stepIndex + 1} of {TOUR_STEPS.length}
        </div>
        <div className="nlc-tour-card__title">{step.title}</div>
        <div className="nlc-tour-card__body">{step.body}</div>
        <div className="nlc-tour-card__footer">
          <button type="button" className="nlc-tour-footer-link" onClick={handleSkip}>
            Skip tour
          </button>
          <div className="nlc-tour-card__nav">
            <Button size="sm" variant="secondary" onClick={handleBack} disabled={stepIndex === 0}>
              ← Back
            </Button>
            <Button size="sm" variant="primary" onClick={handleNext}>
              {isLast ? "Finish" : "Next →"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
