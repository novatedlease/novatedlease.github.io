import type { Inputs } from "@engine/types";
import {
  EV_TRANSITIONAL_FULL_EXEMPT_CAP,
  getEvLctThresholdForLeaseStart,
  getLeaseFbtCategory,
  usedEvHistoryTestsApply,
  type LeaseFbtCategory,
} from "@engine/types";
import { financedAmountExGstFromInputs } from "@engine/effectiveinterest";
import { gstSaved, residualFractionForYears } from "@engine/ato";
import { taxSummaryAUResident } from "@engine/tax_au";
import {
  deriveInputsFromSimpleAnswers,
  estBaseValueFromDriveaway,
  estMarketValueFromDriveaway,
  nonEvFuelAnnual,
  evElectricityClaimAnnual,
  type Assumption,
  type SimpleModeAnswers,
} from "../assumptions";

/** ATO car limit for FY2026-27 (indexed each July). Above this, a luxury vehicle adjustment may appear on the quote. */
export const CAR_LIMIT_FY2027 = 69883;
export const GST_RATE = 0.1;
/** First day of the EV FBT phase-out's transitional period. Leases starting before it are grandfathered. */
export const PHASE_OUT_START = "2027-04-01";

/**
 * Every number the reader types starts empty. `none` is the explicit "this doesn't apply to me"
 * tick, so a figure is never silently left at a pre-filled default. `estimated` marks a value the
 * reader accepted from our "typical figure" suggestion rather than copying from their quote.
 */
export type Money = { text: string; none: boolean; estimated: boolean };
export const emptyMoney = (): Money => ({
  text: "",
  none: false,
  estimated: false,
});

export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function moneyValue(m: Money): number | null {
  if (m.none) return 0;
  return parseAmount(m.text);
}

export type RunningPeriod = "perYear" | "perMonth" | "perFn";
export type YesNoUnsure = "Yes" | "No" | "Unsure";

export type GuidedDraft = {
  /** null until asked. false = still exploring, so the quote-only screens are skipped and typical figures are used. */
  hasQuote: boolean | null;
  vehicleType: Inputs["vehicleType"] | null;
  vehicleCondition: Inputs["vehicleCondition"] | null;
  compareLoan: boolean | null;
  compareCurrent: boolean | null;
  loanDeposit: Money;
  loanRate: Money;
  loanFee: Money;
  curValueNow: Money;
  curValueEnd: Money;
  curService: Money;
  curRego: Money;
  curFuel: Money;
  curInsurance: Money;

  usedAfter2022: boolean | null;
  usedLctNever: boolean | null;
  leaseStartDate: string;
  /** Estimate path only: roughly when an EV lease would start, either side of the phase-out date. */
  exploreStart: "before" | "after" | null;

  baseValue: Money;
  driveaway: Money;

  leaseYears: number | null;
  monthsDeferred: number | null;
  monthsDeferredUnsure: boolean;
  docFee: Money;
  residualBasis: "exGst" | "incGst" | "unknown" | null;
  residual: Money;
  /** Reader's estimate of the car's market value when the lease ends (not at 5 years). Only asked when comparing with keeping the current car. */
  marketValueEnd: Money;

  /** null until asked. Smart Leasing and MillarX quote a figure that needs the buffer-month correction. */
  smartMillarx: boolean | null;
  paymentPeriod: "perFn" | "perMonth" | null;
  /** How the quote labels the finance payment. "unknown" is treated as ex GST and checked against the implied rate. */
  paymentBasis: "exGst" | "incGst" | "unknown" | null;
  payment: Money;
  /** True when the payment came out of the Smart Leasing / MillarX correction tool rather than being typed. */
  paymentCorrected: boolean;
  luxAdj: Money;

  gstPassedOn: YesNoUnsure | null;
  mileage: Money;
  runningPeriod: RunningPeriod | null;
  service: Money;
  rego: Money;
  insurance: Money;
  mgmt: Money;
  fuel: Money;
  chargingRate: Money;

  income: Money;
  superPreNl: YesNoUnsure | null;
  cashHome: "offset" | "savings" | "invested" | "none" | null;
  offsetRate: Money;
  investedRate: Money;
  savingsRatePreTax: Money;
  nswHealth: boolean | null;
  nswAmount: Money;
  nswPeriod: RunningPeriod | null;
};

export function emptyDraft(): GuidedDraft {
  return {
    hasQuote: null,
    vehicleType: null,
    vehicleCondition: null,
    compareLoan: null,
    compareCurrent: null,
    loanDeposit: emptyMoney(),
    loanRate: emptyMoney(),
    loanFee: emptyMoney(),
    curValueNow: emptyMoney(),
    curValueEnd: emptyMoney(),
    curService: emptyMoney(),
    curRego: emptyMoney(),
    curFuel: emptyMoney(),
    curInsurance: emptyMoney(),
    usedAfter2022: null,
    usedLctNever: null,
    leaseStartDate: "",
    exploreStart: null,
    baseValue: emptyMoney(),
    driveaway: emptyMoney(),
    leaseYears: null,
    monthsDeferred: null,
    monthsDeferredUnsure: false,
    docFee: emptyMoney(),
    residualBasis: null,
    residual: emptyMoney(),
    marketValueEnd: emptyMoney(),
    smartMillarx: null,
    paymentPeriod: null,
    paymentBasis: null,
    payment: emptyMoney(),
    paymentCorrected: false,
    luxAdj: emptyMoney(),
    gstPassedOn: null,
    mileage: emptyMoney(),
    runningPeriod: null,
    service: emptyMoney(),
    rego: emptyMoney(),
    insurance: emptyMoney(),
    mgmt: emptyMoney(),
    fuel: emptyMoney(),
    chargingRate: emptyMoney(),
    income: emptyMoney(),
    superPreNl: null,
    cashHome: null,
    offsetRate: emptyMoney(),
    investedRate: emptyMoney(),
    savingsRatePreTax: emptyMoney(),
    nswHealth: null,
    nswAmount: emptyMoney(),
    nswPeriod: null,
  };
}

export const STEP_IDS = [
  "intro",
  "car",
  "compare",
  "quick",
  "price",
  "lease",
  "payment",
  "running",
  "you",
  "alternatives",
  "review",
] as const;
export type StepId = (typeof STEP_IDS)[number];

export const STEP_TITLES: Record<StepId, string> = {
  intro: "Before you start",
  compare: "What you're comparing",
  car: "The car",
  quick: "The basics",
  price: "The price",
  lease: "The lease",
  payment: "The payment",
  running: "Running costs",
  you: "About you",
  alternatives: "Your alternatives",
  review: "Review & results",
};

/** The alternatives screen only appears when the reader chose a loan or keeping their current car. */
export function visibleSteps(d: GuidedDraft): StepId[] {
  const exploring = d.hasQuote === false;
  return STEP_IDS.filter((s) => {
    if (s === "alternatives")
      return d.compareLoan === true || d.compareCurrent === true;
    if (s === "quick") return exploring;
    if (s === "price" || s === "lease" || s === "payment" || s === "running")
      return !exploring;
    return true;
  });
}

export function runningFactor(p: RunningPeriod | null): number {
  return p === "perMonth" ? 12 : p === "perFn" ? 26 : 1;
}

/** The NSW Health employer share as an annual amount, whatever period the reader entered it in. */
export function nswAnnual(d: GuidedDraft): number {
  if (!d.nswHealth || !positive(d.nswAmount) || !d.nswPeriod) return 0;
  return moneyValue(d.nswAmount)! * runningFactor(d.nswPeriod);
}

/** A running-cost figure as an annual amount, whatever period the reader entered it in. */
export function annualOf(d: GuidedDraft, m: Money): number | null {
  const v = moneyValue(m);
  return v === null ? null : v * runningFactor(d.runningPeriod);
}

// ─── Derived helpers ────────────────────────────────────────────────────────

function isIsoDate(s: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(new Date(s + "T00:00:00Z").getTime())
  );
}

/** Today plus n days as yyyy-mm-dd: the same placeholder start date the estimate assumptions use. */
export function isoTodayPlusDays(days: number): string {
  const t = new Date();
  t.setDate(t.getDate() + days);
  return t.toISOString().slice(0, 10);
}

/** On the estimate path, whether the "before or after 1 April 2027" question is worth asking. */
export function needsExploreStart(d: GuidedDraft): boolean {
  return (
    d.hasQuote === false &&
    d.vehicleType === "EV" &&
    isoTodayPlusDays(30) < PHASE_OUT_START
  );
}

/**
 * The lease start date the rules should use: the reader's own date on the quote path, or a
 * placeholder on the estimate path (30 days out, moved to 1 April 2027 if they said "after").
 * Null while an answer it depends on is still missing.
 */
export function effectiveStartDate(d: GuidedDraft): string | null {
  if (d.hasQuote !== false)
    return isIsoDate(d.leaseStartDate) ? d.leaseStartDate : null;
  const placeholder = isoTodayPlusDays(30);
  if (!needsExploreStart(d)) return placeholder;
  if (d.exploreStart === "before") return placeholder;
  if (d.exploreStart === "after") return PHASE_OUT_START;
  return null;
}

/** The FBT base value: the reader's own figure, or our drive-away ÷ 1.08 estimate when exploring. */
export function baseValueUsed(d: GuidedDraft): number | null {
  if (d.hasQuote === false) {
    const drive = moneyValue(d.driveaway);
    return drive ? estBaseValueFromDriveaway(drive) : null;
  }
  return moneyValue(d.baseValue);
}

export function isLuxuryRange(d: GuidedDraft): boolean {
  return (moneyValue(d.baseValue) ?? 0) > CAR_LIMIT_FY2027;
}

/** Used-EV history questions only apply to used EVs on leases starting before 1 Apr 2027. */
export function needsUsedEvChecks(d: GuidedDraft): boolean {
  const start = effectiveStartDate(d);
  if (d.vehicleType !== "EV" || !d.vehicleCondition || !start) return false;
  return usedEvHistoryTestsApply({
    vehicleCondition: d.vehicleCondition,
    leaseStartDate: start,
  } as Inputs);
}

function pricingInputs(d: GuidedDraft): Inputs | null {
  const base = moneyValue(d.baseValue);
  const drive = moneyValue(d.driveaway);
  if (!base || !drive || !d.vehicleCondition) return null;
  return {
    vehicleCondition: d.vehicleCondition,
    vehicleBaseValue: base,
    driveawayCost: drive,
    leaseDocFee: moneyValue(d.docFee) ?? 0,
  } as Inputs;
}

export function financedExGst(d: GuidedDraft): number | null {
  const p = pricingInputs(d);
  return p ? financedAmountExGstFromInputs(p) : null;
}

/** Typical market value at the end of the lease: about 40% of drive-away at 5 years, declining exponentially (as the engine does). */
export function typicalMarketValueAtLeaseEnd(d: GuidedDraft): number | null {
  const p = moneyValue(d.driveaway);
  if (!p || !d.leaseYears) return null;
  const at5 = estMarketValueFromDriveaway(p);
  return Math.round((p * Math.pow(at5 / p, d.leaseYears / 5)) / 500) * 500;
}

/** The lease-end market value the reader gave (or accepted as typical, kept current if the term or price changes). */
export function marketValueEndEntered(d: GuidedDraft): number | null {
  if (d.marketValueEnd.estimated) return typicalMarketValueAtLeaseEnd(d);
  return moneyValue(d.marketValueEnd);
}

/**
 * The new car's value at the end only changes the result against keeping the current car: against
 * cash or a loan you own the same car either way, so it cancels out and we use the typical figure.
 */
export function asksMarketValueEnd(d: GuidedDraft): boolean {
  return d.compareCurrent === true;
}

/** The engine takes a 5-year value and interpolates for shorter terms, so convert the lease-end value back along the same curve. */
export function marketValueAt5Years(d: GuidedDraft): number | null {
  const v = marketValueEndEntered(d);
  const p = moneyValue(d.driveaway);
  if (!v || !p || !d.leaseYears) return null;
  if (d.leaseYears === 5) return v;
  if (v >= p) return null;
  return Math.round(p * Math.pow(v / p, 5 / d.leaseYears));
}

/** ATO minimum residual, ex GST, for the car and term entered so far. */
export function atoMinimumResidualExGst(d: GuidedDraft): number | null {
  const p = pricingInputs(d);
  if (!p || !d.leaseYears) return null;
  const base = Math.max(0, p.driveawayCost - gstSaved(p));
  return base * residualFractionForYears(d.leaseYears);
}

export function residualExGstEntered(d: GuidedDraft): number | null {
  if (d.residualBasis === "unknown") return atoMinimumResidualExGst(d);
  const v = moneyValue(d.residual);
  if (v === null || !d.residualBasis) return null;
  return d.residualBasis === "incGst" ? v / (1 + GST_RATE) : v;
}

/** The finance payment per fortnight, ex GST, as the engine takes it. */
export function paymentPerFn(d: GuidedDraft): number | null {
  const v = moneyValue(d.payment);
  if (v === null || !d.paymentPeriod) return null;
  const perFn = d.paymentPeriod === "perMonth" ? (v * 12) / 26 : v;
  return d.paymentBasis === "incGst" ? perFn / (1 + GST_RATE) : perFn;
}

export function fbtCategoryOf(d: GuidedDraft): LeaseFbtCategory | null {
  const base = baseValueUsed(d);
  const start = effectiveStartDate(d);
  if (!d.vehicleType || !d.vehicleCondition || !start || !base) return null;
  if (needsUsedEvChecks(d) && (d.usedAfter2022 === null || d.usedLctNever === null))
    return null;
  return getLeaseFbtCategory({
    vehicleType: d.vehicleType,
    vehicleCondition: d.vehicleCondition,
    usedCarFirstHeldAfterJul2022: d.usedAfter2022 === true,
    usedCarLctNeverPayable: d.usedLctNever === true,
    vehicleBaseValue: base,
    leaseStartDate: start,
  } as Inputs);
}

/** Plain-English FBT treatment, with the reason when an EV misses out on the exemption. */
export function fbtLabel(d: GuidedDraft, cat: LeaseFbtCategory): string {
  switch (cat) {
    case "EV_FBT_EXEMPT":
      return "Exempt from FBT (electric car under the threshold)";
    case "EV_FBT_DISCOUNTED":
      return "FBT reduced to 75% (electric car under the EV phase-out rules)";
    case "EV_FBT_APPLICABLE": {
      if (needsUsedEvChecks(d) && !(d.usedAfter2022 && d.usedLctNever))
        return "Full FBT applies: this used electric car doesn't meet the history tests for the exemption";
      return "Full FBT applies: the price is above the Luxury Car Tax threshold for electric cars";
    }
    default:
      return "Full FBT applies (not electric), normally cancelled out by your post-tax contribution";
  }
}

/** For EVs on the estimate path: the threshold our guessed base value sits close to, if any. */
export function nearEvThreshold(
  d: GuidedDraft,
): { base: number; threshold: number; kind: "lct" | "cap" } | null {
  if (d.hasQuote !== false || d.vehicleType !== "EV") return null;
  const base = baseValueUsed(d);
  const start = effectiveStartDate(d);
  if (!base || !start) return null;
  const candidates: { threshold: number; kind: "lct" | "cap" }[] = [
    { threshold: getEvLctThresholdForLeaseStart(start), kind: "lct" },
  ];
  if (start >= PHASE_OUT_START)
    candidates.push({ threshold: EV_TRANSITIONAL_FULL_EXEMPT_CAP, kind: "cap" });
  const hit = candidates.find(
    (c) => Math.abs(base - c.threshold) / c.threshold <= 0.05,
  );
  return hit ? { base, ...hit } : null;
}

// ─── Keeping the current car ────────────────────────────────────────────────

/** The same depreciation the starter figures imply ($25,000 now to $14,000 after 5 years). */
const CURRENT_CAR_5Y_RATIO = 14000 / 25000;

export function typicalCurrentCar(d: GuidedDraft) {
  const now = moneyValue(d.curValueNow);
  const km = moneyValue(d.mileage);
  const years = d.leaseYears ?? 5;
  return {
    valueEnd: now
      ? Math.round((now * Math.pow(CURRENT_CAR_5Y_RATIO, years / 5)) / 500) * 500
      : null,
    service: 800,
    rego: 900,
    insurance: 1000,
    fuel: km ? nonEvFuelAnnual(km) : null,
  };
}

/** Current car value at the end of the lease, as entered (or accepted as typical). */
export function currentCarValueEnd(d: GuidedDraft): number | null {
  if (d.curValueEnd.estimated) return typicalCurrentCar(d).valueEnd;
  return moneyValue(d.curValueEnd);
}

/** The engine wants the current car's 5-year value; convert the lease-end value along its own curve. */
export function currentCarValueAt5Years(d: GuidedDraft): number | null {
  const end = currentCarValueEnd(d);
  const now = moneyValue(d.curValueNow);
  if (!end || !now || !d.leaseYears) return null;
  if (d.leaseYears === 5) return end;
  if (end >= now) return end;
  return Math.round(now * Math.pow(end / now, 5 / d.leaseYears));
}

/** A current-car running cost, using the typical figure when the reader accepted one. */
function currentCost(m: Money, typical: number | null): number {
  if (m.estimated && typical) return typical;
  return moneyValue(m) ?? 0;
}

/** Typical annual figures for this car, from the same assumptions Simple mode uses. Suggestions only, never pre-filled. */
export function typicalFigures(d: GuidedDraft) {
  const drive = moneyValue(d.driveaway);
  const km = moneyValue(d.mileage);
  if (!d.vehicleType || !drive || !km) return null;
  const { inputs } = deriveInputsFromSimpleAnswers({
    vehicleType: d.vehicleType,
    driveawayCost: drive,
    totalTaxableIncome: 100000,
    leaseDurationYears: d.leaseYears ?? 5,
    annualMileageKm: km,
    hasHomeLoanOffset: false,
    homeLoanOffsetInterestRate: 0,
  });
  return {
    service: inputs.serviceMaintTyresAnnual,
    rego: inputs.registrationAnnual,
    insurance: inputs.insuranceAnnual,
    mgmt: inputs.managementFeesAnnual,
    fuel: inputs.fuelAnnual,
  };
}

export function marginalRateInclMedicare(income: number): number {
  return taxSummaryAUResident(income, 2027).marginalRateInclMedicare;
}

export function afterTaxSavingsRatePct(
  preTaxPct: number,
  income: number,
): number {
  return preTaxPct * (1 - marginalRateInclMedicare(income));
}

// ─── Completeness ───────────────────────────────────────────────────────────

function positive(m: Money): boolean {
  const v = moneyValue(m);
  return v !== null && v > 0;
}
function answered(m: Money): boolean {
  return moneyValue(m) !== null;
}

/** Plain-English list of what still needs answering on a step (empty means the step is complete). */
export function missingForStep(step: StepId, d: GuidedDraft): string[] {
  const out: string[] = [];
  switch (step) {
    case "intro":
      if (d.hasQuote === null) out.push("Whether you have a quote yet");
      break;
    case "quick":
      if (!positive(d.driveaway)) out.push("Approximate drive-away price");
      if (!d.leaseYears) out.push("Lease term");
      if (!positive(d.mileage)) out.push("Annual kilometres");
      break;
    case "compare":
      if (d.compareLoan === null) out.push("Car loan comparison (yes or no)");
      if (d.compareCurrent === null)
        out.push("Keep-current-car comparison (yes or no)");
      break;
    case "car":
      if (!d.vehicleType) out.push("Vehicle type");
      if (!d.vehicleCondition) out.push("New or used");
      if (d.hasQuote !== false && !isIsoDate(d.leaseStartDate))
        out.push("Lease start date");
      if (needsExploreStart(d) && !d.exploreStart)
        out.push("Whether the lease would start before 1 April 2027");
      if (needsUsedEvChecks(d)) {
        if (d.usedAfter2022 === null)
          out.push("Used EV: first held after 1 July 2022?");
        if (d.usedLctNever === null)
          out.push("Used EV: Luxury Car Tax ever payable?");
      }
      break;
    case "price":
      if (!positive(d.baseValue)) out.push("FBT base value");
      if (!positive(d.driveaway)) out.push("Drive-away price");
      break;
    case "lease":
      if (!d.leaseYears) out.push("Lease term");
      if (d.monthsDeferred === null) out.push("Deferred months");
      if (!answered(d.docFee)) out.push("Documentation fee (or tick none)");
      if (!d.residualBasis) out.push("Residual: inc or ex GST");
      else if (d.residualBasis !== "unknown" && !positive(d.residual))
        out.push("Residual amount");
      if (asksMarketValueEnd(d) && !marketValueEndEntered(d))
        out.push("Estimated market value at the end of the lease");
      break;
    case "payment":
      if (d.smartMillarx === null)
        out.push("Whether your lease is with Smart Leasing or MillarX");
      if (!d.paymentPeriod) out.push("Fortnightly or monthly");
      if (!d.paymentBasis) out.push("Payment: inc or ex GST");
      if (!positive(d.payment)) out.push("Lease payment");
      if (isLuxuryRange(d) && !answered(d.luxAdj))
        out.push("Luxury vehicle adjustment (or tick none)");
      break;
    case "running":
      if (!d.gstPassedOn) out.push("GST on running costs");
      if (!positive(d.mileage)) out.push("Annual kilometres");
      if (!d.runningPeriod) out.push("Fortnightly, monthly or yearly figures");
      if (!answered(d.service)) out.push("Servicing");
      if (!answered(d.rego)) out.push("Registration");
      if (!answered(d.insurance)) out.push("Insurance");
      if (!answered(d.mgmt)) out.push("Management fees");
      if (d.vehicleType === "Non-EV" && !answered(d.fuel)) out.push("Fuel");
      if (d.vehicleType === "EV" && !answered(d.chargingRate))
        out.push("Electricity price per kWh (0 if solar)");
      break;
    case "you":
      if (!positive(d.income)) out.push("Taxable income");
      if (d.hasQuote !== false && !d.superPreNl) out.push("Super calculation");
      if (!d.cashHome) out.push("Where your cash would sit");
      else if (d.cashHome === "offset" && !answered(d.offsetRate))
        out.push("Offset interest rate");
      else if (d.cashHome === "savings" && !positive(d.savingsRatePreTax))
        out.push("Savings interest rate");
      else if (d.cashHome === "invested" && !answered(d.investedRate))
        out.push("Assumed return (or tick none)");
      if (d.hasQuote === false) break;
      if (d.nswHealth === null) out.push("NSW Health doctor or nurse?");
      else if (d.nswHealth) {
        if (!positive(d.nswAmount)) out.push("NSW Health employer share");
        if (!d.nswPeriod)
          out.push("NSW Health employer share: fortnightly, monthly or yearly");
      }
      break;
    case "alternatives":
      if (d.compareLoan) {
        if (!answered(d.loanDeposit)) out.push("Loan deposit (or tick none)");
        if (!positive(d.loanRate)) out.push("Loan interest rate");
        if (!answered(d.loanFee)) out.push("Loan monthly fee (or tick none)");
      }
      if (d.compareCurrent) {
        if (!positive(d.curValueNow)) out.push("Current car value today");
        if (!currentCarValueEnd(d))
          out.push("Current car value at the end of the lease");
        if (!answered(d.curService)) out.push("Current car servicing");
        if (!answered(d.curRego)) out.push("Current car registration");
        if (!answered(d.curFuel)) out.push("Current car fuel");
        if (!answered(d.curInsurance)) out.push("Current car insurance");
      }
      break;
    default:
      break;
  }
  return out;
}

// ─── Estimate path (no quote yet) ───────────────────────────────────────────

const ESTIMATE_STEPS: StepId[] = [
  "compare",
  "car",
  "quick",
  "you",
  "alternatives",
];

function offsetRateFor(d: GuidedDraft, income: number): number {
  return d.cashHome === "offset"
    ? (moneyValue(d.offsetRate) ?? 0)
    : d.cashHome === "savings"
      ? afterTaxSavingsRatePct(moneyValue(d.savingsRatePreTax) ?? 0, income)
      : d.cashHome === "invested"
        ? (moneyValue(d.investedRate) ?? 0)
        : 0;
}

function estimateAnswers(d: GuidedDraft): SimpleModeAnswers {
  const income = moneyValue(d.income)!;
  const offsetRate = offsetRateFor(d, income);
  return {
    vehicleType: d.vehicleType!,
    driveawayCost: moneyValue(d.driveaway)!,
    totalTaxableIncome: income,
    leaseDurationYears: d.leaseYears!,
    annualMileageKm: moneyValue(d.mileage)!,
    hasHomeLoanOffset: offsetRate > 0,
    homeLoanOffsetInterestRate: offsetRate,
    vehicleCondition: d.vehicleCondition!,
    usedCarFirstHeldAfterJul2022: d.usedAfter2022 === true,
    usedCarLctNeverPayable: d.usedLctNever === true,
    leaseStartDate: effectiveStartDate(d) ?? undefined,
  };
}

/** Everything typical figures stand in for when there is no quote. Null until the estimate screens are answered. */
export function estimateAssumptions(d: GuidedDraft): Assumption[] | null {
  if (ESTIMATE_STEPS.some((s) => missingForStep(s, d).length > 0)) return null;
  const superAnswered = d.superPreNl === "Yes" || d.superPreNl === "No";
  // Fields the reader answered are not assumptions; the optional refinements below are, until answered.
  const start = effectiveStartDate(d);
  const base = deriveInputsFromSimpleAnswers(estimateAnswers(d))
    .assumptions.filter(
      (a) =>
        a.field !== "vehicleCondition" &&
        a.field !== "homeLoanOffsetInterestRate" &&
        !(superAnswered && a.field === "superFromPreNlIncome"),
    )
    .map((a) =>
      a.field === "leaseStartDate" && start
        ? {
            ...a,
            value:
              d.exploreStart === "after"
                ? `${start} (you said on or after 1 April 2027)`
                : d.exploreStart === "before"
                  ? `${start} (30 days from today; you said before 1 April 2027)`
                  : `${start} (30 days from today)`,
          }
        : a,
    );
  const extra: Assumption[] = [];
  extra.push({
    field: "saveShareAnnual",
    label: "NSW Health employer contribution",
    value: "None",
    tooltip:
      "We assume you are not an NSW Health doctor or nurse. If you are, enter your quote instead, or adjust it in Advanced mode.",
  });
  return [...base, ...extra];
}

function currentCarInputs(d: GuidedDraft): Partial<Inputs> {
  if (!d.compareCurrent) return { compareWithCurrentCar: false };
  const t = typicalCurrentCar(d);
  return {
    compareWithCurrentCar: true,
    currentCarMarketValueNow: moneyValue(d.curValueNow)!,
    currentCarMarketValueAtEnd: currentCarValueAt5Years(d)!,
    currentServiceMaintTyresAnnual: currentCost(d.curService, t.service),
    currentRegistrationAnnual: currentCost(d.curRego, t.rego),
    currentFuelAnnual: currentCost(d.curFuel, t.fuel),
    currentInsuranceAnnual: currentCost(d.curInsurance, t.insurance),
  };
}

function buildEstimateInputs(d: GuidedDraft): Inputs | null {
  if (ESTIMATE_STEPS.some((s) => missingForStep(s, d).length > 0)) return null;
  const seed = deriveInputsFromSimpleAnswers(estimateAnswers(d)).inputs;
  return {
    ...seed,
    superFromPreNlIncome: d.superPreNl === "No" ? "No" : "Yes",
    saveShareAnnual: 0,
    compareWithCarLoan: d.compareLoan === true,
    ...(d.compareLoan
      ? {
          carLoanInitialDeposit: moneyValue(d.loanDeposit)!,
          carLoanInterestRatePct: moneyValue(d.loanRate)!,
          carLoanMonthlyFee: moneyValue(d.loanFee)!,
        }
      : {}),
    ...currentCarInputs(d),
  };
}

// ─── Build engine Inputs ────────────────────────────────────────────────────

/**
 * Builds the full engine `Inputs` from the guided answers, or null while anything required is
 * missing. Starts from Simple mode's derived scenario only for fields the wizard never asks
 * about (comparator starter figures, EV Wh/km, and so on); everything the reader answered overrides it.
 */
export function buildInputs(d: GuidedDraft): Inputs | null {
  if (d.hasQuote === false) return buildEstimateInputs(d);
  const steps: StepId[] = [
    "compare",
    "car",
    "price",
    "lease",
    "payment",
    "running",
    "you",
    "alternatives",
  ];
  if (steps.some((s) => missingForStep(s, d).length > 0)) return null;

  const driveaway = moneyValue(d.driveaway)!;
  const km = moneyValue(d.mileage)!;
  const income = moneyValue(d.income)!;
  const leaseYears = d.leaseYears!;
  const isEv = d.vehicleType === "EV";

  const seed = deriveInputsFromSimpleAnswers({
    vehicleType: d.vehicleType!,
    driveawayCost: driveaway,
    totalTaxableIncome: income,
    leaseDurationYears: leaseYears,
    annualMileageKm: km,
    hasHomeLoanOffset: false,
    homeLoanOffsetInterestRate: 0,
  }).inputs;

  const offsetRate =
    d.cashHome === "offset"
      ? moneyValue(d.offsetRate)!
      : d.cashHome === "savings"
        ? afterTaxSavingsRatePct(moneyValue(d.savingsRatePreTax)!, income)
        : d.cashHome === "invested"
          ? moneyValue(d.investedRate)!
          : 0;
  const annual = (m: Money) => annualOf(d, m)!;

  const merged: Inputs = {
    ...seed,
    vehicleType: d.vehicleType!,
    vehicleCondition: d.vehicleCondition!,
    usedCarFirstHeldAfterJul2022: d.usedAfter2022 === true,
    usedCarLctNeverPayable: d.usedLctNever === true,
    vehicleBaseValue: moneyValue(d.baseValue)!,
    driveawayCost: driveaway,
    estimatedMarketValueAtEnd:
      (asksMarketValueEnd(d) ? marketValueAt5Years(d) : null) ??
      estMarketValueFromDriveaway(driveaway),
    annualMileageKm: km,

    leaseDocFee: moneyValue(d.docFee)!,
    leaseStartDate: d.leaseStartDate,
    leaseDurationYears: leaseYears,
    monthsDeferred: d.monthsDeferred!,

    totalTaxableIncome: income,
    homeLoanOffsetInterestRate: offsetRate,

    luxuryVehicleAdjPerFn: isLuxuryRange(d) ? (moneyValue(d.luxAdj) ?? 0) : 0,
    superFromPreNlIncome: d.superPreNl === "No" ? "No" : "Yes",
    gstSavingPassedOn: d.gstPassedOn === "No" ? "No" : "Yes",

    serviceMaintTyresAnnual: annual(d.service),
    saveShareAnnual: nswAnnual(d),
    registrationAnnual: annual(d.rego),
    electricityAnnual: isEv ? evElectricityClaimAnnual(km) : 0,
    fuelAnnual: isEv ? 0 : annual(d.fuel),
    insuranceAnnual: annual(d.insurance),
    managementFeesAnnual: annual(d.mgmt),
    avgAudPerKwh: isEv ? moneyValue(d.chargingRate)! : seed.avgAudPerKwh,

    compareWithCarLoan: d.compareLoan === true,
    ...(d.compareLoan
      ? {
          carLoanInitialDeposit: moneyValue(d.loanDeposit)!,
          carLoanInterestRatePct: moneyValue(d.loanRate)!,
          carLoanMonthlyFee: moneyValue(d.loanFee)!,
        }
      : {}),
    ...currentCarInputs(d),
  };

  merged.financedAmountForInterestCalcExGst =
    financedAmountExGstFromInputs(merged);
  merged.residualValueExGst = residualExGstEntered(d)!;
  merged.vehicleLeasePerFn = paymentPerFn(d)!;
  return merged;
}
