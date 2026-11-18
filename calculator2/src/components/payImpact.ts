import { computeDerived } from "@engine/derived";
import type { Inputs } from "@engine/types";
import { computeFinancialSummary } from "../engineAdapter";

/** Super guarantee rate used by the Advanced super section (SG.tsx). */
export const SG_RATE = 0.12;

/**
 * Folds the luxury vehicle adjustment into the lease payment, as Advanced does before its FY
 * breakdown, so super figures match the take-home impact.
 */
export function withLvFolded(inputs: Inputs): Inputs {
  return { ...inputs, vehicleLeasePerFn: inputs.vehicleLeasePerFn + inputs.luxuryVehicleAdjPerFn };
}

/**
 * The lease's average take-home pay reduction per fortnight: finance and running costs after
 * tax, the figure quotes lead with. The same total as "Lease: payments incl. running costs".
 */
export function takeHomeReductionPerFn(inputs: Inputs): number | null {
  const fortnights = Math.round(inputs.leaseDurationYears * 26);
  if (!(fortnights > 0)) return null;
  const total = computeFinancialSummary({ inputs }).leasePaymentsOverLease;
  return Number.isFinite(total) && total > 0 ? total / fortnights : null;
}

/**
 * Super guarantee lost over the lease when the employer works super out on the salary after the
 * lease; 0 when it's on the salary before it. As in Advanced's super section.
 */
export function superShortfallOverLease(inputs: Inputs): number {
  if (inputs.superFromPreNlIncome !== "No") return 0;
  const rows = computeDerived(withLvFolded(inputs)).sgRows;
  return rows.reduce((sum, r) => sum + r.reducedPretaxIncome, 0) * SG_RATE;
}
