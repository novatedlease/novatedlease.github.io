import { useEffect, useRef, useState } from "react";
import { GST_RATE, parseAmount } from "../guided/draft";
import { bufferMonthsFor, initialMillarxDefer, type Provider } from "./leaseAdjust";

/**
 * Ported from calculator/src/components/InputsPanel.tsx's LeaseAdjustModal
 * (~line 1979 onward). Smart Leasing and MillarX quote a per-month figure that
 * bakes in a 1-2 month "buffer" (a budget reserve, refundable if unused at
 * term end) — this converts their quoted figure into the true per-financier-
 * payment amount this calculator expects. Explainer article linked in the
 * launcher (see LeaseRateGuard).
 */
export type QuotePeriod = "perFn" | "perMonth";
/** "unknown": the quote doesn't say, so the figure is treated as ex GST (as most quotes print it). */
export type QuoteGst = "exGst" | "incGst" | "unknown";

/** The corrected payment, in the period and GST basis the reader's quote uses. */
export type CorrectedPayment = { amount: number; period: QuotePeriod; gst: QuoteGst };

export function LeaseAdjustModal(props: {
  leaseDurationYears: number;
  onClose: () => void;
  /** adjustedPerFn is per fortnight ex GST (what the engine takes); shown is the same figure as the reader's quote prints it. */
  onApply: (adjustedPerFn: number, shown: CorrectedPayment) => void;
  /** Answers the reader has already given elsewhere, so they aren't asked twice. */
  initialPeriod?: QuotePeriod | null;
  /** null = not known yet: the reader must choose before the figure can be used. Omitted = ex GST. */
  initialGst?: QuoteGst | null;
  /** Months until the first finance payment, as answered elsewhere; sets MillarX's reserve. */
  initialDeferMonths?: number | null;
  /** The provider the reader picked elsewhere, so the toggle starts on it. Defaults to Smart Leasing. */
  initialProvider?: Provider;
  /**
   * Guided reads a monthly figure as the financier's own payment and spreads it over the term
   * itself, so a monthly figure needs no correction here. Advanced reads it as spread, so it doesn't
   * pass this and keeps correcting monthly figures.
   */
  monthlyIsFinancierPayment?: boolean;
}) {
  const [provider, setProvider] = useState<Provider>(props.initialProvider ?? "smart");
  const [millarxDefer, setMillarxDefer] = useState<1 | 2>(initialMillarxDefer(props.initialDeferMonths));
  const [quotedText, setQuotedText] = useState<string>("");
  const [quotePeriodMode, setQuotePeriodMode] = useState<QuotePeriod>(props.initialPeriod ?? "perFn");
  const [gst, setGst] = useState<QuoteGst | null>(props.initialGst === undefined ? "exGst" : props.initialGst);
  const quotedInputRef = useRef<HTMLInputElement | null>(null);
  // Backup for the `autoFocus` prop: focuses the field on mount via a rAF so
  // it also works reliably right after the modal's open/close transition.
  useEffect(() => {
    const raf = requestAnimationFrame(() => quotedInputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  const totalMonths = props.leaseDurationYears * 12;
  const monthlyAsIs = !!props.monthlyIsFinancierPayment && quotePeriodMode === "perMonth";
  const bufferMonths = monthlyAsIs ? 0 : bufferMonthsFor(provider, millarxDefer);
  const quotedNum = parseAmount(quotedText) ?? NaN;
  const hasQuoted = Number.isFinite(quotedNum) && quotedNum > 0;
  const factor = totalMonths > 0 ? (totalMonths - bufferMonths) / totalMonths : null;
  // Period and GST describe how the quote prints the figure, so changing them re-reads the
  // typed number rather than converting it. The correction is a straight scale either way.
  const adjustedDisplay = hasQuoted && factor !== null ? quotedNum * factor : null;
  const adjustedFn =
    adjustedDisplay !== null && gst !== null
      ? (quotePeriodMode === "perMonth" ? (adjustedDisplay * 12) / 26 : adjustedDisplay) / (gst === "incGst" ? 1 + GST_RATE : 1)
      : null;
  const fmtResult = (n: number) => n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const periodWord = quotePeriodMode === "perFn" ? "per fortnight" : "per month";
  const gstWord = gst === "incGst" ? "inc GST" : gst === null ? null : "ex GST";

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
          // Phones: taller than the screen, so it scrolls inside rather than hiding the buttons.
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          boxSizing: "border-box",
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
          {monthlyAsIs ? (
            <>A monthly figure on the quote is already the payment to the financier, so it needs no correction. Enter it as printed.{" "}</>
          ) : (
            <>
              {provider === "smart" ? "Smart Leasing" : "MillarX"} derives your regular payment as though you are paying for all {totalMonths} monthly
              finance payments — but only {totalMonths - bufferMonths} of those are actual payments to the financier. The remainder is held as a budget
              reserve (refundable if unused at term end). The calculator needs the figure based on the {totalMonths - bufferMonths} true financier
              payments, which is ~{factor !== null ? ((1 - factor) * 100).toFixed(1) : "?"}% lower than your quoted figure.{" "}
            </>
          )}
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

        <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
          {provider === "millarx" && !monthlyAsIs && (
            <QuoteChoice
              label="Months until your first payment (deferral)"
              value={String(millarxDefer) as "1" | "2"}
              onChange={(v) => setMillarxDefer(v === "1" ? 1 : 2)}
              options={[
                ["1", "1 month"],
                ["2", "2 months"],
              ]}
              note="MillarX holds back the same number of months. On the quote, “$819/mth × 58” on a 60-month lease means 2. A “Finance + fee” figure includes the management fee: take it out first."
            />
          )}
          <QuoteChoice
            label="Your quote shows the payment"
            value={quotePeriodMode}
            onChange={setQuotePeriodMode}
            options={[
              ["perFn", "Per fortnight"],
              ["perMonth", "Per month"],
            ]}
          />
          <QuoteChoice
            label="Does the payment include GST?"
            value={gst}
            onChange={setGst}
            options={[
              ["exGst", "Ex GST"],
              ["incGst", "Inc GST"],
              ["unknown", "Not sure"],
            ]}
            hint={gst === null ? "Check next to the payment, its table heading and the footnotes." : undefined}
            note={gst === "unknown" ? "We'll treat it as excluding GST, as most quotes print it." : undefined}
          />
        </div>

        <label
          htmlFor="lam-quoted"
          style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--nlc-text)", marginBottom: 6 }}
        >
          Finance payment, exactly as printed
        </label>
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontWeight: 700, fontSize: 16, color: "var(--nlc-text-faint)", pointerEvents: "none" }}>$</div>
          <input
            ref={quotedInputRef}
            id="lam-quoted"
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
              const n = parseAmount(quotedText) ?? NaN;
              if (Number.isFinite(n) && n > 0) setQuotedText(fmtResult(n));
            }}
            style={{ boxSizing: "border-box", padding: "12px 14px 12px 32px", fontSize: 20, fontWeight: 700 }}
          />
        </div>

        <div style={{ fontSize: 11, color: "var(--nlc-text-muted)", textAlign: "right", marginBottom: 16 }}>
          {bufferMonths === 0 ? (
            "No correction needed"
          ) : (
            <>
              × {totalMonths - bufferMonths} / {totalMonths}
              {factor !== null ? ` = ${(factor * 100).toFixed(3)}%` : ""}
            </>
          )}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--nlc-text-muted)", letterSpacing: "0.05em", marginBottom: 6, textTransform: "uppercase" }}>
          Finance-only payment ({periodWord}{gstWord ? `, ${gstWord}` : ""})
        </div>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--nlc-radius-md)",
            background: adjustedDisplay !== null ? "var(--nlc-good-light)" : "var(--nlc-bg-sunken)",
            border: adjustedDisplay !== null ? "1.5px solid color-mix(in srgb, var(--nlc-good) 35%, transparent)" : "1.5px solid var(--nlc-border)",
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

        {bufferMonths > 0 && (
          <div style={{ fontSize: 11, color: "var(--nlc-text-muted)", lineHeight: 1.5, marginBottom: 20 }}>
            Once applied, the calculator's total cost will appear slightly lower than your provider's quoted total. This is expected — the
            provider's quote treats the buffer payments as a true financial obligation, whereas this calculator correctly models only the{" "}
            {totalMonths - bufferMonths} actual financier payments as a cost. The buffer surplus is returned to you at term end if unused.
          </div>
        )}

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
              if (adjustedFn !== null && adjustedDisplay !== null && gst !== null)
                props.onApply(Math.round(adjustedFn * 100) / 100, {
                  amount: Math.round(adjustedDisplay * 100) / 100,
                  period: quotePeriodMode,
                  gst,
                });
            }}
            style={{
              padding: "10px 20px",
              borderRadius: "var(--nlc-radius-md)",
              border: "none",
              background: adjustedFn !== null ? "var(--nlc-blue-solid)" : "var(--nlc-bg-sunken)",
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

/** A labelled pair of answer buttons: big enough to see which is chosen, unlike a text toggle. */
function QuoteChoice<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  note,
}: {
  label: string;
  value: T | null;
  onChange: (v: T) => void;
  options: [T, string][];
  /** A warning shown under the buttons. */
  hint?: string;
  /** A neutral explanation shown under the buttons. */
  note?: string;
}) {
  return (
    <div role="group" aria-label={label}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--nlc-text)", marginBottom: 6 }}>{label}</div>
      <div className="nlc-pill-group" style={{ display: "flex" }}>
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            className="nlc-pill-group__btn"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            style={{ flex: 1, cursor: "pointer" }}
          >
            {text}
          </button>
        ))}
      </div>
      {note && <div style={{ fontSize: 12, color: "var(--nlc-text-muted)", marginTop: 6, lineHeight: 1.45 }}>{note}</div>}
      {hint && <div style={{ fontSize: 12, color: "var(--nlc-warn-dark)", marginTop: 6 }}>{hint}</div>}
    </div>
  );
}
