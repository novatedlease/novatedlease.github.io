import React, { useId, useState } from "react";

export function Section({
  title,
  description,
  defaultOpen,
  muted,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  defaultOpen?: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const bodyId = useId();

  return (
    <section className={["nlc-section", muted && "nlc-section--muted"].filter(Boolean).join(" ")} data-open={open}>
      <button
        type="button"
        className="nlc-section__header"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
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
