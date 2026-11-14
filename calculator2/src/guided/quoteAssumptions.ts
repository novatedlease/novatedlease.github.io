/**
 * "What we assumed" on the quote path (UX review 14 Nov 2026, item 14): the "Not sure" answers we
 * filled in, then how the comparison is worked out. Each method line was checked against the
 * engine (calculator/src/engine/tax_au.ts, calculator/src/components/FinancialReport.tsx).
 */
import { guessedResidualBasis, moneyValue, type GuidedDraft } from "./draft";
import { atoMinimumResidualExGst } from "./draft";

export type QuoteAssumption = { group: "unsure" | "method"; label: string; value: string };

const money = (n: number) => `$${Math.round(n).toLocaleString("en-AU")}`;

export function quoteAssumptions(d: GuidedDraft): QuoteAssumption[] {
  const out: QuoteAssumption[] = [];
  const unsure = (label: string, value: string) => out.push({ group: "unsure", label, value });
  const method = (label: string, value: string) => out.push({ group: "method", label, value });

  // ── You chose "Not sure" ──
  if (d.monthsDeferredUnsure) unsure("Months until first payment", "2, the most common");
  if (d.residualBasis === "unknown") {
    const guess = guessedResidualBasis(d);
    const ato = atoMinimumResidualExGst(d);
    if (moneyValue(d.residual) && guess)
      unsure("Residual GST", `Read as ${guess === "incGst" ? "including" : "excluding"} GST, the reading closest to the ATO minimum`);
    else if (ato) unsure("Residual amount", `The ATO minimum, ${money(ato)} excluding GST`);
  }
  if (d.paymentBasis === "unknown") unsure("Payment GST", "Taken as excluding GST, then checked against the interest rate");
  if (d.runningGstHeading === "unknown") unsure("Running costs GST", "Taken as excluding GST");
  if (d.runningGstCredit === "Unsure") unsure("GST credit on running costs", "Taken off, as on most quotes");
  if (d.insuranceFinanced === "Unsure") unsure("First-year insurance", "Not in the amount financed");
  if (d.superPreNl === "Unsure") unsure("Super", "Worked out on your salary before the lease");

  // ── How we work it out ──
  method("Tax", "Legislated rates for each year, a 2% Medicare levy, and the same income every year");
  method(
    "Paying cash: running costs",
    `The same servicing, registration, insurance and ${d.vehicleType === "EV" ? "your real charging cost" : "fuel"} as your quote, with GST added back. No management fees`,
  );
  method("Running costs", "The same each year");
  const rate = (m: GuidedDraft["offsetRate"]) => moneyValue(m);
  if (d.cashHome === "offset" && rate(d.offsetRate) !== null)
    method("Home loan rate", `${rate(d.offsetRate)}% for the whole lease`);
  else if ((d.cashHome === "savings" || d.cashHome === "ipOffset") && rate(d.savingsRatePreTax) !== null)
    method("Interest rate on your cash", `${rate(d.savingsRatePreTax)}% before tax for the whole lease`);
  else if (d.cashHome === "invested" && rate(d.investedRate) !== null)
    method("Investment return", `${rate(d.investedRate)}% after tax for the whole lease`);
  method("Residual", "Paid from your cash at the end, so you own the car outright, as a cash buyer would");
  method("Interest", "Each option's home loan interest is measured against not buying a car at all");
  return out;
}
