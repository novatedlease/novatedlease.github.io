import React from "react";
import type { Inputs } from "../engine/types";

import {
  effectiveAnnualRateFromFortnightlyLease,
  financedAmountExGstFromInputs,
} from "../engine/effectiveinterest";
import { InfoTooltip } from "./ui/InfoTooltip";
import { Stat, StatGrid, SubHead, KV, NoteBox } from "./ui/shared";


export type EffectiveInterestReportProps = {
  inputs: Inputs;
};

function money(n: number) {
  return `$ ${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(rAnnual: number) {
  return Number.isFinite(rAnnual) ? `${(rAnnual * 100).toFixed(2)}%` : "—";
}

export function EffectiveInterestReport({ inputs }: EffectiveInterestReportProps) {
  try {
    const years = Math.round(inputs.leaseDurationYears);

    // GST saved (cap $6,334; no GST if private used)
    const gstSavedLocal = (() => {
      const cap = 6334;
      if (inputs.vehicleCondition === "Used – private sale (no GST)") return 0;
      const gross = Math.max(0, inputs.vehicleBaseValue);
      return Math.min(cap, gross / 11);
    })();

    // Definition 1 uses "standard financed" based on driveaway + doc fee - gst saved
    const financedStandardExGst = financedAmountExGstFromInputs(inputs);

    const residualStandardExGst = inputs.residualValueExGst;

    // Definition 2 uses a "brokerage-inflated financed amount reported by NL providers"
    const financedInflatedProxyExGst = Math.max(0, inputs.driveawayCost - gstSavedLocal) + inputs.leaseDocFee;

    const financedInflatedExGst =
      inputs.financedAmountForInterestCalcExGst > 0
        ? Math.max(0, inputs.financedAmountForInterestCalcExGst)
        : financedInflatedProxyExGst;

    const residualInflatedExGst = inputs.residualValueExGst;

    const leaseFn = Math.max(0, inputs.vehicleLeasePerFn);
    const mgmtFeeFn = Math.max(0, inputs.managementFeesAnnual / 26);

    // Wired from inputs.monthsDeferred
    const deferMonths = Math.max(0, Math.round(inputs.monthsDeferred));
    const payableMonths = Math.max(0, years * 12 - deferMonths);
    const totalFortnightsTotal = years * 26;
    const monthlyEquivalentFromFortnightly = (fortnightlyAmount: number) =>
      payableMonths > 0 ? (fortnightlyAmount * totalFortnightsTotal) / payableMonths : 0;

    const monthlyEqDef1 = monthlyEquivalentFromFortnightly(leaseFn);
    const monthlyEqDef1a = monthlyEquivalentFromFortnightly(leaseFn + mgmtFeeFn);
    const monthlyEqDef2 = monthlyEquivalentFromFortnightly(leaseFn);
    const noSolutionNote = "(no numerical solution for these inputs)";

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

    const DetailsCard = (p: { title: React.ReactNode; children: React.ReactNode; accent?: string }) => {
      const accent = p.accent ?? "#0b5cab";
      const [r, g, b] = [parseInt(accent.slice(1,3),16), parseInt(accent.slice(3,5),16), parseInt(accent.slice(5,7),16)];
      return (
        <div style={{ border: `1px solid rgba(${r},${g},${b},0.18)`, borderLeft: `3px solid rgba(${r},${g},${b},0.5)`, borderRadius: 10, padding: "10px 12px", marginTop: 10, background: `rgba(${r},${g},${b},0.03)` }}>
          {p.title}
          <div style={{ marginTop: 8 }}>{p.children}</div>
        </div>
      );
    };

    // --- Amortisation table helpers ---
    const moneyParens = (n: number) => {
      const abs = Math.abs(n);
      const s = abs.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return n < 0 ? `(${s})` : s;
    };

    const AmortisationTable = (p: {
      financedAmount: number;
      monthlyPayment: number;
      annualRate: number;
      title?: string;
    }) => {
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

        const out = {
          month,
          starting: start,
          paymentDisplay: isDeferred ? "" : moneyParens(-payment),
          balancePostPayment,
          interest,
          closing,
        };

        start = closing;
        return out;
      });

      return (
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid rgba(11,92,171,0.25)",
              background: "rgba(11,92,171,0.06)",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.03em",
              color: "#0b5cab",
            }}
          >
            <span>{open ? "Hide amortisation table" : "Show amortisation table"}</span>
            <span style={{ fontSize: 11 }}>{open ? "▾" : "▸"}</span>
          </button>

          {open ? (
            <div style={{ marginTop: 10, overflowX: "auto", borderRadius: 10, border: "1px solid rgba(0,0,0,0.09)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: 34 }} />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ textAlign: "center", padding: "7px 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "#0b5cab", color: "#fff" }}>
                      Month
                    </th>
                    <th style={{ textAlign: "right", padding: "7px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "#0b5cab", color: "#fff", whiteSpace: "nowrap" }}>Starting Bal.</th>
                    <th style={{ textAlign: "right", padding: "7px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "#0b5cab", color: "#fff", whiteSpace: "nowrap" }}>Payment</th>
                    <th style={{ textAlign: "right", padding: "7px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "#0b5cab", color: "#fff", whiteSpace: "nowrap" }}>Post-Payment Bal.</th>
                    <th style={{ textAlign: "right", padding: "7px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "#0b5cab", color: "#fff", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        Interest
                        <InfoTooltip text="Interest is calculated using a higher‑precision rate than the rounded percentage shown above." />
                      </span>
                    </th>
                    <th style={{ textAlign: "right", padding: "7px 6px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "#0b5cab", color: "#fff", whiteSpace: "nowrap" }}>Closing Bal.</th>
                  </tr>
                </thead>
                <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
                  {rows.map((r) => (
                    <tr key={r.month} style={{ borderBottom: "1px solid rgba(0,0,0,0.12)" }}>
                      <td style={{ padding: "6px 4px", textAlign: "center" }}>{r.month}</td>
                      <td style={{ padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{money(r.starting)}</td>
                      <td style={{ padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" }}>
                        {r.paymentDisplay ? `$ ${r.paymentDisplay}` : ""}
                      </td>
                      <td style={{ padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{money(r.balancePostPayment)}</td>
                      <td style={{ padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{money(r.interest)}</td>
                      <td style={{ padding: "6px 6px", textAlign: "right", whiteSpace: "nowrap" }}>{money(r.closing)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

    return (
      <div style={{ fontSize: 13, lineHeight: 1.4 }}>

        {/* ── Top stat cards ── */}
        <StatGrid>
          <Stat label="Effective rate (Def. 1)" value={pct(rateDef1)} color="#1b5e20" note="Recommended — standard financed amount" />
          <Stat label="Effective rate (Def. 1a)" value={pct(rateDef1a)} color="#0b5cab" note="Includes management fees" />
          <Stat label="Effective rate (Def. 2)" value={pct(rateDef2)} color="#4527a0" note="Provider-style inflated amount" />
        </StatGrid>

        <SubHead mt={4}>Definition 1 — Recommended</SubHead>
        <NoteBox color="#1b5e20" mt={0}>
          Closest to "what interest rate would amortise the financed amount down to residual value over the lease term."
        </NoteBox>
        <div style={{ marginTop: 10 }}>
          <KV label="Financed amount (standard)" value={money(financedStandardExGst)} />
          <KV label="Residual value payable (ex GST)" value={money(residualStandardExGst)} />
          <KV label="Fortnightly lease" value={money(leaseFn)} />
          <KV label={`Equivalent monthly lease over ${payableMonths} months`} value={money(monthlyEqDef1)} />
          <KV label="Months deferred" value={`${deferMonths} months`} />
          <KV label="Effective annual rate" value={pct(rateDef1)} bold highlight color="#1b5e20" />
        </div>

        <AmortisationTable
          financedAmount={financedStandardExGst}
          monthlyPayment={monthlyEqDef1}
          annualRate={rateDef1}
        />

        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 12.5, color: "#0b5cab" }}>
            Definition 1a — Include management fees ({pct(rateDef1a)})
            {!Number.isFinite(rateDef1a) ? (
              <span style={{ marginLeft: 8, fontWeight: 500, opacity: 0.75, fontStyle: "italic" }}>{noSolutionNote}</span>
            ) : null}
          </summary>
          <DetailsCard
            accent="#0b5cab"
            title={
              <div style={{ fontSize: 12.5, color: "rgba(0,0,0,0.65)", fontStyle: "italic", marginBottom: 8 }}>
                Useful for comparing quotes — treats management fees as part of the lease payment, revealing true cost when fees are bundled into "running costs".
              </div>
            }
          >
            <KV label="Financed amount (standard)" value={money(financedStandardExGst)} />
            <KV label="Residual value payable (ex GST)" value={money(residualStandardExGst)} />
            <KV label="Fortnightly lease + management fee" value={money(leaseFn + mgmtFeeFn)} />
            <KV label={`Equivalent monthly over ${payableMonths} months`} value={money(monthlyEqDef1a)} />
            <KV label="Effective annual rate (inc. fees)" value={pct(rateDef1a)} bold highlight color="#0b5cab" />

            <AmortisationTable
              financedAmount={financedStandardExGst}
              monthlyPayment={monthlyEqDef1a}
              annualRate={rateDef1a}
            />
          </DetailsCard>
        </details>

        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 12.5, color: "#4527a0" }}>
            Definition 2 — Provider-style inflated financed amount ({pct(rateDef2)})
            {!Number.isFinite(rateDef2) ? (
              <span style={{ marginLeft: 8, fontWeight: 500, opacity: 0.75, fontStyle: "italic" }}>{noSolutionNote}</span>
            ) : null}
          </summary>
          <DetailsCard
            accent="#4527a0"
            title={
              <div style={{ fontSize: 12.5, color: "rgba(0,0,0,0.65)", fontStyle: "italic", marginBottom: 8 }}>
                Can produce a misleadingly low rate when the financed amount is inflated with brokerage.
              </div>
            }
          >
            <KV label="Financed amount (incl. brokerage)" value={money(financedInflatedExGst)} />
            <KV label="Residual value payable (ex GST)" value={money(residualInflatedExGst)} />
            <KV label="Fortnightly lease" value={money(leaseFn)} />
            <KV label={`Equivalent monthly over ${payableMonths} months`} value={money(monthlyEqDef2)} />
            <KV label="Effective annual rate (inflated)" value={pct(rateDef2)} bold highlight color="#4527a0" />

            <AmortisationTable
              financedAmount={financedInflatedExGst}
              monthlyPayment={monthlyEqDef2}
              annualRate={rateDef2}
            />
          </DetailsCard>
        </details>
      </div>
    );
  } catch (e) {
    console.error("Section 4 effective interest render failed", e);

    const msg =
      e instanceof Error ? e.message : typeof e === "string" ? e : JSON.stringify(e);

    return (
      <div
        style={{
          padding: 10,
          border: "1px solid rgba(200,0,0,0.35)",
          borderRadius: 10,
          background: "rgba(200,0,0,0.06)",
          fontSize: 14,
          lineHeight: 1.35,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>
          SECTION 4: WHAT IS MY EFFECTIVE INTEREST RATE? (error)
        </div>
        <div style={{ opacity: 0.9, marginBottom: 6 }}>Something went wrong while computing the effective interest rate.</div>
        <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.85 }}>{msg}</div>
      </div>
    );
  }
}

export default EffectiveInterestReport;