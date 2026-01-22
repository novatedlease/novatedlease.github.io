import React from "react";
import { InfoTooltip } from "./ui/InfoTooltip";
import type { Inputs } from "../engine/types";
import { calcResidualPayableIncGst } from "../engine/types";
import { residualPercentForYears } from "../engine/ato";
import { aud0 } from "../utils/format";
import { buildFyBreakdown } from "../engine/fy_breakdown";
import { financedAmountExGstFromInputs } from "../engine/effectiveinterest";



export function LeaseReport(props: {
  inputs: Inputs;
  // Optional override for marginal rate incl. Medicare (percentage). If omitted, derived from Australian brackets.
  taxRateInclMedicarePct?: number; // e.g. 47
}) {
  const i = props.inputs;


  const fortnights = Math.round(i.leaseDurationYears * 26);

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

  // Placeholder: “post-reimbursement effective charging expense”
  // Requested simple model: actual charging expense minus (assumed claim * marginal tax rate)
  // Note: removed electricity model and related variables per instructions

  // Section 1: Lease payments (use your existing input fields)
  const baseVehicleLeaseFn = i.vehicleLeasePerFn;
  const lvAdjFn = i.luxuryVehicleAdjPerFn;
  const vehicleLeaseFn = baseVehicleLeaseFn + lvAdjFn;

  // If buildFyBreakdown uses vehicleLeasePerFn internally, pass it an Inputs object
  // where vehicleLeasePerFn already includes the LV adjustment.
  const inputsWithLv: Inputs = {
    ...i,
    vehicleLeasePerFn: vehicleLeaseFn,
  };

  const assumedChargingClaimPerYear = i.annualMileageKm * 0.042;
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
    inputs: inputsWithLv,
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

      <div style={{ fontWeight: 900, fontSize: 14, margin: "10px 0 6px" }}>2.1 Summary</div>

      <div
        style={{
          fontWeight: 800,
          fontSize: 14,
          margin: "10px 0 6px",
          paddingLeft: 8,
          borderLeft: "3px solid rgba(0,0,0,0.08)",
        }}
      >
        Pre-Tax
      </div>
      <Table
        rows={[
          [
            lvAdjFn > 0 ? "Vehicle Lease + LV Adjustment" : "Vehicle Lease",
            preTaxFmt(vehicleLeaseFn),
            preTaxFmt(preTaxVehicleLeaseAnnual),
            preTaxFmt(preTaxVehicleLeaseLifetime),
          ],
          ["Running Cost", preTaxFmt(runningCostFn), preTaxFmt(preTaxRunningAnnual), preTaxFmt(preTaxRunningLifetime)],
          ["= Total", preTaxFmt(preTaxTotalFn), preTaxFmt(preTaxTotalAnnual), preTaxFmt(preTaxTotalLifetime)],
        ]}
      />

      <div
        style={{
          fontWeight: 800,
          fontSize: 14,
          margin: "14px 0 6px",
          paddingLeft: 8,
          borderLeft: "3px solid rgba(0,0,0,0.08)",
        }}
      >
        Post-Tax Equivalent (i.e. take home impact)
      </div>
      <Table
        rows={[
          [
            lvAdjFn > 0 ? "Vehicle Lease + LV Adjustment" : "Vehicle Lease",
            preTaxFmt(postTaxVehicleLeaseFn),
            preTaxFmt(postTaxVehicleLeaseAnnual),
            preTaxFmt(postTaxVehicleLeaseLifetime),
          ],
          ["Running Cost", preTaxFmt(postTaxRunningFn), preTaxFmt(postTaxRunningAnnual), preTaxFmt(postTaxRunningLifetime)],
          ["= Total", preTaxFmt(postTaxTotalFn), preTaxFmt(postTaxTotalAnnual), preTaxFmt(postTaxTotalLifetime)],
        ]}
        emphasizeLastRowValue
        headerInfo={{ fortnight: mostExpensiveImpactNote, annual: mostExpensiveImpactNote }}
      />
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
        * REMINDER: After {preTaxFmt(postTaxTotalLifetime)}, <b>you still have to pay {preTaxFmt(residualPayableIncGst)} in 
        residual value</b> to fully own the vehicle at the conclusion of the lease.
      </div>

      <Spacer />

      <div style={{ fontWeight: 900, fontSize: 14, margin: "14px 0 6px" }}>2.2 Breakdown by Financial Years</div>
      <FYTable fyRows={fyRows} />

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
        <div>
          * The take home figure does not consider other subsidies and liabilities (e.g., HECS, childcare subsidy, Medicare Levy Surcharge, other salary packaging, etc.).
        </div>
        <div style={{ marginTop: 6 }}>
          * “Average Lease Tax Bracket” means the average discount effect for the pre-tax dollars used in that financial year. Normally this is equivalent to your marginal tax rate + 2% Medicare levy; however it can change if the novated lease drops you into a lower income tax bracket.
        </div>
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

  const takeHomeRowCellStyle = (isLabel: boolean) => ({
    ...(isLabel ? tdLeft(true) : td(true)),
    background: "rgba(0,0,0,0.015)",
  });

  const GroupCell = (props: { text: string }) => (
    <td
      rowSpan={3}
      style={{
        borderBottom: "1px solid rgba(0,0,0,0.25)",
        textAlign: "center",
        verticalAlign: "middle",
        padding: 0,
        width: 18,
        minWidth: 18,
        maxWidth: 18,
        color: "rgba(0,0,0,0.55)",
        background: "rgba(0,0,0,0.02)",
        writingMode: "vertical-rl" as any,
        transform: "rotate(180deg)",
        letterSpacing: 0.5,
        fontWeight: 700,
        fontSize: 11,
        overflow: "hidden",
      }}
    >
      {props.text}
    </td>
  );

  const SeparatorRow = (props: { text: React.ReactNode }) => (
    <tr>
      <td
        colSpan={years.length + 2}
        style={{
          padding: "8px 6px",
          borderBottom: "1px solid rgba(0,0,0,0.15)",
          background: "rgba(0,0,0,0.02)",
          fontSize: 12,
          color: "rgba(0,0,0,0.65)",
        }}
      >
        {props.text}
      </td>
    </tr>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...thLeft, width: 18, minWidth: 18, maxWidth: 18, paddingLeft: 0, paddingRight: 0 }}></th>
            <th style={thLeft}></th>
            {years.map((y) => (
              <th key={y} style={th}>
                {y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* BEFORE LEASE (grouped) */}
          <tr>
            {GroupCell({ text: "Before Lease" })}
            <td style={tdLeft(false)}>Taxable Income</td>
            {years.map((y) => {
              const r = get(y);
              return (
                <td key={y} style={td(false)}>
                  {money0(r.originalTaxableIncome)}
                </td>
              );
            })}
          </tr>
          <tr>
            <td style={tdLeft(false)}>Income Tax + Medicare Levy</td>
            {years.map((y) => {
              const r = get(y);
              return (
                <td key={y} style={td(false)}>
                  {money0(r.originalTax)}
                </td>
              );
            })}
          </tr>
          <tr>
            <td style={takeHomeRowCellStyle(true)}>Take Home</td>
            {years.map((y) => {
              const r = get(y);
              return (
                <td key={y} style={takeHomeRowCellStyle(false)}>
                  {money0(r.originalTakeHome)}
                </td>
              );
            })}
          </tr>

          <SeparatorRow text={<>↓ After novated lease (estimated)</>} />

          {/* AFTER LEASE (grouped) */}
          <tr>
            {GroupCell({ text: "After Lease" })}
            <td style={tdLeft(false)}>Taxable Income</td>
            {years.map((y) => {
              const r = get(y);
              return (
                <td key={y} style={td(false)}>
                  {money0(r.postNlTaxableIncome)}
                </td>
              );
            })}
          </tr>
          <tr>
            <td style={tdLeft(false)}>Income Tax + Medicare Levy</td>
            {years.map((y) => {
              const r = get(y);
              return (
                <td key={y} style={td(false)}>
                  {money0(r.postNlTax)}
                </td>
              );
            })}
          </tr>
          <tr>
            <td style={takeHomeRowCellStyle(true)}>Take Home</td>
            {years.map((y) => {
              const r = get(y);
              return (
                <td key={y} style={takeHomeRowCellStyle(false)}>
                  {money0(r.postNlTakeHome)}
                </td>
              );
            })}
          </tr>
          <tr>
              {/* Blank cell for the skinny group column */}
              <td style={{ ...td(true), width: 18, minWidth: 18, maxWidth: 18, paddingLeft: 0, paddingRight: 0 }}></td>
            <td style={takeHomeRowCellStyle(true)}>Take Home Impact</td>
            {years.map((y) => {
              const r = get(y);
              const delta = r.postNlTakeHome - r.originalTakeHome;
              return (
                <td key={y} style={takeHomeRowCellStyle(false)}>
                  {money0(delta)}
                </td>
              );
            })}
          </tr>

          <SeparatorRow text={<>↓ Lease-specific metrics</>} />

          {/* METRICS */}
          <tr>
            <td style={td(true)}></td>
            <td style={tdLeft(false)}>Pay Fortnight Count</td>
            {years.map((y) => {
              const r = get(y);
              return (
                <td key={y} style={td(false)}>
                  {String(r.count)}
                </td>
              );
            })}
          </tr>
          <tr>
            <td style={td(true)}></td>
            <td style={tdLeft(false)}>Take Home Impact per pay</td>
            {years.map((y) => {
              const r = get(y);
              return (
                <td key={y} style={td(false)}>
                  {money2(r.takeHomeImpactPerPay)}
                </td>
              );
            })}
          </tr>
          <tr>
            <td style={td(true)}></td>
            <td style={tdLeft(true)}>"Average Lease Tax Bracket" this FY</td>
            {years.map((y) => {
              const r = get(y);
              return (
                <td key={y} style={td(true)}>
                  {pct0(r.avgLeaseTaxBracketPct)}
                </td>
              );
            })}
          </tr>
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