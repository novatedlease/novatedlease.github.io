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
  /** The field isn't on the provider's example, so there's no picture to show. */
  notShown?: boolean;
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
        text: "Use “Lease rental” (per pay), ex GST, with your pay period. Don't use “Monthly lease rental (payable as 34 payments)”: it's paid fewer times than the lease has months, so it would overstate your rate.",
        more: "The per-pay “Lease rental” spreads the same total over the whole lease, which is how the calculator reads every payment.",
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
      { field: "driveaway", text: "Use “DRIVE AWAY” on the MillarX cover, marked 2 in the example. “On-road price” under What you’re financing is another label to check." },
      {
        field: "defer",
        text: "If you see “$X/mth × 58” on a 60-month lease, that's a 2-month deferral (60 − 58). “× 59” means 1.",
      },
      {
        field: "payment",
        text: "Use the fortnightly payment and run it through the correction tool. “$X/mth × N” also works: choose Per month and correct it the same way. If you see “Finance + fee”, take the management fee out first.",
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
    sources: ["1xsbbfa", "1xp1cee", "1xocshn", "1xs7vho"],
    pointers: [
      {
        field: "driveaway",
        text: "The two available Smart Leasing pages do not print a drive-away total. Use the dealer's full on-road price including GST, or use “Not on your quote? Work it out from the residual” below.",
        more: "Do not substitute FBT base value, a GST saving or a lease payment.",
      },
      {
        field: "payment",
        text: "Use the fortnightly “Lease payment” or “Lease per month”, then the correction tool. Both need it.",
        more: "Smart Leasing collects the fortnightly figure as though there were 60 monthly payments while 58 go to the financier.",
      },
      {
        field: "defer",
        text: "If you see “Months deferred”, use that number.",
      },
      {
        field: "docFee",
        text: "Look in the small print on Smart Leasing's terms page for “documentation fee”, marked 5 in this separate quote example. If it says including GST, divide by 1.1 to enter the ex-GST amount here.",
        more: "The same clause states the total amount financed. That is different from the drive-away price and should not be entered in the price field.",
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
        text: "On this Oly example, “Oly driveaway price” has the GST saving taken off. Use the dealer's full on-road price including GST. The marked “Recommended retail price” works only if it includes all on-road charges on your quote.",
      },
      {
        field: "insurance",
        text: "If you see “First year Comprehensive Insurance” in the amount financed, still enter the full yearly premium here.",
      },
      {
        field: "docFee",
        text: "If you see “Financier's Establishment fee”, that's this fee.",
      },
      {
        field: "residual",
        text: "If you see “Your total residual value (after lease term)” near the end of the estimate, it includes GST: choose Including GST.",
        more: "On the Oly estimate checked, it equalled the ATO minimum on Oly's ex-GST price, plus GST.",
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
      { field: "driveaway", text: "Use “Drive-away total” in the Total column, marked 2 on the FleetPartners example. Enter the amount including GST." },
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
      { field: "driveaway", text: "This older LeasePlan example does not show a clearly labelled drive-away total. Ask for the full on-road price including GST; do not assume the vehicle subtotal includes stamp duty and registration. The residual helper below won't work here, because this example doesn't print a residual." },
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
      { field: "driveaway", text: "Use “Total Drive Away Price (Inc GST)” in Purchase Details. It is marked 2 on the Alliance example; do not use Total Amount Financed." },
      {
        field: "payment",
        text: "If you see “Total Lease Payment (Finance Payment)”, it includes GST (see footnote 5). The “Finance” line under “Budgeted Running Costs” is the same payment ex GST.",
      },
      {
        field: "defer",
        text: "If you see “based on two month deferred lease structure”, choose 2 months.",
      },
      {
        field: "docFee",
        text: "If you see “Entry Fee” under “Novated Lease Fees” on page 2, that's this fee.",
        more: "The same page lists the administration and management fees (enter those under lease management fees) and a vehicle price breakdown ending in the drive-away price.",
      },
    ],
  },
  {
    id: "remunerator",
    seen: "2026-11",
    sources: ["1xof9wr", "1xb8dca", "1vr8ncr"],
    pointers: [
      { field: "driveaway", text: "The Remunerator example marks “Vehicle Purchase Price” as 2. Confirm it is the full on-road amount including GST before using it; if not, ask for the dealer’s drive-away total." },
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
      { field: "driveaway", text: "Use “Drive Away Price” on the Easi quote, marked 2 on the example. Enter the full price including GST." },
      {
        field: "payment",
        text: "Use the fortnightly lease figure, with the GST basis shown on your quote. “Lease Per Month” is paid fewer times than the lease has months (see “Number of Installments”), so it would make the rate look higher.",
        more: "On some Easi layouts the fortnightly figure is the monthly × 12 ÷ 26. If yours is, the rate may still look slightly high; ask Easi how many times it is deducted.",
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
      { field: "driveaway", text: "Use “total onroad cost” in vehicle details for the drive-away price. Confirm your quote includes GST in that figure." },
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
      { field: "driveaway", text: "Use “Total on road cost (incl. GST)” near the top of My Lease Package. It is marked 2 on the Custom Fleet example." },
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
        field: "driveaway",
        text: "This LeaseLab example does not print a drive-away total. Add “GST Saved on Car Price” to “Novated Vehicle Price” to get it, or use the dealer’s full on-road price including GST.",
        more: "On the quote checked, Novated Vehicle Price × 28.13% equalled the printed ex-GST residual, so it is the drive-away price without the car's GST.",
      },
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
      { field: "driveaway", text: "The Paywise example does not print a drive-away total. Use the dealer’s full on-road price including GST, or the residual-based helper below if you do not have it." },
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
      { field: "driveaway", text: "The Smartsalary Smart Drive example does not print a drive-away total. Use the dealer’s full on-road price including GST, or the residual-based helper below if you do not have it." },
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
      {
        field: "defer",
        text: "Toyota Fleet's schedule doesn't state a deferral. On the quote checked, the printed rate matched payments starting straight away: choose “Straight away” unless Toyota Fleet tells you otherwise.",
      },
    ],
  },
  {
    id: "leaseexpress",
    seen: "2026-11",
    sources: ["1xo2r3u"],
    pointers: [
      { field: "driveaway", text: "This LeaseExpress example does not print a drive-away total. “Vehicle finance amount” is not that price; use the dealer’s full on-road price including GST or the helper below." },
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
      { field: "driveaway", text: "The ORIX example has no drive-away total: it lists vehicle price, options, stamp duty and initial registration separately. Ask ORIX or the dealer for the full on-road price including GST, or use “Work it out from the residual” below." },
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
      { field: "driveaway", text: "Use “Vehicle Cost” above GST Credit and Financed Amount. On this Simplygreen layout it is the full price including GST, marked 2." },
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
      { field: "driveaway", text: "Use “Driveaway price” in Vehicle & lease, marked 2 on the Vehicle Solutions example. Enter the full amount including GST." },
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

/**
 * Fields the reviewed example for a provider doesn't print. Guided says so, with what to do,
 * rather than saying nothing. Checked against each provider's numbered example (Nov 2026).
 */
const NOT_SHOWN: Partial<Record<ProviderId, GuideField[]>> = {
  millarx: ["baseValue", "running", "fees"],
  flare: ["defer", "docFee"],
  oly: ["baseValue", "defer", "fees"],
  maxxia: ["defer"],
  fleetpartners: ["baseValue"],
  leaseplan: ["defer", "residual"],
  remunerator: ["docFee", "fees"],
  easi: ["docFee"],
  autopia: ["defer"],
  customfleet: ["defer", "docFee"],
  leaselab: ["defer", "docFee"],
  spa: ["docFee"],
  paywise: ["defer", "docFee"],
  smartsalary: ["defer", "docFee"],
  driva: ["defer", "docFee"],
  fingo: ["docFee"],
  nla: ["defer", "docFee"],
  leaseexpress: ["defer", "docFee"],
  orix: ["defer"],
  remserv: ["baseValue", "defer", "docFee", "fees"],
  simplygreen: ["docFee"],
  lendly: ["baseValue", "defer", "docFee"],
  vehiclesolutions: ["docFee"],
};

/** Provider-specific wording where the generic "not shown" line would be wrong or unhelpful. */
const NOT_SHOWN_TEXT: Partial<Record<ProviderId, Partial<Record<GuideField, string>>>> = {
  fleetpartners: {
    baseValue:
      "FleetPartners doesn't label the FBT base value. Use the Total column of the “Vehicle” line in “Your order”: the car after discount, with options and delivery, including GST, before on-road costs.",
  },
  millarx: {
    running: "MillarX quotes are finance only. Take the running-cost budgets from your salary packager.",
    fees: "The MillarX BYO finance quote has no fees. Older MillarX quotes show a management fee per month; enter that here if yours does.",
  },
  remunerator: {
    fees: "Remunerator's summary has no fee line and says management fees are included in its figures. Leave this at $0 unless your quote lists one.",
  },
};

function notShownText(id: ProviderId, field: GuideField): string | null {
  const special = NOT_SHOWN_TEXT[id]?.[field];
  if (special) return special;
  const p = providerLabel(id);
  switch (field) {
    case "baseValue":
      return `The ${p} example checked doesn't print the FBT base value. Ask ${p}, or add up the car, options and delivery, including GST.`;
    case "defer":
      return `The ${p} example checked doesn't say how many months are deferred. Choose “Not sure” (we'll assume 2) unless ${p} tells you.`;
    case "docFee":
      return `The ${p} example checked shows no documentation or establishment fee. Leave this at $0 unless your quote lists one.`;
    case "residual":
      return `This ${p} example doesn't print a residual. Choose “I'm not sure” and we'll use the ATO minimum.`;
    case "fees":
      return `The ${p} example checked shows no management fee. Leave this at $0 unless your quote lists one.`;
    default:
      return null;
  }
}

export function pointersFor(id: ProviderId | null, field: GuideField): Pointer[] {
  const listed = guideFor(id)?.pointers.filter((p) => p.field === field) ?? [];
  if (listed.length > 0 || !id || !NOT_SHOWN[id]?.includes(field)) return listed;
  const text = notShownText(id, field);
  return text ? [{ field, text, notShown: true }] : [];
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
  alliance: ["baseValue", "driveaway", "term", "defer", "residual", "payment", "running", "fees"],
  autopia: ["driveaway", "term", "docFee", "residual", "payment", "luxAdj", "running", "fees"],
  customfleet: ["baseValue", "driveaway", "residual", "payment", "luxAdj", "running", "fees"],
  driva: ["baseValue", "driveaway", "term", "residual", "payment", "luxAdj", "running", "fees"],
  fingo: ["baseValue", "driveaway", "term", "defer", "residual", "payment", "running", "fees"],
  leaseexpress: ["baseValue", "term", "residual", "payment", "running", "fees"],
  leaselab: ["baseValue", "term", "residual", "payment", "running", "fees"],
  leaseplan: ["baseValue", "docFee", "payment", "running", "fees"],
  lendly: ["driveaway", "term", "residual", "payment", "luxAdj", "running", "fees"],
  millarx: ["driveaway", "term", "defer", "docFee", "residual", "payment"],
  oly: ["driveaway", "term", "docFee", "payment", "running"],
  orix: ["term", "docFee", "residual", "payment", "luxAdj", "running", "fees"],
  remserv: ["term", "residual", "payment", "running"],
  simplygreen: ["baseValue", "driveaway", "term", "defer", "residual", "payment", "running", "fees"],
  spa: ["baseValue", "driveaway", "term", "defer", "residual", "payment", "running", "fees"],
  vehiclesolutions: ["baseValue", "driveaway", "term", "defer", "residual", "payment", "running", "fees"],
  sgfleet: ["baseValue", "driveaway", "defer", "docFee", "residual", "payment", "running"],
  smartleasing: ["baseValue", "driveaway", "defer", "docFee", "residual", "payment", "running"],
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

/**
 * Focused crops of the redacted pages: just the marked line(s) for one Guided field, so readers
 * don't have to scroll a whole page. Insurance uses the running-costs crop.
 */
const FIELD_CROPS: Partial<Record<ProviderId, GuideField[]>> = {
  alliance: ["baseValue", "driveaway", "term", "defer", "residual", "payment", "running", "fees"],
  autopia: ["driveaway", "term", "docFee", "residual", "payment", "luxAdj", "running", "fees"],
  customfleet: ["baseValue", "driveaway", "residual", "payment", "luxAdj", "running", "fees"],
  driva: ["baseValue", "driveaway", "term", "residual", "payment", "luxAdj", "running", "fees"],
  fingo: ["baseValue", "driveaway", "term", "defer", "residual", "payment", "running", "fees"],
  leaseexpress: ["baseValue", "term", "residual", "payment", "running", "fees"],
  leaselab: ["baseValue", "term", "residual", "payment", "running", "fees"],
  leaseplan: ["baseValue", "docFee", "payment", "running", "fees"],
  lendly: ["driveaway", "term", "residual", "payment", "luxAdj", "running", "fees"],
  millarx: ["driveaway", "term", "defer", "docFee", "residual", "payment"],
  oly: ["driveaway", "term", "docFee", "payment", "running"],
  orix: ["term", "docFee", "residual", "payment", "luxAdj", "running", "fees"],
  remserv: ["term", "residual", "payment", "running"],
  simplygreen: ["baseValue", "driveaway", "term", "defer", "residual", "payment", "running", "fees"],
  spa: ["baseValue", "driveaway", "term", "defer", "residual", "payment", "running", "fees"],
  vehiclesolutions: ["baseValue", "driveaway", "term", "defer", "residual", "payment", "running", "fees"],
  easi: ["baseValue", "defer", "driveaway", "fees", "luxAdj", "payment", "residual", "running", "term"],
  flare: ["baseValue", "driveaway", "fees", "luxAdj", "payment", "residual", "running", "term"],
  fleetpartners: ["defer", "docFee", "driveaway", "fees", "payment", "residual", "running"],
  maxxia: ["baseValue", "docFee", "driveaway", "fees", "payment", "residual", "running", "term"],
  nla: ["baseValue", "driveaway", "fees", "payment", "residual", "running", "term"],
  paywise: ["baseValue", "fees", "payment", "residual", "running", "term"],
  remunerator: ["baseValue", "defer", "driveaway", "payment", "residual", "running", "term"],
  sgfleet: ["defer", "docFee", "fees", "payment", "residual", "running", "term"],
  smartleasing: ["baseValue", "defer", "fees", "payment", "residual", "running", "term"],
  smartsalary: ["baseValue", "fees", "payment", "residual", "running", "term"],
  toyotafleet: ["baseValue", "docFee", "driveaway", "fees", "luxAdj", "payment", "residual", "running", "term"],
};

/** The whole redacted quote page for a provider, if one was reviewed. */
export function pageFor(id: ProviderId): string | null {
  return TEMPLATE_FIELDS[id] ? `/assets/images/quote-guide/${id}/redacted-quote.png` : null;
}

/** A focused crop of the marked line(s) for this field, if one exists. */
export function cropFor(id: ProviderId, field: GuideField): string | null {
  const f = field === "insurance" ? "running" : field;
  return FIELD_CROPS[id]?.includes(f) ? `/assets/images/quote-guide/${id}/field-${f}.webp` : null;
}

export type FieldExample = {
  image: string;
  /** Button label before the example is opened. */
  button: string;
  alt: string;
  caption: string;
  /** PDF of the page the example comes from. */
  pdf: string;
};

/** Marked examples from a page other than the provider's main sample. */
const FIELD_EXAMPLES: { id: ProviderId; field: GuideField; example: FieldExample }[] = [
  {
    id: "oly",
    field: "residual",
    example: {
      image: "/assets/images/quote-guide/oly/residual-example.png",
      button: "Show where Oly prints the residual",
      alt: "End of a redacted Oly estimate with Your total residual value marked 6",
      caption: "The last section of the same Oly estimate. Figures were removed; the residual line is marked 6.",
      pdf: "/assets/images/quote-guide/oly/residual-example.pdf",
    },
  },
  {
    id: "alliance",
    field: "docFee",
    example: {
      image: "/assets/images/quote-guide/alliance/page2-fees.png",
      button: "Show Alliance's fees page",
      alt: "Redacted page 2 of an Alliance Leasing quote with Entry Fee marked 5",
      caption: "Fees and lease details from page 2 of the same Alliance quote. Figures and customer details were removed; Entry Fee is marked 5.",
      pdf: "/assets/images/quote-guide/alliance/page2-example.pdf",
    },
  },
];

export function exampleFor(id: ProviderId, field: GuideField): FieldExample | null {
  return FIELD_EXAMPLES.find((e) => e.id === id && e.field === field)?.example ?? null;
}

/** Redacted image to show for a field: SG Fleet's focused examples, else a crop, else the whole page. */
export function templateFor(id: ProviderId, field: GuideField): string | null {
  const example = exampleFor(id, field);
  if (example) return example.image;
  if (id === "sgfleet" && field === "baseValue") return "/assets/images/quote-guide/sgfleet/fbt-example.png";
  if (id === "sgfleet" && field === "driveaway") return "/assets/images/quote-guide/sgfleet/driveaway-example.png";
  if (id === "smartleasing" && field === "docFee") return "/assets/images/quote-guide/smartleasing/terms-example.png";
  return cropFor(id, field) ?? (TEMPLATE_FIELDS[id]?.includes(field) ? pageFor(id) : null);
}

/** PDF to open alongside an image: crops link to the whole page's PDF. */
export function pdfFor(id: ProviderId, image: string): string {
  const example = FIELD_EXAMPLES.find((e) => e.id === id && e.example.image === image);
  if (example) return example.example.pdf;
  return image.endsWith(".webp") ? `/assets/images/quote-guide/${id}/redacted-quote.pdf` : image.replace(/\.png$/, ".pdf");
}
