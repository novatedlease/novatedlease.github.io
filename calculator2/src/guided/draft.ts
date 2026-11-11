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

/**
 * A typed amount as a number. Accepts what people naturally type: "$48,990", "52.4k", "7.5%".
 * Anything else (words, units, a negative) is null; amountProblem says why.
 */
export function parseAmount(text: string): number | null {
  let cleaned = text.replace(/[$,\s]/g, "").replace(/%$/, "");
  let scale = 1;
  if (/^[\d.]+k$/i.test(cleaned)) {
    cleaned = cleaned.slice(0, -1);
    scale = 1000;
  }
  if (cleaned === "") return null;
  const n = Number(cleaned) * scale;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Why a box's text can't be used, in words for the reader; null when it's empty or readable. */
export function amountProblem(text: string): string | null {
  const t = text.trim();
  // A lone "$" or "-" is someone part-way through typing, not a mistake yet.
  if (/^[$\s-]*$/.test(t) || parseAmount(t) !== null) return null;
  if (/^-/.test(t.replace(/^\$/, "")))
    return "This can't be negative. Type the amount without a minus sign.";
  return `We couldn't read “${t}”. Type just the number, without words or units.`;
}

/** A missing-answer label, noting when something was typed but couldn't be read. */
function needs(m: Money, label: string): string {
  return !m.none && amountProblem(m.text) ? `${label} (we couldn't read it)` : label;
}

export function moneyValue(m: Money): number | null {
  if (m.none) return 0;
  return parseAmount(m.text);
}

/** How often a quote shows an amount. Weekly: SG Fleet and LeaseLab weekly-pay quotes; yearly: Remunerator. */
export type Period = "perWeek" | "perFn" | "perMonth" | "perYear";
export type RunningPeriod = Period;
/** How many of each period in a year. */
export const PERIODS_PER_YEAR: Record<Period, number> = { perWeek: 52, perFn: 26, perMonth: 12, perYear: 1 };
/** "week", "fortnight", "month", "year": for "per …" and "a …ly amount" wording. */
export const PERIOD_UNIT: Record<Period, string> = { perWeek: "week", perFn: "fortnight", perMonth: "month", perYear: "year" };
/** An amount in the given period, as per fortnight. */
export function toPerFn(v: number, p: Period): number {
  return (v * PERIODS_PER_YEAR[p]) / 26;
}
/** The answers that are typed amounts. */
type MoneyKey = { [K in keyof GuidedDraft]: GuidedDraft[K] extends Money ? K : never }[keyof GuidedDraft];
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
  /**
   * The km per year answered when the reader typed their own current-car fuel. Their figure is
   * scaled from it if the km changes later (e.g. the "Try different numbers" slider), so both cars
   * pay for the same driving. Null when not typed, or for drafts saved before this existed.
   */
  curFuelBasisKm: number | null;
  curInsurance: Money;

  usedAfter2022: boolean | null;
  usedLctNever: boolean | null;
  leaseStartDate: string;
  /** Estimate path only: roughly when an EV lease would start, either side of the phase-out date. */
  exploreStart: "before" | "after" | null;
  /** Estimate path only: the "Try different numbers" rate slider, in % a year. Null means our default. */
  estimateRatePct: number | null;

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
  paymentPeriod: Period | null;
  /** How the quote labels the finance payment. "unknown" is treated as ex GST and checked against the implied rate. */
  paymentBasis: "exGst" | "incGst" | "unknown" | null;
  payment: Money;
  /** True when the payment came out of the Smart Leasing / MillarX correction tool rather than being typed. */
  paymentCorrected: boolean;
  luxAdj: Money;

  /** What drives the engine: "Yes" = running costs entered ex GST, "No" = inc GST with no credit. */
  gstPassedOn: YesNoUnsure | null;
  /** What the running-cost heading on the quote says. */
  runningGstHeading: "exGst" | "incGst" | "unknown" | null;
  /** Heading inc GST: does the quote take a GST credit off afterwards? */
  runningGstCredit: YesNoUnsure | null;
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
  /**
   * "ipOffset" is an offset against an investment property loan: the interest avoided would have
   * been tax-deductible, so like savings interest it is worth the rate after tax. Both use
   * savingsRatePreTax.
   */
  cashHome: "offset" | "ipOffset" | "savings" | "invested" | "none" | null;
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
    curFuelBasisKm: null,
    curInsurance: emptyMoney(),
    usedAfter2022: null,
    usedLctNever: null,
    leaseStartDate: "",
    exploreStart: null,
    estimateRatePct: null,
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
    runningGstHeading: null,
    runningGstCredit: null,
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
  car: "Tell us about the car",
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
  return p ? PERIODS_PER_YEAR[p] : 1;
}

/** The NSW Health employer share as an annual amount, whatever period the reader entered it in. */
export function nswAnnual(d: GuidedDraft): number {
  if (!d.nswHealth || !positive(d.nswAmount) || !d.nswPeriod) return 0;
  return moneyValue(d.nswAmount)! * runningFactor(d.nswPeriod);
}

/** A running-cost figure as an annual amount, whatever period the reader entered it in. */
/** Inc GST figures with a GST credit taken off later: the cost is really the ex GST amount. */
export function runningCreditTaken(d: GuidedDraft): boolean {
  return d.runningGstHeading === "incGst" && (d.runningGstCredit === "Yes" || d.runningGstCredit === "Unsure");
}

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

/** The GST saving the calculator applies to this car (FBT base value ÷ 11, capped), or null until the base value and condition are known. */
export function gstSavedFromDraft(d: GuidedDraft): number | null {
  const base = moneyValue(d.baseValue);
  if (!base || !d.vehicleCondition) return null;
  return gstSaved({ vehicleCondition: d.vehicleCondition, vehicleBaseValue: base });
}

/**
 * Drive-away price backed out of a quote that doesn't print it. The residual is a percentage of
 * the amount financed for the car, which is the drive-away price less the GST saving:
 *   residual ex GST = (drive-away − GST saving) × residual %
 *   so drive-away   = residual ex GST ÷ residual % + GST saving.
 * Exact for providers that set the residual on that base (e.g. NLA); others use a slightly
 * different base and land within about 1%.
 */
export function driveawayFromResidual(residualExGst: number, residualPct: number, gstSaving: number): number | null {
  if (!(residualExGst > 0) || !(residualPct > 0) || residualPct >= 100 || !(gstSaving >= 0)) return null;
  return residualExGst / (residualPct / 100) + gstSaving;
}

/**
 * For a residual typed in but marked "not sure" on GST: whichever reading lands closer (as a ratio)
 * to the ATO minimum. Quotes almost always use that minimum, so this settles it in practice.
 */
export function guessedResidualBasis(d: GuidedDraft): "exGst" | "incGst" | null {
  const v = moneyValue(d.residual);
  const ato = atoMinimumResidualExGst(d);
  if (d.residualBasis !== "unknown" || !v || !ato) return null;
  const asEx = Math.abs(Math.log(v / ato));
  const asInc = Math.abs(Math.log(v / (1 + GST_RATE) / ato));
  return asInc < asEx ? "incGst" : "exGst";
}

/** The residual's GST basis as used: the reader's answer, or our reading of their figure when unsure. */
export function residualBasisUsed(d: GuidedDraft): "exGst" | "incGst" | null {
  if (d.residualBasis === "exGst" || d.residualBasis === "incGst") return d.residualBasis;
  return guessedResidualBasis(d);
}

export function residualExGstEntered(d: GuidedDraft): number | null {
  const v = moneyValue(d.residual);
  const basis = residualBasisUsed(d);
  if (v !== null && basis) return basis === "incGst" ? v / (1 + GST_RATE) : v;
  if (d.residualBasis === "unknown") return atoMinimumResidualExGst(d);
  return null;
}

/** The finance payment per fortnight, ex GST, as the engine takes it. */
export function paymentPerFn(d: GuidedDraft): number | null {
  const v = moneyValue(d.payment);
  if (v === null || !d.paymentPeriod) return null;
  const perFn = toPerFn(v, d.paymentPeriod);
  return d.paymentBasis === "incGst" ? perFn / (1 + GST_RATE) : perFn;
}

/** The luxury vehicle adjustment per fortnight. It's entered in the same period as the payment. */
export function luxAdjPerFn(d: GuidedDraft): number {
  if (!isLuxuryRange(d)) return 0;
  const v = moneyValue(d.luxAdj) ?? 0;
  return d.paymentPeriod ? toPerFn(v, d.paymentPeriod) : v;
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

/**
 * The current car's yearly fuel at the km currently answered: the typical figure (already per km),
 * or the reader's own figure scaled from the km it was entered at.
 */
export function currentCarFuelAnnual(d: GuidedDraft): number | null {
  if (d.curFuel.estimated) return typicalCurrentCar(d).fuel;
  const typed = moneyValue(d.curFuel);
  if (typed === null) return null;
  const km = moneyValue(d.mileage);
  if (!d.curFuelBasisKm || !km || km === d.curFuelBasisKm) return typed;
  return Math.round(typed * (km / d.curFuelBasisKm));
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
  // These are ex GST. A quote that shows running costs inc GST needs them grossed up to compare.
  const g = d.runningGstHeading === "incGst" ? 1 + GST_RATE : 1;
  const r = (n: number) => Math.round(n * g);
  return {
    service: r(inputs.serviceMaintTyresAnnual),
    rego: r(inputs.registrationAnnual),
    insurance: r(inputs.insuranceAnnual),
    mgmt: r(inputs.managementFeesAnnual),
    fuel: r(inputs.fuelAnnual),
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

/** One unanswered question: its wording as the reader sees it, and the answer it fills in. */
export type MissingItem = { field: keyof GuidedDraft; label: string };

/**
 * What still needs answering on a step (empty means the step is complete). Labels use the
 * question's own wording, so the reader can find it on screen; field lets the screen point to it.
 */
export function missingItems(step: StepId, d: GuidedDraft): MissingItem[] {
  const out: MissingItem[] = [];
  const ask = (field: keyof GuidedDraft, label: string) => out.push({ field, label });
  /** A money box: notes when something was typed but couldn't be read. */
  const askMoney = (field: keyof GuidedDraft & MoneyKey, label: string) => ask(field, needs(d[field], label));
  switch (step) {
    case "intro":
      if (d.hasQuote === null) ask("hasQuote", "Do you have a novated lease quote?");
      break;
    case "quick":
      if (!positive(d.driveaway)) askMoney("driveaway", "Approximate drive-away price");
      if (!d.leaseYears) ask("leaseYears", "Lease term");
      if (!positive(d.mileage)) askMoney("mileage", "Kilometres per year");
      break;
    case "compare":
      if (d.compareLoan === null) ask("compareLoan", "If you didn't lease, what would you do?");
      if (d.compareCurrent === null) ask("compareCurrent", "And your current car?");
      break;
    case "car":
      if (!d.vehicleType) ask("vehicleType", "Vehicle type");
      if (!d.vehicleCondition) ask("vehicleCondition", "Condition");
      if (d.hasQuote !== false && !isIsoDate(d.leaseStartDate)) ask("leaseStartDate", "Lease start date");
      if (needsExploreStart(d) && !d.exploreStart) ask("exploreStart", "When would the lease roughly start?");
      if (needsUsedEvChecks(d)) {
        if (d.usedAfter2022 === null)
          ask("usedAfter2022", "Was the car first held and used on or after 1 July 2022?");
        if (d.usedLctNever === null) ask("usedLctNever", "Has Luxury Car Tax ever been payable on it?");
      }
      break;
    case "price":
      if (!positive(d.baseValue)) askMoney("baseValue", "FBT base value");
      if (!positive(d.driveaway)) askMoney("driveaway", "Drive-away price");
      break;
    case "lease":
      if (!d.leaseYears) ask("leaseYears", "Lease term");
      if (d.monthsDeferred === null) ask("monthsDeferred", "How many months until your first finance payment?");
      if (!answered(d.docFee)) askMoney("docFee", "Documentation fee (or tick “no documentation fee”)");
      if (!positive(d.residual) && d.residualBasis !== "unknown")
        askMoney("residual", "Residual (balloon) value");
      if (!d.residualBasis) ask("residualBasis", "Is the residual including or excluding GST?");
      break;
    case "payment":
      if (!d.paymentPeriod) ask("paymentPeriod", "How does your quote show the payment: per week, fortnight, month or year?");
      if (!d.paymentBasis) ask("paymentBasis", "Does the payment include or exclude GST?");
      if (d.smartMillarx === null) ask("smartMillarx", "Is your lease with Smart Leasing or MillarX?");
      if (!positive(d.payment)) askMoney("payment", "Finance (lease) payment");
      if (isLuxuryRange(d) && !answered(d.luxAdj))
        askMoney("luxAdj", "Luxury vehicle adjustment (or tick “no adjustment”)");
      break;
    case "running":
      if (!positive(d.mileage)) askMoney("mileage", "Kilometres per year");
      if (!d.runningPeriod) ask("runningPeriod", "How are costs shown on your quote?");
      if (!d.runningGstHeading) ask("runningGstHeading", "What does the running-cost heading on your quote say?");
      else if (d.runningGstHeading === "incGst" && d.runningGstCredit === null)
        ask("runningGstCredit", "Anywhere on the quote, is a GST credit taken off the running costs?");
      if (!answered(d.service)) askMoney("service", "Servicing, maintenance and tyres");
      if (!answered(d.rego)) askMoney("rego", "Registration and CTP");
      if (!answered(d.insurance)) askMoney("insurance", "Insurance");
      if (!answered(d.mgmt)) askMoney("mgmt", "Lease management fees");
      // Never $0: a petrol car always costs something to run, and a $0 here would skew the
      // comparison with keeping the current car, whose fuel is counted.
      if (d.vehicleType === "Non-EV" && !positive(d.fuel)) askMoney("fuel", "Fuel");
      if (d.vehicleType === "EV" && !answered(d.chargingRate))
        askMoney("chargingRate", "Electricity price you pay to charge (0 if solar)");
      break;
    case "you":
      if (!positive(d.income)) askMoney("income", "Your annual taxable income");
      if (d.hasQuote !== false && !d.superPreNl) ask("superPreNl", "How does your employer calculate super?");
      if (!d.cashHome) ask("cashHome", "If you were to pay cash for the car, where would the money come from?");
      else if (d.cashHome === "offset" && !answered(d.offsetRate))
        askMoney("offsetRate", "Home loan interest rate");
      else if (d.cashHome === "savings" && !positive(d.savingsRatePreTax))
        askMoney("savingsRatePreTax", "Savings account interest rate");
      else if (d.cashHome === "ipOffset" && !positive(d.savingsRatePreTax))
        askMoney("savingsRatePreTax", "Investment property loan interest rate");
      else if (d.cashHome === "invested" && !answered(d.investedRate))
        askMoney("investedRate", "Assumed return after tax");
      if (d.hasQuote === false) break;
      if (d.nswHealth === null) ask("nswHealth", "Are you a doctor or nurse employed by NSW Health?");
      else if (d.nswHealth) {
        if (!d.nswPeriod) ask("nswPeriod", "Employer share: fortnightly, monthly or yearly figure?");
        if (!positive(d.nswAmount)) askMoney("nswAmount", "Employer share of your tax savings");
      }
      break;
    case "alternatives":
      if (asksMarketValueEnd(d) && d.hasQuote !== false && !marketValueEndEntered(d))
        askMoney("marketValueEnd", "New car: estimated market value at lease end");
      if (d.compareLoan) {
        if (!answered(d.loanDeposit)) askMoney("loanDeposit", "Deposit paid up front (or tick “no deposit”)");
        if (!positive(d.loanRate)) askMoney("loanRate", "Loan interest rate");
        if (!answered(d.loanFee)) askMoney("loanFee", "Loan monthly account fee (or tick “no monthly fee”)");
      }
      if (d.compareCurrent) {
        if (!positive(d.curValueNow)) askMoney("curValueNow", "Market value today");
        if (!currentCarValueEnd(d)) askMoney("curValueEnd", "Market value at the end of the lease");
        if (!answered(d.curService)) askMoney("curService", "Current car: servicing, maintenance and tyres");
        if (!answered(d.curRego)) askMoney("curRego", "Current car: registration and CTP");
        if (!answered(d.curFuel)) askMoney("curFuel", "Current car: fuel or electricity");
        if (!answered(d.curInsurance)) askMoney("curInsurance", "Current car: insurance");
      }
      break;
    default:
      break;
  }
  return out;
}

/** The labels alone, for places that only need to say what's left. */
export function missingForStep(step: StepId, d: GuidedDraft): string[] {
  return missingItems(step, d).map((m) => m.label);
}

// ─── Estimate path (no quote yet) ───────────────────────────────────────────

const ESTIMATE_STEPS: StepId[] = [
  "compare",
  "car",
  "quick",
  "you",
  "alternatives",
];

/** Cash whose return is taxed (savings interest, or deductible interest avoided on an investment loan). */
function isTaxedRate(d: GuidedDraft): boolean {
  return d.cashHome === "savings" || d.cashHome === "ipOffset";
}

function offsetRateFor(d: GuidedDraft, income: number): number {
  return d.cashHome === "offset"
    ? (moneyValue(d.offsetRate) ?? 0)
    : isTaxedRate(d)
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
    effectiveAnnualRate:
      d.estimateRatePct != null ? d.estimateRatePct / 100 : undefined,
  };
}

/** Everything typical figures stand in for when there is no quote. Null until the estimate screens are answered. */
export function estimateAssumptions(d: GuidedDraft): Assumption[] | null {
  if (ESTIMATE_STEPS.some((s) => missingForStep(s, d).length > 0)) return null;
  // Fields the reader answered are not assumptions; the optional refinements below are, until answered.
  const start = effectiveStartDate(d);
  const base = deriveInputsFromSimpleAnswers(estimateAnswers(d))
    .assumptions.filter(
      (a) =>
        a.field !== "vehicleCondition" &&
        a.field !== "homeLoanOffsetInterestRate",
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
    currentFuelAnnual: currentCarFuelAnnual(d) ?? 0,
    currentInsuranceAnnual: currentCost(d.curInsurance, t.insurance),
  };
}

function buildEstimateInputs(d: GuidedDraft): Inputs | null {
  if (ESTIMATE_STEPS.some((s) => missingForStep(s, d).length > 0)) return null;
  const seed = deriveInputsFromSimpleAnswers(estimateAnswers(d)).inputs;
  return {
    ...seed,
    // Not asked when exploring: always the listed assumption, even if a quote-path answer lingers.
    superFromPreNlIncome: "Yes",
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
      : isTaxedRate(d)
        ? afterTaxSavingsRatePct(moneyValue(d.savingsRatePreTax)!, income)
        : d.cashHome === "invested"
          ? moneyValue(d.investedRate)!
          : 0;
  const annual = (m: Money) => annualOf(d, m)!;
  const running = (m: Money) => annual(m) / (runningCreditTaken(d) ? 1 + GST_RATE : 1);

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

    luxuryVehicleAdjPerFn: luxAdjPerFn(d),
    superFromPreNlIncome: d.superPreNl === "No" ? "No" : "Yes",
    gstSavingPassedOn: d.gstPassedOn === "No" ? "No" : "Yes",

    serviceMaintTyresAnnual: running(d.service),
    saveShareAnnual: nswAnnual(d),
    registrationAnnual: running(d.rego),
    electricityAnnual: isEv ? evElectricityClaimAnnual(km) : 0,
    fuelAnnual: isEv ? 0 : running(d.fuel),
    insuranceAnnual: running(d.insurance),
    managementFeesAnnual: running(d.mgmt),
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
