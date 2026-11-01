import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/Button";
import { trackEvent } from "../utils/analytics";

export const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/changyang1230";

/**
 * One-time "buy me a coffee" message, surfaced by useCoffeeNudge after sustained use
 * (see src/state/engagement.ts for the thresholds). Deliberately soft in tone: it's an
 * encouragement, never a paywall — every feature stays free regardless.
 */
export function CoffeeNudgeModal(props: { onClose: (reason: "dismissed" | "support_clicked") => void }) {
  const { onClose } = props;
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
    trackEvent("coffee_nudge_dismissed");
    onClose("dismissed");
  }

  function supportClicked() {
    trackEvent("coffee_nudge_clicked");
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
            If it has done any of that for you, a coffee is genuinely appreciated. It helps cover the time and effort it takes to produce new
            content and keep it fresh.
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
          <Button variant="secondary" onClick={dismiss}>
            No thanks
          </Button>
        </div>
      </div>
    </>,
    document.body,
  );
}
