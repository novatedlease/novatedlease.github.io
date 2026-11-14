/** How the review screen's answers list words each answer: as the reader typed it. */
import { atoMinimumResidualExGst, guessedResidualBasis, moneyValue, type GuidedDraft } from "./draft";

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
