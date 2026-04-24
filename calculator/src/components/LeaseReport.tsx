import React, { useState } from "react";
import { InfoTooltip } from "./ui/InfoTooltip";
import type { Inputs } from "../engine/types";
import { isFbtApplicable } from "../engine/types";
import { aud0 } from "../utils/format";

import { computeDerived } from "../engine/derived";
import { taxSummaryAUResident } from "../engine/tax_au";



export function LeaseReport(props: {
  inputs: Inputs;
  taxRateInclMedicarePct?: number; // e.g. 47
  vehicleLeasePeriodMode?: "perFn" | "perMonth";
}) {
  const i = props.inputs;
  const isMonthly = props.vehicleLeasePeriodMode === "perMonth";
  const fnToCol = (v: number) => isMonthly ? v * 26 / 12 : v;

  const [fyExpanded, setFyExpanded] = useState(false);

  const fbtApplies = isFbtApplicable(i);

  // ECM / Employee contribution method (only relevant when FBT applies)
  // Using vehicle base value as the dutiable value proxy (matches BasicInformationReport).
  const vehicleDutiableValue = Math.max(0, i.vehicleBaseValue);
  const fbtStatutoryRate = 0.2;
  const ecmAnnual = vehicleDutiableValue * fbtStatutoryRate;
  const ecmPerFn = ecmAnnual / 26;
  const ecmGstPerFn = ecmPerFn / 11;

  const residualPayableIncGst = i.residualValueExGst * 1.1;

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

  // Single source of truth for packaged running costs and FY allocation inputs.
  const d = computeDerived(inputsWithLv);

  const runningCostAnnual = d.runningCostAnnual;
  const runningCostFn = d.runningCostFn;

  const preTaxVehicleLeaseAnnual = vehicleLeaseFn * 26;
  const preTaxRunningAnnual = runningCostAnnual;
  const preTaxTotalFn = d.preTaxTotalFn;

  // Breakdown by Financial Years (engine)
  const fyRows = d.fyRows;

  // (removed: old maxAvgLeaseTaxRate and any previous correctedAvgLeaseTaxRateForFy/maxAfterTaxFactorForPreTax helper)

  // Actual pre-tax deduction after ECM adjustments (FBT-applicable only)
  const preTaxTotalAnnual = preTaxVehicleLeaseAnnual + preTaxRunningAnnual;
  const preTaxTotalLifetime = preTaxTotalAnnual * i.leaseDurationYears;

  const actualPreTaxDeductionFn = preTaxTotalFn + (fbtApplies ? -ecmPerFn + ecmGstPerFn : 0);
  const actualPreTaxDeductionAnnual = preTaxTotalAnnual + (fbtApplies ? -ecmAnnual + ecmGstPerFn * 26 : 0);
  const actualPreTaxDeductionLifetime =
    preTaxTotalLifetime + (fbtApplies ? (-ecmAnnual + ecmGstPerFn * 26) * i.leaseDurationYears : 0);

  // For Fortnight/Annual columns we want the MOST expensive FY take-home impact.
  // Pre-tax dollars reduce take-home by (1 - taxRate), so we want the MAX of (1 - taxRate).
  const correctedAvgLeaseTaxRateForFy = (r: (typeof fyRows)[number]) => {
    // Non-FBT path: use engine-provided average bracket
    if (!fbtApplies) {
      const rate = r.avgLeaseTaxBracketPct / 100;
      return Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 0;
    }

    // FBT-applicable path: replicate FYTable logic with exact tax
    const preTaxDeductionThisFy = actualPreTaxDeductionFn * r.count;
    if (!(preTaxDeductionThisFy > 0) || !Number.isFinite(preTaxDeductionThisFy)) return 0;

    const postTaxEcmThisFy = ecmPerFn * r.count;

    const postNlTaxableIncome = r.originalTaxableIncome - preTaxDeductionThisFy;
    const postNlTax = taxSummaryAUResident(postNlTaxableIncome).totalTax;

    const postNlTakeHome = postNlTaxableIncome - postNlTax - postTaxEcmThisFy;

    const denom = r.originalTaxableIncome - postNlTaxableIncome; // should equal preTaxDeductionThisFy
    if (!(denom > 0) || !Number.isFinite(denom)) return 0;

    // Match FYTable: 1 - ((beforeTH - afterTH - postTaxECM) / (beforeTI - afterTI))
    const numer = r.originalTakeHome - postNlTakeHome - postTaxEcmThisFy;
    const ratio = numer / denom;
    const taxRate = 1 - ratio;

    // Clamp + guard
    if (!Number.isFinite(taxRate)) return 0;
    return Math.min(1, Math.max(0, taxRate));
  };

  const maxAfterTaxFactorForPreTax =
    fyRows.length > 0 ? Math.max(...fyRows.map((r) => 1 - correctedAvgLeaseTaxRateForFy(r))) : 0;

  // Pre-tax deductions reduce take-home by (1 - taxRate) dollars per pre-tax dollar.
  // For the headline Fortnight/Annual columns we use the MOST expensive (highest) FY after-tax factor.
  const preTaxEquivalentPostTaxImpactFn = actualPreTaxDeductionFn * maxAfterTaxFactorForPreTax;
  const preTaxEquivalentPostTaxImpactAnnual = preTaxEquivalentPostTaxImpactFn * 26;

  // Lifetime: apply the per-FY corrected average lease tax rate to each FY's pay count
  const preTaxEquivalentPostTaxImpactLifetime = fyRows.reduce(
    (acc, r) => acc + actualPreTaxDeductionFn * (1 - correctedAvgLeaseTaxRateForFy(r)) * r.count,
    0
  );

  const postTaxComponentFn = fbtApplies ? ecmPerFn : 0;
  const postTaxComponentAnnual = postTaxComponentFn * 26;
  const postTaxComponentLifetime = fbtApplies ? ecmPerFn * fyRows.reduce((a, r) => a + r.count, 0) : 0;

  const totalTakeHomeImpactFn = preTaxEquivalentPostTaxImpactFn + postTaxComponentFn;
  const totalTakeHomeImpactAnnual = totalTakeHomeImpactFn * 26;
  const totalTakeHomeImpactLifetime = preTaxEquivalentPostTaxImpactLifetime + postTaxComponentLifetime;

  const preTaxVehicleLeaseLifetime = preTaxVehicleLeaseAnnual * i.leaseDurationYears;
  const preTaxRunningLifetime = preTaxRunningAnnual * i.leaseDurationYears;

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

      <div style={{ fontWeight: 900, fontSize: 14, margin: "10px 0 6px" }}>1.1 Summary</div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thLeft}></th>
              <th style={th}>{isMonthly ? "Monthly" : "Fortnight"}</th>
              <th style={th}>Annual</th>
              <th style={th}>Lease Lifetime</th>
            </tr>
          </thead>
          <tbody>
            {/* PRE-TAX COMPONENT */}
            <tr>
              <td
                colSpan={4}
                style={{
                  padding: "10px 6px 6px",
                  fontWeight: 800,
                  borderBottom: "1px solid rgba(0,0,0,0.15)",
                  textAlign: "left",
                  background: "rgba(0,0,0,0.035)",
                }}
              >
                Pre-Tax Component
              </td>
            </tr>
            <tr>
              <td style={tdLeft(false)}>{lvAdjFn > 0 ? "Vehicle Lease + LV Adjustment" : "Vehicle Lease"}</td>
              <td style={td(false)}>{preTaxFmt(fnToCol(vehicleLeaseFn))}</td>
              <td style={td(false)}>{preTaxFmt(preTaxVehicleLeaseAnnual)}</td>
              <td style={td(false)}>{preTaxFmt(preTaxVehicleLeaseLifetime)}</td>
            </tr>
            <tr>
              <td style={tdLeft(false)}>Running Cost</td>
              <td style={td(false)}>{preTaxFmt(fnToCol(runningCostFn))}</td>
              <td style={td(false)}>{preTaxFmt(preTaxRunningAnnual)}</td>
              <td style={td(false)}>{preTaxFmt(preTaxRunningLifetime)}</td>
            </tr>

            {fbtApplies ? (
              <>
                <tr>
                  <td style={tdLeft(false)}>Less Employee Contribution</td>
                  <td style={td(false)}>{preTaxFmt(fnToCol(-ecmPerFn))}</td>
                  <td style={td(false)}>{preTaxFmt(-ecmAnnual)}</td>
                  <td style={td(false)}>{preTaxFmt(-ecmAnnual * i.leaseDurationYears)}</td>
                </tr>
                <tr>
                  <td style={tdLeft(false)}>Add Employee Contribution GST</td>
                  <td style={td(false)}>{preTaxFmt(fnToCol(ecmGstPerFn))}</td>
                  <td style={td(false)}>{preTaxFmt(ecmGstPerFn * 26)}</td>
                  <td style={td(false)}>{preTaxFmt(ecmGstPerFn * 26 * i.leaseDurationYears)}</td>
                </tr>
              </>
            ) : null}

            <tr>
              <td style={tdLeft(true)}>= Total Pre-Tax Deduction</td>
              <td style={td(true)}>{preTaxFmt(fnToCol(actualPreTaxDeductionFn))}</td>
              <td style={td(true)}>{preTaxFmt(actualPreTaxDeductionAnnual)}</td>
              <td style={td(true)}>{preTaxFmt(actualPreTaxDeductionLifetime)}</td>
            </tr>

            {/* POST-TAX COMPONENT */}
            {fbtApplies ? (
              <>
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "14px 6px 6px",
                      fontWeight: 800,
                      borderBottom: "1px solid rgba(0,0,0,0.15)",
                      textAlign: "left",
                      background: "rgba(0,0,0,0.035)",
                    }}
                  >
                    Post-Tax Component
                  </td>
                </tr>
                <tr>
                  <td style={tdLeft(false)}>Employee Contribution Method</td>
                  <td style={td(false)}>{preTaxFmt(fnToCol(ecmPerFn))}</td>
                  <td style={td(false)}>{preTaxFmt(ecmAnnual)}</td>
                  <td style={td(false)}>{preTaxFmt(ecmAnnual * i.leaseDurationYears)}</td>
                </tr>
              </>
            ) : null}

            {/* TAKE HOME IMPACT */}
            <tr>
              <td
                colSpan={4}
                style={{
                  padding: "14px 6px 6px",
                  fontWeight: 800,
                  borderBottom: "1px solid rgba(0,0,0,0.15)",
                  textAlign: "left",
                  background: "rgba(0,0,0,0.035)",
                }}
              >
                Take Home Impact (Combining Above)
              </td>
            </tr>

            {fbtApplies ? (
              <>
                <tr>
                  <td style={tdLeft(false)}>
                    Pre-Tax Deduction&apos;s Equivalent Post-Tax Impact
                    <span style={{ marginLeft: 8, fontWeight: 500, opacity: 0.7, fontSize: 12 }}>
                      <InfoInline text="Fortnight/Annual use the most expensive FY take-home impact factor for pre-tax dollars (i.e., the largest (1 − taxRate) across FYs)." />
                    </span>
                  </td>
                  <td style={td(false)}>{preTaxFmt(fnToCol(preTaxEquivalentPostTaxImpactFn))}</td>
                  <td style={td(false)}>{preTaxFmt(preTaxEquivalentPostTaxImpactAnnual)}</td>
                  <td style={td(false)}>{preTaxFmt(preTaxEquivalentPostTaxImpactLifetime)}</td>
                </tr>
                <tr>
                  <td style={tdLeft(false)}>Post-Tax Component</td>
                  <td style={td(false)}>{preTaxFmt(fnToCol(postTaxComponentFn))}</td>
                  <td style={td(false)}>{preTaxFmt(postTaxComponentAnnual)}</td>
                  <td style={td(false)}>{preTaxFmt(postTaxComponentLifetime)}</td>
                </tr>
                <tr>
                  <td style={{ ...tdLeft(true), background: "rgba(0,0,0,0.06)" }}>= Total Take Home Impact</td>
                  <td style={{ ...td(true), background: "rgba(0,0,0,0.06)" }}>{preTaxFmt(fnToCol(totalTakeHomeImpactFn))}</td>
                  <td style={{ ...td(true), background: "rgba(0,0,0,0.06)" }}>{preTaxFmt(totalTakeHomeImpactAnnual)}</td>
                  <td style={{ ...td(true, true), background: "rgba(0,0,0,0.06)" }}>{preTaxFmt(totalTakeHomeImpactLifetime)}</td>
                </tr>
              </>
            ) : (
              <>
                <tr>
                  <td style={tdLeft(false)}>
                    {lvAdjFn > 0 ? "Vehicle Lease + LV Adjustment" : "Vehicle Lease"}
                    <span style={{ marginLeft: 8, fontWeight: 500, opacity: 0.7, fontSize: 12 }}>
                      <InfoInline text={mostExpensiveImpactNote} />
                    </span>
                  </td>
                  <td style={td(false)}>{preTaxFmt(fnToCol(postTaxVehicleLeaseFn))}</td>
                  <td style={td(false)}>{preTaxFmt(postTaxVehicleLeaseAnnual)}</td>
                  <td style={td(false)}>{preTaxFmt(postTaxVehicleLeaseLifetime)}</td>
                </tr>
                <tr>
                  <td style={tdLeft(false)}>Running Cost</td>
                  <td style={td(false)}>{preTaxFmt(fnToCol(postTaxRunningFn))}</td>
                  <td style={td(false)}>{preTaxFmt(postTaxRunningAnnual)}</td>
                  <td style={td(false)}>{preTaxFmt(postTaxRunningLifetime)}</td>
                </tr>
                <tr>
                  <td style={{ ...tdLeft(true), background: "rgba(0,0,0,0.06)" }}>= Total Take Home Impact</td>
                  <td style={{ ...td(true), background: "rgba(0,0,0,0.06)" }}>{preTaxFmt(fnToCol(postTaxTotalFn))}</td>
                  <td style={{ ...td(true), background: "rgba(0,0,0,0.06)" }}>{preTaxFmt(postTaxTotalAnnual)}</td>
                  <td style={{ ...td(true, true), background: "rgba(0,0,0,0.06)" }}>{preTaxFmt(postTaxTotalLifetime)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
        * REMINDER: After {preTaxFmt(fbtApplies ? totalTakeHomeImpactLifetime : postTaxTotalLifetime)}, <b>you still have to pay {preTaxFmt(residualPayableIncGst)} in 
        residual value</b> to fully own the vehicle at the conclusion of the lease.
      </div>

      <Spacer />

      <div style={{ margin: "14px 0 6px" }}>
        <button
          type="button"
          onClick={() => setFyExpanded((v) => !v)}
          aria-label={fyExpanded ? "Collapse breakdown by financial years" : "Expand breakdown by financial years"}
          aria-expanded={fyExpanded}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "baseline",
            gap: 8,
            fontWeight: 900,
            fontSize: 14,
            lineHeight: 1.2,
          }}
        >
          <span>1.2 Breakdown by Financial Years</span>
          <span style={{ fontSize: 14, lineHeight: 1, color: "rgba(0,0,0,0.55)", minWidth: 18, textAlign: "center" }}>
            {fyExpanded ? "▾" : "▸"}
          </span>
        </button>
      </div>
      {fyExpanded ? (
        <>
          <FYTable
            fyRows={fyRows}
            fbtApplies={fbtApplies}
            actualPreTaxDeductionFn={actualPreTaxDeductionFn}
            ecmPerFn={ecmPerFn}
          />

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
            <div>
              * The take home figure does not consider other subsidies and liabilities (e.g., HECS, childcare subsidy, Medicare Levy
              Surcharge, other salary packaging, etc.).
            </div>
            <div style={{ marginTop: 6 }}>
              * “Average Lease Tax Bracket” means the average discount effect for the pre-tax dollars used in that financial year.
              Normally this is equivalent to your marginal tax rate + 2% Medicare levy; however it can change if the novated lease
              drops you into a lower income tax bracket.
            </div>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>
          (collapsed)
        </div>
      )}

    </div>
  );
}

function preTaxFmt(n: number): string {
  return `$ ${n.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Spacer() {
  return <div style={{ height: 10 }} />;
}

function InfoInline(props: { text: React.ReactNode; width?: number }) {
  return <InfoTooltip text={props.text} width={props.width} />;
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
  fbtApplies: boolean;
  // Actual pre-tax deduction PER PAY (fortnight) after ECM adjustments (from 1.1)
  actualPreTaxDeductionFn: number;
  // Post-tax ECM payment PER PAY (fortnight)
  ecmPerFn: number;
}) {
  const years = props.fyRows.map((r) => r.fy);

  const money0 = (n: number) => `$ ${aud0(n)}`;
  const money2 = (n: number) => `$ ${n.toLocaleString("en-AU", { maximumFractionDigits: 2 })}`;
  const pct0 = (n: number) => `${Math.round(n)}%`;

  const get = (fy: number) => props.fyRows.find((r) => r.fy === fy)!;

  const correctedPostNl = (r: (typeof props.fyRows)[number]) => {
    if (!props.fbtApplies) {
      return {
        postNlTaxableIncome: r.postNlTaxableIncome,
        postNlTax: r.postNlTax,
        postTaxEcm: 0,
        postNlTakeHome: r.postNlTakeHome,
        takeHomeImpactPerPay: r.takeHomeImpactPerPay,
      };
    }

    // Pre-tax deduction in this FY (uses correct pay count)
    const preTaxDeductionThisFy = props.actualPreTaxDeductionFn * r.count;

    // Post-tax ECM payments in this FY
    const postTaxEcmThisFy = props.ecmPerFn * r.count;

    // Taxable income after novated lease (pre-tax deduction applied for the correct pay-count)
    const postNlTaxableIncome = r.originalTaxableIncome - preTaxDeductionThisFy;

    // Exact tax (income tax + Medicare levy) applied to the post-NL taxable income
    const postNlTax = taxSummaryAUResident(postNlTaxableIncome).totalTax;

    // Take home after lease = post-NL taxable income minus exact tax, then minus post-tax ECM payment
    const postNlTakeHome = postNlTaxableIncome - postNlTax - postTaxEcmThisFy;

    // Exact per-pay impact for this FY
    const takeHomeImpactPerPay = r.count > 0 ? (r.originalTakeHome - postNlTakeHome) / r.count : 0;

    return {
      postNlTaxableIncome,
      postNlTax,
      postTaxEcm: postTaxEcmThisFy,
      postNlTakeHome,
      takeHomeImpactPerPay,
    };
  };

  const avgLeaseBracketPctForFy = (r: (typeof props.fyRows)[number]) => {
    if (!props.fbtApplies) return r.avgLeaseTaxBracketPct;

    const c = correctedPostNl(r);

    const denom = r.originalTaxableIncome - c.postNlTaxableIncome;
    if (denom <= 0) return 0;

    // Per spec: ([take home before] - [take home after] - [post-tax ECM]) / ([orig taxable] - [post taxable])
    const numer = r.originalTakeHome - c.postNlTakeHome - c.postTaxEcm;

    const rate = numer / denom;
    return (1 - rate) * 100;
  };

  const takeHomeRowCellStyle = (isLabel: boolean) => ({
    ...(isLabel ? tdLeft(true) : td(true)),
    background: "rgba(0,0,0,0.015)",
  });

  const GroupCell = (props: { text: string; rowSpan?: number }) => (
    <td
      rowSpan={props.rowSpan ?? 3}
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
            {GroupCell({ text: "Before Lease", rowSpan: 3 })}
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
            {GroupCell({ text: "After Lease", rowSpan: props.fbtApplies ? 4 : 3 })}
            <td style={tdLeft(false)}>Taxable Income</td>
            {years.map((y) => {
              const r = get(y);
              return (
                <td key={y} style={td(false)}>
                  {money0(correctedPostNl(r).postNlTaxableIncome)}
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
                  {money0(correctedPostNl(r).postNlTax)}
                </td>
              );
            })}
          </tr>
          {props.fbtApplies ? (
            <tr>
              <td style={tdLeft(false)}>Post-tax payment for ECM</td>
              {years.map((y) => {
                const r = get(y);
                return (
                  <td key={y} style={td(false)}>
                    {money0(correctedPostNl(r).postTaxEcm)}
                  </td>
                );
              })}
            </tr>
          ) : null}
          <tr>
            <td style={takeHomeRowCellStyle(true)}>Take Home</td>
            {years.map((y) => {
              const r = get(y);
              return (
                <td key={y} style={takeHomeRowCellStyle(false)}>
                  {money0(correctedPostNl(r).postNlTakeHome)}
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
              const delta = r.originalTakeHome - correctedPostNl(r).postNlTakeHome;
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
                  {money2(correctedPostNl(r).takeHomeImpactPerPay)}
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
                  {pct0(avgLeaseBracketPctForFy(r))}
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