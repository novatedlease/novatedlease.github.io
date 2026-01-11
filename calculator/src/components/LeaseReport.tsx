import React from "react";
import type { Inputs } from "../engine/types";

function aud(n: number): string {
  return n.toLocaleString("en-AU", { maximumFractionDigits: 2 });
}
function aud0(n: number): string {
  return n.toLocaleString("en-AU", { maximumFractionDigits: 0 });
}
function pct(n: number): string {
  return `${n.toFixed(2)}%`;
}

const GST_EXEMPT_CAP = 6334;
const ATO_RESIDUAL_PCT: Record<number, number> = {
  1: 65.63,
  2: 56.25,
  3: 46.88,
  4: 37.5,
  5: 28.13,
};

function residualPercentForYears(years: number): number {
  const y = Math.round(years);
  return ATO_RESIDUAL_PCT[y] ?? 28.13; // default to 5y if unknown for now
}

export function LeaseReport(props: {
  inputs: Inputs;
  // for now, pass in a tax rate as a simple percent
  taxRateInclMedicarePct?: number; // e.g. 47
}) {
  const i = props.inputs;
  const taxRatePct = props.taxRateInclMedicarePct ?? 47;
  const taxRate = taxRatePct / 100;

  const fortnights = Math.round(i.leaseDurationYears * 26);

  // Vehicle GST saved (simple: cap only; later we can compute from dutiable value precisely)
  const vehicleGstSaved = Math.min(GST_EXEMPT_CAP, i.driveawayCost / 11);

  // Amount financed (simple approximation)
  const amountFinanced = Math.max(0, i.driveawayCost - vehicleGstSaved);

  // Residual
  const residualPct = residualPercentForYears(i.leaseDurationYears);
  // Approx: residual based on amount financed excluding GST, then add GST back
  const residualPayableIncGst = (amountFinanced * (residualPct / 100)) * 1.1;

  // Electricity model
  const kwhPerYear = (i.annualMileageKm * i.avgWhPerKm) / 1000;
  const chargingExpensePerYear =
    i.overrideAnnualChargingExpense ??
    kwhPerYear * i.avgAudPerKwh;

  // ATO EV home charging shortcut (4.2c / km)
  const assumedChargingClaimPerYear = i.annualMileageKm * 0.042;
  const chargingDelta = assumedChargingClaimPerYear - chargingExpensePerYear;

  // Placeholder: “post-reimbursement effective charging expense”
  // (We'll refine later. For now, assume benefit = delta * taxRate if delta positive.)
  const postReimbursementEffectiveChargingExpense =
    chargingExpensePerYear - Math.max(0, chargingDelta) * taxRate;

  // Section 1: Lease payments (use your existing input fields)
  const vehicleLeaseFn = i.vehicleLeasePerFn;
  const runningCostAnnual =
    i.serviceMaintTyresAnnual +
    i.registrationAnnual +
    i.insuranceAnnual +
    i.managementFeesAnnual +
    chargingExpensePerYear;

  const runningCostFn = runningCostAnnual / 26;

  const preTaxVehicleLeaseAnnual = vehicleLeaseFn * 26;
  const preTaxRunningAnnual = runningCostAnnual;
  const preTaxTotalFn = vehicleLeaseFn + runningCostFn;
  const preTaxTotalAnnual = preTaxVehicleLeaseAnnual + preTaxRunningAnnual;

  const preTaxVehicleLeaseLifetime = preTaxVehicleLeaseAnnual * i.leaseDurationYears;
  const preTaxRunningLifetime = preTaxRunningAnnual * i.leaseDurationYears;
  const preTaxTotalLifetime = preTaxTotalAnnual * i.leaseDurationYears;

  // Placeholder for “post-tax equivalent” (take-home impact)
  // (Later: handle ECM/FBT, SG rules, Medicare, HELP, etc.)
  const postTaxFactor = 1 - taxRate;
  const postTaxVehicleLeaseFn = vehicleLeaseFn * postTaxFactor;
  const postTaxRunningFn = runningCostFn * postTaxFactor;
  const postTaxTotalFn = postTaxVehicleLeaseFn + postTaxRunningFn;

  const postTaxVehicleLeaseAnnual = postTaxVehicleLeaseFn * 26;
  const postTaxRunningAnnual = postTaxRunningFn * 26;
  const postTaxTotalAnnual = postTaxTotalFn * 26;

  const postTaxVehicleLeaseLifetime = postTaxVehicleLeaseAnnual * i.leaseDurationYears;
  const postTaxRunningLifetime = postTaxRunningAnnual * i.leaseDurationYears;
  const postTaxTotalLifetime = postTaxTotalAnnual * i.leaseDurationYears;

  return (
    <div style={{ fontSize: 14, lineHeight: 1.35 }}>
      <h2 style={{ margin: "0 0 10px" }}>DETAILS</h2>

      <KeyValue
        label="Income Tax Bracket (inclusive of Medicare Levy)"
        value={`Post 01/07/2024 — ${pct(taxRatePct)}`}
      />
      <KeyValue label="Lease Duration (Years)" value={String(i.leaseDurationYears)} />
      <KeyValue label="Fortnights" value={String(fortnights)} />

      <Spacer />

      <KeyValue label="Vehicle GST saved" value={`$ ${aud(vehicleGstSaved)}`} />
      <KeyValue label="Amount Financed" value={`$ ${aud(amountFinanced)}`} />
      <KeyValue
        label={`ATO-Mandated Residual Value % for ${Math.round(i.leaseDurationYears)} Years`}
        value={pct(residualPct)}
      />
      <KeyValue
        label={`Residual Value Payable after ${Math.round(i.leaseDurationYears)} Years (inc GST)`}
        value={`$ ${aud(residualPayableIncGst)}`}
      />

      <Spacer />

      <h3 style={{ margin: "10px 0 6px", fontStyle: "italic" }}>Electricity</h3>
      <KeyValue label="kWh per year" value={aud0(kwhPerYear)} />
      <KeyValue label="Charging Expense per year" value={`$ ${aud(chargingExpensePerYear)}`} />
      <KeyValue
        label="Assumed Charging per year (NL claim method)"
        value={`$ ${aud(assumedChargingClaimPerYear)}`}
      />
      <KeyValue label="Charging Delta" value={`$ ${aud(chargingDelta)}`} />
      <KeyValue
        label="Post-Reimbursement Effective Charging Expense"
        value={`$ ${aud(postReimbursementEffectiveChargingExpense)}`}
        highlight
      />

      <Spacer />

      <h2 style={{ margin: "14px 0 8px" }}>SECTION 1: LEASE PAYMENTS</h2>

      <h3 style={{ margin: "10px 0 6px" }}>Pre-Tax</h3>
      <Table
        rows={[
          ["Vehicle Lease", preTaxFmt(vehicleLeaseFn), preTaxFmt(preTaxVehicleLeaseAnnual), preTaxFmt(preTaxVehicleLeaseLifetime)],
          ["Running Cost", preTaxFmt(runningCostFn), preTaxFmt(preTaxRunningAnnual), preTaxFmt(preTaxRunningLifetime)],
          ["= Total", preTaxFmt(preTaxTotalFn), preTaxFmt(preTaxTotalAnnual), preTaxFmt(preTaxTotalLifetime)],
        ]}
      />

      <h3 style={{ margin: "14px 0 6px" }}>Post-Tax Equivalent (i.e. take home impact) — WIP</h3>
      <Table
        rows={[
          ["Vehicle Lease", preTaxFmt(postTaxVehicleLeaseFn), preTaxFmt(postTaxVehicleLeaseAnnual), preTaxFmt(postTaxVehicleLeaseLifetime)],
          ["Running Cost", preTaxFmt(postTaxRunningFn), preTaxFmt(postTaxRunningAnnual), preTaxFmt(postTaxRunningLifetime)],
          ["= Total", preTaxFmt(postTaxTotalFn), preTaxFmt(postTaxTotalAnnual), preTaxFmt(postTaxTotalLifetime)],
        ]}
        emphasizeLastRowValue
      />

      <div style={{ marginTop: 10, fontSize: 13, color: "#0b5cab", fontWeight: 600 }}>
        * REMINDER: After ${aud(preTaxTotalLifetime)}, you still have to pay $
        {aud(residualPayableIncGst)} residual value to fully own the vehicle at the conclusion of the lease.
      </div>
    </div>
  );
}

function preTaxFmt(n: number): string {
  return `$ ${n.toLocaleString("en-AU", { maximumFractionDigits: 2 })}`;
}

function Spacer() {
  return <div style={{ height: 10 }} />;
}

function KeyValue(props: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12, padding: "2px 0" }}>
      <div style={{ opacity: 0.85 }}>{props.label}</div>
      <div style={{ fontWeight: props.highlight ? 700 : 600, color: props.highlight ? "#0b5cab" : "inherit" }}>
        {props.value}
      </div>
    </div>
  );
}

function Table(props: { rows: Array<[string, string, string, string]>; emphasizeLastRowValue?: boolean }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thLeft}></th>
            <th style={th}>Fortnight</th>
            <th style={th}>Annual</th>
            <th style={th}>Lease Lifetime</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((r, idx) => {
            const isLast = idx === props.rows.length - 1;
            return (
              <tr key={idx}>
                <td style={tdLeft(isLast)}>{r[0]}</td>
                <td style={td(isLast)}>{r[1]}</td>
                <td style={td(isLast)}>{r[2]}</td>
                <td style={td(isLast, props.emphasizeLastRowValue)}>{r[3]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "right",
  borderBottom: "1px solid rgba(0,0,0,0.25)",
  padding: "6px 6px",
  fontWeight: 700,
};

const thLeft: React.CSSProperties = {
  ...th,
  textAlign: "left",
};

const td = (bold?: boolean, emphasize?: boolean): React.CSSProperties => ({
  textAlign: "right",
  padding: "6px 6px",
  borderBottom: bold ? "1px solid rgba(0,0,0,0.25)" : "1px solid rgba(0,0,0,0.08)",
  fontWeight: emphasize ? 800 : bold ? 700 : 500,
  color: emphasize ? "#0b5cab" : "inherit",
});

const tdLeft = (bold?: boolean): React.CSSProperties => ({
  ...td(bold),
  textAlign: "left",
});