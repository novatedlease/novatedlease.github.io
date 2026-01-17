// Interest rate calculation engine
// Computes fortnightly lease payment from core lease parameters
//
// NOTE: This file contains two related “engines”:
//
// 1) A spreadsheet-mirroring monthly PMT-in-advance model that derives residual from
//    ATO residual % table (1–5y) and documentation fee exclusion.
//
// 2) A “Section 4” engine that works with EXPLICIT residualValueExGst and can solve
//    effectiveAnnualRate <-> fortnightlyLeasePayment. This Section 4 engine is
//    mathematically consistent forward/inverse by doing ALL finance math in MONTHLY
//    space (same model as #1) and only converting to/from fortnightly at the edges.

import type { Inputs } from "./types";
import { calcResidualPayableIncGst } from "./types";
import { gstSaved, residualPercentForYears } from "./ato";

export type InterestLeaseInputs = {
  financedAmount: number; // total amount financed (ex GST convention used in app)
  documentationFee: number; // doc fee excluded from residual base
  effectiveAnnualRate: number; // e.g. 0.089 for 8.9%
  leaseYears: number; // lease duration in years (1–5 integer for residual table)
  monthsDeferred: number; // number of months deferred
};

// Residual percentages for standard 1–5 year leases
const RESIDUAL_PCT_TABLE: Record<number, number> = {
  1: 0.6563,
  2: 0.5625,
  3: 0.4688,
  4: 0.375,
  5: 0.2813,
};

function residualPctFromYears(years: number): number {
  const rounded = Math.round(years);
  const okInteger = Math.abs(years - rounded) < 1e-9;
  if (!okInteger) {
    throw new Error(`leaseYears must be an integer 1–5 to use this engine (got ${years})`);
  }
  const pct = RESIDUAL_PCT_TABLE[rounded];
  if (!pct) {
    throw new Error(`leaseYears must be between 1 and 5 years (got ${rounded})`);
  }
  return pct;
}

/**
 * Excel-style PMT implementation.
 *
 * @param rate periodic interest rate
 * @param nper number of periods
 * @param pv present value
 * @param fv future value (balloon), default 0
 * @param type 0 = arrears, 1 = advance
 */
function pmt(rate: number, nper: number, pv: number, fv = 0, type: 0 | 1 = 0): number {
  if (nper <= 0) throw new Error("nper must be greater than zero");

  if (Math.abs(rate) < 1e-12) {
    return -(pv + fv) / nper;
  }

  const r1 = 1 + rate;
  const pow = Math.pow(r1, nper);

  let payment = -(rate * (pv * pow + fv)) / (pow - 1);

  if (type === 1) {
    payment /= r1;
  }

  return payment;
}

function computeMonthlyPaymentInAdvance(i: InterestLeaseInputs): {
  monthsPaid: number;
  monthlyPayment: number; // Excel sign convention: negative means cash outflow
  residual: number;
} {
  const { financedAmount, documentationFee, effectiveAnnualRate, leaseYears, monthsDeferred } = i;

  if (financedAmount <= 0) throw new Error("financedAmount must be > 0");
  if (leaseYears <= 0) throw new Error("leaseYears must be > 0");
  if (monthsDeferred < 0) throw new Error("monthsDeferred must be >= 0");

  const totalMonths = leaseYears * 12;
  const monthsPaid = totalMonths - monthsDeferred;
  if (monthsPaid <= 0) throw new Error("monthsDeferred must be less than total lease months");

  const monthlyRate = effectiveAnnualRate / 12;

  const residualPct = residualPctFromYears(leaseYears);
  const residual = (financedAmount - documentationFee) * residualPct;

  // Present value grown during the deferred period
  const pvAtFirstPayment = financedAmount * Math.pow(1 + monthlyRate, monthsDeferred);

  // Monthly payment in advance (type = 1), with FV = -residual (spreadsheet convention)
  const monthlyPayment = pmt(monthlyRate, monthsPaid, pvAtFirstPayment, -residual, 1);

  return { monthsPaid, monthlyPayment, residual };
}

/**
 * Computes the fortnightly lease payment (positive number).
 * Mirrors the spreadsheet formula:
 * =-PMT(r/12, y*12-m, financed*(1+r/12)^m, -residual, 1) * (y*12-m) / (y*26)
 */
export function computeFortnightlyLease(i: InterestLeaseInputs): number {
  const { monthsPaid, monthlyPayment } = computeMonthlyPaymentInAdvance(i);

  // Convert monthly payment stream into total paid over lease, then average per fortnight.
  const fortnightly = (-monthlyPayment * monthsPaid) / (i.leaseYears * 26);
  return fortnightly;
}

/**
 * Inverse: solves for effective annual interest rate (decimal, e.g. 0.089 for 8.9%)
 * given the target fortnightly lease payment.
 *
 * Uses monotonic bisection on the effective annual rate.
 */
export function solveEffectiveAnnualRateFromFortnightlyLease(opts: {
  financedAmount: number;
  documentationFee: number;
  leaseYears: number;
  monthsDeferred: number;
  targetFortnightlyLeasePayment: number; // positive
  // Optional solver controls
  tolAbs?: number; // absolute tolerance on fortnightly payment, default 0.01
  maxIter?: number; // default 80
  maxRate?: number; // default 1.5 (150%)
}): number {
  const target = opts.targetFortnightlyLeasePayment;

  if (!(target > 0)) {
    throw new Error("targetFortnightlyLeasePayment must be > 0");
  }

  const base: Omit<InterestLeaseInputs, "effectiveAnnualRate"> = {
    financedAmount: opts.financedAmount,
    documentationFee: opts.documentationFee,
    leaseYears: opts.leaseYears,
    monthsDeferred: opts.monthsDeferred,
  };

  const tol = opts.tolAbs ?? 0.01;
  const maxIter = opts.maxIter ?? 80;
  const maxRate = opts.maxRate ?? 1.5;

  // f(rate) = computed - target
  const f = (rate: number) => computeFortnightlyLease({ ...base, effectiveAnnualRate: rate }) - target;

  // Lower bound at 0% rate (minimum payment for non-negative rates)
  let lo = 0;
  let flo = f(lo);

  // If even 0% produces higher payment, we'd need a negative rate (not supported)
  if (flo > 0) {
    throw new Error(
      `Target payment is too low to be achieved with a non-negative rate (at 0% the payment is ${computeFortnightlyLease({
        ...base,
        effectiveAnnualRate: 0,
      }).toFixed(2)} per fn)`
    );
  }

  // Find an upper bound that makes f(hi) >= 0
  let hi = 0.05; // 5% initial guess
  let fhi = f(hi);

  while (fhi < 0 && hi < maxRate) {
    hi *= 2;
    fhi = f(hi);
  }

  if (fhi < 0) {
    throw new Error(`Target payment is too high to bracket within maxRate=${maxRate * 100}%`);
  }

  // Bisection
  for (let iter = 0; iter < maxIter; iter++) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);

    if (Math.abs(fmid) <= tol) return mid;

    if (fmid < 0) {
      lo = mid;
      flo = fmid;
    } else {
      hi = mid;
      fhi = fmid;
    }

    if (hi - lo < 1e-12) return (lo + hi) / 2;
  }

  return (lo + hi) / 2;
}

// -----------------------------------------------------------------------------
// Section 4: Effective interest-rate engine (fortnightly payment <-> annual rate)
// -----------------------------------------------------------------------------
//
// IMPORTANT: This section intentionally mirrors the spreadsheet model used above:
//  - Interest rate is applied MONTHLY (r/12)
//  - Payments are MONTHLY and IN ADVANCE (type = 1)
//  - A residual (balloon) is due at end of lease
//  - An optional deferred period (monthsDeferred) accrues interest before the first payment
//
// It accepts an EXPLICIT residualValueExGst (not derived from residual % table).
// Forward and inverse are true inverses of each other because they share the same forward model.

export type EffectiveInterestLeaseInputs = {
  financedAmountExGst: number; // PV at t=0 (ex GST)
  residualValueExGst: number; // balloon at end (ex GST, positive)
  leaseYears: number; // typically integer 1–5
  deferMonths?: number; // optional, default 0
};

function monthsPaidFromLease(opts: { leaseYears: number; deferMonths: number }): number {
  const totalMonths = Math.round(opts.leaseYears * 12);
  const defer = Math.max(0, Math.round(opts.deferMonths));
  const monthsPaid = totalMonths - defer;
  if (totalMonths <= 0) throw new Error("leaseYears must be > 0");
  if (monthsPaid <= 0) throw new Error("deferMonths too large for lease term");
  return monthsPaid;
}

function pvAtFirstPaymentMonthly(opts: { financed: number; monthlyRate: number; deferMonths: number }): number {
  const { financed, monthlyRate, deferMonths } = opts;
  if (deferMonths <= 0) return financed;
  return financed * Math.pow(1 + monthlyRate, deferMonths);
}

function targetMonthlyPaymentFromFortnightly(opts: {
  targetFortnightly: number;
  leaseYears: number;
  monthsPaid: number;
}): number {
  // From the spreadsheet conversion:
  // fortnightly = (-monthlyPayment * monthsPaid) / (leaseYears * 26)
  // => -monthlyPayment = fortnightly * (leaseYears * 26) / monthsPaid
  return -opts.targetFortnightly * (opts.leaseYears * 26) / opts.monthsPaid;
}

export function fortnightlyLeaseFromEffectiveAnnualRate(opts: {
  financedAmountExGst: number;
  residualValueExGst: number;
  leaseYears: number;
  deferMonths?: number;
  effectiveAnnualRate: number; // decimal e.g. 0.1472
}): number {
  const financed = Math.max(0, opts.financedAmountExGst);
  const residual = Math.max(0, opts.residualValueExGst);
  const years = Math.max(0, opts.leaseYears);
  const deferMonths = Math.max(0, Math.round(opts.deferMonths ?? 0));

  const monthsPaid = monthsPaidFromLease({ leaseYears: years, deferMonths });

  const monthlyRate = opts.effectiveAnnualRate / 12;
  const pvFirst = pvAtFirstPaymentMonthly({ financed, monthlyRate, deferMonths });

  // PMT sign convention: negative means outflow
  const monthlyPayment = pmt(monthlyRate, monthsPaid, pvFirst, -residual, 1);

  // Convert total monthly paid over lease to average per fortnight
  const fortnightly = (-monthlyPayment * monthsPaid) / (years * 26);
  return fortnightly;
}

export function effectiveAnnualRateFromFortnightlyLease(opts: {
  financedAmountExGst: number;
  residualValueExGst: number;
  leaseYears: number;
  deferMonths?: number;
  fortnightlyLeasePayment: number; // positive
  tolAbs?: number; // default 0.01 (on fortnightly)
  maxIter?: number; // default 80
  maxAnnualRate?: number; // default 2.0 = 200%
}): number {
  const financed = Math.max(0, opts.financedAmountExGst);
  const residual = Math.max(0, opts.residualValueExGst);
  const years = Math.max(0, opts.leaseYears);
  const deferMonths = Math.max(0, Math.round(opts.deferMonths ?? 0));

  if (years <= 0) throw new Error("leaseYears must be > 0");

  const targetFn = opts.fortnightlyLeasePayment;
  if (!(targetFn > 0)) throw new Error("fortnightlyLeasePayment must be > 0");

  const monthsPaid = monthsPaidFromLease({ leaseYears: years, deferMonths });

  // Convert target fortnightly to target MONTHLY payment (negative outflow)
  const targetMonthly = targetMonthlyPaymentFromFortnightly({
    targetFortnightly: targetFn,
    leaseYears: years,
    monthsPaid,
  });

  // (targetMonthly is not directly used below, but keeping it computed helps keep
  // the relationship explicit for debugging/maintenance.)
  void targetMonthly;

  const tolFn = opts.tolAbs ?? 0.01;
  const maxIter = opts.maxIter ?? 80;
  const maxAnnualRate = opts.maxAnnualRate ?? 2.0;

  // Forward model returning fortnightly (positive)
  const forwardFn = (annualRate: number) =>
    fortnightlyLeaseFromEffectiveAnnualRate({
      financedAmountExGst: financed,
      residualValueExGst: residual,
      leaseYears: years,
      deferMonths,
      effectiveAnnualRate: annualRate,
    });

  // f(rate) = computed fortnightly - target fortnightly
  const f = (annualRate: number) => forwardFn(annualRate) - targetFn;

  // At 0% rate, payment is minimal for non-negative rates
  const f0 = f(0);
  if (f0 > 0) throw new Error("Payment too low (even at 0% rate)");

  // Bracket an upper bound where f(hi) >= 0
  let lo = 0;
  let hi = 0.05;
  let fhi = f(hi);

  while (fhi < 0 && hi < maxAnnualRate) {
    hi *= 2;
    fhi = f(hi);
  }
  if (fhi < 0) throw new Error("Unable to bracket rate within maxAnnualRate");

  // Bisection on annual rate
  for (let iter = 0; iter < maxIter; iter++) {
    const mid = (lo + hi) / 2;
    const fmid = f(mid);

    if (Math.abs(fmid) <= tolFn) return mid;

    if (fmid < 0) lo = mid;
    else hi = mid;

    if (hi - lo < 1e-12) return (lo + hi) / 2;
  }

  return (lo + hi) / 2;
}

// -----------------------------------------------------------------------------
// Shared helpers for App/Reports (single source of truth)
// -----------------------------------------------------------------------------

export function financedAmountExGstFromInputs(i: Inputs): number {
  const vehicleGstSaved = gstSaved(i);
  return Math.max(0, i.driveawayCost + i.leaseDocFee - vehicleGstSaved);
}

export function residualPayableIncGstFromInputs(i: Inputs): number {
  const residualPctRaw = residualPercentForYears(i.leaseDurationYears);
  const residualPct = residualPctRaw > 1 ? residualPctRaw / 100 : residualPctRaw;

  const amountFinancedExGst = financedAmountExGstFromInputs(i);

  return calcResidualPayableIncGst({
    amountFinancedExGst,
    leaseDocFeeExGst: i.leaseDocFee,
    residualPct,
  });
}