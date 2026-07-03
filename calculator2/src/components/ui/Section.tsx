import React, { useEffect, useId, useState } from "react";
import { trackOncePerSession } from "../../utils/analytics";

export function Section({
  title,
  description,
  defaultOpen,
  muted,
  children,
  analyticsId,
  anchorId,
  forceOpenNonce,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  defaultOpen?: boolean;
  muted?: boolean;
  children: React.ReactNode;
  analyticsId?: string;
  /** DOM id used as a cross-navigation scroll target (see App.tsx's navigateToDetails). */
  anchorId?: string;
  /** Bump this (any changing value) to force the section open, e.g. when navigated to while collapsed. */
  forceOpenNonce?: number;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const bodyId = useId();

  useEffect(() => {
    if (forceOpenNonce !== undefined) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpenNonce]);

  return (
    <section id={anchorId} className={["nlc-section", muted && "nlc-section--muted"].filter(Boolean).join(" ")} data-open={open}>
      <button
        type="button"
        className="nlc-section__header"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() =>
          setOpen((v) => {
            const next = !v;
            if (next && analyticsId) {
              trackOncePerSession(`expand_${analyticsId}`, "breakdown_expanded", { section: analyticsId });
            }
            return next;
          })
        }
      >
        <div>
          <div className="nlc-section__heading">{title}</div>
          {description && <div className="nlc-section__desc">{description}</div>}
        </div>
        <svg className="nlc-section__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M7 5l6 5-6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div id={bodyId} className="nlc-section__body">
          {children}
        </div>
      )}
    </section>
  );
}
