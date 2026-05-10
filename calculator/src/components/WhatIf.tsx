import { useMemo, useState } from "react";
import type { Inputs } from "../engine/types";
import {
  effectiveAnnualRateFromFortnightlyLease,
  financedAmountExGstFromInputs,
  fortnightlyLeaseFromEffectiveAnnualRate,
} from "../engine/effectiveinterest";

import { InfoTooltip } from "./ui/InfoTooltip";
import { Stat, StatGrid, SubHead, NoteBox } from "./ui/shared";

export type WhatIfProps = {
  inputs: Inputs;
  vehicleLeasePeriodMode?: "perFn" | "perMonth";
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

export default function WhatIf({ inputs, vehicleLeasePeriodMode }: WhatIfProps) {
  // This section is intentionally conservative + simple.
  // We use the same interest-rate engine as Section 3 (Effective Interest Rate)
  // so the hypothetical comparison is apples-to-apples.

  const isMonthly = vehicleLeasePeriodMode === "perMonth";
  const fnToCol = (v: number) => isMonthly ? v * 26 / 12 : v;
  const period = isMonthly ? "month" : "fortnight";

  const years = Math.max(1, Math.round(inputs.leaseDurationYears));
  const deferMonths = Math.max(0, Math.round(inputs.monthsDeferred ?? 0));
  const totalFortnights = years * 26;

  // For this comparison, use ONLY the quoted "Vehicle Lease (Per Fortnight)" input field.
  // (i.e. do not include any luxury-car adjustment.)
  const currentVehiclePerFn = Math.max(0, inputs.vehicleLeasePerFn);

  // Finance parameters (ex GST) consistent with EffectiveInterestReport
  const financedExGst = financedAmountExGstFromInputs(inputs);
  const residualExGst = inputs.residualValueExGst;

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



  if (error) {
    return (
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>
        <NoteBox color="#b71c1c">
          Unable to compute the hypothetical lease payment for these inputs.
          <div style={{ marginTop: 6, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11, opacity: 0.85 }}>{error}</div>
        </NoteBox>
      </div>
    );
  }

  return (
    <div style={{ fontSize: 13, lineHeight: 1.5 }}>

      {/* ── Top stat cards ── */}
      <StatGrid>
        <Stat
          label={`Quoted vehicle lease / ${period}`}
          value={money(fnToCol(currentVehiclePerFn2dp))}
          color="#0b5cab"
          note={`Implied rate: ${quotedAnnualRate != null ? fmtPct(quotedAnnualRate) : "—"}`}
        />
        <Stat
          label={`Wholesale rate (${fmtPct(assumedAnnualRate)}) vehicle / ${period}`}
          value={money(fnToCol(hypotheticalPerFn2dp))}
          color="#1b5e20"
        />
        <Stat
          label="Difference over term"
          value={`${moneyNoCents(Math.abs(diffTotal))} ${moreOrLess(diffTotal)}`}
          color={diffTotal >= 0 ? "#b71c1c" : "#1b5e20"}
          note="Pre-tax, lifetime total"
        />
      </StatGrid>

      {/* ── Assumed rate selector ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(0,0,0,0.65)" }}>Assumed wholesale rate:</div>
        <div style={{ display: "inline-flex", border: "1px solid rgba(11,92,171,0.3)", borderRadius: 999, overflow: "hidden", background: "rgba(11,92,171,0.04)" }}>
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
                  background: active ? "#0b5cab" : "transparent",
                  color: active ? "#fff" : "#0b5cab",
                  padding: "5px 12px",
                  cursor: "pointer",
                  fontWeight: active ? 800 : 600,
                  fontSize: 12,
                  lineHeight: 1,
                  transition: "all 120ms ease",
                }}
                aria-pressed={active}
              >
                {(r * 100).toFixed(0)}%
              </button>
            );
          })}
        </div>
        <InfoTooltip
          width={420}
          text="7% is a ballpark estimate of wholesale finance rate underlying typical novated leases. Actual wholesale rates vary over time and by financier, credit profile, term, and broader interest rate conditions."
        />
      </div>

      {/* ── Comparison table ── */}
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(0,0,0,0.09)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", minWidth: "max-content", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "7px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "#4a4a4a", color: "#fff" }}></th>
              <th style={{ textAlign: "right", padding: "7px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "#4a4a4a", color: "#fff", whiteSpace: "nowrap" }}>Rate</th>
              <th style={{ textAlign: "right", padding: "7px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "#4a4a4a", color: "#fff", whiteSpace: "nowrap" }}>Per {period}</th>
              <th style={{ textAlign: "right", padding: "7px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", background: "#4a4a4a", color: "#fff", whiteSpace: "nowrap" }}>Lifetime total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: "6px 10px", fontWeight: 600, borderBottom: "1px solid rgba(0,0,0,0.06)", color: "#1b5e20" }}>Wholesale (assumed)</td>
              <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid rgba(0,0,0,0.06)", fontVariantNumeric: "tabular-nums", color: "#1b5e20" }}>{fmtPct(assumedAnnualRate)}</td>
              <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid rgba(0,0,0,0.06)", fontVariantNumeric: "tabular-nums", color: "#1b5e20" }}>{money(fnToCol(hypotheticalPerFn2dp))}</td>
              <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid rgba(0,0,0,0.06)", fontVariantNumeric: "tabular-nums", color: "#1b5e20" }}>{money(hypotheticalTotal)}</td>
            </tr>
            <tr>
              <td style={{ padding: "6px 10px", fontWeight: 600, borderBottom: "1px solid rgba(0,0,0,0.06)", color: "#0b5cab" }}>Quoted</td>
              <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid rgba(0,0,0,0.06)", fontVariantNumeric: "tabular-nums", color: "#0b5cab" }}>{quotedAnnualRate != null ? fmtPct(quotedAnnualRate) : "–"}</td>
              <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid rgba(0,0,0,0.06)", fontVariantNumeric: "tabular-nums", color: "#0b5cab" }}>{money(fnToCol(currentVehiclePerFn2dp))}</td>
              <td style={{ padding: "6px 10px", textAlign: "right", borderBottom: "1px solid rgba(0,0,0,0.06)", fontVariantNumeric: "tabular-nums", color: "#0b5cab" }}>{money(currentTotal)}</td>
            </tr>
            <tr style={{ background: "rgba(183,28,28,0.04)" }}>
              <td style={{ padding: "6px 10px", fontWeight: 800, color: "#b71c1c" }}>Difference</td>
              <td style={{ padding: "6px 10px", textAlign: "right", color: "#b71c1c" }}></td>
              <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#b71c1c" }}>{money(Math.abs(fnToCol(diffPerFn)))} {moreOrLess(diffPerFn)}</td>
              <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#b71c1c" }}>{moneyNoCents(Math.abs(diffTotal))} {moreOrLess(diffTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <SubHead mt={14}>Interpretation</SubHead>
      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: "rgba(0,0,0,0.75)" }}>
        <p style={{ margin: "0 0 8px 0" }}>
          The difference above is a simple estimate of the gross financing margin between your quoted vehicle lease and an assumed
          wholesale finance rate. In practice, novated lease providers derive margin from multiple sources — the spread between wholesale and quoted interest rates, administration fees, and commissions from bundled products such as insurance and service packages — and it is generally impossible to determine their true total revenue or how it is split across these channels.
        </p>
        <p style={{ margin: 0 }}>
          <b>Note:</b> This shows the <b>pre-tax</b> repayment difference only. To approximate the net after-tax impact, enter{" "}
          <b>{money(fnToCol(hypotheticalPerFn2dp))} per {period}</b> as the vehicle lease in the Inputs panel and compare Summary outcomes.
        </p>
      </div>

    </div>
  );
}