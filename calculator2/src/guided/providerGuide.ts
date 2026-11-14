import type { QuoteKey } from "./QuoteDiagram";
import { GST_EXEMPT_CAP } from "@engine/ato";
import quoteImages from "../../../docs/assets/images/quote-guide/manifest.json";

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
  { id: "clearlease", label: "Clear Lease" },
  { id: "customfleet", label: "Custom Fleet" },
  { id: "driva", label: "Driva" },
  { id: "easi", label: "Easi (EasiFleet)" },
  { id: "fingo", label: "Fingo (Automotive Lease Packaging)" },
  { id: "flare", label: "Flare" },
  { id: "fleetpartners", label: "FleetPartners" },
  { id: "kooya", label: "Kooya" },
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

/** "a" or "an" before a provider name: acronyms are read letter by letter ("an SG Fleet", "an ORIX"). */
export function articleFor(label: string): "a" | "an" {
  if (/^[A-Z]{2}/.test(label)) return /^[AEFHILMNORSX]/.test(label) ? "an" : "a";
  return /^[AEIOU]/i.test(label) ? "an" : "a";
}

/**
 * Lower GST-reduced price labels that can be mistaken for a drive-away total. The amber drive-away
 * pointer for each of these providers says which line to use instead; the red check points to it.
 */
export const DRIVEAWAY_TRAP_LABELS: Partial<Record<ProviderId, { wrong: string }>> = {
  flare: { wrong: "Vehicle cost — Flare Cars driveaway cost" },
  oly: { wrong: "Oly driveaway price" },
  fingo: { wrong: "Your car price (drive away price when financed)" },
  spa: { wrong: "Novated lease purchase price (excluding GST)" },
  driva: { wrong: "Effective novated vehicle price" },
  lendly: { wrong: "Total Price (ex. GST)" },
  kooya: { wrong: "Price (ex. GST)" },
  clearlease: { wrong: "Vehicle Finance Amount" },
};

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
  kind?: "trap" | "locate" | "missing";
  /** One or two short sentences, worded "If you see X, …". Plain text. */
  text: string;
  /** Optional nuance, shown in a tooltip. */
  more?: string;
  /** The field isn't on the provider's example, so there's no picture to show. */
  notShown?: boolean;
  /** A marked picture for a not-shown line, e.g. a line to work the figure out from. */
  example?: FieldExample;
};

/** Specific entries where a plausible quote figure would mislead the calculator. */
export const TRAP_FIELDS: Partial<Record<ProviderId, GuideField[]>> = {
  sgfleet: ["payment", "baseValue"],
  millarx: ["payment"], smartleasing: ["payment"],
  flare: ["driveaway"], oly: ["driveaway", "docFee"],
  maxxia: ["docFee"], fleetpartners: ["docFee"],
  leaseplan: ["driveaway", "docFee"], alliance: ["driveaway"],
  remunerator: ["driveaway", "payment"], easi: ["payment"],
  autopia: ["baseValue"], leaselab: ["driveaway"],
  spa: ["driveaway", "baseValue"], smartsalary: ["running"],
  driva: ["driveaway"], fingo: ["driveaway"],
  leaseexpress: ["driveaway"], lendly: ["driveaway"],
  kooya: ["driveaway", "payment"],
  clearlease: ["driveaway", "payment"],
};

function withKind(id: ProviderId, pointer: Pointer): Pointer {
  return { ...pointer, kind: pointer.notShown ? "missing" : TRAP_FIELDS[id]?.includes(pointer.field) ? "trap" : "locate" };
}

/** Payment pointers never state a GST basis: it can differ between employers on one provider's quotes. */
const PAYMENT_GST_NOTE =
  "Whether the payment includes GST can depend on your employer. Check the headings and footnotes on your own quote.";

export type ProviderGuide = {
  id: ProviderId;
  /** Month of the newest quote layout these pointers were checked against, "YYYY-MM". */
  seen: string;
  /** Reddit post ids the pointers were checked against. Kept out of the UI. */
  sources: string[];
  pointers: Pointer[];
};

export const GUIDES: ProviderGuide[] = [
  {
    id: "sgfleet",
    seen: "2026-11",
    sources: ["1xrc93u", "1xp7rio", "1xoemj6"],
    pointers: [
      {
        field: "payment",
        text: "Use “Lease rental” per pay. Don't use “Monthly lease rental”: it may cover fewer payments than the lease has months.",
        more: `The per-pay “Lease rental” spreads the same total over the whole lease, which is how the calculator reads every payment.\n\n${PAYMENT_GST_NOTE}`,
      },
      {
        field: "defer",
        text: "If you see “payable as 34 payments” on a 36-month lease, that's a 2-month deferral (36 − 34).",
      },
      {
        field: "baseValue",
        text: "Look for “FBT Base Value” in the FBT section, which may be on a later page. Don't use “Vehicle on-road cost”.",
        more: "If your quote does not show the FBT line, ask SG Fleet for its FBT base value.",
      },
      {
        field: "driveaway",
        text: "Use “Vehicle on-road cost (incl. GST)” under “Lease details”.",
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
      { field: "driveaway", text: "Use “DRIVE AWAY” on the cover. You can also check “On-road price” under “What you’re financing”." },
      {
        field: "defer",
        text: "If you see “$X/mth × 58” on a 60-month lease, that's a 2-month deferral (60 − 58). “× 59” means 1.",
      },
      {
        field: "payment",
        text: "Use the fortnightly payment or “$X/mth × N” with its matching period, then run the correction tool.",
        more: "If your quote says “Finance + fee”, subtract the management fee first. The fortnightly amount spreads the monthly figure over the whole term; the correction tool removes the extra.",
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
        text: "Can't find a drive-away total? Use the dealer's full on-road price including GST, or work it out from the residual.",
        more: "Do not substitute FBT base value, a GST saving or a lease payment.",
      },
      {
        field: "payment",
        text: "Use “Lease payment” or “Lease per month”, then run the correction tool. Both need it.",
        more: "Smart Leasing collects the fortnightly figure as though there were 60 monthly payments while 58 go to the financier.",
      },
      {
        field: "defer",
        text: "If you see “Months deferred”, use that number.",
      },
      {
        field: "docFee",
        text: "Look for “documentation fee” on the terms page. If it includes GST, divide by 1.1.",
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
        text: "If you see “Finance” under “Budgeted running costs”, that's the fortnightly payment.",
        more: PAYMENT_GST_NOTE,
      },
    ],
  },
  {
    id: "kooya",
    seen: "2026-08",
    sources: ["1vg13w1", "1unt2tj", "1st7ozz"],
    pointers: [
      {
        field: "driveaway",
        text: "Use “Total (drive way)”. Don't use “Price (ex. GST)”: it has the GST saving taken off.",
        more: "On the quotes we checked, “Price (ex. GST)” plus the “GST” line below it added up to “Total (drive way)”.",
      },
      {
        field: "baseValue",
        text: "Look for “FBT base value” under “Taxation & finance”, near the end of the quote.",
      },
      {
        field: "payment",
        text: "Use “Lease payment” under “Total running costs”. Don't use the “Finance” tile on page 1: it's a different figure.",
        more: `“Per paycycle” follows “Employer pay cycle” near the top. It was monthly on one quote we checked and fortnightly on another. On the quotes we checked, the tile was about a tenth higher than “Lease payment”.\n\n${PAYMENT_GST_NOTE}`,
      },
      {
        field: "defer",
        text: "If you see “based on a 2-month deferred lease structure” under “Employee authorisation”, choose 2 months.",
        more: "Only one of the quotes we checked included this section. If yours doesn't, choose “Not sure”.",
      },
      { field: "residual", text: "If you see “Residual value inc GST”, choose Including GST." },
      { field: "luxAdj", text: "If you see “Luxury car adjustment” under “Payroll calculation”, that's this line." },
      {
        field: "running",
        text: "Use the “Per paycycle” lines under “Total running costs”, not the tiles on page 1. Choose the period shown in “Employer pay cycle”.",
        more: "The table lists GST on its own line. If yours does too, choose Excluding GST.",
      },
      { field: "fees", text: "If you see “Administration fee” under “Total running costs”, that's the management fee." },
    ],
  },
  {
    id: "oly",
    seen: "2026-11",
    sources: ["1xq2wcg", "1vfxcqr"],
    pointers: [
      {
        field: "driveaway",
        text: "Don’t use “Oly driveaway price”: it has the GST saving taken off. Use “Recommended retail price” if it includes all on-road charges.",
        more: "On the quote we checked, it matched the full on-road price including GST. If yours doesn't include on-road charges, ask the dealer for the full drive-away price.",
      },
      {
        field: "insurance",
        text: "Enter the full yearly insurance premium, including year one.",
        more: "Use the yearly amount you would pay to insure the car, not just Oly's renewal budget. If the first year is financed, the calculator counts it once.",
      },
      {
        field: "docFee",
        text: "Enter only “Financier's Establishment fee” as the documentation fee. Financed year-one insurance has its own question.",
        more: "Both amounts enter the rate calculation, but the insurance is counted only once in the lease total.",
      },
      {
        field: "residual",
        text: "Look for “Your total residual value (after lease term)” near the end of the estimate, and choose Including GST.",
        more: "It included GST on both Oly quotes we checked (Apr and Aug 2026): it matched the ATO minimum on Oly's ex-GST price, plus GST.",
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
        text: "If “Total residual value” has no GST label, choose Including GST.",
        more: "It included GST on all 30 Maxxia quotes we checked (Aug 2025 to Nov 2026).",
      },
      {
        field: "insurance",
        text: "Enter the full yearly insurance premium, including year one.",
        more: "Use the yearly amount you would pay to insure the car, not just Maxxia's renewal budget. If the first year is financed, the calculator counts it once.",
      },
      {
        field: "docFee",
        text: "Enter only “Financier's Establishment Fee” as the documentation fee. Financed year-one insurance has its own question.",
        more: "Both amounts enter the rate calculation, but the insurance is counted only once in the lease total.",
      },
    ],
  },
  {
    id: "fleetpartners",
    seen: "2026-11",
    sources: ["1xlqzm8", "1x9tvny"],
    pointers: [
      { field: "driveaway", text: "Use “Drive-away total” in the Total column, including GST." },
      {
        field: "docFee",
        text: "If “Lease Establishment Fee” is monthly, add it to management fees instead. Add the one-off PPSR fee and any financed brokerage.",
      },
      {
        field: "defer",
        text: "Use the stated delay before lease payments start, or subtract “Based on” months from the lease term.",
      },
    ],
  },
  {
    id: "leaseplan",
    seen: "2025-08",
    sources: ["1n16kcg"],
    pointers: [
      { field: "driveaway", text: "Can’t find a drive-away total? Ask for the full on-road price including GST. The quote we checked had no residual to work it out from.", more: "The vehicle subtotal may leave out stamp duty and registration. The reviewed quote did not print a residual." },
      {
        field: "docFee",
        text: "If “Finance Documentation” is monthly, put it in management fees. Enter any one-off “Security Interest” fee as the documentation fee.",
      },
    ],
  },
  {
    id: "alliance",
    seen: "2026-11",
    sources: ["1xocvn9", "1xnlk94", "1so066a"],
    pointers: [
      { field: "driveaway", text: "Use “Total Drive Away Price (Inc GST)” in Purchase Details. Don’t use “Total Amount Financed”." },
      {
        field: "payment",
        text: "If “Total Lease Payment (Finance Payment)” matches “Finance” in the running costs, use either figure.",
        more: `These lines can have different GST labels. ${PAYMENT_GST_NOTE}`,
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
      { field: "driveaway", text: "“Vehicle Purchase Price” may omit on-road costs. Check it includes GST and all on-road charges before using it.", more: "If it does not, ask the dealer for the full drive-away price." },
      {
        field: "payment",
        text: "If you see “Lease Payment (excl GST)” under “Annual Car Expenses”, it's a yearly total: choose “Per year (total)”.",
        more: "Yearly on all 7 Remunerator quotes we checked. The per-fortnight and per-month boxes on the summary are the whole salary deduction, including running costs.",
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
      { field: "driveaway", text: "Use “Drive Away Price”, including GST." },
      {
        field: "payment",
        text: "Use the fortnightly lease figure. Don’t use “Lease Per Month” if it covers fewer payments than the lease term.",
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
        text: "Can’t find the FBT base value? Don’t use “base price”: it excludes GST. Ask for the value or derive it from the price breakdown.",
        more: "Include the car, options and delivery with GST, before stamp duty and registration.",
      },
      {
        field: "docFee",
        text: "If you see “autopia setup fee”, enter it as the documentation fee.",
      },
    ],
  },
  {
    id: "clearlease",
    seen: "2026-11",
    sources: ["1xvt7sq"],
    pointers: [
      {
        field: "driveaway",
        text: "Use “Price (incl GST)” under “Your Vehicle & Finance”. Don't use “Vehicle Finance Amount”: it has the GST saving taken off.",
        more: "On the quote we checked, “Price (incl GST)” minus “GST Savings” equalled “Vehicle Finance Amount”.",
      },
      { field: "baseValue", text: "Use “Vehicle Base Value” under “FBT Calculation”, on the page headed “The numbers”." },
      {
        field: "docFee",
        text: "Add “Financier Setup Fee” and “Clear Lease Fee” together.",
        more: "“Vehicle Finance Amount” leaves both fees out, but on the quote we checked the payment only matched with both financed.",
      },
      { field: "residual", text: "If you see “Total Residual Payable”, choose Including GST. “Residual amount” is without GST." },
      {
        field: "payment",
        text: "Use “Finance Budget”, per month. Don't use “What it costs you per month” or “Total Cost to You”: they're after tax.",
        more: `Those two figures also include running costs. On the quote we checked, “GST” was a separate line below “Finance Budget”. If yours is too, choose Excluding GST.\n\n${PAYMENT_GST_NOTE}`,
      },
      { field: "luxAdj", text: "If you see “Pre-tax Luxury Car Charge”, that's this line." },
      {
        field: "running",
        text: "Use “Maintenance” to “Comprehensive Insurance” under “Your Budget/ Inclusions per month”, and choose Per month.",
        more: "“GST” is a separate line in the right-hand column. If yours is too, choose Excluding GST.",
      },
      {
        field: "fees",
        text: "Enter “Administration” as the management fee, and add “GAP Insurance (financed)” to it.",
        more: "You'd only buy GAP cover with a lease, so it belongs with the management fees.",
      },
    ],
  },
  {
    id: "customfleet",
    seen: "2026-11",
    sources: ["1xp2oq9"],
    pointers: [
      { field: "driveaway", text: "Use “Total on road cost (incl. GST)” near the top of “My Lease Package”." },
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
        text: "No drive-away total? Add “GST Saved on Car Price” to “Novated Vehicle Price”, or ask for the full on-road price.",
        more: "Adding the printed GST saving reverses the GST reduction in “Novated Vehicle Price”. Check against your dealer's full on-road price if available.",
      },
      {
        field: "payment",
        text: "If “Lease” is under “Budgeted Allowance (ex GST)”, choose the period in the heading (Weekly or Fortnightly Allowances) and Excluding GST.",
      },
      {
        field: "running",
        text: "Choose the period in the heading for the running costs too.",
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
        text: "Use “Total Drive Away Price” including GST. Don’t use “Novated lease purchase price (excluding GST)”.",
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
      { field: "driveaway", text: "Can’t find a drive-away total? Use the dealer’s full on-road price including GST, or work it out from the residual." },
      { field: "baseValue", text: "If you see “FBT value”, that's the FBT base value." },
      { field: "payment", text: "Use “Lease Payment” under “Package Inclusions (ex. GST) – Fortnightly”, not the package total. If you see “(ex. GST)”, choose Excluding GST.", more: "Enter it per fortnight. The package total adds running costs and fees." },
      { field: "fees", text: "If you see separate “Lease Management” and “Salary Packaging” lines, add both under lease management fees using the quote's period." },
    ],
  },
  {
    id: "smartsalary",
    seen: "2026-11",
    sources: ["1xsj1gj"],
    pointers: [
      { field: "driveaway", text: "Can’t find a drive-away total? Use the dealer’s full on-road price including GST, or work it out from the residual." },
      { field: "payment", text: "If “Lease Payment (Fixed)” sits under “Motor Vehicle Deductions (inc GST)”, choose Including GST and the printed period." },
      { field: "running", text: "If the heading is “Motor Vehicle Deductions (inc GST)”, choose Including GST and enter the costs as printed.", more: "If a “Less” line takes a GST credit off those costs, answer Yes when asked whether a GST credit is taken off." },
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
      { field: "payment", text: "Use “Finance Repayment (Fixed)” with the period shown in its column. Check the subtotal for GST." },
    ],
  },
  {
    id: "nla",
    seen: "2026-11",
    sources: ["1xs3una"],
    pointers: [
      { field: "baseValue", text: "If you see “Vehicle base value” in the FBT calculations box, that's the FBT base value." },
      { field: "driveaway", text: "No drive-away total? Add the vehicle price, GST, stamp duty, registration, CTP and any luxury car tax shown." },
      { field: "residual", text: "If you see “Residual payment (ex GST)”, choose Excluding GST." },
      { field: "payment", text: "Use “Lease payment (fixed)” under “Gross fortnightly rental”, per fortnight, without its separate GST line.", more: "Don't use the take-home-pay reduction. It is after tax and includes running costs." },
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
        text: "Can’t find a deferral on your Toyota Fleet quote? Choose “Straight away” unless Toyota Fleet tells you otherwise.",
        more: "Choose another answer if your schedule explicitly says payments start later.",
      },
    ],
  },
  {
    id: "leaseexpress",
    seen: "2026-11",
    sources: ["1xo2r3u"],
    pointers: [
      { field: "driveaway", text: "Don’t use “Vehicle finance amount” as the drive-away price. Ask for the full on-road price including GST.", more: "If you have the residual, you can work out the price from it." },
      { field: "baseValue", text: "If you see “Value for FBT purposes”, that's the FBT base value." },
      { field: "residual", text: "If “GST on residual” sits beside “Residual value”, enter the residual figure and choose Excluding GST." },
      { field: "payment", text: "If “Lease payments (fortnightly)” has GST in a separate column, enter the payment per fortnight, excluding that GST." },
    ],
  },
  {
    id: "orix",
    seen: "2026-11",
    sources: ["1xp2oq9"],
    pointers: [
      { field: "driveaway", text: "No drive-away total? Ask ORIX or the dealer for the full on-road price including GST, or work it out from the residual." },
      { field: "baseValue", text: "If you see “FBT base value (inc GST)”, enter it as printed." },
      { field: "docFee", text: "Check the “Other Fees” footnote for an establishment or dealer fee.", more: "It may already be added to the amount you borrow." },
      { field: "residual", text: "If you see “Residual value (ex GST)”, choose Excluding GST." },
      { field: "payment", text: "If you see a monthly “Lease Rental”, check its footnote for whether it includes GST." },
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
      { field: "payment", text: "If “Finance” is per fortnight with no GST label, enter it per fortnight and choose “I'm not sure” for GST." },
      { field: "running", text: "If you see “Servicing & Incidentals” as one line, enter that combined amount under servicing and tyres." },
    ],
  },
  {
    id: "simplygreen",
    seen: "2026-11",
    sources: ["1xngaj3"],
    pointers: [
      { field: "driveaway", text: "Use “Vehicle Cost”, the line before “GST Credit” and “Financed Amount”. Check that it includes GST." },
      { field: "defer", text: "Use “Months Deferred” as printed. If only “No. of Payments” appears, subtract it from the lease term in months." },
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
      { field: "driveaway", text: "Use “Driveaway price” in “Vehicle & lease”, including GST." },
      { field: "defer", text: "Use the number before “MONTHS DEFERRED” on the Finance lease line." },
      { field: "residual", text: "If you see “Residual (incl GST)”, choose Including GST." },
      { field: "payment", text: "If EXCL GST and INCL GST finance-lease columns sit side by side, enter either fortnightly figure with its matching GST answer." },
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
  clearlease: ["defer"],
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
  kooya: ["docFee"],
};

/** Provider-specific wording where the generic "not shown" line would be wrong or unhelpful. */
type NotShownLine = string | { text: string; more: string; example?: FieldExample };

const capText = `$${GST_EXEMPT_CAP.toLocaleString("en-AU")}`;

/**
 * These quotes print the car's GST credit but no FBT base value. The credit is a tenth of the
 * GST-inclusive price before on-road costs, so x 11 gives the FBT base value, unless the credit
 * hit the cap. Checked against real quotes (Nov 2026).
 */
function gstCreditLine(id: ProviderId, label: string, line: string, ask: string): NotShownLine {
  return {
    text: `Can't find it on your ${label} quote? Multiply ${line} by 11.`,
    more: `Doesn't work if the credit is ${capText}, the most allowed. Then ask ${ask}, or take the drive-away price and subtract stamp duty, rego and CTP.`,
    example: {
      image: `/assets/images/quote-guide/${id}/field-gst-credit.webp`,
      alt: `Part of a redacted ${label} quote with the ${line.replace(/[“”]/g, "")} line outlined`,
      caption: `Part of a real ${label} quote with values removed. Multiply the outlined figure by 11.`,
    },
  };
}

const NOT_SHOWN_TEXT: Partial<Record<ProviderId, Partial<Record<GuideField, NotShownLine>>>> = {
  oly: {
    baseValue: gstCreditLine("oly", "Oly", "the “GST” line", "Oly"),
  },
  remserv: {
    baseValue: gstCreditLine("remserv", "RemServ", "“GST savings on car”", "RemServ"),
  },
  lendly: {
    baseValue: gstCreditLine("lendly", "Lendly", "“GST Tax Credit”", "Lendly"),
  },
  fleetpartners: {
    baseValue:
      { text: "Can’t find the FBT base value? Use the Total column of “Vehicle” in “Your order”.", more: "That is the car after discount, options and delivery including GST, before on-road costs." },
  },
  millarx: {
    // MillarX is finance only: the salary packager, not MillarX, holds the FBT base value.
    baseValue: gstCreditLine("millarx", "MillarX", "“Less: GST credit”", "your salary packager"),
    running: "MillarX quotes are finance only. Take the running-cost budgets from your salary packager.",
    fees: "Some MillarX quotes show a management fee per month. Enter it if yours does. The BYO finance-only quote has none.",
  },
  remunerator: {
    fees: "Remunerator's summary has no fee line and says management fees are included in its figures. Leave this at $0 unless your quote lists one.",
  },
};

function notShownText(id: ProviderId, field: GuideField): NotShownLine | null {
  const special = NOT_SHOWN_TEXT[id]?.[field];
  if (special) return special;
  const p = providerLabel(id);
  switch (field) {
    case "baseValue":
      return `Can't find it on your ${p} quote? Ask ${p}, or take the drive-away price and subtract stamp duty, rego and CTP.`;
    case "defer":
      return `Can’t find months deferred on your ${p} quote? Choose “Not sure” (we’ll assume 2) unless told otherwise.`;
    case "docFee":
      return `Can’t find a documentation or establishment fee on your ${p} quote? Leave this at $0 unless yours lists one.`;
    case "residual":
      return `Can’t find a residual on your ${p} quote? Choose “I’m not sure” and we’ll use the ATO minimum.`;
    case "fees":
      return `Can’t find a management fee on your ${p} quote? Leave this at $0 unless yours lists one.`;
    default:
      return null;
  }
}

export function pointersFor(id: ProviderId | null, field: GuideField): Pointer[] {
  const listed = guideFor(id)?.pointers.filter((p) => p.field === field) ?? [];
  if (!id) return [];
  if (listed.length > 0 || !NOT_SHOWN[id]?.includes(field)) return listed.map((p) => withKind(id, p));
  const line = notShownText(id, field);
  if (!line) return [];
  return [withKind(id, typeof line === "string" ? { field, text: line, notShown: true } : { field, ...line, notShown: true })];
}

/** "Nov 2026" from "2026-11". */
export function seenLabel(seen: string): string {
  const [y, m] = seen.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[(m ?? 1) - 1]} ${y}`;
}

function monthsSince(seen: string, now: Date): number {
  const [year, month] = seen.split("-").map(Number);
  return now.getFullYear() * 12 + now.getMonth() + 1 - (year * 12 + month);
}

/** Quote layouts can change; show a caution once the last checked month is over six months old. */
export function guideMayHaveChanged(seen: string, now = new Date()): boolean {
  return monthsSince(seen, now) > 6;
}

/** Over twelve months with no newer quote checked: amber traps show as plain lines (review round 2, R15). */
export function guideIsOld(seen: string, now = new Date()): boolean {
  return monthsSince(seen, now) > 12;
}

/** The kind a pointer is shown as: an old guide's traps are no longer amber. */
export function shownKind(pointer: Pointer, id: ProviderId, now = new Date()): NonNullable<Pointer["kind"]> {
  const kind = pointer.kind ?? (pointer.notShown ? "missing" : "locate");
  const guide = guideFor(id);
  return kind === "trap" && guide && guideIsOld(guide.seen, now) ? "locate" : kind;
}

/** The whole redacted quote page for a provider, if one was reviewed. */
export function pageFor(id: ProviderId): string | null {
  const image = `/assets/images/quote-guide/${id}/redacted-quote.webp`;
  return imageSizeFor(image) ? image : null;
}

/** All reviewed pages available for the in-card full-page view. */
export function pageImagesFor(id: ProviderId): string[] {
  const page = pageFor(id);
  if (!page) return [];
  const extraPages = Object.keys(quoteImages.images)
    .filter((key) => key.startsWith(`${id}/redacted-quote-page-`) && key.endsWith(".webp"))
    .sort()
    .map((key) => `/assets/images/quote-guide/${key}`);
  return [...extraPages, page];
}

/** A focused crop of the marked line(s) for this field, if one exists. */
export function cropFor(id: ProviderId, field: GuideField): string | null {
  const f = field === "insurance" ? "running" : field;
  const image = `/assets/images/quote-guide/${id}/field-${f}.webp`;
  return imageSizeFor(image) ? image : null;
}

export type FieldExample = {
  image: string;
  alt: string;
  caption: string;
};

/** Marked examples from a page other than the provider's main sample. */
const FIELD_EXAMPLES: { id: ProviderId; field: GuideField; example: FieldExample }[] = [
  { id: "sgfleet", field: "baseValue", example: {
    image: "/assets/images/quote-guide/sgfleet/fbt-example.webp",
    alt: "Redacted SG Fleet FBT section with FBT Base Value marked 1",
    caption: "A later FBT section from a different SG Fleet quote layout, with values removed. The line to use is marked 1.",
  } },
  { id: "sgfleet", field: "driveaway", example: {
    image: "/assets/images/quote-guide/sgfleet/driveaway-example.webp",
    alt: "Redacted SG Fleet Lease details with Vehicle on-road cost marked 2",
    caption: "Lease details from an SG Fleet quote, with values removed. The line to use is marked 2.",
  } },
  { id: "smartleasing", field: "docFee", example: {
    image: "/assets/images/quote-guide/smartleasing/terms-example.webp",
    alt: "Redacted Smart Leasing terms page with documentation fee marked 5",
    caption: "Terms page from a separate Smart Leasing quote, with values removed. The line to use is marked 5.",
  } },
  {
    id: "oly",
    field: "residual",
    example: {
      image: "/assets/images/quote-guide/oly/residual-example.webp",
      alt: "End of a redacted Oly estimate with Your total residual value marked 6",
      caption: "The last section of the same Oly estimate. Figures were removed; the residual line is marked 6.",
    },
  },
  {
    id: "alliance",
    field: "docFee",
    example: {
      image: "/assets/images/quote-guide/alliance/page2-fees.webp",
      alt: "Redacted page 2 of an Alliance Leasing quote with Entry Fee marked 5",
      caption: "Fees and lease details from page 2 of the same Alliance quote. Figures and customer details were removed; Entry Fee is marked 5.",
    },
  },
  {
    id: "kooya",
    field: "defer",
    example: {
      image: "/assets/images/quote-guide/kooya/defer-example.webp",
      alt: "Redacted Kooya Employee authorisation section with the 2-month deferral line marked 4",
      caption: "The authorisation section of a separate Kooya quote, with the deferral line marked 4.",
    },
  },
];

export function exampleFor(id: ProviderId, field: GuideField): FieldExample | null {
  return FIELD_EXAMPLES.find((e) => e.id === id && e.field === field)?.example ?? null;
}

/** Redacted image to show for a field: a special example, a crop, or the whole page. */
export function templateFor(id: ProviderId, field: GuideField): string | null {
  const example = exampleFor(id, field);
  if (example) return example.image;
  const pageContext = quoteImages.pageContextFields as Partial<Record<ProviderId, GuideField[]>>;
  return cropFor(id, field) ?? (markerFor(id, field) || pageContext[id]?.includes(field) ? pageFor(id) : null);
}

/** Plain names for each field, for headings and image alt text. */
export const FIELD_NAMES: Record<GuideField, string> = {
  baseValue: "FBT base value", driveaway: "Drive-away price", term: "Lease term", defer: "Months deferred",
  docFee: "Documentation fee", residual: "Residual", payment: "Finance payment", luxAdj: "Luxury adjustment",
  running: "Running costs", insurance: "Insurance", fees: "Management fees",
};

/**
 * The picture to show for a field, in the same order the inline "Show me" uses: the pointer's own
 * example (e.g. the GST credit x 11 crop), a special example, then a crop or the marked page.
 */
export function pictureFor(id: ProviderId, field: GuideField): string | null {
  const own = pointersFor(id, field).find((p) => p.example)?.example;
  return own?.image ?? exampleFor(id, field)?.image ?? templateFor(id, field);
}

/** The top edge and height of a numbered line on the converted full page. */
export function markerFor(id: ProviderId, field: GuideField): { y: number; h: number } | null {
  const markers = quoteImages.markers as Record<string, Record<string, { y: number; h: number }[]>>;
  return markers[id]?.[field === "insurance" ? "running" : field]?.[0] ?? null;
}

/**
 * The number(s) that mark this field on the provider's whole redacted page, e.g. "2" or "7a or 7b".
 * Crops show a tick instead, so the whole-page caption names the number to look for.
 */
export function lineLabelFor(id: ProviderId, field: GuideField): string | null {
  const labels = (quoteImages as { lineLabels?: Record<string, Record<string, string[]>> }).lineLabels;
  const list = labels?.[id]?.[field === "insurance" ? "running" : field];
  return list?.length ? list.join(" or ") : null;
}

/** Intrinsic dimensions reserve space before a quote image finishes loading. */
export function imageSizeFor(image: string | null): { w: number; h: number } | null {
  if (!image) return null;
  const prefix = "/assets/images/quote-guide/";
  if (!image.startsWith(prefix)) return null;
  const images = quoteImages.images as Record<string, { w: number; h: number }>;
  return images[image.slice(prefix.length)] ?? null;
}
