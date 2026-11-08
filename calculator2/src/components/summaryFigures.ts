import type { Inputs } from "@engine/types";
import { computeFinancialSummary } from "../engineAdapter";

/**
 * Every figure the three Summary cards show, so other views (Guided mode's "Try different numbers")
 * can quote the same totals without re-deriving them.
 */
export function summaryFigures(inputs: Inputs, horizon: "five_year" | "lease_end") {
  const s = computeFinancialSummary({ inputs });

  const isLeaseEnd = horizon === "lease_end";
  const years = isLeaseEnd ? s.yearsLease : 5;

  const nlTotalSpent = isLeaseEnd ? s.nlTotalSpentAtLeaseEnd : s.nlTotalSpentAt5;
  const offsetTotalSpent = isLeaseEnd ? s.offsetTotalSpentAtLeaseEnd : s.offsetTotalSpentAt5;
  const loanTotalSpent = isLeaseEnd ? s.loanTotalSpentAtLeaseEnd : s.loanTotalSpentAt5;
  const keepTotalSpent = isLeaseEnd ? s.keepTotalSpentAtLeaseEnd : s.keepTotalSpentAt5;

  const nlInterestTotal = isLeaseEnd ? s.irNl.first : s.irNl.total;
  const cashInterestTotal = isLeaseEnd ? s.irCash.first : s.irCash.total;
  const loanInterestTotal = isLeaseEnd ? s.irLoan.first : s.irLoan.total;
  const keepInterestTotal = isLeaseEnd ? s.irKeep.first : s.irKeep.total;

  const evEndValue = isLeaseEnd ? s.newEvValueAtLeaseEnd : inputs.estimatedMarketValueAtEnd;
  const currentEndValue = isLeaseEnd ? s.currentCarValueAtLeaseEnd : inputs.currentCarMarketValueAtEnd;

  const nlPostLeaseRunning = isLeaseEnd ? 0 : Math.max(0, s.nlTotalSpentAt5 - s.nlTotalSpentAtLeaseEnd);
  const chargingDelta = s.chargingDeltaBenefitOverLease;
  const saleProceedsNow = s.extraCashFromSaleOfOldCar;

  const cashflowSaving = offsetTotalSpent - nlTotalSpent;
  const interestSaving = nlInterestTotal - cashInterestTotal;
  const totalSaving = cashflowSaving + interestSaving;

  const cashflowSavingVsLoan = loanTotalSpent - nlTotalSpent;
  const interestSavingVsLoan = nlInterestTotal - loanInterestTotal;
  const totalSavingVsLoan = cashflowSavingVsLoan + interestSavingVsLoan;

  const assetDelta = evEndValue - currentEndValue;
  const cashDelta = keepTotalSpent - (nlTotalSpent - saleProceedsNow);
  const interestDelta = nlInterestTotal - keepInterestTotal;
  const nlVsKeepSaving = assetDelta + cashDelta + interestDelta;

  return {
    s,
    years,
    nlTotalSpent,
    offsetTotalSpent,
    loanTotalSpent,
    keepTotalSpent,
    nlInterestTotal,
    cashInterestTotal,
    loanInterestTotal,
    keepInterestTotal,
    evEndValue,
    currentEndValue,
    nlPostLeaseRunning,
    chargingDelta,
    saleProceedsNow,
    cashflowSaving,
    interestSaving,
    totalSaving,
    cashflowSavingVsLoan,
    interestSavingVsLoan,
    totalSavingVsLoan,
    assetDelta,
    cashDelta,
    interestDelta,
    nlVsKeepSaving,
  };
}
