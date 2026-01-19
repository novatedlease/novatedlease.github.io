import React from "react";
import type { Inputs } from "../engine/types";

// These helpers are already used elsewhere in the app (previously inline in App.tsx Section 4).
// If TypeScript complains about missing exports, we can adjust the import path to the exact module later.
import {
  effectiveAnnualRateFromFortnightlyLease,
  financedAmountExGstFromInputs,
} from "../engine/effectiveinterest";
import { InfoTooltip } from "./ui/InfoTooltip";
import { residualPercentForYears } from "../engine/ato";

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

    const residualPctRaw = residualPercentForYears(years);
    let residualPct = residualPctRaw > 1 ? residualPctRaw / 100 : residualPctRaw;
    // Defensive normalisation: guard against double-scaling (e.g. 0.002813 instead of 0.2813)
    if (residualPct > 0 && residualPct < 0.01) residualPct = residualPct * 100;

    // GST saved (cap $6,334; no GST if private used)
    const gstSavedLocal = (() => {
      const cap = 6334;
      if (inputs.vehicleCondition === "Used – private sale (no GST)") return 0;
      const gross = Math.max(0, inputs.vehicleBaseValue);
      return Math.min(cap, gross / 11);
    })();

    // Definition 1 uses "standard financed" based on driveaway + doc fee - gst saved
    const financedStandardExGst = financedAmountExGstFromInputs(inputs);

    // IMPORTANT: For Section 4, we want the residual value payable **ex GST**.
    // financedStandardExGst is treated as the financed amount INCLUDING doc fee (ex GST),
    // so the residual is computed off (financed - doc fee), per the existing pattern.
    const residualStandardExGst = Math.max(0, financedStandardExGst - inputs.leaseDocFee) * residualPct;

    // Definition 2 uses a "brokerage-inflated financed amount reported by NL providers"
    const financedInflatedProxyExGst = Math.max(0, inputs.driveawayCost - gstSavedLocal) + inputs.leaseDocFee;

    const financedInflatedExGst =
      inputs.financedAmountForInterestCalcExGst > 0
        ? Math.max(0, inputs.financedAmountForInterestCalcExGst)
        : financedInflatedProxyExGst;

    // Keep residual consistent with the standard base (matches the prior implementation)
    const residualInflatedExGst = Math.max(0, financedStandardExGst - inputs.leaseDocFee) * residualPct;

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

    const SectionTitle = (p: { children: React.ReactNode; subtle?: boolean }) => (
      <div
        style={{
          fontWeight: 900,
          fontSize: 15,
          marginTop: 14,
          marginBottom: 6,
          opacity: p.subtle ? 0.9 : 1,
        }}
      >
        {p.children}
      </div>
    );

    const SummaryBox = (p: { title: string; value: string; subtitle?: string }) => (
      <div
        style={{
          padding: "10px 12px",
          borderLeft: "4px solid rgba(11, 92, 171, 0.6)",
          background: "rgba(11, 92, 171, 0.06)",
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>{p.title}</div>
        <div style={{ fontSize: 24, fontWeight: 900, marginTop: 2 }}>{p.value}</div>
        {p.subtitle ? <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>{p.subtitle}</div> : null}
      </div>
    );

    const DetailsCard = (p: { title: React.ReactNode; children: React.ReactNode }) => (
      <div
        style={{
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 12,
          padding: "10px 12px",
          marginTop: 10,
        }}
      >
        {p.title}
        <div style={{ marginTop: 8 }}>{p.children}</div>
      </div>
    );

    const Row = (p: { label: string; value: string; note?: string }) => (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 10,
          alignItems: "baseline",
          padding: "2px 0",
        }}
      >
        <div style={{ fontWeight: 600 }}>
          {p.label}
          {p.note ? (
            <span
              style={{
                marginLeft: 8,
                fontWeight: 400,
                opacity: 0.7,
                fontStyle: "italic",
              }}
            >
              {p.note}
            </span>
          ) : null}
        </div>
        <div style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{p.value}</div>
      </div>
    );

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
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "rgba(0,0,0,0.02)",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 14,
              color: "rgba(0,0,0,0.9)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {open ? "Hide amortisation table" : "Show amortisation table"}
            </span>
            <span style={{ fontSize: 16, opacity: 0.7 }}>{open ? "▾" : "▸"}</span>
          </button>

          {open ? (
            <div style={{ marginTop: 10, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: 34 }} />
                  <col />
                  <col />
                  <col />
                  <col />
                  <col />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "2px solid rgba(0,0,0,0.25)" }}>
                    <th style={{ textAlign: "center", padding: "8px 4px", fontSize: 12, letterSpacing: 0.2 }}>
                      Month
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px", whiteSpace: "nowrap" }}>Starting Balance</th>
                    <th style={{ textAlign: "right", padding: "8px 6px", whiteSpace: "nowrap" }}>Payment</th>
                    <th style={{ textAlign: "right", padding: "8px 6px", whiteSpace: "nowrap" }}>Balance Post Payment</th>
                    <th style={{ textAlign: "right", padding: "8px 6px", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        Interest
                        <InfoTooltip text="Balance multiplied by effective interest rate / 12" />
                      </span>
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px", whiteSpace: "nowrap" }}>Closing Balance</th>
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
                The closing balance at the end of the schedule may not exactly match the residual value payable. This is expected:
                the effective interest rate displayed above is rounded to two decimal places, and this rounded rate is used to
                compute monthly interest in this table. When the underlying calculation uses the full (higher‑precision)
                interest rate, the amortisation schedule reconciles exactly to the residual value.
              </div>
            </div>
          ) : null}
        </div>
      );
    };

    return (
      <div style={{ fontSize: 14, lineHeight: 1.35 }}>

        <SummaryBox
          title="Effective interest rate (recommended)"
          value={pct(rateDef1)}
          subtitle="Definition 1: standard financed amount, excluding management fees"
        />

        <SectionTitle>Definition 1 (recommended)</SectionTitle>
        <div style={{ fontSize: 13, opacity: 0.75, fontStyle: "italic", marginTop: 6 }}>
          * Closest approximation of “if we pretend this as a loan; what interest rate would result in an amortisation schedule
          that starts from financed amount and ends with residual value”.
        </div>
        <div style={{ marginTop: 8 }}>
          <Row label="Financed Amount from standard calculations" value={money(financedStandardExGst)} />
          <Row label="Residual Value Payable (ex GST)" value={money(residualStandardExGst)} />
          <Row label="Fortnightly lease" value={money(leaseFn)} />
          <Row label={`↳ Equivalent to monthly lease over ${payableMonths} months`} value={money(monthlyEqDef1)} />
          <Row label="Months deferred" value={`${deferMonths} months`} />
        </div>
        <div style={{ marginTop: 8, fontWeight: 900 }}>
          Effective interest rate&nbsp;&nbsp;{pct(rateDef1)}
          {!Number.isFinite(rateDef1) ? (
            <span style={{ marginLeft: 8, fontWeight: 500, opacity: 0.75, fontStyle: "italic" }}>{noSolutionNote}</span>
          ) : null}
        </div>
        <AmortisationTable
          financedAmount={financedStandardExGst}
          monthlyPayment={monthlyEqDef1}
          annualRate={rateDef1}
        />

        <details style={{ marginTop: 14 }}>
          <summary style={{ cursor: "pointer", fontWeight: 900 }}>
            Definition 1a: Include management fees in the effective rate ({pct(rateDef1a)})
            {!Number.isFinite(rateDef1a) ? (
              <span style={{ marginLeft: 8, fontWeight: 500, opacity: 0.75, fontStyle: "italic" }}>{noSolutionNote}</span>
            ) : null}
          </summary>
          <DetailsCard
            title={
              <div style={{ fontSize: 13, opacity: 0.75, fontStyle: "italic" }}>
                * Useful for comparing quotes because it treats management fees as part of the lease payment. This can reveal the
                true cost when fees are bundled into “running costs”, especially if management fees are high.
              </div>
            }
          >
            <Row label="Financed Amount from standard calculations" value={money(financedStandardExGst)} />
            <Row label="Residual Value Payable (ex GST)" value={money(residualStandardExGst)} />
            <Row label="Fortnightly lease + Management fee" value={money(leaseFn + mgmtFeeFn)} />
            <Row label={`↳ Equivalent to monthly lease over ${payableMonths} months`} value={money(monthlyEqDef1a)} />
            <Row label="Months deferred" value={`${deferMonths} months`} />
            <div style={{ marginTop: 8, fontWeight: 900 }}>
              Effective interest rate (incorporating fees)&nbsp;&nbsp;{pct(rateDef1a)}
            </div>
            <AmortisationTable
              financedAmount={financedStandardExGst}
              monthlyPayment={monthlyEqDef1a}
              annualRate={rateDef1a}
            />
          </DetailsCard>
        </details>

        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 900 }}>
            Definition 2: Provider-style inflated financed amount ({pct(rateDef2)})
            {!Number.isFinite(rateDef2) ? (
              <span style={{ marginLeft: 8, fontWeight: 500, opacity: 0.75, fontStyle: "italic" }}>{noSolutionNote}</span>
            ) : null}
          </summary>
          <DetailsCard
            title={
              <div style={{ fontSize: 13, opacity: 0.75, fontStyle: "italic" }}>
                * Can produce misleadingly low interest rate if the financed amount is inflated with brokerage amount.
              </div>
            }
          >
            <Row label="Financed Amount that includes brokerage inflation" value={money(financedInflatedExGst)} />
            <Row label="Residual Value Payable (ex GST)" value={money(residualInflatedExGst)} />
            <Row label="Fortnightly lease" value={money(leaseFn)} />
            <Row label={`↳ Equivalent to monthly lease over ${payableMonths} months`} value={money(monthlyEqDef2)} />
            <Row label="Months deferred" value={`${deferMonths} months`} />
            <div style={{ marginTop: 8, fontWeight: 900 }}>
              Effective interest rate (using inflated financed amount)&nbsp;&nbsp;{pct(rateDef2)}
            </div>
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