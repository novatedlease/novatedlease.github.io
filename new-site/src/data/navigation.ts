export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export interface NavSection {
  label: string;
  href?: string;
  items?: NavItem[];
}

export type NavEntry = NavItem | NavSection;

export const navigation: NavEntry[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Calculator',
    href: '/calculator/',
    items: [
      { label: 'Novated Lease Calculator', href: '/calculator/' },
      { label: 'Employer BYO Checker', href: '/tools/byo-employer-check/' },
    ],
  },
  {
    label: 'Fundamentals',
    items: [
      { label: 'What is a novated lease, really?', href: '/start-here/what-is-novated-lease/' },
      { label: 'EV vs ICE novated leases compared', href: '/start-here/ev-vs-ice-compared/' },
      { label: 'Is a novated lease worth it?', href: '/start-here/is-it-worth-it/' },
      { label: 'How to read a novated lease quote', href: '/start-here/how-to-read-a-novated-lease-quote/' },
      { label: 'How to use the calculator', href: '/start-here/use-nl-calculator/' },
      { label: '20 novated lease calculators reviewed', href: '/start-here/calculator-comparison/' },
      { label: 'Glossary of terms', href: '/start-here/glossary/' },
    ],
  },
  {
    label: 'Mechanisms',
    items: [
      { label: 'Overview', href: '/costs-and-savings/' },
      { label: 'Why "tax saved" is wrong', href: '/costs-and-savings/why-tax-saved-is-wrong/' },
      { label: '$21,320 "savings" → $5,591 net loss', href: '/costs-and-savings/false-saving-example/' },
      { label: '$81k Tesla cost-neutral to $25k Mazda', href: '/costs-and-savings/ev-nl-vs-keeping-petrol-car/' },
      { label: 'Why interest rates look high', href: '/costs-and-savings/why-nl-interest-looks-high/' },
      { label: 'Effective rates on short leases & cheap cars', href: '/costs-and-savings/effective-interest-rate-short-leases-cheaper-cars/' },
      { label: 'FBT, RFBA, and adjusted taxable income', href: '/costs-and-savings/fbt-rfba-ati-explained/' },
      { label: 'Used-car GST secret (Division 66)', href: '/costs-and-savings/used-car-gst-saving/' },
      { label: 'All about residual values', href: '/costs-and-savings/why-residual-values-matter/' },
      { label: "You don't have to sell above residual", href: '/costs-and-savings/residual-values-vs-sales-price/' },
      { label: 'The "$70k too low" myth — corrected', href: '/costs-and-savings/low-income-novated-lease-savings/' },
    ],
  },
  {
    label: 'Running Costs',
    items: [
      { label: 'Overview', href: '/running-costs/' },
      { label: 'Running costs as a "piggy bank"', href: '/running-costs/running-costs-piggy-bank/' },
      { label: 'ATO EV home charging shortcut', href: '/running-costs/ev-home-charging-shortcut/' },
      { label: 'Employers not passing on GST saving', href: '/running-costs/failure-to-pass-gst-saving/' },
      { label: 'Insurance premium vs excess', href: '/running-costs/insurance-premium-and-excess/' },
    ],
  },
  {
    label: 'Risks',
    items: [
      { label: 'Overview of risks & exit strategies', href: '/risks/' },
      { label: 'Lease length, residuals, and risk', href: '/risks/lease-length-and-risk/' },
      { label: 'What happens on early termination', href: '/risks/early-termination/' },
      { label: 'How bad can early termination get', href: '/risks/how-bad-can-early-termination-get/' },
      { label: 'Risk mitigation strategies', href: '/risks/risk-mitigation/' },
      { label: 'Think like a gambler', href: '/risks/novated-lease-risk-adjusted-decision/' },
    ],
  },
  {
    label: 'Special Cases',
    items: [
      { label: 'Overview', href: '/special-and-policy/' },
      { label: 'Childcare subsidy impact', href: '/special-and-policy/childcare-subsidy/' },
      { label: "Don't double-count the NFP FBT cap", href: '/special-and-policy/fbt-exemption-double-counting/' },
      { label: 'Super guarantee & payroll risks', href: '/special-and-policy/super-guarantee/' },
      { label: 'NSW Health "Employer Share"', href: '/special-and-policy/nsw-health-employer-share/' },
      { label: 'EV FBT wind-back — 2026 Budget', href: '/special-and-policy/ev-fbt-exemption-phase-out-budget-2026/' },
      { label: 'EV FBT exemption review timing', href: '/special-and-policy/ev-fbt-exemption-review-timing/' },
      { label: 'LCT threshold & FBT exemption', href: '/special-and-policy/lct-threshold-fbt-exemption/' },
      { label: 'Smart Leasing / MillarX payment structure', href: '/special-and-policy/smart-leasing-millarx-payment-structure/' },
      { label: 'Why novated leasing is poorly regulated', href: '/special-and-policy/why-poorly-regulated/' },
    ],
  },
  {
    label: 'About',
    items: [
      { label: 'Who I am', href: '/about/about-me/' },
      { label: 'Calculator history', href: '/about/history/' },
      { label: 'Privacy Policy', href: '/about/privacy/' },
      { label: 'Disclaimer', href: '/about/disclaimer/' },
      { label: 'Contact', href: '/about/contact/' },
      { label: '☕ Buy me a coffee', href: 'https://buymeacoffee.com/changyang1230', external: true },
    ],
  },
];

export function isNavItem(entry: NavEntry): entry is NavItem {
  return !('items' in entry);
}

export function isNavSection(entry: NavEntry): entry is NavSection {
  return 'items' in entry;
}
