/** How the review screen's answers list words each answer: as the reader typed it. */
import { atoMinimumResidualExGst, guessedResidualBasis, moneyValue, type GuidedDraft } from "./draft";

/** Shown, in the muted style, for a question with no answer yet, so a gap never reads as $0. */
export const NOT_ANSWERED = "Not answered";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-12-15" → "15 Dec 2026", the way readers write dates. */
export function longDate(iso: string | null): string | null {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : null;
}

/**
 * The residual as the reader typed it, with the GST answer they gave, so it matches their quote.
 * The ex-GST figure the engine uses stays in the full workings.
 */
export function residualAsTyped(d: GuidedDraft): string | null {
  const v = moneyValue(d.residual);
  if (v && d.residualBasis === "incGst") return `${money(v)} including GST`;
  if (v && d.residualBasis === "exGst") return `${money(v)} excluding GST`;
  if (d.residualBasis !== "unknown") return null;
  const guess = guessedResidualBasis(d);
  if (v && guess)
    return `${money(v)}, GST not stated (we read it as ${guess === "incGst" ? "including" : "excluding"} GST)`;
  const ato = atoMinimumResidualExGst(d);
  return ato ? `Not on your quote: the ATO minimum, ${money(ato)} excluding GST` : null;
}

/** "Petrol/diesel/hybrid, new"; with no type yet, "New (type not answered)". */
export function carText(d: GuidedDraft): string {
  const cond = d.vehicleCondition?.split(" ")[0] ?? null;
  if (!d.vehicleType) return cond ? `${cond} (type not answered)` : NOT_ANSWERED;
  const type = d.vehicleType === "EV" ? "Electric" : "Petrol/diesel/hybrid";
  return cond ? `${type}, ${cond.toLowerCase()}` : `${type} (new or used not answered)`;
}

/** "5 years, first payment after 2 months", naming whichever half is missing. */
export function termText(d: GuidedDraft): string {
  if (!d.leaseYears) return NOT_ANSWERED;
  const years = `${d.leaseYears} year${d.leaseYears > 1 ? "s" : ""}`;
  if (d.monthsDeferred === null) return `${years}, first payment not answered`;
  return `${years}, first payment after ${d.monthsDeferred} month${d.monthsDeferred === 1 ? "" : "s"}`;
}
