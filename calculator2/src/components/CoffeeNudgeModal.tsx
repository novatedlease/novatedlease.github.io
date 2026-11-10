import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/Button";
import { trackEvent } from "../utils/analytics";
import { coffeeNudgeVariant, type CoffeeNudgeContext } from "../state/engagement";

export const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/changyang1230";
/** Same referral link and offer as the site's support boxes (new-site/src/components/SupportBox.astro). */
export const TESLA_REFERRAL_URL = "https://ts.la/david51680";

/**
 * One-time "buy me a coffee" message, surfaced by useCoffeeNudge after sustained use
 * (see src/state/engagement.ts for the thresholds). Deliberately soft in tone: it's an
 * encouragement, never a paywall — every feature stays free regardless.
 */
export function CoffeeNudgeModal(props: {
  onClose: (reason: "dismissed" | "support_clicked" | "tesla_clicked") => void;
  context?: CoffeeNudgeContext;
}) {
  const { onClose } = props;
  const variant = coffeeNudgeVariant();
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => cardRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    trackEvent("coffee_nudge_dismissed", { ...props.context });
    onClose("dismissed");
  }

  function supportClicked() {
    trackEvent("coffee_nudge_clicked", { ...props.context, variant });
    trackEvent(`coffee_nudge_clicked_${variant}`, { ...props.context });
    // Same event shape as the site-wide link tracker in new-site/src/layouts/Base.astro,
    // which only binds to anchors present at page load and so misses this dynamic one.
    trackEvent("support_link_click", {
      link_label: "buymeacoffee",
      link_url: BUY_ME_A_COFFEE_URL,
      page_path: window.location.pathname,
      page_title: document.title,
      source: "coffee_nudge",
    });
    onClose("support_clicked");
  }

  function teslaClicked() {
    trackEvent("coffee_nudge_tesla_clicked", { ...props.context });
    // Same shape as Base.astro's site-wide tracker, which can't see this dynamically added link.
    trackEvent("support_link_click", {
      link_label: "tesla_referral",
      link_url: TESLA_REFERRAL_URL,
      page_path: window.location.pathname,
      page_title: document.title,
      source: "coffee_nudge",
    });
    onClose("tesla_clicked");
  }

  return createPortal(
    <>
      <div className="nlc-coffee-dim" onClick={dismiss} />
      <div
        ref={cardRef}
        className="nlc-coffee-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nlc-coffee-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="nlc-coffee-close" onClick={dismiss} aria-label="Close">
          ✕
        </button>

        <div className="nlc-coffee-emoji" aria-hidden="true">
          ☕
        </div>
        <h2 id="nlc-coffee-title" className="nlc-coffee-title">
          Why is this free?
        </h2>

        <div className="nlc-coffee-body">
          <p>Many people have asked me that. I do not serve ads or sell leads to novated lease companies.</p>
          <p>
            It is an{" "}
            <a href="/about/history/" target="_blank" rel="noopener">
              original financial model
            </a>
            , built from scratch and improved over hundreds of hours. I keep it free on purpose: I want as many people as possible to see through
            the industry's sales maths, not only those willing to pay.
          </p>
          <p>
            It is working. Readers tell me they took the effective interest rate back to their provider, negotiated several percentage points off,
            and saved thousands. Others understood a quote better, spotted a risk, or talked themselves out of an expensive mistake.{" "}
            <a href="/about/what-readers-say/" target="_blank" rel="noopener">
              Read what they say.
            </a>
          </p>
          <p>
            If it has done any of that for you, a coffee is genuinely appreciated.{" "}
            {variant === "b" && "More than 130 readers have already bought one to keep it free. "}
            It helps cover the time and effort it takes to produce new content and keep it fresh. Or if you're ordering a Tesla, this referral link gets you a $350 discount.
          </p>
          <p className="nlc-coffee-fineprint">No pressure, and nothing changes if you say no. This shows once and won't appear again in this browser.</p>
        </div>

        <div className="nlc-coffee-actions">
          <a
            className="nlc-btn nlc-btn--primary"
            href={BUY_ME_A_COFFEE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={supportClicked}
          >
            Buy me a coffee ☕
          </a>
          <a className="nlc-btn nlc-btn--secondary" href={TESLA_REFERRAL_URL} target="_blank" rel="noopener noreferrer" onClick={teslaClicked}>
            Use the Tesla referral link
          </a>
          <Button variant="ghost" onClick={dismiss}>
            No thanks
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
