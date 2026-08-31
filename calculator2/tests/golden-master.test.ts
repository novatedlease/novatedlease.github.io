import { describe, expect, test } from "vitest";
import type { Inputs } from "@engine/types";
import { getLeaseFbtCategory } from "@engine/types";
import { computeDerived } from "@engine/derived";
import {
  effectiveAnnualRateFromFortnightlyLease,
  fortnightlyLeaseFromEffectiveAnnualRate,
} from "@engine/effectiveinterest";
// computeFinancialSummary is the top-level "net position" aggregator the UI renders
// (SummaryView.tsx imports it from FinancialReport.tsx) — importing it here means these
// tests exercise the exact function the app calls, not a re-derivation of the maths.
// eslint-disable-next-line import/no-relative-packages
import { computeFinancialSummary } from "../../calculator/src/components/FinancialReport";
import { baseEvInputs, withOverrides } from "./fixtures";

/**
 * Rounds every number in a (possibly nested) object/array to 2dp so snapshots are
 * stable across platforms and don't churn on floating-point noise in the 10th decimal.
 */
function round(value: unknown): unknown {
  if (typeof value === "number") return Math.round(value * 100) / 100;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(round);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = round(v);
    return out;
  }
  return value;
}

function snapshotFor(inputs: Inputs) {
  const category = getLeaseFbtCategory(inputs);
  const derived = computeDerived(inputs);
  const summary = computeFinancialSummary({ inputs });

  let effectiveRatePct: number | string;
  try {
    effectiveRatePct = round(
      effectiveAnnualRateFromFortnightlyLease({
        financedAmountExGst: inputs.financedAmountForInterestCalcExGst,
        residualValueExGst: inputs.residualValueExGst,
        leaseYears: inputs.leaseDurationYears,
        deferMonths: inputs.monthsDeferred,
        fortnightlyLeasePayment: inputs.vehicleLeasePerFn + inputs.luxuryVehicleAdjPerFn,
      }) * 100
    ) as number;
  } catch (e) {
    effectiveRatePct = `error: ${(e as Error).message}`;
  }

  return round({
    fbtCategory: category,
    effectiveRatePct,
    residualValueExGst: inputs.residualValueExGst,
    financedAmountExGst: inputs.financedAmountForInterestCalcExGst,
    fyRows: derived.fyRows,
    atiRows: derived.atiRows,
    sgRows: derived.sgRows,
    packagedChargingClaimPerYear: derived.packagedChargingClaimPerYear,
    runningCostAnnual: derived.runningCostAnnual,
    summary: {
      leasePaymentsOverLease: summary.leasePaymentsOverLease,
      residualPayableIncGst: summary.residualPayableIncGst,
      nlTotalSpentAtLeaseEnd: summary.nlTotalSpentAtLeaseEnd,
      nlTotalSpentAt5: summary.nlTotalSpentAt5,
      offsetTotalSpentAtLeaseEnd: summary.offsetTotalSpentAtLeaseEnd,
      offsetTotalSpentAt5: summary.offsetTotalSpentAt5,
      loanTotalSpentAtLeaseEnd: summary.loanTotalSpentAtLeaseEnd,
      loanTotalSpentAt5: summary.loanTotalSpentAt5,
      keepTotalSpentAtLeaseEnd: summary.keepTotalSpentAtLeaseEnd,
      keepTotalSpentAt5: summary.keepTotalSpentAt5,
      newEvValueAtLeaseEnd: summary.newEvValueAtLeaseEnd,
      irNl: summary.irNl,
      irCash: summary.irCash,
      irLoan: summary.irLoan,
      irKeep: summary.irKeep,
    },
  });
}

const base = baseEvInputs();

describe("golden master: FBT category tiers", () => {
  test("EV, legacy pre-transitional start (2027-03-01), under LCT -> EXEMPT", () => {
    const i = withOverrides(base, { leaseStartDate: "2027-03-01", vehicleBaseValue: 60000 });
    expect(snapshotFor(i)).toMatchSnapshot();
  });

  test("EV, transitional window (2027-06-01), base $80k (between $75k cap and LCT) -> DISCOUNTED", () => {
    const i = withOverrides(base, { leaseStartDate: "2027-06-01", vehicleBaseValue: 80000, driveawayCost: 86000 });
    expect(snapshotFor(i)).toMatchSnapshot();
  });

  test("EV, transitional window (2027-06-01), base $70k (<= $75k cap) -> still EXEMPT", () => {
    const i = withOverrides(base, { leaseStartDate: "2027-06-01", vehicleBaseValue: 70000, driveawayCost: 76000 });
    expect(snapshotFor(i)).toMatchSnapshot();
  });

  test("EV, over LCT threshold at any date -> APPLICABLE (full FBT)", () => {
    const i = withOverrides(base, { leaseStartDate: "2026-08-02", vehicleBaseValue: 95000, driveawayCost: 102000 });
    expect(snapshotFor(i)).toMatchSnapshot();
  });

  test("EV, post-phase-out (2029-06-01), under LCT -> DISCOUNTED", () => {
    const i = withOverrides(base, { leaseStartDate: "2029-06-01", vehicleBaseValue: 60000 });
    expect(snapshotFor(i)).toMatchSnapshot();
  });

  test("Non-EV -> NON_EV_FBT_APPLICABLE regardless of value/date", () => {
    const i = withOverrides(base, {
      vehicleType: "Non-EV",
      electricityAnnual: 0,
      fuelAnnual: 2200,
      avgAudPerKwh: 0,
      avgWhPerKm: 0,
    });
    expect(snapshotFor(i)).toMatchSnapshot();
  });
});

describe("golden master: vehicle condition / GST / used-EV eligibility", () => {
  test("Used - dealer sale (GST inc), New-eligible checks pass -> still EXEMPT", () => {
    const i = withOverrides(base, {
      vehicleCondition: "Used – dealer sale (GST inc)",
      usedCarFirstHeldAfterJul2022: true,
      usedCarLctNeverPayable: true,
    });
    expect(snapshotFor(i)).toMatchSnapshot();
  });

  test("Used - private sale (no GST), eligibility checks FAIL -> forced APPLICABLE", () => {
    const i = withOverrides(base, {
      vehicleCondition: "Used – private sale (no GST)",
      usedCarFirstHeldAfterJul2022: false,
      usedCarLctNeverPayable: false,
    });
    expect(snapshotFor(i)).toMatchSnapshot();
  });

  test("GST saving NOT passed on (gstSavingPassedOn = No)", () => {
    const i = withOverrides(base, { gstSavingPassedOn: "No" });
    expect(snapshotFor(i)).toMatchSnapshot();
  });
});

describe("golden master: lease term, deferral, luxury adjustment", () => {
  for (const years of [1, 2, 3, 4, 5]) {
    test(`lease term = ${years} year(s)`, () => {
      // $550/fn (the baseline payment) is only realistic for a 5-year term; for shorter
      // terms it can fall below the minimum payment the solver can rate at all (0% floor),
      // so re-derive a term-appropriate payment at a representative 9% p.a. effective rate.
      const withTerm = withOverrides(base, { leaseDurationYears: years });
      const vehicleLeasePerFn = fortnightlyLeaseFromEffectiveAnnualRate({
        financedAmountExGst: withTerm.financedAmountForInterestCalcExGst,
        residualValueExGst: withTerm.residualValueExGst,
        leaseYears: years,
        deferMonths: withTerm.monthsDeferred,
        effectiveAnnualRate: 0.09,
      });
      const i = withOverrides(base, { leaseDurationYears: years, vehicleLeasePerFn });
      expect(snapshotFor(i)).toMatchSnapshot();
    });
  }

  test("deferred start: monthsDeferred = 2", () => {
    const i = withOverrides(base, { monthsDeferred: 2 });
    expect(snapshotFor(i)).toMatchSnapshot();
  });

  test("luxury vehicle adjustment per fortnight > 0", () => {
    const i = withOverrides(base, { luxuryVehicleAdjPerFn: 45 });
    expect(snapshotFor(i)).toMatchSnapshot();
  });
});

describe("golden master: income bracket edges + Div 293 territory", () => {
  const incomes = [18200, 45000, 45001, 135000, 135001, 190000, 190001, 250000, 300000];
  for (const income of incomes) {
    test(`totalTaxableIncome = ${income}`, () => {
      const i = withOverrides(base, { totalTaxableIncome: income });
      expect(snapshotFor(i)).toMatchSnapshot();
    });
  }
});

describe("golden master: super-from-pre-NL income toggle", () => {
  test("superFromPreNlIncome = No (SG loss applies)", () => {
    const i = withOverrides(base, { superFromPreNlIncome: "No" });
    expect(snapshotFor(i)).toMatchSnapshot();
  });
});

describe("golden master: comparators enabled", () => {
  test("keep-current-car comparator ON", () => {
    const i = withOverrides(base, { compareWithCurrentCar: true });
    expect(snapshotFor(i)).toMatchSnapshot();
  });

  test("car-loan comparator ON", () => {
    const i = withOverrides(base, { compareWithCarLoan: true });
    expect(snapshotFor(i)).toMatchSnapshot();
  });

  test("both comparators ON, non-EV, high income, 3-year term (combined realistic scenario)", () => {
    const i = withOverrides(base, {
      vehicleType: "Non-EV",
      electricityAnnual: 0,
      fuelAnnual: 2600,
      avgAudPerKwh: 0,
      avgWhPerKm: 0,
      leaseDurationYears: 3,
      totalTaxableIncome: 210000,
      compareWithCurrentCar: true,
      compareWithCarLoan: true,
    });
    expect(snapshotFor(i)).toMatchSnapshot();
  });
});

describe("golden master: baseline scenario (all defaults)", () => {
  test("baseEvInputs", () => {
    expect(snapshotFor(base)).toMatchSnapshot();
  });
});
