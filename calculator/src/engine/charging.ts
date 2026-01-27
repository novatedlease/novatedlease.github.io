import type { Inputs } from "./types";

/**
 * ATO EV home charging shortcut rate (A$ per km).
 */
export const ATO_EV_HOME_CHARGING_RATE_PER_KM = 0.042;

export type ChargingMethod =
  | "override"
  | "kwh_model"
  | "no_estimate"
  | "not_ev";

export type ChargingEstimate = {
  annualChargingExpense: number;
  kwhPerYear: number;
  method: ChargingMethod;
};

function finiteNonNegative(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function computeKwhPerYear(i: Inputs): number {
  const km = finiteNonNegative(i.annualMileageKm) ? i.annualMileageKm : 0;
  const whPerKm = finiteNonNegative(i.avgWhPerKm) ? i.avgWhPerKm : 0;
  if (km > 0 && whPerKm > 0) {
    const kwh = (km * whPerKm) / 1000;
    return Number.isFinite(kwh) && kwh >= 0 ? kwh : 0;
  }
  return 0;
}

/**
 * Single source of truth for annual EV charging expense.
 *
 * Precedence:
 * 1) overrideAnnualChargingExpense (if provided)
 * 2) kWh model (km * Wh/km / 1000 * $/kWh)
 * 3) otherwise return 0 (no estimate)
 *
 * For non-EVs this returns 0.
 */
export function estimateAnnualChargingExpense(i: Inputs): ChargingEstimate {
  const kwhPerYear = computeKwhPerYear(i);

  if (i.vehicleType !== "EV") {
    return { annualChargingExpense: 0, kwhPerYear, method: "not_ev" };
  }

  if (
    i.overrideAnnualChargingExpense !== undefined &&
    i.overrideAnnualChargingExpense !== null
  ) {
    const v = Number(i.overrideAnnualChargingExpense);
    if (Number.isFinite(v) && v >= 0) {
      return { annualChargingExpense: v, kwhPerYear, method: "override" };
    }
  }

  const km = finiteNonNegative(i.annualMileageKm) ? i.annualMileageKm : 0;
  const whPerKm = finiteNonNegative(i.avgWhPerKm) ? i.avgWhPerKm : 0;
  const audPerKwh = finiteNonNegative(i.avgAudPerKwh) ? i.avgAudPerKwh : 0;

  if (km > 0 && whPerKm > 0 && audPerKwh > 0) {
    const kwh = (km * whPerKm) / 1000;
    const cost = kwh * audPerKwh;
    if (Number.isFinite(cost) && cost >= 0) {
      return { annualChargingExpense: cost, kwhPerYear: kwh, method: "kwh_model" };
    }
  }

  return {
    annualChargingExpense: 0,
    kwhPerYear,
    method: "no_estimate",
  };
}


/**
 * Annual amount used for *packaged* EV charging in this calculator.
 *
 * This is intentionally the ATO shortcut claim (4.2c/km) and is used in:
 *  - running costs that are salary packaged (pre-tax)
 *  - FY breakdown modelling
 *
 * It is NOT the user's actual electricity spend.
 */
export function atoChargingClaimAnnual(i: Inputs): number {
  if (i.vehicleType !== "EV") return 0;
  const km = Number.isFinite(i.annualMileageKm) ? Math.max(0, i.annualMileageKm) : 0;
  return km * ATO_EV_HOME_CHARGING_RATE_PER_KM;
}
