import React, { useMemo, useState } from "react";
import type { Inputs } from "../engine/types";
import {
  effectiveAnnualRateFromFortnightlyLease,
  financedAmountExGstFromInputs,
  fortnightlyLeaseFromEffectiveAnnualRate,
} from "../engine/effectiveinterest";
import { residualFractionForYears } from "../engine/ato";
import { InfoTooltip } from "./ui/InfoTooltip";

export type WhatIfProps = {
  inputs: Inputs;
};

function money(n: number) {
  return `$ ${n.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function moneyNoCents(n: number) {
  return `$ ${Math.round(n).toLocaleString("en-AU")}`;
}

function fmtPct(p: number) {
  return `${(p * 100).toFixed(2)}%`;
}

export default function WhatIf({ inputs }: WhatIfProps) {
  // This section is intentionally conservative + simple.
  // We use the same interest-rate engine as Section 3 (Effective Interest Rate)
  // so the hypothetical comparison is apples-to-apples.

  const years = Math.max(1, Math.round(inputs.leaseDurationYears));
  const deferMonths = Math.max(0, Math.round(inputs.monthsDeferred ?? 0));
  const totalFortnights = years * 26;

  // For this comparison, use ONLY the quoted "Vehicle Lease (Per Fortnight)" input field.
  // (i.e. do not include any luxury-car adjustment.)
  const currentVehiclePerFn = Math.max(0, inputs.vehicleLeasePerFn);

  // Finance parameters (ex GST) consistent with EffectiveInterestReport
  const financedExGst = financedAmountExGstFromInputs(inputs);
  const residualPct = residualFractionForYears(years);
  const residualExGst = Math.max(0, financedExGst - Math.max(0, inputs.leaseDocFee)) * residualPct;

  // Implied effective annual rate for the QUOTED vehicle lease (using the engine's inverse solver)
  const quotedAnnualRate = useMemo(() => {
    try {
      if (currentVehiclePerFn <= 0) return null;
      return effectiveAnnualRateFromFortnightlyLease({
        financedAmountExGst: financedExGst,
        residualValueExGst: residualExGst,
        leaseYears: years,
        deferMonths,
        fortnightlyLeasePayment: currentVehiclePerFn,
      });
    } catch {
      return null;
    }
  }, [currentVehiclePerFn, financedExGst, residualExGst, years, deferMonths]);

  const [assumedAnnualRate, setAssumedAnnualRate] = useState<number>(0.07);

  const { hypotheticalPerFn, error } = useMemo(() => {
    try {
      const perFn = fortnightlyLeaseFromEffectiveAnnualRate({
        financedAmountExGst: financedExGst,
        residualValueExGst: residualExGst,
        leaseYears: years,
        deferMonths,
        effectiveAnnualRate: assumedAnnualRate,
      });
      return { hypotheticalPerFn: perFn, error: null as string | null };
    } catch (e) {
      return {
        hypotheticalPerFn: 0,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [financedExGst, residualExGst, years, deferMonths, assumedAnnualRate]);

  // Finance outcomes are settled in cents per pay period.
  // To match real-world statements, we round per-fortnight amounts to 2dp
  // before multiplying across the term.
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const currentVehiclePerFn2dp = round2(currentVehiclePerFn);
  const hypotheticalPerFn2dp = round2(hypotheticalPerFn);

  const currentTotal = currentVehiclePerFn2dp * totalFortnights;
  const hypotheticalTotal = hypotheticalPerFn2dp * totalFortnights;
  const diffTotal = currentTotal - hypotheticalTotal;
  const diffPerFn = currentVehiclePerFn2dp - hypotheticalPerFn2dp;

  const moreOrLess = (x: number) => (x >= 0 ? "more" : "less");

  const SummaryCard = (p: { title: string; value: string; subtitle?: React.ReactNode }) => (
    <div
      style={{
        padding: "10px 12px",
        borderLeft: "4px solid #0b5cab",
        background: "rgba(11,92,171,0.08)",
        borderRadius: 10,
        marginBottom: 10,
        maxWidth: 520,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>{p.title}</div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>{p.value}</div>
      {p.subtitle ? (
        <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6, lineHeight: 1.35 }}>
          {p.subtitle}
        </div>
      ) : null}
    </div>
  );


  if (error) {
    return (
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ fontWeight: 850, fontSize: 12, opacity: 0.85 }}>Assumed rate</div>
          <div style={{ display: "inline-flex", border: "1px solid rgba(0,0,0,0.18)", borderRadius: 999, overflow: "hidden" }}>
            {[0.07, 0.08, 0.09].map((r) => {
              const active = assumedAnnualRate === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAssumedAnnualRate(r)}
                  style={{
                    appearance: "none",
                    border: "none",
                    background: active ? "rgba(0,0,0,0.12)" : "transparent",
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontWeight: active ? 900 : 650,
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                  aria-pressed={active}
                >
                  {(r * 100).toFixed(0)}%
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>
          Assumption: effective interest rate = {fmtPct(assumedAnnualRate)}
        </div>
        <div style={{ opacity: 0.85 }}>
          Unable to compute the hypothetical lease payment for these inputs.
        </div>
        <div style={{ marginTop: 8, opacity: 0.75, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 15 }}>
            What if the underlying wholesale finance rate were {fmtPct(assumedAnnualRate)}?
          </div>
          <InfoTooltip
            width={420}
            text={
              "This is a simple 'what-if' sensitivity check. 7% is a ballpark estimate of wholesale finance rate underlying typical novated leases based on an inside source. Actual wholesale rates vary over time and by financier, credit profile, term, broader interest rate conditions."
            }
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 850, fontSize: 12, opacity: 0.85 }}>Assumed rate</div>
          <div style={{ display: "inline-flex", border: "1px solid rgba(0,0,0,0.18)", borderRadius: 999, overflow: "hidden" }}>
            {[0.07, 0.08, 0.09].map((r) => {
              const active = assumedAnnualRate === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAssumedAnnualRate(r)}
                  style={{
                    appearance: "none",
                    border: "none",
                    background: active ? "rgba(0,0,0,0.12)" : "transparent",
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontWeight: active ? 900 : 650,
                    fontSize: 12,
                    lineHeight: 1,
                  }}
                  aria-pressed={active}
                >
                  {(r * 100).toFixed(0)}%
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <SummaryCard
        title="You paid"
        value={`${moneyNoCents(Math.abs(diffTotal))} ${moreOrLess(diffTotal)} (pre-tax)`}
        subtitle={
          <>
            Your quoted vehicle lease is <b>{moneyNoCents(Math.abs(diffTotal))}</b> (pre-tax)
            {" "}{moreOrLess(diffTotal)} than the wholesale finance rate over <b>{totalFortnights}</b> fortnights.
          </>
        }
      />

      <div style={{ maxWidth: 820 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.18)" }}>
              <th style={{ textAlign: "left", padding: "6px 4px" }}></th>
              <th style={{ textAlign: "left", padding: "6px 4px" }}>Rate</th>
              <th style={{ textAlign: "left", padding: "6px 4px" }}>Per fortnight (pre-tax)</th>
              <th style={{ textAlign: "left", padding: "6px 4px" }}>Lifetime total (pre-tax)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
              <td style={{ padding: "6px 4px", fontWeight: 600 }}>
                Wholesale (Assumed)
              </td>
              <td style={{ padding: "6px 4px" }}>{fmtPct(assumedAnnualRate)}</td>
              <td style={{ padding: "6px 4px" }}>{money(hypotheticalPerFn2dp)}</td>
              <td style={{ padding: "6px 4px" }}>{money(hypotheticalTotal)}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px 4px", fontWeight: 600 }}>Quoted</td>
              <td style={{ padding: "6px 4px" }}>
                {quotedAnnualRate != null ? fmtPct(quotedAnnualRate) : "–"}
              </td>
              <td style={{ padding: "6px 4px" }}>{money(currentVehiclePerFn2dp)}</td>
              <td style={{ padding: "6px 4px" }}>{money(currentTotal)}</td>
            </tr>
            <tr style={{ borderTop: "1px solid rgba(0,0,0,0.12)" }}>
              <td style={{ padding: "6px 4px", fontWeight: 800 }}>Difference</td>
              <td style={{ padding: "6px 4px" }}></td>
              <td style={{ padding: "6px 4px", fontWeight: 800 }}>
                {money(Math.abs(diffPerFn))} {moreOrLess(diffPerFn)}
              </td>
              <td style={{ padding: "6px 4px", fontWeight: 800 }}>
                {moneyNoCents(Math.abs(diffTotal))} {moreOrLess(diffTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20, maxWidth: 820 }}>
        <div style={{ fontWeight: 900, opacity: 0.9, marginBottom: 6 }}>
          Interpretation
        </div>

        <div style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.85 }}>
          The difference above is a simple estimate of the gross financing margin between your quoted vehicle lease and an assumed
          underlying wholesale finance rate. Novated lease quotes often bundle admin fees, insurances, and repair packages, and different
          parties may be compensated in different ways; this tool cannot observe the underlying commercial arrangements. 
        </div>

        <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.4, opacity: 0.75 }}>
          <b>Note:</b> This shows the <b>pre-tax</b> repayment difference only, not the net (after-tax) impact on your take-home pay. The actual net effect depends on your marginal tax rate (including any threshold effects), as well as the secondary benefit from reduced home loan interest. To approximate the net impact, enter the hypothetical vehicle lease amount in the Inputs panel (i.e. <b>{money(hypotheticalPerFn2dp)} per fortnight, pre-tax</b>) and compare the Summary outcomes.
        </div>
      </div>

    </div>
  );
}