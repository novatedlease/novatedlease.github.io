import React, { useState } from "react";
import { InfoTooltip } from "../ui/InfoTooltip";
import type { Inputs } from "@engine/types";
import { isFbtApplicable, getLeaseFbtCategory, getEcmStatutoryRate, getEcmMultiplierForFy } from "@engine/types";
import { aud0 } from "../../utils/format";
import { Stat, StatGrid, SubHead, NoteBox } from "../ui/shared";

import { computeDerived } from "@engine/derived";
import { taxSummaryAUResident } from "@engine/tax_au";

/**
 * Ported from calculator/src/components/LeaseReport.tsx — same maths/structure,
 * only import paths and colour tokens adjusted for calculator2. See
 * calculator2/tests/golden-master.test.ts for engine-level coverage of the
 * numbers this section renders (fyRows, ECM, take-home impact).
 */
export function LeaseReport(props: {
  inputs: Inputs;
  vehicleLeasePeriodMode?: "perFn" | "perMonth";
}) {
  const i = props.inputs;
  const isMonthly = props.vehicleLeasePeriodMode === "perMonth";
  const fnToCol = (v: number) => (isMonthly ? (v * 26) / 12 : v);

  const [fyExpanded, setFyExpanded] = useState(false);

  const fbtApplies = isFbtApplicable(i);

  const vehicleDutiableValue = Math.max(0, i.vehicleBaseValue);
  const fbtStatutoryRate = getEcmStatutoryRate(getLeaseFbtCategory(i));
  const ecmAnnual = vehicleDutiableValue * fbtStatutoryRate;
  const ecmPerFn = ecmAnnual / 26;
  const ecmGstPerFn = ecmPerFn / 11;

  const ecmTwoThirdsFromFy = (() => {
    const d = new Date(i.leaseStartDate + "T00:00:00Z");
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    return m < 4 ? y + 5 : y + 6;
  })();
  const ecmPerFnForFy = (fy: number) => ecmPerFn * (fbtApplies ? getEcmMultiplierForFy(fy, ecmTwoThirdsFromFy) : 1);
  const ecmGstPerFnForFy = (fy: number) => ecmPerFnForFy(fy) / 11;
  const actualPreTaxDeductionFnForFy = (fy: number) => {
    const e = ecmPerFnForFy(fy);
    return preTaxTotalFn + (fbtApplies ? -e + e / 11 : 0);
  };

  const residualPayableIncGst = i.residualValueExGst * 1.1;

  const baseVehicleLeaseFn = i.vehicleLeasePerFn;
  const lvAdjFn = i.luxuryVehicleAdjPerFn;
  const vehicleLeaseFn = baseVehicleLeaseFn + lvAdjFn;

  const inputsWithLv: Inputs = { ...i, vehicleLeasePerFn: vehicleLeaseFn };
  const d = computeDerived(inputsWithLv);

  const runningCostAnnual = d.runningCostAnnual;
  const runningCostFn = d.runningCostFn;

  const preTaxVehicleLeaseAnnual = vehicleLeaseFn * 26;
  const preTaxRunningAnnual = runningCostAnnual;
  const preTaxTotalFn = d.preTaxTotalFn;

  const fyRows = d.fyRows;

  const preTaxTotalAnnual = preTaxVehicleLeaseAnnual + preTaxRunningAnnual;
  const preTaxTotalLifetime = preTaxTotalAnnual * i.leaseDurationYears;

  const actualPreTaxDeductionFn = preTaxTotalFn + (fbtApplies ? -ecmPerFn + ecmGstPerFn : 0);
  const actualPreTaxDeductionAnnual = preTaxTotalAnnual + (fbtApplies ? -ecmAnnual + ecmGstPerFn * 26 : 0);
  const actualPreTaxDeductionLifetime = fbtApplies
    ? fyRows.reduce((acc, r) => acc + actualPreTaxDeductionFnForFy(r.fy) * r.count, 0)
    : preTaxTotalLifetime;

  const correctedAvgLeaseTaxRateForFy = (r: (typeof fyRows)[number]) => {
    if (!fbtApplies) {
      const rate = r.avgLeaseTaxBracketPct / 100;
      return Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 0;
    }

    const preTaxDeductionThisFy = actualPreTaxDeductionFnForFy(r.fy) * r.count;
    if (!(preTaxDeductionThisFy > 0) || !Number.isFinite(preTaxDeductionThisFy)) return 0;

    const postTaxEcmThisFy = ecmPerFnForFy(r.fy) * r.count;

    const postNlTaxableIncome = r.originalTaxableIncome - preTaxDeductionThisFy;
    const postNlTax = taxSummaryAUResident(postNlTaxableIncome).totalTax;

    const postNlTakeHome = postNlTaxableIncome - postNlTax - postTaxEcmThisFy;

    const denom = r.originalTaxableIncome - postNlTaxableIncome;
    if (!(denom > 0) || !Number.isFinite(denom)) return 0;

    const numer = r.originalTakeHome - postNlTakeHome - postTaxEcmThisFy;
    const ratio = numer / denom;
    const taxRate = 1 - ratio;

    if (!Number.isFinite(taxRate)) return 0;
    return Math.min(1, Math.max(0, taxRate));
  };

  const maxAfterTaxFactorForPreTax =
    fyRows.length > 0 ? Math.max(...fyRows.map((r) => 1 - correctedAvgLeaseTaxRateForFy(r))) : 0;

  const preTaxEquivalentPostTaxImpactFn = actualPreTaxDeductionFn * maxAfterTaxFactorForPreTax;
  const preTaxEquivalentPostTaxImpactAnnual = preTaxEquivalentPostTaxImpactFn * 26;

  const preTaxEquivalentPostTaxImpactLifetime = fyRows.reduce(
    (acc, r) => acc + actualPreTaxDeductionFnForFy(r.fy) * (1 - correctedAvgLeaseTaxRateForFy(r)) * r.count,
    0
  );

  const postTaxComponentFn = fbtApplies ? ecmPerFn : 0;
  const postTaxComponentAnnual = postTaxComponentFn * 26;
  const postTaxComponentLifetime = fbtApplies
    ? fyRows.reduce((acc, r) => acc + ecmPerFnForFy(r.fy) * r.count, 0)
    : 0;

  const totalTakeHomeImpactFn = preTaxEquivalentPostTaxImpactFn + postTaxComponentFn;
  const totalTakeHomeImpactAnnual = totalTakeHomeImpactFn * 26;
  const totalTakeHomeImpactLifetime = preTaxEquivalentPostTaxImpactLifetime + postTaxComponentLifetime;

  const preTaxVehicleLeaseLifetime = preTaxVehicleLeaseAnnual * i.leaseDurationYears;
  const preTaxRunningLifetime = preTaxRunningAnnual * i.leaseDurationYears;

  const maxTakeHomeImpactPerPay = fyRows.length > 0 ? Math.max(...fyRows.map((r) => r.takeHomeImpactPerPay)) : 0;

  const totalTakeHomeImpactOverLease = fyRows.reduce((acc, r) => acc + r.takeHomeImpactPerPay * r.count, 0);

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

  const mostExpensiveImpactNote = "This is displaying the most expensive take home impact when the FY-to-FY effect varies";

  const totalLifetimeImpact = fbtApplies ? totalTakeHomeImpactLifetime : postTaxTotalLifetime;

  return (
    <div style={{ fontSize: 13, lineHeight: 1.4 }}>
      <StatGrid>
        <Stat
          label={`Pre-tax deduction / ${isMonthly ? "month" : "fortnight"}`}
          value={`$${aud0(Math.abs(fnToCol(actualPreTaxDeductionFn)))}`}
          color="#0b5cab"
          note="Vehicle lease + running costs"
        />
        <Stat label="Total take-home impact" value={`$${aud0(totalLifetimeImpact)}`} color="#b71c1c" note="Over full lease term" />
        <Stat label="Residual payable (inc GST)" value={`$${aud0(residualPayableIncGst)}`} color="#37474f" note="Due at lease end" />
      </StatGrid>

      <SubHead mt={4}>1.1 Summary</SubHead>

      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(0,0,0,0.09)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", minWidth: "max-content", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thLeft}></th>
              <th style={th}>{isMonthly ? "Monthly" : "Fortnight"}</th>
              <th style={th}>Annual</th>
              <th style={th}>Lease Lifetime</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} style={sectionDivider}>
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
                  <td style={td(false)}>{preTaxFmt(-fyRows.reduce((a, r) => a + ecmPerFnForFy(r.fy) * r.count, 0))}</td>
                </tr>
                <tr>
                  <td style={tdLeft(false)}>Add Employee Contribution GST</td>
                  <td style={td(false)}>{preTaxFmt(fnToCol(ecmGstPerFn))}</td>
                  <td style={td(false)}>{preTaxFmt(ecmGstPerFn * 26)}</td>
                  <td style={td(false)}>{preTaxFmt(fyRows.reduce((a, r) => a + ecmGstPerFnForFy(r.fy) * r.count, 0))}</td>
                </tr>
              </>
            ) : null}

            <tr style={{ background: "rgba(11,92,171,0.04)" }}>
              <td style={tdLeft(true)}>= Total Pre-Tax Deduction</td>
              <td style={td(true)}>{preTaxFmt(fnToCol(actualPreTaxDeductionFn))}</td>
              <td style={td(true)}>{preTaxFmt(actualPreTaxDeductionAnnual)}</td>
              <td style={td(true)}>{preTaxFmt(actualPreTaxDeductionLifetime)}</td>
            </tr>

            {fbtApplies ? (
              <>
                <tr>
                  <td colSpan={4} style={sectionDivider}>
                    Post-Tax Component
                  </td>
                </tr>
                <tr>
                  <td style={tdLeft(false)}>Employee Contribution Method</td>
                  <td style={td(false)}>{preTaxFmt(fnToCol(ecmPerFn))}</td>
                  <td style={td(false)}>{preTaxFmt(ecmAnnual)}</td>
                  <td style={td(false)}>{preTaxFmt(fyRows.reduce((a, r) => a + ecmPerFnForFy(r.fy) * r.count, 0))}</td>
                </tr>
              </>
            ) : null}

            <tr>
              <td colSpan={4} style={sectionDivider}>
                Take Home Impact (Combining Above)
              </td>
            </tr>

            {fbtApplies ? (
              <>
                <tr>
                  <td style={tdLeft(false)}>
                    Pre-Tax Deduction&apos;s Equivalent Post-Tax Impact
                    <span style={{ marginLeft: 8, fontWeight: 500, opacity: 0.7, fontSize: 12 }}>
                      <InfoTooltip text="Fortnight/Annual use the most expensive FY take-home impact factor for pre-tax dollars (i.e., the largest (1 − taxRate) across FYs)." />
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
                <tr style={{ background: "rgba(183,28,28,0.04)" }}>
                  <td style={{ ...tdLeft(true), color: "#b71c1c" }}>= Total Take Home Impact</td>
                  <td style={{ ...td(true), color: "#b71c1c" }}>{preTaxFmt(fnToCol(totalTakeHomeImpactFn))}</td>
                  <td style={{ ...td(true), color: "#b71c1c" }}>{preTaxFmt(totalTakeHomeImpactAnnual)}</td>
                  <td style={{ ...td(true, true), color: "#b71c1c" }}>{preTaxFmt(totalTakeHomeImpactLifetime)}</td>
                </tr>
              </>
            ) : (
              <>
                <tr>
                  <td style={tdLeft(false)}>
                    {lvAdjFn > 0 ? "Vehicle Lease + LV Adjustment" : "Vehicle Lease"}
                    <span style={{ marginLeft: 8, fontWeight: 500, opacity: 0.7, fontSize: 12 }}>
                      <InfoTooltip text={mostExpensiveImpactNote} />
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
                <tr style={{ background: "rgba(183,28,28,0.04)" }}>
                  <td style={{ ...tdLeft(true), color: "#b71c1c" }}>= Total Take Home Impact</td>
                  <td style={{ ...td(true), color: "#b71c1c" }}>{preTaxFmt(fnToCol(postTaxTotalFn))}</td>
                  <td style={{ ...td(true), color: "#b71c1c" }}>{preTaxFmt(postTaxTotalAnnual)}</td>
                  <td style={{ ...td(true, true), color: "#b71c1c" }}>{preTaxFmt(postTaxTotalLifetime)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <NoteBox color="#37474f" mt={10}>
        After paying {preTaxFmt(totalLifetimeImpact)} in lease costs, you still owe <b>{preTaxFmt(residualPayableIncGst)}</b> in
        residual value to fully own the vehicle.
      </NoteBox>

      <SubHead mt={16}>
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
            alignItems: "center",
            gap: 8,
            font: "inherit",
            color: "inherit",
            letterSpacing: "inherit",
            textTransform: "inherit",
          }}
        >
          <span>1.2 Breakdown by Financial Years</span>
          <span style={{ fontSize: 12 }}>{fyExpanded ? "▾" : "▸"}</span>
        </button>
      </SubHead>

      {fyExpanded ? (
        <>
          <FYTable fyRows={fyRows} fbtApplies={fbtApplies} actualPreTaxDeductionFnForFy={actualPreTaxDeductionFnForFy} ecmPerFnForFy={ecmPerFnForFy} />

          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(0,0,0,0.6)", lineHeight: 1.55 }}>
            <p style={{ margin: "0 0 6px 0" }}>
              * Take home figures do not account for other subsidies and liabilities (HECS, childcare subsidy, Medicare Levy
              Surcharge, other salary packaging, etc.).
            </p>
            <p style={{ margin: 0 }}>
              * "Average Lease Tax Bracket" is the average discount effect for pre-tax dollars in that financial year — normally
              equal to your marginal tax rate + 2% Medicare levy, but may differ if the lease drops you into a lower bracket.
            </p>
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.45)", marginTop: 2, fontStyle: "italic" }}>Click to expand year-by-year tax breakdown</div>
      )}
    </div>
  );
}

function preTaxFmt(n: number): string {
  return `$ ${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  actualPreTaxDeductionFnForFy: (fy: number) => number;
  ecmPerFnForFy: (fy: number) => number;
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

    const preTaxDeductionThisFy = props.actualPreTaxDeductionFnForFy(r.fy) * r.count;
    const postTaxEcmThisFy = props.ecmPerFnForFy(r.fy) * r.count;
    const postNlTaxableIncome = r.originalTaxableIncome - preTaxDeductionThisFy;
    const postNlTax = taxSummaryAUResident(postNlTaxableIncome).totalTax;
    const postNlTakeHome = postNlTaxableIncome - postNlTax - postTaxEcmThisFy;
    const takeHomeImpactPerPay = r.count > 0 ? (r.originalTakeHome - postNlTakeHome) / r.count : 0;

    return { postNlTaxableIncome, postNlTax, postTaxEcm: postTaxEcmThisFy, postNlTakeHome, takeHomeImpactPerPay };
  };

  const avgLeaseBracketPctForFy = (r: (typeof props.fyRows)[number]) => {
    if (!props.fbtApplies) return r.avgLeaseTaxBracketPct;

    const c = correctedPostNl(r);
    const denom = r.originalTaxableIncome - c.postNlTaxableIncome;
    if (denom <= 0) return 0;

    const numer = r.originalTakeHome - c.postNlTakeHome - c.postTaxEcm;
    const rate = numer / denom;
    return (1 - rate) * 100;
  };

  const takeHomeRowCellStyle = (isLabel: boolean) => ({
    ...(isLabel ? tdLeft(true) : td(true)),
    background: "rgba(11,92,171,0.05)",
    color: "#0b5cab",
  });

  const GroupCell = (p: { text: string; rowSpan?: number }) => (
    <td
      rowSpan={p.rowSpan ?? 3}
      style={{
        borderBottom: "1px solid rgba(0,0,0,0.12)",
        textAlign: "center",
        verticalAlign: "middle",
        padding: 0,
        width: 18,
        minWidth: 18,
        maxWidth: 18,
        color: "rgba(0,0,0,0.4)",
        background: "rgba(0,0,0,0.02)",
        writingMode: "vertical-rl" as React.CSSProperties["writingMode"],
        transform: "rotate(180deg)",
        letterSpacing: 0.5,
        fontWeight: 700,
        fontSize: 10,
        overflow: "hidden",
      }}
    >
      {p.text}
    </td>
  );

  const SeparatorRow = (p: { text: React.ReactNode }) => (
    <tr>
      <td
        colSpan={years.length + 2}
        style={{
          padding: "7px 10px",
          background: "rgba(11,92,171,0.06)",
          fontSize: 11,
          fontWeight: 700,
          color: "#0b5cab",
          letterSpacing: "0.04em",
          borderTop: "1px solid rgba(11,92,171,0.15)",
          borderBottom: "1px solid rgba(11,92,171,0.15)",
        }}
      >
        {p.text}
      </td>
    </tr>
  );

  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid rgba(0,0,0,0.09)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <table style={{ width: "100%", minWidth: "max-content", borderCollapse: "collapse" }}>
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
          <tr>
            {GroupCell({ text: "Before Lease", rowSpan: 3 })}
            <td style={tdLeft(false)}>Taxable Income</td>
            {years.map((y) => (
              <td key={y} style={td(false)}>
                {money0(get(y).originalTaxableIncome)}
              </td>
            ))}
          </tr>
          <tr>
            <td style={tdLeft(false)}>Income Tax + Medicare Levy</td>
            {years.map((y) => (
              <td key={y} style={td(false)}>
                {money0(get(y).originalTax)}
              </td>
            ))}
          </tr>
          <tr>
            <td style={takeHomeRowCellStyle(true)}>Take Home</td>
            {years.map((y) => (
              <td key={y} style={takeHomeRowCellStyle(false)}>
                {money0(get(y).originalTakeHome)}
              </td>
            ))}
          </tr>

          <SeparatorRow text="After novated lease (estimated)" />

          <tr>
            {GroupCell({ text: "After Lease", rowSpan: props.fbtApplies ? 4 : 3 })}
            <td style={tdLeft(false)}>Taxable Income</td>
            {years.map((y) => (
              <td key={y} style={td(false)}>
                {money0(correctedPostNl(get(y)).postNlTaxableIncome)}
              </td>
            ))}
          </tr>
          <tr>
            <td style={tdLeft(false)}>Income Tax + Medicare Levy</td>
            {years.map((y) => (
              <td key={y} style={td(false)}>
                {money0(correctedPostNl(get(y)).postNlTax)}
              </td>
            ))}
          </tr>
          {props.fbtApplies ? (
            <tr>
              <td style={tdLeft(false)}>Post-tax payment for ECM</td>
              {years.map((y) => (
                <td key={y} style={td(false)}>
                  {money0(correctedPostNl(get(y)).postTaxEcm)}
                </td>
              ))}
            </tr>
          ) : null}
          <tr>
            <td style={takeHomeRowCellStyle(true)}>Take Home</td>
            {years.map((y) => (
              <td key={y} style={takeHomeRowCellStyle(false)}>
                {money0(correctedPostNl(get(y)).postNlTakeHome)}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ ...td(true), width: 18, minWidth: 18, maxWidth: 18, paddingLeft: 0, paddingRight: 0 }}></td>
            <td style={{ ...takeHomeRowCellStyle(true), fontWeight: 800 }}>Take Home Impact</td>
            {years.map((y) => {
              const r = get(y);
              const delta = r.originalTakeHome - correctedPostNl(r).postNlTakeHome;
              return (
                <td key={y} style={{ ...takeHomeRowCellStyle(false), fontWeight: 800 }}>
                  {money0(delta)}
                </td>
              );
            })}
          </tr>

          <SeparatorRow text="Lease-specific metrics" />

          <tr>
            <td style={td(true)}></td>
            <td style={tdLeft(false)}>Pay Fortnight Count</td>
            {years.map((y) => (
              <td key={y} style={td(false)}>
                {String(get(y).count)}
              </td>
            ))}
          </tr>
          <tr>
            <td style={td(true)}></td>
            <td style={tdLeft(false)}>Take Home Impact per pay</td>
            {years.map((y) => (
              <td key={y} style={td(false)}>
                {money2(correctedPostNl(get(y)).takeHomeImpactPerPay)}
              </td>
            ))}
          </tr>
          <tr>
            <td style={td(true)}></td>
            <td style={tdLeft(true)}>"Average Lease Tax Bracket" this FY</td>
            {years.map((y) => (
              <td key={y} style={td(true)}>
                {pct0(avgLeaseBracketPctForFy(get(y)))}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const sectionDivider: React.CSSProperties = {
  padding: "9px 10px 7px",
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  textAlign: "left",
  background: "rgba(11,92,171,0.07)",
  color: "#0b5cab",
  borderTop: "2px solid rgba(11,92,171,0.15)",
  borderBottom: "1px solid rgba(11,92,171,0.12)",
};

const th: React.CSSProperties = {
  textAlign: "right",
  padding: "7px 10px",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
  background: "#0b5cab",
  color: "#fff",
  whiteSpace: "nowrap",
};

const thLeft: React.CSSProperties = { ...th, textAlign: "left" };

const td = (bold?: boolean, emphasize?: boolean): React.CSSProperties => ({
  textAlign: "right",
  padding: "6px 10px",
  fontSize: 13,
  borderBottom: bold ? "1px solid rgba(0,0,0,0.12)" : "1px solid rgba(0,0,0,0.06)",
  fontWeight: emphasize ? 800 : bold ? 700 : 500,
  color: emphasize ? "#0b5cab" : "inherit",
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

const tdLeft = (bold?: boolean): React.CSSProperties => ({ ...td(bold), textAlign: "left", whiteSpace: "normal" });
