import React from "react";
import type { Inputs } from "@engine/types";
import { effectiveAnnualRateFromFortnightlyLease, financedAmountExGstFromInputs } from "@engine/effectiveinterest";
import { gstSaved } from "@engine/ato";
import { InfoTooltip } from "../ui/InfoTooltip";
import { SubHead, KV, NoteBox } from "../ui/shared";
import { useIsMobile } from "../../hooks/useIsMobile";

export type EffectiveInterestReportProps = { inputs: Inputs };

function money(n: number) {
  return `$ ${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function pct(rAnnual: number) {
  return Number.isFinite(rAnnual) ? `${(rAnnual * 100).toFixed(2)}%` : "—";
}
/**
 * Ported from calculator/src/components/EffectiveInterestReport.tsx — same
 * maths/structure. One fix applied during the port: v1 re-implemented the GST-saved
 * formula locally (`gstSavedLocal`) instead of importing engine/ato.ts's `gstSaved` —
 * a duplication risk flagged for the maths audit. This port imports the canonical
 * engine function instead; the formula (cap $6,353, base value ÷ 11, $0 for private
 * sales) is identical, so this is a dedup, not a behaviour change.
 */
export function EffectiveInterestReport({ inputs }: EffectiveInterestReportProps) {
  const isMobile = useIsMobile();
  try {
    const years = Math.round(inputs.leaseDurationYears);

    const financedStandardExGst = financedAmountExGstFromInputs(inputs);
    const residualStandardExGst = inputs.residualValueExGst;

    const financedInflatedProxyExGst = Math.max(0, inputs.driveawayCost - gstSaved(inputs)) + inputs.leaseDocFee;
    const financedInflatedExGst =
      inputs.financedAmountForInterestCalcExGst > 0
        ? Math.max(0, inputs.financedAmountForInterestCalcExGst)
        : financedInflatedProxyExGst;
    const residualInflatedExGst = inputs.residualValueExGst;

    const leaseFn = Math.max(0, inputs.vehicleLeasePerFn);
    const mgmtFeeFn = Math.max(0, inputs.managementFeesAnnual / 26);

    const deferMonths = Math.max(0, Math.round(inputs.monthsDeferred));
    const payableMonths = Math.max(0, years * 12 - deferMonths);
    const totalFortnightsTotal = years * 26;
    const monthlyEquivalentFromFortnightly = (fortnightlyAmount: number) =>
      payableMonths > 0 ? (fortnightlyAmount * totalFortnightsTotal) / payableMonths : 0;

    const monthlyEqDef1 = monthlyEquivalentFromFortnightly(leaseFn);
    const monthlyEqDef1a = monthlyEquivalentFromFortnightly(leaseFn + mgmtFeeFn);
    const monthlyEqDef2 = monthlyEquivalentFromFortnightly(leaseFn);

    const rateDef1 = effectiveAnnualRateFromFortnightlyLease({
      financedAmountExGst: financedStandardExGst,
      residualValueExGst: residualStandardExGst,
      leaseYears: years,
      deferMonths,
      fortnightlyLeasePayment: leaseFn,
    });
    const rateDef1a = effectiveAnnualRateFromFortnightlyLease({
      financedAmountExGst: financedStandardExGst,
      residualValueExGst: residualStandardExGst,
      leaseYears: years,
      deferMonths,
      fortnightlyLeasePayment: leaseFn + mgmtFeeFn,
    });
    const rateDef2 = effectiveAnnualRateFromFortnightlyLease({
      financedAmountExGst: financedInflatedExGst,
      residualValueExGst: residualInflatedExGst,
      leaseYears: years,
      deferMonths,
      fortnightlyLeasePayment: leaseFn,
    });

    const [activeDef, setActiveDef] = React.useState<"def1" | "def1a" | "def2">("def1");

    const moneyParens = (n: number) => {
      const abs = Math.abs(n);
      const s = abs.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return n < 0 ? `(${s})` : s;
    };

    const AmortisationTable = (p: { financedAmount: number; monthlyPayment: number; annualRate: number }) => {
      const [open, setOpen] = React.useState(false);
      const monthsTotal = years * 12;
      const monthlyRate = Number.isFinite(p.annualRate) ? p.annualRate / 12 : 0;

      let start = Math.max(0, p.financedAmount);
      const rows = Array.from({ length: monthsTotal }, (_, idx) => {
        const month = idx + 1;
        const isDeferred = month <= deferMonths;
        const payment = isDeferred ? 0 : Math.max(0, p.monthlyPayment);
        const balancePostPayment = start - payment;
        const interest = balancePostPayment * monthlyRate;
        const closing = balancePostPayment + interest;
        const out = { month, starting: start, paymentDisplay: isDeferred ? "" : moneyParens(-payment), balancePostPayment, interest, closing };
        start = closing;
        return out;
      });

      return (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", borderRadius: 8, border: "1px solid var(--nlc-blue-mid)", background: "var(--nlc-blue-light)", cursor: "pointer", fontWeight: 700, fontSize: 12, letterSpacing: "0.03em", color: "var(--nlc-blue)" }}
          >
            <span>{open ? "Hide amortisation table" : "Show amortisation table"}</span>
            <span style={{ fontSize: 11 }}>{open ? "▾" : "▸"}</span>
          </button>

          {open ? (
            <div style={{ marginTop: 10, borderRadius: 10, border: "1px solid var(--nlc-line)" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: "max-content", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "center", padding: "7px 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "var(--nlc-blue-solid)", color: "#fff", whiteSpace: "nowrap" }}>Month</th>
                      <th style={{ textAlign: "right", padding: "7px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "var(--nlc-blue-solid)", color: "#fff", whiteSpace: "nowrap" }}>Starting Bal.</th>
                      <th style={{ textAlign: "right", padding: "7px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "var(--nlc-blue-solid)", color: "#fff", whiteSpace: "nowrap" }}>Payment</th>
                      <th style={{ textAlign: "right", padding: "7px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "var(--nlc-blue-solid)", color: "#fff", whiteSpace: "nowrap" }}>Post-Payment Bal.</th>
                      <th style={{ textAlign: "right", padding: "7px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "var(--nlc-blue-solid)", color: "#fff", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          Interest
                          <InfoTooltip text="Interest is calculated using a higher-precision rate than the rounded percentage shown above." />
                        </span>
                      </th>
                      <th style={{ textAlign: "right", padding: "7px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "var(--nlc-blue-solid)", color: "#fff", whiteSpace: "nowrap" }}>Closing Bal.</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
                    {rows.map((r) => (
                      <tr key={r.month} style={{ borderBottom: "1px solid var(--nlc-line)" }}>
                        <td style={{ padding: "6px 4px", textAlign: "center" }}>{r.month}</td>
                        <td style={{ padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{money(r.starting)}</td>
                        <td style={{ padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{r.paymentDisplay ? `$ ${r.paymentDisplay}` : ""}</td>
                        <td style={{ padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{money(r.balancePostPayment)}</td>
                        <td style={{ padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{money(r.interest)}</td>
                        <td style={{ padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{money(r.closing)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
                Payments are shown as negatives (parentheses) and are blank during deferred months.
                <br />
                The closing balance at the end of the schedule may not exactly match the residual value payable due to rounding error.
              </div>
            </div>
          ) : null}
        </div>
      );
    };

    const defs = [
      { id: "def1" as const, label: "Definition 1", title: "Recommended", rate: rateDef1, color: "var(--nlc-acc-green)", desc: "Standard financed amount" },
      { id: "def1a" as const, label: "Definition 1a", title: "Inc. Management Fees", rate: rateDef1a, color: "var(--nlc-blue)", desc: "Lease + fees as payment" },
      { id: "def2" as const, label: "Definition 2", title: "Provider-Style", rate: rateDef2, color: "var(--nlc-acc-purple)", desc: "Inflated financed amount" },
    ];

    const contentByDef: Record<"def1" | "def1a" | "def2", React.ReactNode> = {
      def1: (
        <>
          <NoteBox color="var(--nlc-acc-green)" mt={0}>
            Closest to "what interest rate would amortise the financed amount down to residual value over the lease term."
          </NoteBox>
          <div style={{ marginTop: 10 }}>
            <KV label="Financed amount (standard)" value={money(financedStandardExGst)} />
            <KV label="Residual value payable (ex GST)" value={money(residualStandardExGst)} />
            <KV label="Fortnightly lease" value={money(leaseFn)} />
            <KV label={`Equivalent monthly lease over ${payableMonths} months`} value={money(monthlyEqDef1)} />
            <KV label="Months deferred" value={`${deferMonths} months`} />
            <KV label="Effective annual rate" value={pct(rateDef1)} bold highlight color="var(--nlc-acc-green)" />
          </div>
          <AmortisationTable financedAmount={financedStandardExGst} monthlyPayment={monthlyEqDef1} annualRate={rateDef1} />
        </>
      ),
      def1a: (
        <>
          <NoteBox color="var(--nlc-blue)" mt={0}>
            Useful for comparing quotes — treats management fees as part of the lease payment, revealing true cost when fees are bundled into "running costs".
          </NoteBox>
          <div style={{ marginTop: 10 }}>
            <KV label="Financed amount (standard)" value={money(financedStandardExGst)} />
            <KV label="Residual value payable (ex GST)" value={money(residualStandardExGst)} />
            <KV label="Fortnightly lease + management fee" value={money(leaseFn + mgmtFeeFn)} />
            <KV label={`Equivalent monthly over ${payableMonths} months`} value={money(monthlyEqDef1a)} />
            <KV label="Effective annual rate (inc. fees)" value={pct(rateDef1a)} bold highlight color="var(--nlc-blue)" />
          </div>
          <AmortisationTable financedAmount={financedStandardExGst} monthlyPayment={monthlyEqDef1a} annualRate={rateDef1a} />
        </>
      ),
      def2: (
        <>
          <NoteBox color="var(--nlc-acc-purple)" mt={0}>
            Can produce a misleadingly low rate when the financed amount is inflated with brokerage.
          </NoteBox>
          <div style={{ marginTop: 10 }}>
            <KV label="Financed amount (incl. brokerage)" value={money(financedInflatedExGst)} />
            <KV label="Residual value payable (ex GST)" value={money(residualInflatedExGst)} />
            <KV label="Fortnightly lease" value={money(leaseFn)} />
            <KV label={`Equivalent monthly over ${payableMonths} months`} value={money(monthlyEqDef2)} />
            <KV label="Effective annual rate (inflated)" value={pct(rateDef2)} bold highlight color="var(--nlc-acc-purple)" />
          </div>
          <AmortisationTable financedAmount={financedInflatedExGst} monthlyPayment={monthlyEqDef2} annualRate={rateDef2} />
        </>
      ),
    };

    return (
      <div style={{ fontSize: 13, lineHeight: 1.4 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
          {defs.map((d) => {
            const active = activeDef === d.id;
                        return (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveDef(d.id)}
                style={{
                  border: active ? `2px solid ${d.color}` : `1.5px solid color-mix(in srgb, ${d.color} 22%, transparent)`,
                  borderRadius: 12,
                  padding: "11px 13px",
                  cursor: "pointer",
                  background: active ? d.color : `color-mix(in srgb, ${d.color} 5%, transparent)`,
                  color: active ? "#fff" : d.color,
                  opacity: active ? 1 : 0.45,
                  boxShadow: active ? `0 3px 14px color-mix(in srgb, ${d.color} 38%, transparent)` : "none",
                  textAlign: "left",
                  lineHeight: 1,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>{d.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", marginBottom: 5 }}>{pct(d.rate)}</div>
                <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85, lineHeight: 1.3 }}>{d.desc}</div>
              </button>
            );
          })}
        </div>

        {Number.isFinite(rateDef1) && rateDef1 > 0.1 && (
          <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(217,119,6,0.35)", borderLeft: "3px solid #d97706", background: "rgba(217,119,6,0.06)", fontSize: 12, lineHeight: 1.45, color: "var(--nlc-text)" }}>
            <div style={{ fontWeight: 800, marginBottom: 3, color: "var(--nlc-acc-brown)" }}>High rate — is a BYO lease available?</div>
            <div>
              Your effective rate exceeds 10%. It may be worth checking whether your employer supports a{" "}
              <a href="/tools/byo-employer-check/" target="_blank" rel="noopener" style={{ color: "var(--nlc-warn-dark)" }}>
                self-managed (BYO) novated lease
              </a>{" "}
              — these let you choose your own financier and typically carry a lower effective rate.
            </div>
          </div>
        )}

        {(() => {
          const d = defs.find((x) => x.id === activeDef)!;
          return (
            <SubHead mt={0}>
              {d.label} — {d.title}
            </SubHead>
          );
        })()}

        {contentByDef[activeDef]}
      </div>
    );
  } catch (e) {
    console.error("Effective interest report render failed", e);
    const msg = e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);
    return (
      <div style={{ padding: 10, border: "1px solid color-mix(in srgb, var(--nlc-bad) 40%, transparent)", borderRadius: 10, background: "var(--nlc-bad-light)", fontSize: 14, lineHeight: 1.35 }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 8 }}>Effective interest rate (error)</div>
        <div style={{ opacity: 0.9, marginBottom: 6 }}>Something went wrong while computing the effective interest rate.</div>
        <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.85 }}>{msg}</div>
      </div>
    );
  }
}
