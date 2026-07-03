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
