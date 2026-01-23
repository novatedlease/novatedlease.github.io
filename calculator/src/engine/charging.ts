import type { Inputs } from "./types";

/**
 * ATO EV home charging shortcut rate (A$ per km).
 */
export const ATO_EV_HOME_CHARGING_RATE_PER_KM = 0.042;

export type ChargingMethod =
  | "override"
  | "user_annual"
  | "kwh_model"
  | "ato_shortcut"
  | "not_ev";

export type ChargingEstimate = {
  annualChargingExpense: number;
  method: ChargingMethod;
};

function finiteNonNegative(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

/**
 * Single source of truth for annual EV charging expense.
 *
 * Precedence:
 * 1) overrideAnnualChargingExpense (if provided)
 * 2) electricityAnnual (explicit annual input)
 * 3) kWh model (km * Wh/km / 1000 * $/kWh)
 * 4) ATO shortcut (km * 4.2c)
 *
 * For non-EVs this returns 0.
 */
export function estimateAnnualChargingExpense(i: Inputs): ChargingEstimate {
  if (i.vehicleType !== "EV") {
    return { annualChargingExpense: 0, method: "not_ev" };
  }

  if (
    i.overrideAnnualChargingExpense !== undefined &&
    i.overrideAnnualChargingExpense !== null
  ) {
    const v = Number(i.overrideAnnualChargingExpense);
    if (Number.isFinite(v) && v >= 0) {
      return { annualChargingExpense: v, method: "override" };
    }
  }

  // If the user explicitly entered an annual electricity cost, prefer it.
  if (finiteNonNegative(i.electricityAnnual) && i.electricityAnnual > 0) {
    return { annualChargingExpense: i.electricityAnnual, method: "user_annual" };
  }

  const km = finiteNonNegative(i.annualMileageKm) ? i.annualMileageKm : 0;
  const whPerKm = finiteNonNegative(i.avgWhPerKm) ? i.avgWhPerKm : 0;
  const audPerKwh = finiteNonNegative(i.avgAudPerKwh) ? i.avgAudPerKwh : 0;

  if (km > 0 && whPerKm > 0 && audPerKwh > 0) {
    const kwh = (km * whPerKm) / 1000;
    const cost = kwh * audPerKwh;
    if (Number.isFinite(cost) && cost >= 0) {
      return { annualChargingExpense: cost, method: "kwh_model" };
    }
  }

  return {
    annualChargingExpense: km * ATO_EV_HOME_CHARGING_RATE_PER_KM,
    method: "ato_shortcut",
  };
}

export function annualChargingExpense(i: Inputs): number {
  return estimateAnnualChargingExpense(i).annualChargingExpense;
}
