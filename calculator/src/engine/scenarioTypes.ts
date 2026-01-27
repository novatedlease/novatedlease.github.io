export type Money = number;

export type ScenarioId =
  | "nl_new_ev"
  | "offset_new_ev"
  | "keep_current_car";

export type ScenarioResult = {
  id: ScenarioId;
  title: string;

  // Key headline numbers
  leaseYears: number;
  fortnightlyCount: number;

  // Cashflow over the horizon (positive = money out)
  cashflowTotal: Money;

  // Residual (0 for non-lease scenarios)
  residualPayable: Money;

  // End asset value (car value at end of horizon)
  endCarValue: Money;

  // Home loan / offset opportunity cost impact over horizon (positive = worse)
  homeLoanInterestImpact: Money;

  // Optional supporting breakdowns (for tabs)
  breakdown?: {
    leasePaymentsTotal?: Money;
    runningCostTotal?: Money;
    driveawayCost?: Money;
    chargingDelta?: Money;
  };

  notes?: string[];
};