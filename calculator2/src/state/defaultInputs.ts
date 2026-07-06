import type { Inputs } from "@engine/types";
import { defaultSimpleModeAnswers, deriveInputsFromSimpleAnswers } from "../assumptions";

/**
 * Advanced-mode default inputs — derived from Simple mode's default answers
 * and its associated assumptions, so an untouched/reset Advanced-mode form
 * shows the same starting point a Simple-mode user with default answers would see.
 */
export const advancedDefaultInputs: Inputs = deriveInputsFromSimpleAnswers(defaultSimpleModeAnswers()).inputs;

/**
 * Same scenario as advancedDefaultInputs, but with the 5 fields Advanced mode's
 * auto-fill effects treat as a "not yet computed" sentinel (residual value,
 * financed amount, estimated market value, EV electricity claim, Non-EV fuel
 * estimate) reset to 0.
 *
 * Use this — not advancedDefaultInputs — as the `defaults` object when merging
 * PARTIAL external data (a decoded share link, a saved quote) over a base
 * scenario. Merging over advancedDefaultInputs directly means a field OMITTED
 * from that external data silently inherits an unrelated real number from
 * today's default scenario, rather than being recognised as "unset" and
 * recomputed for the scenario actually being loaded — this is exactly what
 * caused a shared example link (missing residualValueExGst) to show the
 * calculator's own current default residual instead of the correct one for
 * its own financed amount.
 */
export const sentinelDefaultInputs: Inputs = {
  ...advancedDefaultInputs,
  financedAmountForInterestCalcExGst: 0,
  residualValueExGst: 0,
  estimatedMarketValueAtEnd: 0,
  electricityAnnual: 0,
  fuelAnnual: 0,
};
