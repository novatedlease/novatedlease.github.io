// engine/worksheet_130.ts
import type { Inputs } from "./types";
import { isFbtApplicable } from "./types";
import { buildFortnightSchedule, fyForDate } from "./lease_schedule";
import { buildFyBreakdown } from "./fy_breakdown";
import { computeLeasePaymentsOverLease } from "./lease_payments";

export type Scenario = "nl" | "cash" | "loan" | "keep";

export type WorksheetRow = {
  idx: number; // 1..130
  date: Date;
  fy: number;
  avgBracketPct: number; // FY effective tax bracket (only meaningful for NL)

  cash: number;
  chargingDelta: number;
  vehicle: number;
  lvAdj: number;
  smt: number;
  saveShare: number;
  rego: number;
  electricity: number;
  insurance: number;
  fees: number;

  delta: number; // SUM(U:AD)
  ae: number; // AE: cumulative balance (spreadsheet AE column)
  af: number; // AF: interest accrued this pay (spreadsheet AF column)
};

function sumCols(
  r: Omit<WorksheetRow, "delta" | "ae" | "af" | "idx" | "date" | "fy" | "avgBracketPct">
) {
  return (
    r.cash +
    r.chargingDelta +
    r.vehicle +
    r.lvAdj +
    r.smt +
    r.saveShare +
    r.rego +
    r.electricity +
    r.insurance +
    r.fees
  );
}

export function buildWorksheet130(args: { inputs: Inputs; scenario: Scenario }): WorksheetRow[] {
  const { inputs: i, scenario } = args;

  const yearsLease = Math.max(0, Math.min(5, i.leaseDurationYears));
  const leaseFortnights = Math.round(yearsLease * 26);
  const dates = buildFortnightSchedule(i.leaseStartDate, 130);

  // Shared running-cost primitives (post-tax / real)
  const kwhPerYear = (i.annualMileageKm * i.avgWhPerKm) / 1000;
  const chargingExpensePerYear =
    i.overrideAnnualChargingExpense !== undefined
      ? i.overrideAnnualChargingExpense
      : kwhPerYear * i.avgAudPerKwh;

  // GST multiplier applies to most running costs when “GST saving passed on” is Yes.
  // Electricity is NOT GST-multiplied (per your rule).
  const gstMult = i.gstSavingPassedOn === "Yes" ? 1.1 : 1.0;


  // Helper: normalize interest input so both 0.06 and 6 mean 6%
  const normalizeRateDecimal = (x: number): number => {
    if (!Number.isFinite(x) || x <= 0) return 0;
    return x > 1 ? x / 100 : x;
  };

  // Helper: Excel-like PMT (returns POSITIVE payment amount for pv>0)
  const pmt = (rate: number, nper: number, pv: number, fv = 0): number => {
    if (nper <= 0) return 0;
    if (Math.abs(rate) < 1e-12) return (pv + fv) / nper;
    const pow = Math.pow(1 + rate, nper);
    return (rate * (fv + pv * pow)) / (pow - 1);
  };

  const applyAeAf = (rows: WorksheetRow[]): WorksheetRow[] => {
    // Read home-loan offset rate from Inputs, tolerant to older field names.
    const annualRateInput =
      (i as any).homeLoanOffsetInterestRatePct ??
      (i as any).homeLoanOffsetRatePct ??
      (i as any).homeLoanOffsetInterestRate ??
      0;

    const annualRateDec = normalizeRateDecimal(Number(annualRateInput));
    const rFn = annualRateDec / 26;

    let aePrev = 0; // corresponds to AE2
    let afPrev = 0; // corresponds to AF2

    return rows.map((row) => {
      const ae = row.delta + aePrev + afPrev;
      const af = ae * rFn;

      aePrev = ae;
      afPrev = af;

      return { ...row, ae, af };
    });
  };

  if (scenario === "cash") {
    // Cash purchase: driveaway is paid upfront (fortnight 1), then real running costs each fortnight.
    // Save-share and management fees are NOT included here (per your rule).
    const rows = dates.map((d, k) => {
      const idx = k + 1;
      const fy = fyForDate(d);

      // Spreadsheet cadence rules (cash pathway):
      // - Annual items (S/M/T, rego, insurance) occur every 26th fortnight as a lump sum.
      // - Electricity occurs every 4th fortnight as 4× the per-fortnight average.
      const isAnnualPay = idx % 26 === 0; // 26, 52, 78, 104, 130
      const isElecPay = idx % 4 === 0; // 4, 8, 12, ...

      const rowCore = {
        cash:
          (k === 0 ? -i.driveawayCost : 0) +
          (i.vehicleType === "EV" ? 0 : -(i.fuelAnnual / 26) * gstMult),
        chargingDelta: 0,
        vehicle: 0,
        lvAdj: 0,

        smt: isAnnualPay ? -i.serviceMaintTyresAnnual * gstMult : 0,
        saveShare: 0,
        rego: isAnnualPay ? -i.registrationAnnual * gstMult : 0,
        electricity: i.vehicleType === "EV" && isElecPay ? -(chargingExpensePerYear / 26) * 4 : 0, // NO GST multiplier
        insurance: isAnnualPay ? -i.insuranceAnnual * gstMult : 0,

        fees: 0,
      };

      return {
        idx,
        date: d,
        fy,
        avgBracketPct: 0,
        ...rowCore,
        delta: sumCols(rowCore),
        ae: 0,
        af: 0,
      };
    });
    return applyAeAf(rows);
  }

  if (scenario === "loan") {
    // Loan purchase: deposit upfront, then fortnightly loan repayments for the lease duration.
    // Monthly fee is spread evenly across fortnights (close to spreadsheet behaviour; we can refine later).
    const principal = Math.max(0, i.driveawayCost - i.carLoanInitialDeposit);
    const annualRateDec = normalizeRateDecimal(i.carLoanInterestRatePct);
    const rFn = annualRateDec / 26;
    const nper = Math.max(0, leaseFortnights);

    const loanPaymentFn = nper > 0 ? pmt(rFn, nper, principal, 0) : 0;
    const loanFeeFn = (i.carLoanMonthlyFee * 12) / 26;

    const rows = dates.map((d, k) => {
      const idx = k + 1;
      const fy = fyForDate(d);
      const inLoan = k < leaseFortnights;

      // Spreadsheet cadence rules (loan pathway):
      // - Annual items (S/M/T, rego, insurance) occur every 26th fortnight as a lump sum.
      // - Electricity occurs every 4th fortnight as 4× the per-fortnight average.
      const isAnnualPay = idx % 26 === 0; // 26, 52, 78, 104, 130
      const isElecPay = idx % 4 === 0; // 4, 8, 12, ...

      const rowCore = {
        cash:
          (k === 0 ? -i.carLoanInitialDeposit : 0) +
          (inLoan ? -loanPaymentFn : 0) +
          (i.vehicleType === "EV" ? 0 : -(i.fuelAnnual / 26) * gstMult),
        chargingDelta: 0,
        vehicle: 0,
        lvAdj: 0,

        smt: isAnnualPay ? -i.serviceMaintTyresAnnual * gstMult : 0,
        saveShare: 0,
        rego: isAnnualPay ? -i.registrationAnnual * gstMult : 0,
        electricity: i.vehicleType === "EV" && isElecPay ? -(chargingExpensePerYear / 26) * 4 : 0, // NO GST multiplier
        insurance: isAnnualPay ? -i.insuranceAnnual * gstMult : 0,

        fees: inLoan ? -loanFeeFn : 0,
      };

      return {
        idx,
        date: d,
        fy,
        avgBracketPct: 0,
        ...rowCore,
        delta: sumCols(rowCore),
        ae: 0,
        af: 0,
      };
    });
    return applyAeAf(rows);
  }

  if (scenario === "keep") {
    // Keep pathway rules:
    // - Annual items (S/M/T, rego, insurance) occur every 26th fortnight as a lump sum.
    // - Fuel is paid every fortnight (stored in `cash` column).
    // - Row 1 includes an upfront current car value (stored in `cash` column).

    const rows = dates.map((d, k) => {
      const idx = k + 1;
      const fy = fyForDate(d);

      const isAnnualPay = idx % 26 === 0; // 26, 52, 78, 104, 130

      const rowCore = {
        // Fuel paid every fortnight + upfront current car value on row 1
        cash: -(i.currentFuelAnnual / 26) + (idx === 1 ? -i.currentCarMarketValueNow : 0),
        chargingDelta: 0,
        vehicle: 0,
        lvAdj: 0,

        smt: isAnnualPay ? -i.currentServiceMaintTyresAnnual : 0,
        saveShare: 0,
        rego: isAnnualPay ? -i.currentRegistrationAnnual : 0,
        electricity: 0,
        insurance: isAnnualPay ? -i.currentInsuranceAnnual : 0,

        fees: 0,
      };

      return {
        idx,
        date: d,
        fy,
        avgBracketPct: 0,
        ...rowCore,
        delta: sumCols(rowCore),
        ae: 0,
        af: 0,
      };
    });
    return applyAeAf(rows);
  }

  // --- NL worksheet ---

  const fbtApplies = isFbtApplicable(i);

  // Charging inputs (actual vs claim) — EV only.
  // Claimable (packaged) electricity comes from InputsPanel `electricityAnnual` (user-adjustable).
  // InputsPanel may default this to the ATO 5.47c/km shortcut, but users can override it.
  const assumedChargingClaimPerYear = i.vehicleType === "EV" ? i.electricityAnnual : 0;

  // Packaged pre-tax components per fortnight (during lease)
  const preTaxVehicleFn = i.vehicleLeasePerFn;
  const preTaxLvAdjFn = i.luxuryVehicleAdjPerFn;

  const preTaxSmtFn = i.serviceMaintTyresAnnual / 26;
  const preTaxSaveShareFn = i.saveShareAnnual / 26;
  const preTaxRegoFn = i.registrationAnnual / 26;
  const preTaxInsuranceFn = i.insuranceAnnual / 26;
  const preTaxFeesFn = i.managementFeesAnnual / 26;
  const preTaxEnergyFn = (i.vehicleType === "EV" ? assumedChargingClaimPerYear : i.fuelAnnual) / 26;

  const preTaxTotalFn =
    preTaxVehicleFn +
    preTaxLvAdjFn +
    preTaxSmtFn +
    preTaxSaveShareFn +
    preTaxRegoFn +
    preTaxInsuranceFn +
    preTaxFeesFn +
    preTaxEnergyFn;

  // FY effective brackets (same engine used by LeaseReport)
  const fyRows = buildFyBreakdown({ inputs: i, fortnights: leaseFortnights, preTaxTotalFn });
  const fyToBracket = new Map<number, number>();
  for (const r of fyRows) fyToBracket.set(r.fy, r.avgLeaseTaxBracketPct);

  // Exact (FBT-aware) per-pay take-home impact for the NL pathway.
  // For FBT-exempt: matches the FY breakdown engine.
  // For FBT-applicable: includes ECM + exact tax per FY.
  const ecmAnnual = i.vehicleBaseValue * 0.2;
  const ecmPerFn = ecmAnnual / 26;
  const ecmGstPerFn = ecmPerFn / 11;
  const actualPreTaxDeductionFn = preTaxTotalFn + (fbtApplies ? -ecmPerFn + ecmGstPerFn : 0);

  const nlLeasePayments = computeLeasePaymentsOverLease({
    inputs: i,
    fortnights: leaseFortnights,
    preTaxTotalFn,
    actualPreTaxDeductionFn,
    ecmPerFn,
  });

  const fyToTakeHomeImpactPerPay = new Map<number, number>();
  for (const r of nlLeasePayments.fyRows) fyToTakeHomeImpactPerPay.set(r.fy, r.takeHomeImpactPerPay);

  // Post-lease running costs (real costs) for remaining fortnights up to 130
  const postLeaseGstMult = i.gstSavingPassedOn === "Yes" ? 1.1 : 1.0;

  const residualIncGst = i.residualValueExGst * 1.1;

  const rows = dates.map((d, k) => {
    const idx = k + 1;
    const fy = fyForDate(d);
    const avgBracketPct = fyToBracket.get(fy) ?? 0;
    const inLease = k < leaseFortnights;
    const isResidualPayRow = k === leaseFortnights;

    // Spreadsheet cadence rules (post-lease NL pathway):
    // - Annual items (S/M/T, rego, insurance) occur every 26th fortnight as a lump sum.
    // - Electricity occurs every 4th fortnight as 4× the per-fortnight average.
    const isAnnualPay = idx % 26 === 0; // 26, 52, 78, 104, 130
    const isElecPay = idx % 4 === 0; // 4, 8, 12, ...

    if (inLease) {
      // chargingDelta: (claim - actual) per fortnight (EV only), not bracket-multiplied.
      const chargingDeltaFn = (assumedChargingClaimPerYear - chargingExpensePerYear) / 26;

      // FBT-applicable: use exact per-pay take-home impact (includes ECM + exact tax).
      if (fbtApplies) {
        const takeHomeImpactPerPay = fyToTakeHomeImpactPerPay.get(fy) ?? 0;

        const rowCore = {
          cash: 0,
          chargingDelta: i.vehicleType === "EV" ? chargingDeltaFn : 0,

          // Collapse all packaged deductions into one net cash impact bucket.
          vehicle: -takeHomeImpactPerPay,
          lvAdj: 0,
          smt: 0,
          saveShare: 0,
          rego: 0,
          electricity: 0,
          insurance: 0,
          fees: 0,
        };

        return {
          idx,
          date: d,
          fy,
          avgBracketPct,
          ...rowCore,
          delta: sumCols(rowCore),
          ae: 0,
          af: 0,
        };
      }

      // FBT-exempt: keep legacy per-column model using FY effective bracket.
      const avgBracket = avgBracketPct / 100;
      const postTaxMult = 1 - avgBracket;

      const rowCore = {
        cash: 0,
        chargingDelta: i.vehicleType === "EV" ? chargingDeltaFn : 0,

        vehicle: -preTaxVehicleFn * postTaxMult,
        lvAdj: -preTaxLvAdjFn * postTaxMult,
        smt: -preTaxSmtFn * postTaxMult,
        saveShare: -preTaxSaveShareFn * postTaxMult,
        rego: -preTaxRegoFn * postTaxMult,
        electricity: i.vehicleType === "EV" ? -preTaxEnergyFn * postTaxMult : 0,
        insurance: -preTaxInsuranceFn * postTaxMult,
        fees: -preTaxFeesFn * postTaxMult,
      };

      return {
        idx,
        date: d,
        fy,
        avgBracketPct,
        ...rowCore,
        delta: sumCols(rowCore),
        ae: 0,
        af: 0,
      };
    }

    // Post-lease: no salary packaging; just real running costs
    const rowCore = {
      cash:
        (isResidualPayRow ? -residualIncGst : 0) +
        (i.vehicleType === "EV" ? 0 : -(i.fuelAnnual / 26) * postLeaseGstMult),
      chargingDelta: 0,

      vehicle: 0,
      lvAdj: 0,
      saveShare: 0,
      fees: 0,

      smt: isAnnualPay ? -i.serviceMaintTyresAnnual * postLeaseGstMult : 0,
      rego: isAnnualPay ? -i.registrationAnnual * postLeaseGstMult : 0,
      electricity: i.vehicleType === "EV" && isElecPay ? -(chargingExpensePerYear / 26) * 4 : 0, // NO GST multiplier
      insurance: isAnnualPay ? -i.insuranceAnnual * postLeaseGstMult : 0,
    };

    return {
      idx,
      date: d,
      avgBracketPct: 0,
      fy,
      ...rowCore,
      delta: sumCols(rowCore),
      ae: 0,
      af: 0,
    };
  });
  return applyAeAf(rows);
}