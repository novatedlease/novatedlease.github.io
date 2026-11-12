import type { QuoteKey } from "./QuoteDiagram";

/**
 * Optional "Who is your quote from?" answer and the dated, per-field pointers shown for it.
 * Design: PROVIDER_PICKER_DESIGN_2026-11.md (issue 16). Reviewed providers can show
 * redacted quote-page previews; all customer values and identifying details are removed.
 */
export const PROVIDERS = [
  { id: "smartleasing", label: "Smart Leasing" },
  { id: "sgfleet", label: "SG Fleet" },
  { id: "maxxia", label: "Maxxia" },
  { id: "paywise", label: "Paywise" },
  { id: "smartsalary", label: "Smartsalary (Smart Drive)" },
  { id: "alliance", label: "Alliance Leasing" },
  { id: "autopia", label: "Autopia" },
  { id: "customfleet", label: "Custom Fleet" },
  { id: "driva", label: "Driva" },
  { id: "easi", label: "Easi (EasiFleet)" },
  { id: "fingo", label: "Fingo (Automotive Lease Packaging)" },
  { id: "flare", label: "Flare" },
  { id: "fleetpartners", label: "FleetPartners" },
  { id: "leaseexpress", label: "LeaseExpress" },
  { id: "leaselab", label: "LeaseLab" },
  { id: "leaseplan", label: "LeasePlan / Ayvens" },
  { id: "lendly", label: "Lendly" },
  { id: "millarx", label: "MillarX" },
  { id: "nla", label: "Novated Lease Australia (NLA)" },
  { id: "oly", label: "Oly" },
  { id: "orix", label: "ORIX" },
  { id: "remserv", label: "RemServ" },
  { id: "remunerator", label: "Remunerator" },
  { id: "simplygreen", label: "Simplygreen" },
  { id: "spa", label: "Salary Packaging Australia (S.P.A.)" },
  { id: "toyotafleet", label: "Toyota Fleet Management" },
  { id: "vehiclesolutions", label: "Vehicle Solutions" },
  { id: "other", label: "Other / not listed" },
] as const;

export type ProviderId = (typeof PROVIDERS)[number]["id"];

/** The five providers posted most often (Reddit, 2026), repeated at the top of the list. */
export const POPULAR: ProviderId[] = ["smartleasing", "sgfleet", "maxxia", "paywise", "smartsalary"];

export function providerLabel(id: ProviderId): string {
  return PROVIDERS.find((p) => p.id === id)?.label ?? id;
}

/** True for the two providers whose per-pay figure needs the budget-reserve correction. */
export function isSmartOrMillarx(id: ProviderId | null): boolean {
  return id === "smartleasing" || id === "millarx";
}

/** A provider we know, as opposed to skipping the question or "Other / not listed". */
export function isNamedProvider(id: ProviderId | null): id is ProviderId {
  return id !== null && id !== "other";
}

export type GuideField = QuoteKey | "insurance" | "fees";

export type Pointer = {
  field: GuideField;
  /** One or two short sentences, worded "If you see X, …". Plain text. */
  text: string;
  /** Optional nuance, shown in a tooltip. */
  more?: string;
};

export type ProviderGuide = {
  id: ProviderId;
  /** Month of the newest quote layout these pointers were checked against, "YYYY-MM". */
  seen: string;
  /** Reddit post ids the pointers were checked against. Kept out of the UI. */
  sources: string[];
  pointers: Pointer[];
};

const GUIDES: ProviderGuide[] = [
  {
    id: "sgfleet",
    seen: "2026-11",
    sources: ["1xrc93u", "1xp7rio", "1xoemj6"],
    pointers: [
      {
        field: "payment",
        text: "If you see both “Lease rental” (per pay) and “Monthly lease rental”, either works: choose the matching period. Both are ex GST.",
        more: "“Monthly lease rental (payable as 34 payments)” is the financier's payment. The per-pay figure spreads the same total over the whole term.",
      },
      {
        field: "defer",
        text: "If you see “payable as 34 payments” on a 36-month lease, that's a 2-month deferral (36 − 34).",
      },
      {
        field: "baseValue",
        text: "This SG Fleet sample's first two pages do not show the FBT base value. Look for “FBT Base Value” in a later “Fringe Benefit Tax (FBT)” section. Do not use Vehicle on-road cost for this field.",
        more: "The marked FBT example below is from a different SG Fleet quote layout. If your quote does not show the line, ask SG Fleet for its FBT base value.",
      },
      {
        field: "driveaway",
        text: "On this SG Fleet VSSS quote, use “Vehicle on-road cost (incl. GST)” in the “Lease details” panel for drive-away price. It is marked 2 on page 2.",
        more: "Use the full on-road price. “FBT Base Value” and “Total amount financed” are different figures.",
      },
      {
        field: "luxAdj",
        text: "If you see “Luxury levy” or “Luxury vehicle adjustment”, that's this line.",
      },
      {
        field: "running",
        text: "If your pay is weekly, the package lines are per week. Choose “Per week”.",
      },
    ],
  },
  {
    id: "millarx",
    seen: "2026-10",
    sources: ["1xcd4xa", "1xj7w9y", "1x6ikxh"],
    pointers: [
      {
        field: "defer",
        text: "If you see “$X/mth × 58” on a 60-month lease, that's a 2-month deferral (60 − 58). “× 59” means 1.",
      },
      {
        field: "payment",
        text: "If you see “$X/mth × N”, enter that monthly figure per month: it needs no correction. If you see “Finance + fee”, take the management fee out first.",
        more: "The fortnightly figure is the monthly payment × 12 ÷ 26, collected for the whole term while the financier is paid term − deferral times. The correction tool takes the extra out.",
      },
      {
        field: "docFee",
        text: "If you see “Setup fee” under “What you're financing”, that's this fee.",
      },
      {
        field: "residual",
        text: "If you see “Balloon (ex GST)”, choose Excluding GST.",
      },
    ],
  },
  {
    id: "smartleasing",
    seen: "2026-11",
    sources: ["1xsbbfa", "1xp1cee", "1xocshn"],
    pointers: [
      {
        field: "payment",
        text: "If you see “Lease per month”, enter it per month: it needs no correction. The fortnightly “Lease payment” needs the correction tool.",
        more: "Smart Leasing collects the fortnightly figure as though there were 60 monthly payments while 58 go to the financier.",
      },
      {
        field: "defer",
        text: "If you see “Months deferred”, use that number.",
      },
      {
        field: "residual",
        text: "If you see “Residual ex GST” and “Residual inc GST”, use either and choose the matching answer.",
      },
    ],
  },
  {
    id: "flare",
    seen: "2026-11",
    sources: ["1xrpgvb", "1xptqzg"],
    pointers: [
      {
        field: "driveaway",
        text: "If you see “Vehicle cost — Flare Cars driveaway cost”, don't use it: it has the GST saving taken off. Use “Total on-road price”.",
      },
      {
        field: "payment",
        text: "If you see “Finance” under “Budgeted running costs”, that's the fortnightly payment, ex GST.",
      },
    ],
  },
  {
    id: "oly",
    seen: "2026-11",
    sources: ["1xq2wcg", "1vfxcqr"],
    pointers: [
      {
        field: "driveaway",
        text: "If you see “Oly driveaway price”, don't use it: it has the GST saving taken off. Add the GST back, or use the recommended retail price if it's the full on-road price.",
      },
      {
        field: "insurance",
        text: "If you see “First year Comprehensive Insurance” in the amount financed, still enter the full yearly premium here.",
      },
      {
        field: "docFee",
        text: "If you see “Financier's Establishment fee”, that's this fee.",
      },
    ],
  },
  {
    id: "maxxia",
    seen: "2026-11",
    sources: ["1xt3of3", "1xs8shk"],
    pointers: [
      {
        field: "driveaway",
        text: "If you see “Car price (based on on roads…)”, that's the drive-away price.",
      },
      {
        field: "residual",
        text: "If you see “Total residual value” with no GST label, it's usually including GST.",
        more: "On the Maxxia quotes checked, the residual matched the ATO minimum on the ex-GST price plus GST.",
      },
      {
        field: "insurance",
        text: "If you see “1st year Comprehensive Insurance” in the amount financed, still enter the full yearly premium here.",
      },
      {
        field: "docFee",
        text: "If you see “Financier's Establishment Fee”, that's this fee.",
      },
    ],
  },
  {
    id: "fleetpartners",
    seen: "2026-11",
    sources: ["1xlqzm8", "1x9tvny"],
    pointers: [
      {
        field: "docFee",
        text: "If you see “Lease Establishment Fee” as a monthly amount, enter $0 here and add it to lease management fees. Enter the PPSR fee here.",
      },
      {
        field: "defer",
        text: "If you see “Based on 58 months” on a 60-month lease, that's a 2-month deferral.",
      },
    ],
  },
  {
    id: "leaseplan",
    seen: "2025-08",
    sources: ["1n16kcg"],
    pointers: [
      {
        field: "docFee",
        text: "If you see “Finance Documentation” as a monthly amount, enter $0 here and add it to lease management fees. Enter any “Security Interest” fee here.",
      },
    ],
  },
  {
    id: "alliance",
    seen: "2026-11",
    sources: ["1xocvn9", "1xnlk94", "1so066a"],
    pointers: [
      {
        field: "payment",
        text: "If you see “Total Lease Payment (Finance Payment)”, it includes GST (see footnote 5). The “Finance” line under “Budgeted Running Costs” is the same payment ex GST.",
      },
      {
        field: "defer",
        text: "If you see “based on two month deferred lease structure”, choose 2 months.",
      },
    ],
  },
  {
    id: "remunerator",
    seen: "2026-11",
    sources: ["1xof9wr", "1xb8dca", "1vr8ncr"],
    pointers: [
      {
        field: "payment",
        text: "If you see “Lease Payment (excl GST)” under “Annual Car Expenses”, it's a yearly total: choose “Per year (total)”.",
        more: "The per-fortnight and per-month boxes on the summary are the whole salary deduction, including running costs.",
      },
      {
        field: "defer",
        text: "If you see “Number of Lease Payments: 59” on a 60-month term, that's a 1-month deferral.",
      },
    ],
  },
  {
    id: "easi",
    seen: "2026-11",
    sources: ["1xifopq", "1xqceg2", "1so066a"],
    pointers: [
      {
        field: "payment",
        text: "If you see “Lease Per Month”, check whether it says ex GST or inc GST: Easi quotes vary. Enter it per month.",
        more: "Easi's fortnightly figure is worked out differently on different quote layouts, so the monthly figure is the safer one to use.",
      },
      {
        field: "defer",
        text: "If you see “Months Deferred” or “Number of Installments”, use it: 58 instalments on 60 months means 2.",
      },
    ],
  },
  {
    id: "autopia",
    seen: "2026-11",
    sources: ["1xq2wcg"],
    pointers: [
      {
        field: "baseValue",
        text: "If your Autopia quote has no FBT base value, don't use “base price”: that figure excludes GST. Estimate from the car, options and delivery including GST, before stamp duty and registration.",
      },
      {
        field: "docFee",
        text: "If you see “autopia setup fee”, enter it as the documentation fee.",
      },
    ],
  },
  {
    id: "customfleet",
    seen: "2026-11",
    sources: ["1xp2oq9"],
    pointers: [
      {
        field: "luxAdj",
        text: "If you see “Non-Deductible Depreciation”, that's the luxury vehicle adjustment.",
      },
      {
        field: "fees",
        text: "If you see both “Lease Management Fee” and “Salary Packaging Fee”, include both in lease management fees.",
      },
    ],
  },
  {
    id: "leaselab",
    seen: "2026-11",
    sources: ["1xrv7kd"],
    pointers: [
      {
        field: "payment",
        text: "If your quote shows a weekly lease payment, choose “Per week” and enter it as printed.",
      },
      {
        field: "running",
        text: "If the running costs are shown weekly, choose “Per week” for those too.",
      },
      {
        field: "residual",
        text: "If the residual is labelled ex GST, choose “Excluding GST”.",
      },
    ],
  },
  {
    id: "spa",
    seen: "2026-11",
    sources: ["1xs6pa5"],
    pointers: [
      {
        field: "driveaway",
        text: "If you see “Novated lease purchase price (excluding GST)”, don't use it as the drive-away price. Use the full price including GST and on-road costs.",
      },
      {
        field: "baseValue",
        text: "If you see “Vehicle cost”, don't use it as the FBT base value: on this layout it means the drive-away price.",
      },
      {
        field: "defer",
        text: "If you see “Based on 2-month deferred lease”, choose 2 months deferred.",
      },
    ],
  },
  {
    id: "paywise",
    seen: "2026-11",
    sources: ["1xob46m"],
    pointers: [
      { field: "baseValue", text: "If you see “FBT value”, that's the FBT base value." },
      { field: "payment", text: "If you see “Lease Payment” under “Package Inclusions (ex. GST) – Fortnightly”, enter it per fortnight, excluding GST." },
      { field: "fees", text: "If you see separate “Lease Management” and “Salary Packaging” lines, add both under lease management fees." },
    ],
  },
  {
    id: "smartsalary",
    seen: "2026-11",
    sources: ["1xsj1gj"],
    pointers: [
      { field: "payment", text: "If you see “Lease Payment (Fixed)” under “Motor Vehicle Deductions (inc GST)”, choose Including GST." },
      { field: "running", text: "If the running-cost heading says inc GST and has “Less: Employer Claimed ITC”, choose Including GST, then say your employer claims the GST credit." },
    ],
  },
  {
    id: "driva",
    seen: "2026-08",
    sources: ["1vfxcqr"],
    pointers: [
      { field: "driveaway", text: "If you see both “DriveAway Price” and a lower “Effective novated vehicle price”, use “DriveAway Price” including GST." },
      { field: "residual", text: "If you see “Residual Value (ex. GST)”, choose Excluding GST." },
      { field: "payment", text: "If you see “Lease Payment” under “Budget per payroll ex. GST”, enter it excluding GST and choose the payroll period shown." },
    ],
  },
  {
    id: "fingo",
    seen: "2026-11",
    sources: ["1xs3una"],
    pointers: [
      { field: "driveaway", text: "If you see “Your car price (drive away price when financed)”, it has the GST saving taken off. Use the full “Drive away Price” instead." },
      { field: "defer", text: "If the footnote says the first two payments can be deferred, check whether your quote uses that option before choosing 2 months." },
      { field: "payment", text: "If you see “Finance Repayment (Fixed)” in weekly, fortnightly and monthly columns, enter one figure with its matching period. Check the subtotal for GST." },
    ],
  },
  {
    id: "nla",
    seen: "2026-11",
    sources: ["1xs3una"],
    pointers: [
      { field: "baseValue", text: "If you see “Vehicle base value” in the FBT calculations box, that's the FBT base value." },
      { field: "driveaway", text: "If no drive-away total is printed, add the vehicle price, GST, stamp duty, registration and CTP shown on the quote." },
      { field: "residual", text: "If you see “Residual payment (ex GST)”, choose Excluding GST." },
      { field: "payment", text: "If you see “Lease payment (fixed)” under “Gross fortnightly rental”, enter the lease payment excluding the separate GST line." },
    ],
  },
  {
    id: "toyotafleet",
    seen: "2026-10",
    sources: ["1x9tvny"],
    pointers: [
      { field: "driveaway", text: "If you see “Vehicle price on-road* (incl GST)”, that's the drive-away price." },
      { field: "docFee", text: "If you see “Est. Fee - financed (exc GST)” and a separate PPSR fee, add both as one-off documentation fees." },
      { field: "residual", text: "If you see “Residual Value (excl GST)”, choose Excluding GST." },
      { field: "payment", text: "If you see “Rent” under a monthly “(excl GST)” heading, enter it per month, excluding GST." },
    ],
  },
  {
    id: "leaseexpress",
    seen: "2026-11",
    sources: ["1xo2r3u"],
    pointers: [
      { field: "baseValue", text: "If you see “Value for FBT purposes”, that's the FBT base value." },
      { field: "residual", text: "If “GST on residual” sits beside “Residual value”, the residual figure itself excludes GST." },
      { field: "payment", text: "If you see “Lease payments (fortnightly)” with GST in a separate column, enter the payment excluding that GST column." },
    ],
  },
  {
    id: "orix",
    seen: "2026-11",
    sources: ["1xp2oq9"],
    pointers: [
      { field: "baseValue", text: "If you see “FBT base value (inc GST)”, enter it as printed." },
      { field: "docFee", text: "Check the “Other Fees” footnote for an establishment or non-appointed dealer fee; it may be capitalised into the lease rental." },
      { field: "residual", text: "If you see “Residual value (ex GST)”, choose Excluding GST." },
      { field: "payment", text: "If you see a monthly “Lease Rental”, check its footnote: the quote reviewed states that it excludes GST." },
      { field: "luxAdj", text: "If you see “Luxury vehicle non-deductible”, that's the luxury vehicle adjustment." },
    ],
  },
  {
    id: "remserv",
    seen: "2026-10",
    sources: ["1xdwkvq"],
    pointers: [
      { field: "driveaway", text: "If you see only “RemServ price”, its GST basis is unclear on the quote reviewed. Check the full on-road price before entering it." },
      { field: "residual", text: "If “Residual value” has no GST label, choose “I'm not sure” unless the quote or provider confirms the basis." },
      { field: "payment", text: "If “Finance” has no GST label, check the headings and footnotes; choose “I'm not sure” if it remains unclear." },
      { field: "running", text: "If you see “Servicing & Incidentals” as one line, enter that combined amount under servicing and tyres." },
    ],
  },
  {
    id: "simplygreen",
    seen: "2026-11",
    sources: ["1xngaj3"],
    pointers: [
      { field: "defer", text: "If you see “Months Deferred 2” and “No. of Payments 34” on a 36-month lease, choose 2 months." },
      { field: "payment", text: "If you see “Total Lease Cost” under “Lease/Finance Budget (excluding gst)”, enter that figure excluding GST in the period shown." },
      { field: "running", text: "If you see a “Contingency Budget” or “Car Washes/Incidentals”, check whether you want those budgets included in your comparison." },
    ],
  },
  {
    id: "lendly",
    seen: "2026-10",
    sources: ["1wus9yl"],
    pointers: [
      { field: "driveaway", text: "If you see “Price … Drive Away” beside a lower “Total Price (ex. GST)”, use the drive-away price including GST." },
      { field: "residual", text: "If “Residual Value” has no GST label, check the footnote: the quote reviewed says it includes GST." },
      { field: "fees", text: "If you see a “Licence Fee” in the running-cost budget, include it with lease management fees." },
    ],
  },
  {
    id: "vehiclesolutions",
    seen: "2026-09",
    sources: ["1wothrn"],
    pointers: [
      { field: "defer", text: "If you see “Finance lease 2 MONTHS DEFERRED”, choose 2 months." },
      { field: "residual", text: "If you see “Residual (incl GST)”, choose Including GST." },
      { field: "payment", text: "If the quote shows EXCL GST and INCL GST payment columns side by side, enter either one and choose the matching GST answer." },
    ],
  },
];

const BY_ID = new Map(GUIDES.map((g) => [g.id, g]));

export function guideFor(id: ProviderId | null): ProviderGuide | null {
  return id ? (BY_ID.get(id) ?? null) : null;
}

export function pointersFor(id: ProviderId | null, field: GuideField): Pointer[] {
  return guideFor(id)?.pointers.filter((p) => p.field === field) ?? [];
}

/** "Nov 2026" from "2026-11". */
export function seenLabel(seen: string): string {
  const [y, m] = seen.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[(m ?? 1) - 1]} ${y}`;
}

/** Quote layouts can change; show a caution once the last checked month is over six months old. */
export function guideMayHaveChanged(seen: string, now = new Date()): boolean {
  const [year, month] = seen.split("-").map(Number);
  return now.getFullYear() * 12 + now.getMonth() + 1 - (year * 12 + month) > 6;
}

const TEMPLATE_FIELDS: Partial<Record<ProviderId, GuideField[]>> = {
  sgfleet: ["baseValue", "driveaway", "defer", "docFee", "residual", "payment", "running"],
  smartleasing: ["baseValue", "defer", "residual", "payment", "running"],
  maxxia: ["baseValue", "driveaway", "docFee", "residual", "payment", "insurance", "running"],
  paywise: ["baseValue", "residual", "payment", "fees", "running"],
  smartsalary: ["baseValue", "residual", "payment", "running"],
  easi: ["payment", "defer"],
  flare: ["driveaway", "payment"],
  fleetpartners: ["docFee", "defer"],
  nla: ["baseValue", "driveaway", "residual", "payment"],
  remunerator: ["payment", "defer"],
  toyotafleet: ["driveaway", "docFee", "residual", "payment"],
};

/** Redacted image of a reviewed quote page. The PDF version is linked from the guide. */
export function templateFor(id: ProviderId, field: GuideField): string | null {
  if (id === "sgfleet" && field === "baseValue") return "/assets/images/quote-guide/sgfleet/fbt-example.png";
  if (id === "sgfleet" && field === "driveaway") return "/assets/images/quote-guide/sgfleet/driveaway-example.png";
  return TEMPLATE_FIELDS[id]?.includes(field) ? `/assets/images/quote-guide/${id}/redacted-quote.png` : null;
}
