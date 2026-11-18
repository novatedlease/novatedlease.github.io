import type { Inputs } from "./types";

/**
 * The yearly insurance the lease's running-cost budget pays during the lease. When the first
 * year's premium is financed (Maxxia, Oly), it is repaid through the lease payment, so one premium
 * spread over the term comes off the budget. Paying cash, and any years after the lease, keep the
 * full `insuranceAnnual`. Every lease-side total must use this, or the financed year is counted
 * twice (Nov 2026: the financial summary missed it, so Guided's take-home line and headline
 * disagreed with Advanced's lease section).
 */
export function leaseInsuranceAnnual(i: Pick<Inputs, "insuranceAnnual" | "insuranceFinancedFirstYear" | "leaseDurationYears">): number {
  return Math.max(0, i.insuranceAnnual - (i.insuranceFinancedFirstYear ?? 0) / Math.max(1, i.leaseDurationYears));
}
