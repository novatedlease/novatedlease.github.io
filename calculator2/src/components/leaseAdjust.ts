/** Smart Leasing / MillarX payment correction: the rules, kept apart from the modal. */
export type Provider = "smart" | "millarx";

/**
 * Months of budget reserve built into the quoted figure. Smart Leasing holds 2. MillarX holds as
 * many as the quote's deferral, 1 or 2 (MillarX quotes from Oct 2026: "$819/mth × 58" on a 60-month
 * lease with "$378 fortnightly" = 819 × 12/26, i.e. 60 months collected for 58 paid).
 */
export function bufferMonthsFor(provider: Provider, millarxDefer: 1 | 2): number {
  return provider === "smart" ? 2 : millarxDefer;
}

/** MillarX's deferral to assume: the reader's own answer when it's 1, otherwise 2 (the usual). */
export function initialMillarxDefer(deferMonths: number | null | undefined): 1 | 2 {
  return deferMonths === 1 ? 1 : 2;
}
