// engine/compound.ts

/**
 * Compound interest accrued at the terminal fortnight
 * from a single cashflow occurring at fortnight B.
 *
 * @param principal Amount of cashflow (P)
 * @param annualRatePct Home loan interest rate (e.g. 6 for 6%)
 * @param fortnightIndex Fortnight when cashflow occurs (B, 0-based or 1-based — be consistent)
 * @param terminalFortnight Terminal fortnight (C)
 */
export function compoundInterestToTerminal(opts: {
  principal: number;
  annualRatePct: number;
  fortnightIndex: number;
  terminalFortnight: number;
}): number {
  const { principal, annualRatePct, fortnightIndex, terminalFortnight } = opts;

  if (principal === 0) return 0;

  const n = Math.max(0, terminalFortnight - fortnightIndex);
  if (n === 0) return 0;

  const r = (annualRatePct / 100) / 26;

  return principal * Math.pow(1 + r, n) - principal;
}