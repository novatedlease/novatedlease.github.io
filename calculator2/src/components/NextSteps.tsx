import { trackEvent } from "../utils/analytics";

/**
 * "What to do next" links under the results (Guided results screen and Advanced Summary).
 * Picked from where calculator visitors actually go next (GA4, Oct–Nov 2026): the checklist,
 * the BYO employer checker and "Is it worth it?". Only about 1 in 7 scroll below the
 * calculator, so these live in the results rather than further down the page.
 * Each card fires its own event name so clicks are countable without a custom dimension.
 */
const STEPS = [
  {
    event: "next_step_checklist",
    href: "/tools/checklist/",
    title: "Check your quote before you sign",
    desc: "35 things people commonly miss, from extras in the amount financed to early exit costs.",
  },
  {
    event: "next_step_byo",
    href: "/tools/byo-employer-check/",
    title: "Can you bring your own finance?",
    desc: "Many employers allow a BYO lease, often at a lower rate. Check whether yours does.",
  },
  {
    event: "next_step_worth_it",
    href: "/start-here/is-it-worth-it/",
    title: "Is it right for you?",
    desc: "What the numbers can't show: changing jobs, ending a lease early, and effects on HECS, childcare and borrowing.",
  },
] as const;

export function NextSteps({ mode }: { mode: "guided" | "advanced" }) {
  return (
    <nav className="nlc-next" aria-label="What to do next">
      {mode === "advanced" && <div className="nlc-next__title">What to do next</div>}
      <div className="nlc-next__grid">
        {STEPS.map((s) => (
          <a
            key={s.href}
            className="nlc-next__card"
            href={s.href}
            target="_blank"
            rel="noopener"
            onClick={() => trackEvent(s.event, { mode })}
          >
            <span className="nlc-next__card-title">
              {/* Non-breaking space keeps the arrow with the last word. */}
              {s.title}{"\u00a0"}<span aria-hidden="true">→</span>
            </span>
            <span className="nlc-next__card-desc">{s.desc}</span>
          </a>
        ))}
      </div>
    </nav>
  );
}
