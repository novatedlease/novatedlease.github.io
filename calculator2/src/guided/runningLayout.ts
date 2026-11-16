/**
 * Each provider's running-cost lines in the order its quote prints them, in its own wording
 * (owner decision 15 Nov 2026). Extra lines such as roadside or carbon offset are not listed:
 * readers place those using "Where do other lines on my quote go?". Read off the Reddit quotes
 * in each provider's `sources`; "(+ X)" means the quote prints X as a second line for that box.
 */
import type { ProviderId } from "./providerGuide";

export type RunBox = "service" | "tyres" | "rego" | "insurance" | "mgmt" | "fuel";

/** Guided's own order, used when the provider is unknown and for boxes a quote doesn't have. */
export const DEFAULT_RUN_ORDER: RunBox[] = ["service", "tyres", "rego", "insurance", "mgmt", "fuel"];

/** A label, or for the fuel line { ev, petrol } when the wording differs by vehicle type. */
export type RunLabel = string | { ev: string; petrol: string };

export const RUNNING_LAYOUT: Partial<Record<ProviderId, [RunBox, RunLabel][]>> = {
  // Smart Leasing: 4 quotes.
  smartleasing: [
    ["service", "Maintenance"],
    ["tyres", "Tyres"],
    ["rego", "Registration/CTP"],
    ["insurance", "Insurance"],
    ["fuel", { ev: "Charging budget - 5.47 cents per KM", petrol: "Fuel" }],
    ["mgmt", "Administration fee"],
  ],
  // SG Fleet: 3 quotes.
  sgfleet: [
    ["mgmt", "Package management fee"],
    ["fuel", "Fuel/charging"],
    ["tyres", "Tyres"],
    ["service", "Service and maintenance"],
    ["rego", "Registration"],
    ["insurance", "Insurance"],
  ],
  // Maxxia: 2 quotes.
  maxxia: [
    ["fuel", { ev: "Electricity", petrol: "Fuel" }],
    ["service", "Scheduled servicing"],
    ["tyres", "Replacement tyres"],
    ["rego", "Registration renewal"],
    ["insurance", "Insurance"],
    ["mgmt", "Maxxia novated leasing fee"],
  ],
  // Oly: 1 quote.
  oly: [
    ["fuel", "[Fuel/Charging]"],
    ["service", "Scheduled servicing"],
    ["tyres", "Replacement tyres"],
    ["insurance", "Insurance"],
    ["rego", "Registration"],
    ["mgmt", "Oly novated leasing"],
  ],
  // Prosperity Smart Drive: 1 quote.
  prosperity: [
    ["rego", "Registration / CTP Renewal - Annual"],
    ["insurance", "Insurance"],
    ["fuel", "Fuel / Electricity"],
    ["service", "Service and Maintenance"],
    ["tyres", "Replacement Tyres & Tyre Repairs"],
    ["mgmt", "Smart Drive Administration Fee (+ Salary Packaging Administration Fee)"],
  ],
  // RemServ: 1 quote.
  remserv: [
    ["rego", "Rego"],
    ["service", "Servicing & Incidentals"],
    ["tyres", "Tyres"],
    ["fuel", "Fuel/charging"],
    ["insurance", "Insurance"],
  ],
  // Paywise: 1 quote.
  paywise: [
    ["fuel", "Power"],
    ["tyres", "Tyres"],
    ["rego", "Registration"],
    ["service", "Servicing"],
    ["insurance", "Insurance"],
    ["mgmt", "Lease Management (+ Salary Packaging)"],
  ],
  // Flare: 2 quotes.
  flare: [
    ["fuel", "Charging"],
    ["service", "Service and maintenance"],
    ["tyres", "Tyres"],
    ["rego", "Rego/CTP"],
    ["insurance", "Insurance"],
    ["mgmt", "Management fee"],
  ],
  // Kooya: 2 quotes.
  kooya: [
    ["service", "Service & maintenance"],
    ["tyres", "Tyres"],
    ["fuel", "Fuel / electricity"],
    ["insurance", "Insurance"],
    ["rego", "Rego & CTP"],
    ["mgmt", "Administration fee"],
  ],
  // FleetPartners: 2 quotes.
  fleetpartners: [
    ["fuel", "Charging"],
    ["service", "Maintenance"],
    ["tyres", "Tyres"],
    ["rego", "Registration and CTP"],
    ["insurance", "Insurance"],
    ["mgmt", "Management Fee"],
  ],
  // LeasePlan: 1 quote.
  // Inside Edge: the Basics page of two quotes, checked against a Details page.
  insideedge: [
    ["service", "Maintenance Provision"],
    ["tyres", "Replacement Tyres"],
    ["rego", "Registration / CTP"],
    ["insurance", "Comp Insurance Provision"],
    ["fuel", { ev: "Home Charging Reimbursement", petrol: "Fuel" }],
    ["mgmt", "Finance Documentation (+ Management Fee)"],
  ],
  // LeasePlan: 1 quote.
  leaseplan: [
    ["service", "Maintenance"],
    ["tyres", "Tyres (4)"],
    ["fuel", "Fuel"],
    ["rego", "Registration"],
    ["insurance", "Insurance"],
    ["mgmt", "Management Fees (including FBT Fee)"],
  ],
  // Alliance: 2 quotes.
  alliance: [
    ["service", "Service and Maintenance"],
    ["tyres", "Replacement Tyres"],
    ["rego", "Registration and CTP"],
    ["insurance", "Insurance"],
    ["fuel", { ev: "Electricity", petrol: "Fuel" }],
    ["mgmt", "Management Fee"],
  ],
  // Easi: 1 quote.
  easi: [
    ["fuel", "Electricity"],
    ["rego", "Registration"],
    ["service", "Maintenance"],
    ["tyres", "Tyres"],
    ["insurance", "Insurance"],
    ["mgmt", "Admin Fee"],
  ],
  // Remunerator: 3 quotes.
  remunerator: [
    ["fuel", "Recharging"],
    ["service", "Maintenance"],
    ["rego", "Registration"],
    ["insurance", "Insurance"],
  ],
  // Fingo: 1 quote.
  fingo: [
    ["mgmt", "Management Fee (Fixed)"],
    ["rego", "Rego & CTP Budget"],
    ["insurance", "Insurance"],
    ["service", "Servicing Budget"],
    ["fuel", "Fuel/Charging Budget"],
    ["tyres", "Tyres Budget"],
  ],
  // Novated Lease Australia: 1 quote.
  nla: [
    ["service", "Maintenance (budget)"],
    ["tyres", "Tyres (budget)"],
    ["fuel", "Fuel (budget)"],
    ["insurance", "Insurance"],
    ["rego", "Registration & CTP (budget)"],
    ["mgmt", "Administration (fixed)"],
  ],
  // Driva: 1 quote.
  driva: [
    ["fuel", "Power"],
    ["service", "Service And Maintenance"],
    ["rego", "Registration"],
    ["tyres", "Tyres"],
    ["mgmt", "Lease Management"],
    ["insurance", "Insurance"],
  ],
  // Autopia: 1 quote.
  autopia: [
    ["service", "Maintenance"],
    ["tyres", "Tyres"],
    ["fuel", "Fuel"],
    ["mgmt", "Management fee (+ administration cost)"],
    ["rego", "Registration & ctp"],
    ["insurance", "Insurance"],
  ],
  // Clear Lease: 1 quote.
  clearlease: [
    ["service", "Maintenance"],
    ["rego", "Registration"],
    ["fuel", "Fuel/Electricity"],
    ["tyres", "Tyres"],
    ["insurance", "Insurance"],
    ["mgmt", "Administration"],
  ],
  // Custom Fleet: 1 quote.
  customfleet: [
    ["service", "Servicing & Maintenance"],
    ["tyres", "Replacement Tyres (4)"],
    ["fuel", "Fuel"],
    ["rego", "Registration & CTP Renewal"],
    ["insurance", "Insurance (+ Fire Service Levy, Insurance Stamp Duty)"],
    ["mgmt", "Lease Management Fee (+ Salary Packaging Fee)"],
  ],
  // ORIX: 1 quote.
  orix: [
    ["mgmt", "ORIX management fee"],
    ["service", "Maintenance"],
    ["tyres", "Tyres"],
    ["fuel", { ev: "Energy (EV Charging)", petrol: "Fuel" }],
    ["insurance", "Insurance"],
    ["rego", "Registration renewal"],
  ],
  // LeaseLab: 1 quote.
  leaselab: [
    ["fuel", "Fuel"],
    ["service", "Servicing & Maintenance"],
    ["insurance", "Insurance"],
    ["rego", "Registration"],
    ["tyres", "Tyre Replacement"],
    ["mgmt", "Lease Management"],
  ],
  // SPA: 1 quote.
  spa: [
    ["tyres", "Tyres"],
    ["service", "Maintenance"],
    ["rego", "Registration Renewal"],
    ["insurance", "Insurance"],
    ["fuel", "Fuel and/or Electricity (EV)"],
    ["mgmt", "Administration Fee"],
  ],
  // LeaseExpress: 1 quote.
  leaseexpress: [
    ["rego", "Re-registrations"],
    ["fuel", "Fuel / Electricity"],
    ["tyres", "Tyres (4 tyres)"],
    ["service", "Manufacturer's Schedule Servicing"],
    ["insurance", "Insurance (+ Insurance Uplift)"],
    ["mgmt", "Leasexpress fee"],
  ],
  // Toyota Fleet Management: 1 quote.
  toyotafleet: [
    ["fuel", "EV Reimbursement"],
    ["rego", "Registration (+ CTP Insurance)"],
    ["service", "Maintenance"],
    ["tyres", "Tyres"],
    ["insurance", "Insurance"],
    ["mgmt", "Management"],
  ],
  // Lendly: 1 quote.
  lendly: [
    ["fuel", "EV Charging + At-home Charging"],
    ["insurance", "Insurance"],
    ["rego", "Registration"],
    ["service", "Maintenance"],
    ["tyres", "Tyres"],
    ["mgmt", "Licence Fee"],
  ],
  // Simplygreen: 1 quote.
  simplygreen: [
    ["fuel", "Charging"],
    ["rego", "Annual Registration"],
    ["service", "Maintenance & Repairs"],
    ["tyres", "Tyres"],
    ["insurance", "Insurance"],
    ["mgmt", "Administration Fee"],
  ],
  // Vehicle Solutions: 1 quote.
  vehiclesolutions: [
    ["fuel", "Fuel / charge"],
    ["insurance", "Insurance"],
    ["rego", "Rego & CTP"],
    ["tyres", "Tyres"],
    ["service", "Servicing"],
    ["mgmt", "Administration"],
  ],
};

/** The boxes in the order the reader's quote prints them, then any the quote doesn't have. */
export function runningOrder(provider: ProviderId | null): { box: RunBox; label: RunLabel | null }[] {
  const layout = (provider && RUNNING_LAYOUT[provider]) || [];
  const seen = new Set(layout.map(([box]) => box));
  return [
    ...layout.map(([box, label]) => ({ box, label })),
    ...DEFAULT_RUN_ORDER.filter((box) => !seen.has(box)).map((box) => ({ box, label: null })),
  ];
}

export function runLabelText(label: RunLabel, isEv: boolean): string {
  return typeof label === "string" ? label : isEv ? label.ev : label.petrol;
}
