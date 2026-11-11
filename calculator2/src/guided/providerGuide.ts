import type { QuoteKey } from "./QuoteDiagram";

/**
 * Optional "Who is your quote from?" answer and the dated, per-field pointers shown for it.
 * Design: PROVIDER_PICKER_DESIGN_2026-11.md (issue 16). Pointers are text only for now;
 * picture crops wait for consented quotes (issue 18–19).
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
        text: "If it isn't on the first pages, look for “FBT Base Value” near the end of the quote.",
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
