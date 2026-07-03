/**
 * Single point of contact for the handful of pure, non-React aggregation
 * functions that still live inside calculator/src/components/*.tsx rather
 * than calculator/src/engine/*.ts. calculator/src/ is read-only from here —
 * see CALCULATOR2_REDESIGN_PROMPT.md §2 for why (v1 must stay byte-identical).
 *
 * computeFinancialSummary is the exact function SummaryView.tsx (v1) calls to
 * produce the net-position numbers — importing it here means v2 renders the
 * same computation, not a re-derivation of it.
 */
export { computeFinancialSummary } from "../../calculator/src/components/FinancialReport";
import { computeFinancialSummary } from "../../calculator/src/components/FinancialReport";

/**
 * v1's headline "net saving" figure (calculator/src/components/SummaryView.tsx,
 * `totalSaving` = cashflowSaving + interestSaving). NOT just the raw cashflow
 * difference between pathways — it also includes the home-loan-offset
 * opportunity-cost term (irNl vs irCash): novated lease payments come out of
 * pre-tax salary, so more cash sits in offset for longer, which reduces home
 * loan interest relative to the cash-purchase pathway. Omitting this term
 * materially understates the real net benefit. See tests/total-saving.test.ts
 * for the regression coverage that caught this being missing initially.
 */
export function computeTotalSaving(opts: {
  summary: ReturnType<typeof computeFinancialSummary>;
  horizon: "at5" | "atLeaseEnd";
}): { cashflowSaving: number; interestSaving: number; totalSaving: number } {
  const { summary: s, horizon } = opts;
  const nlTotal = horizon === "at5" ? s.nlTotalSpentAt5 : s.nlTotalSpentAtLeaseEnd;
  const cashTotal = horizon === "at5" ? s.offsetTotalSpentAt5 : s.offsetTotalSpentAtLeaseEnd;
  const nlInterest = horizon === "at5" ? s.irNl.total : s.irNl.first;
  const cashInterest = horizon === "at5" ? s.irCash.total : s.irCash.first;

  const cashflowSaving = cashTotal - nlTotal;
  const interestSaving = nlInterest - cashInterest;
  return { cashflowSaving, interestSaving, totalSaving: cashflowSaving + interestSaving };
}
