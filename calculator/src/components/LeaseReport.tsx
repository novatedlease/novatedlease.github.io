import React from "react";
import { InfoTooltip } from "./ui/InfoTooltip";
import type { Inputs } from "../engine/types";
import { calcResidualPayableIncGst } from "../engine/types";
import { taxSummaryAUResident } from "../engine/tax_au";
import { residualPercentForYears, gstSaved } from "../engine/ato";
import { aud, aud0, pct } from "../utils/format";
import { buildFyBreakdown } from "../engine/fy_breakdown";
import { financedAmountExGstFromInputs } from "../engine/effectiveinterest";



export function LeaseReport(props: {
  inputs: Inputs;
  // Optional override for marginal rate incl. Medicare (percentage). If omitted, derived from Australian brackets.
  taxRateInclMedicarePct?: number; // e.g. 47
}) {
  const i = props.inputs;

  const t = taxSummaryAUResident(i.totalTaxableIncome);

  const taxRatePct =
    props.taxRateInclMedicarePct ?? t.marginalRateInclMedicare * 100;
  const taxRate = taxRatePct / 100;

  const fortnights = Math.round(i.leaseDurationYears * 26);

  // Vehicle GST saved (single-source rule in engine)
  const vehicleGstSaved = gstSaved(i);

  // Amount financed (simple approximation)
  const amountFinanced = financedAmountExGstFromInputs(i);

  // Residual
  const residualPct = residualPercentForYears(i.leaseDurationYears);

  // Residual payable (inc GST) — single source of truth (engine/types)
  const residualPayableIncGst = calcResidualPayableIncGst({
    amountFinancedExGst: amountFinanced,
    leaseDocFeeExGst: i.leaseDocFee,
    residualPct,
  });

  // Electricity model
  const kwhPerYear = (i.annualMileageKm * i.avgWhPerKm) / 1000;
  const chargingExpensePerYear =
    i.overrideAnnualChargingExpense ??
    kwhPerYear * i.avgAudPerKwh;

  // ATO EV home charging shortcut (4.2c / km)
  const assumedChargingClaimPerYear = i.annualMileageKm * 0.042;
  const chargingDelta = assumedChargingClaimPerYear - chargingExpensePerYear;

  // Placeholder: “post-reimbursement effective charging expense”
  // Requested simple model: actual charging expense minus (assumed claim * marginal tax rate)
  const postReimbursementEffectiveChargingExpense =
    chargingExpensePerYear - assumedChargingClaimPerYear * taxRate;

  // Section 1: Lease payments (use your existing input fields)
  const vehicleLeaseFn = i.vehicleLeasePerFn;
  const runningCostAnnual =
    i.serviceMaintTyresAnnual +
    i.saveShareAnnual +
    i.registrationAnnual +
    i.insuranceAnnual +
    i.managementFeesAnnual +
    assumedChargingClaimPerYear;

  const runningCostFn = runningCostAnnual / 26;

  const preTaxVehicleLeaseAnnual = vehicleLeaseFn * 26;
  const preTaxRunningAnnual = runningCostAnnual;
  const preTaxTotalFn = vehicleLeaseFn + runningCostFn;

  // Breakdown by Financial Years (engine)
  const fyRows = buildFyBreakdown({
    inputs: i,
    fortnights,
    preTaxTotalFn,
  });

  const preTaxTotalAnnual = preTaxVehicleLeaseAnnual + preTaxRunningAnnual;

  const preTaxVehicleLeaseLifetime = preTaxVehicleLeaseAnnual * i.leaseDurationYears;
  const preTaxRunningLifetime = preTaxRunningAnnual * i.leaseDurationYears;
  const preTaxTotalLifetime = preTaxTotalAnnual * i.leaseDurationYears;

  // Post-tax equivalent (take-home impact) — derived from FY breakdown
  // Fortnight + Annual columns show the MOST expensive FY effect when it varies.
  const maxTakeHomeImpactPerPay =
    fyRows.length > 0 ? Math.max(...fyRows.map((r) => r.takeHomeImpactPerPay)) : 0;

  // Lifetime impact should sum the actual per-FY counts
  const totalTakeHomeImpactOverLease = fyRows.reduce(
    (acc, r) => acc + r.takeHomeImpactPerPay * r.count,
    0
  );

  // Allocate take-home impact to lease vs running proportionally (WIP)
  const leaseShare = preTaxTotalFn > 0 ? vehicleLeaseFn / preTaxTotalFn : 0;
  const runningShare = preTaxTotalFn > 0 ? runningCostFn / preTaxTotalFn : 0;

  const postTaxVehicleLeaseFn = maxTakeHomeImpactPerPay * leaseShare;
  const postTaxRunningFn = maxTakeHomeImpactPerPay * runningShare;
  const postTaxTotalFn = postTaxVehicleLeaseFn + postTaxRunningFn;

  const postTaxVehicleLeaseAnnual = postTaxVehicleLeaseFn * 26;
  const postTaxRunningAnnual = postTaxRunningFn * 26;
  const postTaxTotalAnnual = postTaxTotalFn * 26;

  const postTaxVehicleLeaseLifetime = totalTakeHomeImpactOverLease * leaseShare;
  const postTaxRunningLifetime = totalTakeHomeImpactOverLease * runningShare;
  const postTaxTotalLifetime = totalTakeHomeImpactOverLease;

  const mostExpensiveImpactNote =
    "This is displaying the most expensive take home impact when the FY-to-FY effect varies";

  return (
    <div style={{ fontSize: 14, lineHeight: 1.35 }}>
      <h2 style={{ margin: "0 0 10px" }}>DETAILS</h2>

      <KeyValue
        label="Income Tax Bracket (inc. Medicare Levy)"
        value={`${Math.round(taxRatePct)}%`}
      />
      <KeyValue label="Lease Duration (Years)" value={String(i.leaseDurationYears)} />
      <KeyValue label="Fortnights" value={String(fortnights)} />

      <Spacer />

      <KeyValue
        label="Vehicle condition"
        value={i.vehicleCondition}
      />
      <KeyValue
        label="Vehicle GST saved"
        value={
          i.vehicleCondition === "Used – private sale (no GST)"
            ? `$ ${aud(vehicleGstSaved)} (not eligible — private sale)`
            : `$ ${aud(vehicleGstSaved)} (cap $ ${aud(6334)}; based on dutiable value / 11)`
        }
      />

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
        headerInfo={{ fortnight: mostExpensiveImpactNote, annual: mostExpensiveImpactNote }}
      />
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
        * {mostExpensiveImpactNote}
      </div>

      <Spacer />

      <h2 style={{ margin: "14px 0 8px" }}>Breakdown by Financial Years</h2>
      <FYTable fyRows={fyRows} />

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
        * Australian financial year runs from 1/7 to 30/6 and is named after the second year (e.g. FY 2027).
      </div>

      <div style={{ marginTop: 10, fontSize: 13, color: "#0b5cab", fontWeight: 600 }}>
        * REMINDER: After ${aud(postTaxTotalLifetime)}, you still have to pay $
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

function InfoInline(props: { text: React.ReactNode; width?: number }) {
  return <InfoTooltip text={props.text} width={props.width} />;
}

function Table(props: {
  rows: Array<[string, string, string, string]>;
  emphasizeLastRowValue?: boolean;
  headerInfo?: { fortnight?: React.ReactNode; annual?: React.ReactNode };
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thLeft}></th>
            <th style={th}>
              Fortnight{props.headerInfo?.fortnight ? <InfoInline text={props.headerInfo.fortnight} /> : null}
            </th>
            <th style={th}>
              Annual{props.headerInfo?.annual ? <InfoInline text={props.headerInfo.annual} /> : null}
            </th>
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

function FYTable(props: {
  fyRows: Array<{
    fy: number;
    count: number;
    originalTaxableIncome: number;
    originalTax: number;
    originalTakeHome: number;
    postNlTaxableIncome: number;
    postNlTax: number;
    postNlTakeHome: number;
    takeHomeImpactPerPay: number;
    avgLeaseTaxBracketPct: number;
  }>;
}) {
  const years = props.fyRows.map((r) => r.fy);

  const money0 = (n: number) => `$ ${aud0(n)}`;
  const money2 = (n: number) => `$ ${n.toLocaleString("en-AU", { maximumFractionDigits: 2 })}`;
  const pct0 = (n: number) => `${Math.round(n)}%`;

  const get = (fy: number) => props.fyRows.find((r) => r.fy === fy)!;

  const row = (
    label: string,
    render: (r: (typeof props.fyRows)[number]) => string,
    bold?: boolean
  ) => (
    <tr>
      <td style={tdLeft(bold)}>{label}</td>
      {years.map((y) => {
        const r = get(y);
        return (
          <td key={y} style={td(bold)}>
            {render(r)}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thLeft}></th>
            {years.map((y) => (
              <th key={y} style={th}>
                {y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {row("Original Taxable Income", (r) => money0(r.originalTaxableIncome))}
          {row("Original Income Tax + Medicare Levy", (r) => money0(r.originalTax), false)}
          {row("Original Take Home", (r) => money0(r.originalTakeHome), true)}

          {row("Post NL Taxable Income", (r) => money0(r.postNlTaxableIncome))}
          {row("Post NL Income Tax + Medicare Levy", (r) => money0(r.postNlTax), false)}
          {row("Post NL Take Home", (r) => money0(r.postNlTakeHome), true)}

          {row("Pay Fortnight Count", (r) => String(r.count))}
          {row("Take Home Impact per pay", (r) => money2(r.takeHomeImpactPerPay))}
          {row('"Average Lease Tax Bracket" this FY', (r) => pct0(r.avgLeaseTaxBracketPct), true)}
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