import type { Inputs } from "./types";

export const GST_EXEMPT_CAP = 6334;

export function gstSaved(
  i: Pick<Inputs, "vehicleCondition" | "vehicleBaseValue">
): number {
  // Only private sales have no GST component
  const gstEligible = i.vehicleCondition !== "Used – private sale (no GST)";
  if (!gstEligible) return 0;

  // Vehicle dutiable / FBT base value includes GST for new + dealer-used
  return Math.min(GST_EXEMPT_CAP, i.vehicleBaseValue / 11);
}

export const ATO_RESIDUAL_PCT: Record<number, number> = {
  1: 65.63,
  2: 56.25,
  3: 46.88,
  4: 37.5,
  5: 28.13,
};

export function residualPercentForYears(years: number): number {
  const y = Math.round(years);
  return ATO_RESIDUAL_PCT[y] ?? 28.13;
}

export function residualFractionForYears(years: number): number {
  return residualPercentForYears(years) / 100;
}