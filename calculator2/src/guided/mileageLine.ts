/**
 * Where each provider's quote prints the kilometres a year its budgets assume (owner request,
 * 15 Nov 2026). Read off the Reddit quotes in each provider's `sources`. LeasePlan, RemServ, Easi
 * and Custom Fleet print none on the quotes we have, so they get no line. ORIX and Lendly print a
 * total for the whole lease, which is a trap: a reader typing it in as a yearly figure would
 * multiply the running costs.
 */
import type { ProviderId } from "./providerGuide";

export type MileageLine = { text: string; trap?: boolean };

export const MILEAGE_LINE: Partial<Record<ProviderId, MileageLine>> = {
  smartleasing: { text: "Use “Annual kms” under “Fringe benefit tax details”." },
  sgfleet: { text: "Use “Annual distance” under “Your package arrangements”." },
  maxxia: { text: "Use “Estimated annual kilometers”." },
  oly: { text: "Use the figure in “You've estimated you'll drive … km / year”, under “Running costs and servicing”." },
  prosperity: { text: "Use “Annual kms” under “FBT Details”." },
  paywise: { text: "Use “Annual kilometres” under “Lease Information”." },
  flare: { text: "Use “Annual kilometres” under “Calculating your quote”." },
  millarx: { text: "Use “Distance” in the summary at the top, shown in km/yr." },
  kooya: { text: "Use “Kms travelled P/A”." },
  fleetpartners: { text: "Use the figure in “These budgets are based on the … kms you plan to drive every year”." },
  insideedge: { text: "Use “Annual Kilometres” under “Car & lease details” on The Details page." },
  toyotafleet: { text: "Use “Estimated kms per annum”." },
  alliance: { text: "Use “Annual Estimated Kilometres”." },
  remunerator: { text: "Use “Estimated Annual KM”." },
  fingo: { text: "Use “Your nominated annual KM travelled” under “FBT Details”." },
  nla: { text: "Use “Budgeted annual kilometres” under “Annual budgets (including GST)”." },
  driva: { text: "Use “Annual Kilometers” under “Lease Information”." },
  autopia: { text: "Use “annual km” under “vehicle details”." },
  clearlease: { text: "Use “Budgeted Annual KM's” under “Your Details”." },
  orix: {
    text: "“Kilometre Limit” is the total for the whole lease. Divide it by the years: 75,000 over 5 years is 15,000.",
    trap: true,
  },
  leaselab: { text: "Use “Est. Annual Kilometers”." },
  spa: { text: "Use “Annual Estimated Kilometres” (or “Annual Kms budgeted for”)." },
  leaseexpress: { text: "Use “Annual kilometres”." },
  lendly: {
    text: "The running-cost heading shows kilometres for the whole lease, e.g. “(60 mths/100,000 kms)”. Divide by the years: 100,000 over 5 years is 20,000.",
    trap: true,
  },
  simplygreen: { text: "Use “Estimated Annual Kms” under “Fringe Benefits Tax Details”." },
  vehiclesolutions: { text: "Use “annual budget km”." },
};
