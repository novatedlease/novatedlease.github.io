import { useEffect, useRef, useState } from "react";

/**
 * Ported from calculator/src/components/InputsPanel.tsx's LeaseAdjustModal
 * (~line 1979 onward). Smart Leasing and MillarX quote a per-month figure that
 * bakes in a 1-2 month "buffer" (a budget reserve, refundable if unused at
 * term end) — this converts their quoted figure into the true per-financier-
 * payment amount this calculator expects. Explainer article linked in the
 * launcher (see LeaseRateGuard).
 */
export function LeaseAdjustModal(props: { leaseDurationYears: number; onClose: () => void; onApply: (adjustedPerFn: number) => void }) {
  const [provider, setProvider] = useState<"smart" | "millarx">("smart");
  const [quotedText, setQuotedText] = useState<string>("");
  const [quotePeriodMode, setQuotePeriodMode] = useState<"perFn" | "perMonth">("perFn");
  const quotedInputRef = useRef<HTMLInputElement | null>(null);

  // Backup for the `autoFocus` prop: focuses the field on mount via a rAF so
  // it also works reliably right after the modal's open/close transition.
  useEffect(() => {
    const raf = requestAnimationFrame(() => quotedInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  const totalMonths = props.leaseDurationYears * 12;
  const bufferMonths = provider === "smart" ? 2 : 1;
  const quotedNum = parseFloat(String(quotedText).trim().replace(/[$,]/g, ""));
  const hasQuoted = Number.isFinite(quotedNum) && quotedNum > 0;
  const factor = totalMonths > 0 ? (totalMonths - bufferMonths) / totalMonths : null;
  const quotedPerFn = hasQuoted ? (quotePeriodMode === "perMonth" ? (quotedNum * 12) / 26 : quotedNum) : null;
  const adjustedFn = quotedPerFn !== null && factor !== null ? quotedPerFn * factor : null;
  const adjustedDisplay = adjustedFn !== null ? (quotePeriodMode === "perMonth" ? (adjustedFn * 26) / 12 : adjustedFn) : null;

  const fmtResult = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function handleQuotePeriodModeChange(mode: "perFn" | "perMonth") {
    if (mode === quotePeriodMode) return;
    const n = parseFloat(String(quotedText).trim().replace(/[$,]/g, ""));
    if (Number.isFinite(n) && n > 0) {
      const converted = mode === "perMonth" ? (n * 26) / 12 : (n * 12) / 26;
      setQuotedText(fmtResult(converted));
    }
    setQuotePeriodMode(mode);
  }

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 1000 }} onClick={props.onClose} />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          background: "var(--nlc-surface)",
          borderRadius: "var(--nlc-radius-lg)",
          padding: "28px 30px 24px",
          maxWidth: 420,
          width: "calc(100vw - 32px)",
          boxShadow: "var(--nlc-shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Close"
          style={{ position: "absolute", top: 14, right: 16, padding: 0, border: "none", background: "transparent", cursor: "pointer", fontSize: 20, lineHeight: 1, color: "var(--nlc-text-muted)" }}
        >
          ✕
        </button>

        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4, paddingRight: 24 }}>Adjust your quoted finance figure</div>
        <div style={{ fontSize: 13, color: "var(--nlc-text-muted)", marginBottom: 20, lineHeight: 1.45 }}>
          {provider === "smart" ? "Smart Leasing" : "MillarX"} derives your regular payment as though you are paying for all {totalMonths} monthly
          finance payments — but only {totalMonths - bufferMonths} of those are actual payments to the financier. The remainder is held as a budget
          reserve (refundable if unused at term end). The calculator needs the figure based on the {totalMonths - bufferMonths} true financier
          payments, which is ~{factor !== null ? ((1 - factor) * 100).toFixed(1) : "?"}% lower than your quoted figure.{" "}
          <a href="/special-and-policy/smart-leasing-millarx-payment-structure/" target="_blank" rel="noopener noreferrer">
            Read more
          </a>
          .
        </div>

        <div style={{ display: "inline-flex", borderRadius: 999, border: "1px solid var(--nlc-border-mid)", background: "var(--nlc-bg-sunken)", padding: 3, marginBottom: 24, gap: 2 }}>
          {(["smart", "millarx"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProvider(p)}
              style={{
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                background: provider === p ? "var(--nlc-surface)" : "transparent",
                boxShadow: provider === p ? "var(--nlc-shadow-sm)" : "none",
                cursor: "pointer",
                fontWeight: provider === p ? 800 : 500,
                fontSize: 13,
                color: provider === p ? "var(--nlc-blue)" : "var(--nlc-text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {p === "smart" ? "Smart Leasing" : "MillarX"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--nlc-text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Your quoted finance figure (ex GST)
          </div>
          <div style={{ display: "flex", gap: 4, fontSize: 11 }}>
            {(["perFn", "perMonth"] as const).map((mode, idx) => (
              <span key={mode} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {idx > 0 && <span style={{ opacity: 0.3 }}>/</span>}
                <button
                  type="button"
                  onClick={() => handleQuotePeriodModeChange(mode)}
                  style={{
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: quotePeriodMode === mode ? 800 : 400,
                    opacity: quotePeriodMode === mode ? 0.9 : 0.45,
                    textDecoration: quotePeriodMode === mode ? "underline" : "none",
                  }}
                >
                  {mode === "perFn" ? "per fortnight" : "per month"}
                </button>
              </span>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontWeight: 700, fontSize: 16, color: "var(--nlc-text-faint)", pointerEvents: "none" }}>$</div>
          <input
            ref={quotedInputRef}
            className="nlc-input"
            type="text"
            inputMode="decimal"
            value={quotedText}
            placeholder="e.g. 650.00"
            autoFocus
            onChange={(e) => setQuotedText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            }}
            onBlur={() => {
              const n = parseFloat(String(quotedText).trim().replace(/[$,]/g, ""));
              if (Number.isFinite(n) && n > 0) setQuotedText(fmtResult(n));
            }}
            style={{ boxSizing: "border-box", padding: "12px 14px 12px 32px", fontSize: 20, fontWeight: 700 }}
          />
        </div>

        <div style={{ fontSize: 11, color: "var(--nlc-text-muted)", textAlign: "right", marginBottom: 16 }}>
          × {totalMonths - bufferMonths} / {totalMonths}
          {factor !== null ? ` = ${(factor * 100).toFixed(3)}%` : ""}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--nlc-text-muted)", letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>
          Enter this into the calculator ({quotePeriodMode === "perFn" ? "per fortnight" : "per month"})
        </div>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--nlc-radius-md)",
            background: adjustedDisplay !== null ? "var(--nlc-good-light)" : "var(--nlc-bg-sunken)",
            border: adjustedDisplay !== null ? "1.5px solid rgba(46,125,50,0.3)" : "1.5px solid var(--nlc-border)",
            fontSize: 20,
            fontWeight: 800,
            color: adjustedDisplay !== null ? "var(--nlc-good-dark)" : "var(--nlc-text-faint)",
            letterSpacing: "-0.01em",
            marginBottom: 12,
            minHeight: 46,
            display: "flex",
            alignItems: "center",
          }}
        >
          {adjustedDisplay !== null ? `$${fmtResult(adjustedDisplay)}` : "—"}
        </div>

        <div style={{ fontSize: 11, color: "var(--nlc-text-muted)", lineHeight: 1.5, marginBottom: 20 }}>
          Once applied, the calculator's total cost will appear slightly lower than your provider's quoted total. This is expected — the
          provider's quote treats the buffer payments as a true financial obligation, whereas this calculator correctly models only the{" "}
          {totalMonths - bufferMonths} actual financier payments as a cost. The buffer surplus is returned to you at term end if unused.
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={props.onClose}
            style={{ padding: "10px 18px", borderRadius: "var(--nlc-radius-md)", border: "1px solid var(--nlc-border-mid)", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--nlc-text-muted)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={adjustedFn === null}
            onClick={() => {
              if (adjustedFn !== null) props.onApply(Math.round(adjustedFn * 100) / 100);
            }}
            style={{
              padding: "10px 20px",
              borderRadius: "var(--nlc-radius-md)",
              border: "none",
              background: adjustedFn !== null ? "var(--nlc-blue)" : "var(--nlc-bg-sunken)",
              color: adjustedFn !== null ? "#fff" : "var(--nlc-text-faint)",
              cursor: adjustedFn !== null ? "pointer" : "default",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            Use this value →
          </button>
        </div>
      </div>
    </>
  );
}
