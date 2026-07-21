import type { Inputs } from "@engine/types";
import {
  financedAmountExGstFromInputs,
  fortnightlyLeaseFromEffectiveAnnualRate,
} from "@engine/effectiveinterest";
import { residualFractionForYears, residualPercentForYears } from "@engine/ato";
import { ATO_EV_HOME_CHARGING_RATE_PER_KM } from "@engine/charging";

/**
 * Market-typical effective interest rate used to derive a plausible fortnightly
 * lease payment when the user doesn't have a real quote. Documented in the
 * calculator's own FAQ as a common market range (8-12% p.a.); 9.5% is the
 * midpoint. Advanced mode lets the user override this via the real payment.
 */
export const ASSUMED_EFFECTIVE_RATE = 0.095;

/**
 * Single source of truth for the EV electricity claim and Non-EV fuel default
 * formulas — used both to build the Simple-mode default scenario here AND by
 * Advanced mode's live auto-fill effects (App.tsx). Deliberately NOT
 * duplicated inline in both places: an earlier bug had the electricity claim
 * default computed via one formula while the live auto-fill used a
 * differently-rounded version of the same formula, which made the claim
 * permanently look "already overridden" and silently disabled the auto-fill.
 * Importing these from one place makes that class of drift impossible.
 */
export function evElectricityClaimAnnual(annualMileageKm: number): number {
  return annualMileageKm * ATO_EV_HOME_CHARGING_RATE_PER_KM;
}

// ~6 L/100km at ~$1.80/L — reflects hybrids' large and growing share of
// novated-lease vehicles (e.g. RAV4 Hybrid ~4.5 L/100km) blended with
// non-hybrid mid-size cars (~6-7 L/100km), rather than a pure-ICE figure.
export function nonEvFuelAnnual(annualMileageKm: number): number {
  return Math.round(annualMileageKm * 0.06 * 1.8);
}

// 5-year market value estimate, same rule-of-thumb the engine interpolates down
// for shorter terms: ~40% of drive-away price. Shared with App.tsx's Advanced-mode
// auto-fill effect for the same reason as the two functions above.
export function estMarketValueFromDriveaway(driveawayCost: number): number {
  return Math.round((driveawayCost * 0.4) / 1000) * 1000;
}

/**
 * Fills in any of Advanced mode's "auto-derivable" fields (residual value,
 * financed amount, estimated market value, EV electricity claim / Non-EV fuel
 * estimate) that are still at their 0 "not yet computed" sentinel, recomputing
 * them from the rest of the given scenario.
 *
 * Used wherever a full Inputs object is built from PARTIAL external data (a
 * share link, a saved quote) merged over some defaults object. Merging over
 * `advancedDefaultInputs` directly would silently carry over that unrelated
 * scenario's own non-zero values for these 5 fields when they're omitted from
 * the external data — merge over `sentinelDefaultInputs` (which zeroes them)
 * first so omitted fields read as "unset", then call this to recompute them
 * for the ACTUAL loaded scenario. App.tsx's own Advanced-mode auto-fill
 * effects do the equivalent job continuously during live editing; this is the
 * one-shot version for import paths that don't go through those effects
 * (e.g. ComparatorView, which computes results directly from merged inputs).
 */
export function resolveAutoFields(inputs: Inputs): Inputs {
  const leaseYears = Math.max(1, Math.min(5, Math.round(inputs.leaseDurationYears)));
  const isEv = inputs.vehicleType === "EV";

  // Matches App.tsx's own residual auto-sync effect: residual is always derived from a
  // freshly-recomputed financed amount (vehicleBaseValue/driveawayCost/condition), not
  // from whatever happens to be stored in financedAmountForInterestCalcExGst — that field
  // is tracked/overridable separately (e.g. for effective-interest back-solving) and isn't
  // guaranteed to match a fresh recompute if the user has customised it independently.
  const freshFinancedAmountExGst = financedAmountExGstFromInputs(inputs);
  const financedAmountForInterestCalcExGst = inputs.financedAmountForInterestCalcExGst || freshFinancedAmountExGst;

  const residualValueExGst =
    inputs.residualValueExGst ||
    Math.max(0, freshFinancedAmountExGst - inputs.leaseDocFee) * residualFractionForYears(leaseYears);

  const estimatedMarketValueAtEnd = inputs.estimatedMarketValueAtEnd || estMarketValueFromDriveaway(inputs.driveawayCost);

  const electricityAnnual = isEv ? inputs.electricityAnnual || evElectricityClaimAnnual(inputs.annualMileageKm) : inputs.electricityAnnual;
  const fuelAnnual = !isEv ? inputs.fuelAnnual || nonEvFuelAnnual(inputs.annualMileageKm) : inputs.fuelAnnual;

  return {
    ...inputs,
    financedAmountForInterestCalcExGst,
    residualValueExGst,
    estimatedMarketValueAtEnd,
    electricityAnnual,
    fuelAnnual,
  };
}

export type SimpleModeAnswers = {
  vehicleType: "EV" | "Non-EV";
  driveawayCost: number;
  totalTaxableIncome: number;
  leaseDurationYears: number;
  annualMileageKm: number;
  hasHomeLoanOffset: boolean;
  homeLoanOffsetInterestRate: number;
};

export function defaultSimpleModeAnswers(): SimpleModeAnswers {
  return {
    vehicleType: "EV",
    driveawayCost: 65000,
    totalTaxableIncome: 110000,
    leaseDurationYears: 5,
    annualMileageKm: 15000,
    hasHomeLoanOffset: true,
    homeLoanOffsetInterestRate: 6.1,
  };
}

export type Assumption = {
  /** Inputs field this assumption sets, for the "edit in Advanced" deep link. */
  field: keyof Inputs;
  label: string;
  value: string;
  /** Underlying logic/reasoning for the assumption, rendered as an info tooltip next to the label. */
  tooltip?: string;
};

export type SimpleModeResult = {
  inputs: Inputs;
  assumptions: Assumption[];
  leaseStartDate: string;
};

function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString("en-AU")}`;
}

function isoDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Derives a full engine Inputs object (plus a human-readable list of the
 * assumptions made) from the small Simple-mode question set. Every derived
 * value flows through the same engine as Advanced mode — there is no
 * separate simplified calculation path.
 */
export function deriveInputsFromSimpleAnswers(answers: SimpleModeAnswers): SimpleModeResult {
  const leaseStartDate = isoDatePlusDays(30);
  const isEv = answers.vehicleType === "EV";
  const leaseYears = Math.max(1, Math.min(5, Math.round(answers.leaseDurationYears)));

  // Vehicle dutiable/FBT base value from drive-away price: drive-away typically
  // includes ~8% on top of the dutiable/base value (stamp duty, rego, dealer/CTP
  // fees). This is a rough heuristic — Advanced mode lets the user enter the
  // real figure from a quote.
  const vehicleBaseValue = Math.round((answers.driveawayCost / 1.08) / 100) * 100;

  // 5-year market value estimate — the engine interpolates this down for shorter terms.
  const estimatedMarketValueAtEnd = estMarketValueFromDriveaway(answers.driveawayCost);

  const leaseDocFee = 450;

  // Running-cost heuristics, scaled by annual km. Deliberately conservative
  // round numbers — flagged to the user as assumptions, not hidden.
  const serviceMaintTyresAnnual = Math.round(
    (isEv ? 500 + answers.annualMileageKm * 0.015 : 700 + answers.annualMileageKm * 0.025) / 10
  ) * 10;
  // Registration doesn't scale meaningfully with vehicle price in the major
  // states (NSW/QLD price it by weight/cylinder count, VIC by risk zone, not
  // value) — a flat estimate is appropriate here, unlike insurance below.
  const registrationAnnual = 900;
  // Comprehensive insurance scales with vehicle price, and EVs carry a
  // documented premium over equivalent-priced ICE/hybrid cars (battery/panel
  // repair costs). Coefficients are a rough fit to 2026 market benchmarks
  // (e.g. ~$1,770/yr for a ~$45k RAV4 Hybrid; ~$3,000-3,500/yr for a
  // $65-75k EV), not a precise regression.
  const insuranceAnnual = Math.round(
    (900 + answers.driveawayCost * (isEv ? 0.022 : 0.013)) / 10
  ) * 10;
  const managementFeesAnnual = 500;

  const avgAudPerKwh = 0.3;
  const avgWhPerKm = 170;
  // The packaged/claimed figure defaults to the ATO EV home-charging shortcut
  // (5.47c/km) — NOT the avgWhPerKm/avgAudPerKwh actual-cost model above, which
  // only estimates the user's real out-of-pocket spend. Mixing the two up here
  // made the claim equal the actual estimate by construction, so "NL:
  // electricity gain/loss" always came out ~$0 regardless of inputs.
  const electricityAnnual = isEv ? evElectricityClaimAnnual(answers.annualMileageKm) : 0;
  const fuelAnnual = isEv ? 0 : nonEvFuelAnnual(answers.annualMileageKm);
  // Actual estimated out-of-pocket electricity spend (kWh model), as opposed
  // to the ATO shortcut-rate figure claimed above — see comment above.
  const actualElectricityAnnual = isEv
    ? Math.round((answers.annualMileageKm * avgWhPerKm) / 1000 * avgAudPerKwh)
    : 0;

  const partialInputs: Omit<Inputs, "financedAmountForInterestCalcExGst" | "residualValueExGst" | "vehicleLeasePerFn"> = {
    vehicleType: answers.vehicleType,
    vehicleCondition: "New",
    usedCarFirstHeldAfterJul2022: false,
    usedCarLctNeverPayable: false,
    vehicleBaseValue,
    driveawayCost: answers.driveawayCost,
    estimatedMarketValueAtEnd,
    annualMileageKm: answers.annualMileageKm,

    leaseDocFee,
    leaseStartDate,
    leaseDurationYears: leaseYears,
    // Assumes a 2-month deferred first payment — common in practice (e.g. EV
    // delivery wait times) — consistent with Advanced mode's default.
    monthsDeferred: 2,

    totalTaxableIncome: answers.totalTaxableIncome,
    homeLoanOffsetInterestRate: answers.hasHomeLoanOffset ? answers.homeLoanOffsetInterestRate : 0,

    luxuryVehicleAdjPerFn: 0,

    superFromPreNlIncome: "Yes",
    gstSavingPassedOn: "Yes",

    serviceMaintTyresAnnual,
    saveShareAnnual: 0,
    registrationAnnual,
    electricityAnnual,
    fuelAnnual,
    insuranceAnnual,
    managementFeesAnnual,

    avgAudPerKwh,
    avgWhPerKm,

    // Starter figures for the optional "compare with X" pathways, matching v1's
    // defaults (calculator/src/App.tsx) — these only apply once the user turns
    // the toggle on, at which point some non-zero starting point is more useful
    // than an all-zero form.
    compareWithCurrentCar: false,
    currentCarMarketValueNow: 25000,
    currentCarMarketValueAtEnd: 14000,
    currentServiceMaintTyresAnnual: 800,
    currentRegistrationAnnual: 900,
    currentFuelAnnual: 2362.5,
    currentInsuranceAnnual: 1000,

    compareWithCarLoan: false,
    carLoanInitialDeposit: 10000,
    carLoanInterestRatePct: 8,
    carLoanMonthlyFee: 25,
  };

  const financedAmountForInterestCalcExGst = financedAmountExGstFromInputs(partialInputs as Inputs);
  const residualValueExGst =
    Math.max(0, financedAmountForInterestCalcExGst - leaseDocFee) * residualFractionForYears(leaseYears);

  const vehicleLeasePerFn = fortnightlyLeaseFromEffectiveAnnualRate({
    financedAmountExGst: financedAmountForInterestCalcExGst,
    residualValueExGst,
    leaseYears,
    deferMonths: 2,
    effectiveAnnualRate: ASSUMED_EFFECTIVE_RATE,
  });

  const inputs: Inputs = {
    ...partialInputs,
    financedAmountForInterestCalcExGst,
    residualValueExGst,
    vehicleLeasePerFn,
  };

  const assumptions: Assumption[] = [
    {
      field: "leaseStartDate",
      label: "Lease start date",
      value: `${leaseStartDate} (30 days from today)`,
      tooltip:
        "A placeholder date, used only to determine which FBT tier/EV phase-out rules apply and how the lease term splits across financial years. Switch to Advanced mode to set your real expected start date.",
    },
    {
      field: "vehicleCondition",
      label: "Vehicle condition",
      value: "Assumed New",
      tooltip:
        "Simple mode assumes you're buying a brand new car. This matters: a used car bought in a private sale isn't GST-registered, so there's no GST credit on the purchase, changing the financed amount; and a used EV only qualifies for the FBT exemption if it was first held and used after 1 July 2022 AND Luxury Car Tax was never payable on it. If you're buying used, switch to Advanced mode and set the real vehicle condition to get an accurate result.",
    },
    {
      field: "vehicleBaseValue",
      label: "Vehicle dutiable / FBT base value",
      value: fmtMoney(vehicleBaseValue),
      tooltip: `Estimated as drive-away price ÷ 1.08: ${fmtMoney(answers.driveawayCost)} ÷ 1.08 ≈ ${fmtMoney(vehicleBaseValue)}, rounded to the nearest $100. Drive-away pricing typically includes about 8% on top of the dutiable/FBT base value for stamp duty, registration, and dealer/CTP fees. This is a rough heuristic — enter the real figure from your quote/invoice in Advanced mode for an exact result.`,
    },
    {
      field: "estimatedMarketValueAtEnd",
      label: "Estimated market value after 5 years",
      value: fmtMoney(estimatedMarketValueAtEnd),
      tooltip: `A simple rule of thumb: cars are assumed to retain roughly 40% of their drive-away price after 5 years: ${fmtMoney(answers.driveawayCost)} × 40% ≈ ${fmtMoney(estimatedMarketValueAtEnd)}, rounded to the nearest $1,000. This 5-year figure is interpolated down for your ${leaseYears}-year term when estimating end-of-lease value elsewhere in the results. Real depreciation varies a lot by make/model and market conditions — check a resale value guide for a more accurate figure.`,
    },
    {
      field: "vehicleLeasePerFn",
      label: `Fortnightly lease payment @ ${(ASSUMED_EFFECTIVE_RATE * 100).toFixed(1)}%`,
      value: `$${vehicleLeasePerFn.toFixed(2)}/fortnight`,
      tooltip:
        `Since you don't have a real quote yet, we have assumed a mid-market effective interest rate of ${(ASSUMED_EFFECTIVE_RATE * 100).toFixed(1)}% p.a. for this simulation — the midpoint of the roughly 8-12% p.a. range that's typical in the current novated lease market. Real quotes can differ meaningfully from this; get an actual quote and enter it in Advanced mode to see your true effective rate.`,
    },
    {
      field: "monthsDeferred",
      label: "Finance payment months deferred",
      value: "2 months",
      tooltip:
        "Novated lease financing is typically structured so your fortnightly salary deductions accumulate for about 2 months before the first monthly remittance is made to the financier, ensuring enough funds have built up to cover it. Interest accrues on the full financed amount during this deferral period before any repayments begin, which increases the fortnightly lease payment above compared to no deferral. Advanced mode lets you change this (e.g. to 0 or 1 month) to match your quote's structure.",
    },
    {
      field: "residualValueExGst",
      label: "Residual value",
      value: fmtMoney(residualValueExGst),
      tooltip: `The ATO sets a minimum allowable residual (balloon) value based on your lease term, as a percentage of the financed amount: ${residualPercentForYears(leaseYears)}% for a ${leaseYears}-year term. ${fmtMoney(Math.max(0, financedAmountForInterestCalcExGst - leaseDocFee))} × ${residualPercentForYears(leaseYears)}% ≈ ${fmtMoney(residualValueExGst)}. Most providers quote at or near this minimum, since a higher residual lowers your ongoing payments.`,
    },
    {
      field: "luxuryVehicleAdjPerFn",
      label: "Luxury vehicle adjustment",
      value: "$0/fortnight (assumed not applicable)",
      tooltip:
        `Assumed $0. This is a separate pre-tax charge some providers add to quotes for vehicles above roughly $69,883, for complex employer-accounting reasons — it's a different concept from Luxury Car Tax (LCT) and is listed separately on some quotes when it applies. ${answers.driveawayCost > 69883 ? "Your drive-away price is above this threshold, so check your real quote for whether this applies to you. " : ""}Advanced mode lets you enter the real per-fortnight figure from your quote.\n\n[Read sgfleet's explainer on the luxury vehicle adjustment](https://www.sgfleet.com/docs/australialibraries/novated/novated-support/7-sgf-oct2024-luxury-vehicle-adjustment.pdf)`,
    },
    {
      field: "leaseDocFee",
      label: "Lease documentation fee",
      value: fmtMoney(leaseDocFee),
      tooltip: "A typical flat administration/establishment fee charged by financiers when setting up a novated lease. Actual fees vary by provider, roughly $0-$600 — check your real quote.",
    },
    {
      field: "serviceMaintTyresAnnual",
      label: "Service / maintenance / tyres",
      value: `${fmtMoney(serviceMaintTyresAnnual)}/year`,
      tooltip: isEv
        ? `Estimated as $500 plus 1.5c per annual km: $500 + (${answers.annualMileageKm.toLocaleString()} km × $0.015/km) ≈ ${fmtMoney(serviceMaintTyresAnnual)}/year, rounded to the nearest $10. EVs are assumed cheaper to service (no oil changes, fewer moving parts) than petrol/diesel/hybrid vehicles. Real costs vary a lot by make and model, especially for luxury or performance vehicles.`
        : `Estimated as $700 plus 2.5c per annual km: $700 + (${answers.annualMileageKm.toLocaleString()} km × $0.025/km) ≈ ${fmtMoney(serviceMaintTyresAnnual)}/year, rounded to the nearest $10. Real costs vary a lot by make and model, especially for luxury or performance vehicles.`,
    },
    {
      field: "registrationAnnual",
      label: "Registration",
      value: `${fmtMoney(registrationAnnual)}/year`,
      tooltip:
        "A flat, Australia-wide rough estimate. Unlike insurance, registration cost is set by your state and is typically based on vehicle weight or engine size/cylinders rather than the car's price, so it doesn't scale with vehicle value. Check your state's transport authority for an exact figure.",
    },
    {
      field: "insuranceAnnual",
      label: "Insurance",
      value: `${fmtMoney(insuranceAnnual)}/year`,
      tooltip: isEv
        ? `Estimated as $900 plus roughly 2.2% of your drive-away price: $900 + (${fmtMoney(answers.driveawayCost)} × 2.2%) ≈ ${fmtMoney(insuranceAnnual)}/year, rounded to the nearest $10. EVs carry a well-documented insurance premium over similarly-priced petrol/hybrid vehicles, due to higher battery and panel repair costs. This is a rough fit to 2026 market benchmarks, not a quote — get a real comprehensive insurance quote to check this.`
        : `Estimated as $900 plus roughly 1.3% of your drive-away price: $900 + (${fmtMoney(answers.driveawayCost)} × 1.3%) ≈ ${fmtMoney(insuranceAnnual)}/year, rounded to the nearest $10 — comprehensive insurance scales with vehicle value. This is a rough fit to 2026 market benchmarks, not a quote — get a real comprehensive insurance quote to check this.`,
    },
    {
      field: "managementFeesAnnual",
      label: "Management fees",
      value: `${fmtMoney(managementFeesAnnual)}/year`,
      tooltip: "A typical flat membership/administration fee charged by novated lease providers for managing your lease and running-cost budget. Varies by provider — check your real quote.",
    },
    ...(isEv
      ? [
          {
            field: "electricityAnnual" as const,
            label: "Electricity (packaged)",
            value: `${fmtMoney(electricityAnnual)}/year`,
            tooltip: `Uses the ATO's EV home-charging shortcut rate (5.47c/km): ${answers.annualMileageKm.toLocaleString()} km × $0.0547/km = ${fmtMoney(electricityAnnual)}/year — the amount you're allowed to claim as a packaged running cost regardless of your actual electricity price. Your actual electricity cost (estimated separately at an assumed ${avgWhPerKm} Wh/km and $${avgAudPerKwh.toFixed(2)}/kWh) may differ from this claimable amount — Advanced mode lets you compare the two.\n\n[Read more about the ATO EV home-charging shortcut](https://novatedlease.guide/running-costs/ev-home-charging-shortcut/)`,
          },
          {
            field: "avgWhPerKm" as const,
            label: "Electricity (actual)",
            value: `${fmtMoney(actualElectricityAnnual)}/year`,
            tooltip: `Estimated real out-of-pocket cost using a kWh model, at an assumed ${avgWhPerKm} Wh/km efficiency and $${avgAudPerKwh.toFixed(2)}/kWh electricity price: ${answers.annualMileageKm.toLocaleString()} km × ${avgWhPerKm} Wh/km ÷ 1,000 = ${((answers.annualMileageKm * avgWhPerKm) / 1000).toFixed(0)} kWh/year; ${((answers.annualMileageKm * avgWhPerKm) / 1000).toFixed(0)} kWh × $${avgAudPerKwh.toFixed(2)}/kWh ≈ ${fmtMoney(actualElectricityAnnual)}/year. This is separate from the ATO shortcut-rate claim above, which is a fixed packaged allowance rather than your real spend — the two can differ. Advanced mode lets you override the Wh/km efficiency and electricity price.\n\n[Read more about the ATO EV home-charging shortcut](https://novatedlease.guide/running-costs/ev-home-charging-shortcut/)`,
          },
        ]
      : [
          {
            field: "fuelAnnual" as const,
            label: "Fuel",
            value: `${fmtMoney(fuelAnnual)}/year`,
            tooltip: `Assumes roughly 6 L/100km at $1.80/L: (${answers.annualMileageKm.toLocaleString()} km ÷ 100 × 6 L) × $1.80/L ≈ ${fmtMoney(fuelAnnual)}/year. This blend reflects that hybrids (increasingly common in novated leases — e.g. a RAV4 Hybrid manages ~4.5 L/100km) now make up a large share of the market, blended with less efficient non-hybrid mid-size vehicles (~6-7 L/100km). Your actual fuel cost depends heavily on your specific vehicle and driving style.`,
          },
        ]),
    {
      field: "superFromPreNlIncome",
      label: "Super Guarantee basis",
      value: "Assumed calculated on pre-NL income (most common)",
      tooltip:
        "In the large majority of workplaces, Super Guarantee (SG) is calculated on your salary BEFORE the novated lease deduction, so your super isn't reduced by packaging a car. In roughly 1 in 10 workplaces, SG is calculated on the post-deduction amount instead, which does reduce it — check with payroll to confirm which applies to you.\n\n[Read more about how novated leases affect your Super Guarantee](https://novatedlease.guide/special-and-policy/super-guarantee/)",
    },
    {
      field: "gstSavingPassedOn",
      label: "GST saving",
      value: "Assumed passed on by your provider",
      tooltip:
        "Most novated lease providers pass the GST saving on vehicle running costs through to you. A minority of employers (Victorian public hospitals in particular) do not pass this saving on — check your employer/provider's policy.\n\n[Read more about what happens if the GST saving isn't passed on](https://novatedlease.guide/running-costs/failure-to-pass-gst-saving/)",
    },
  ];

  return { inputs, assumptions, leaseStartDate };
}
