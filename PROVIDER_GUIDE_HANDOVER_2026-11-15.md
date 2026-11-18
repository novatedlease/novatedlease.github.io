# Provider guide branch: handover, 15 Nov 2026

Picks up after the session that ran the owner's provider-by-provider walkthrough of Guided mode.
Earlier context: `PROVIDER_GUIDE_HANDOVER.md`, `TO_REVIEW.md`, `PROVIDER_GUIDE_MERGE_CHECKLIST.md`.

## Where things stand

- Worktree `/Users/changyang1230/novated-lease-guide-provider-guide`, branch
  `codex/provider-guide-completion`, 214 commits ahead of `main`, working tree clean. Nothing pushed.
- The only unticked item in `TO_REVIEW.md` is **Say "merge"**.
- The main checkout `/Users/changyang1230/novated-lease-guide` (on `main`) has the owner's own
  uncommitted work, unrelated to this branch: `new-site/src/styles/global.css` (15 lines of
  `.quote-evidence` styles) and an untracked Smart Leasing $21,000 draft article
  (`new-site/src/content/docs/costs-and-savings/real-example-smartleasing-21000-cheaper.md` plus
  `docs/assets/images/smartleasing-example/`). Don't commit or discard it. The branch also changes
  `global.css`, so stash it before merging and restore it afterwards.

## Rules (the owner's)

- **Never push or merge until the owner says "merge".** Then: a merge commit into `main` (not a
  squash), then push. Deploys go live about 75 seconds after the push.
- Don't commit `new-site/.astro/`. **Never run `new-site/scripts/prepare-content.mjs`**: it wipes
  real content.
- UI copy: short main text, nuance in tooltips (ⓘ). No over-assertive or over-generous claims.
- Never state a provider's payment GST basis as fact (it varies by employer); quote printed labels.
- ATO residual percentages use two decimals (28.13%, never 28.125%).
- After `npm run build` in `calculator2`, restart the Astro dev server (live reload misses the JS).
- When seeding browser state for testing, back up and restore the owner's Chrome localStorage.
- Commit messages end with the owner's attribution lines (see recent commits).

## How to work

- `cd calculator2 && npx vitest run` (446 tests pass). `npx eslint <changed files>`.
  Pre-existing lint errors, not ours: `src/App.tsx` (setState in effect, ~line 510) and
  `src/components/ComparatorView.tsx` (react-refresh, line 141).
- `npm run build` in `calculator2` writes `docs/assets/calculator/main.js`, exports
  `new-site/src/data/provider-guides.json` and resyncs the provider articles and the guides
  index (`new-site/scripts/sync-provider-*.mjs`). Commit those generated files with the change.
- Preview: `cd new-site && npx astro dev --port 4340 --host 0.0.0.0`. The owner checks on a
  phone at `http://10.1.1.108:4340/calculator/`.
- Seeding Guided for a check: write `{draft, step, visited}` to localStorage key
  `nlc2-guided-draft-v3`, then reload.

## Private material (git-ignored, outside the repo)

`~/novated-lease-guide/private/quote-review-2026-11/`:
- `images*/<post>_<n>.jpg` original Reddit quote screenshots (unredacted: never publish),
  `ocr/` tesseract text, `data/*.json` post metadata (`data/ocr_byprov.json` is a guess; often wrong).
- `running-layout/runlines.json` + `runlayout_gen.py`: source of `src/guided/runningLayout.ts`
  (each provider's running-cost lines, order and wording). Edit the JSON and regenerate
  (`python3 runlayout_gen.py <calculator2 dir>`)
  rather than hand-editing the generated file.
- `crops/`: crop scripts. `make_km_crops.py` makes the kilometres crops (`field-mileage.webp`)
  from the published redacted pages.
- `provider-walk/`: the walkthrough page the owner uses (per provider: original Reddit quotes,
  Guided's pictures, a notes box). `server.py` serves it on port 4343 with notes saved to
  `feedback.json`; `build.py` regenerates `index.html` (it expects an `assets` symlink to the
  worktree's `docs/assets` and builds `orig/` symlinks to the private images).
  Progress: SG Fleet, Smart Leasing, Maxxia and Paywise marked good; the rest not yet reviewed.

## What this session changed (57 commits, 2dee0b55..c0d002a0)

Guided, by screen:
- **Payment:** Smart Leasing / MillarX readers go straight to the correction tool (amount, period
  and GST appear after it runs); the box links the payment-structure explainer; their payment
  pictures say to correct the figure first.
- **Every screen:** "Clear this page" beside "Start over".
- **Price:** the side panel says when a line isn't on the provider's quote (Smart Leasing
  drive-away) instead of showing an unmarked page; the residual helper moves the panel to the
  residual picture; on wide screens bare "Show me on a … quote" links are hidden (the panel
  already follows focus); drive-away tooltip covers accessories financed with the car.
- **Lease:** documentation fee hint and tooltip cover optional cover financed up front (GAP, lease
  protection, …).
- **Running costs:** side panel added; boxes follow each provider's quote order and wording
  (`runningLayout.ts`, 28 providers; insurance always labelled "Insurance"); byline names the
  provider; tyres is its own optional box (summed into servicing); EV charging budget is an
  editable box pre-filled from km × 5.47c, with amber warnings at $0 and when more than 10% below
  5.47c (link to the 5.47c article); price per kWh sits under "Not on your quote" (solar
  quick-pick: "use your feed-in tariff, about 4c"; $0 tick: "free, or solar with no feed-in
  tariff"); "Where do other lines go?" sits after the quote's boxes and covers carbon offset and
  "not included" lines; no "Use a typical figure" links except MillarX (finance-only quotes);
  no too-low warning on management fees; kilometres question has a per-provider note
  (`mileageLine.ts`, 25 providers; ORIX and Lendly print whole-lease totals: amber) and a marked
  crop for 24 providers (FleetPartners text only).
- **Results:** headline tidied (take-home and super lines with ⓘ; "Before you decide" box under a
  good result; one-line "Not counted" small print); take-home uses the pay cycle from the
  running-cost period; super "Not sure" shows the employer contribution at stake (after 15% or
  30% contributions tax in the tip); interest row named after where the cash would sit; a lease
  under 5 years opens on its own term (Advanced and the comparator too); save/share/workings
  before "What to do next"; cards ordered Is it right for you? → BYO → checklist.

Maths fixes:
- **Maxxia/Oly financed first-year insurance.** Quotes finance year one including GST, with no
  credit, and budget four ex-GST renewals over five years. Readers now enter the renewal line as
  printed; Guided works out the full premium (renewal + financed year ex GST ÷ term). The
  financed year is converted to the running costs' GST basis whenever they're ex GST.
  `leaseInsuranceAnnual()` (`calculator/src/engine/insurance.ts`) now serves every lease-side
  total: the financial summary had counted the year twice, so Guided's take-home and headline
  disagreed with Advanced's lease section.
- Share links and saved quotes keep `insuranceFinancedFirstYear` (it defaults to 0, so older
  links load unchanged).
- Typical fuel 8 L/100km at $2.00/L.

Providers:
- The quote filed as "Smartsalary (Smart Drive)" is **Prosperity Smart Drive** (provider id
  `prosperity`, article `how-to-read-prosperity-quote`). Smartsalary and Smart Leasing are one
  company ("Smart") with one layout: "Smartsalary (Smart)" is a picker alias that selects Smart
  Leasing (`PROVIDER_ALIAS`; `GUIDED_PROVIDERS` excludes it).
- "Most common" is the three clear leaders by posts with the provider named in a quote image:
  SG Fleet 132, Smart Leasing 108, Maxxia 84 (then Flare 32, Paywise 26, FleetPartners 26).
- Maxxia/Oly doc fee notes are plain; Maxxia has no amber note any more.

## Open, not started (raise with the owner rather than assume)

1. Continue the walkthrough from the providers not yet marked good.
2. Maxxia/Oly: if the reader answers No / Not sure to the first-year insurance question on a quote
   that does finance it, the renewal budget is taken as the full premium. A hint under the
   insurance box was proposed, not built.
3. End-to-end reconciliation of a whole quote (e.g. the Maxxia one) against the quote's own
   take-home figure, proposed, not done.
4. Survey of financed extras per provider (Lendly's tint/dash cam, Maxxia's optional insurances),
   proposed, not done.
5. Smart Leasing drive-away pointer still says "Can't find a drive-away total?", softer than the
   panel's "Not shown on the Smart Leasing quotes we've seen".
6. `sources` in `providerGuide.ts` include other brands' quotes from comparison posts (a Flare
   quote under MillarX, Smart Leasing under FleetPartners, Autopia under Oly). Untidied.
7. Kilometres crops: "Whole page" doesn't scroll to the line (no number marker).
8. Current-car typical figures (value at end, servicing, rego, insurance) have no basis note,
   unlike the new car's lease-end value.
9. After merge: check GA4 `next_step_*` events in a couple of weeks (checklist card moved last).

## 16 Nov: standalone provider article audit

- Checked all 29 provider articles against their numbered redacted page markers, current Guided
  pointers, generated guide export and referenced image paths. All 29 now explain every marker
  on the corresponding page; `provider-picker.test.tsx` enforces that coverage.
- Added missing table entries in Maxxia, Paywise, Prosperity Smart Drive, SG Fleet, Smart Leasing
  and Toyota Fleet. Prosperity's fee guidance now names both the Smart Drive and salary-packaging
  administration fees where both are charged; its running-cost box names both too. The private
  source for that generated label is `private/quote-review-2026-11/running-layout/runlines.json`.
- Removed stale mentions of the residual helper from LeaseLab and LeasePlan articles, where
  Guided hides that helper. Removed wrong FBT-base marker metadata for MillarX and ORIX: those
  marker locations were actually their interest-rate lines. Their articles already describe how
  to find the base value when the sample doesn't print it.
- Built the calculator/export and restarted Astro preview at `http://10.1.1.108:4340/`.
  Targeted provider tests: 101 passed; eslint on changed TypeScript: clean. No push or merge.

## 16 Nov: Custom Fleet example cleanup

- Blanked quote-specific choice answers in the published Custom Fleet page and affected Guided
  crops: employee contribution, fuel, insurance arrangement, roadside assistance, accident
  management and Peace of Mind Plan. Kept the field names and numbered markers. Confirmed OCR
  finds none of the old answer text in any published Custom Fleet image.
- Removed the article's instruction that Roadside Assistance and Accident Management are
  “Included in Lease Rental”; that was only true of this one example.

## 16 Nov: take-home impact tooltip

- The results headline's take-home tooltip now explains two common reasons it can differ from a
  provider's take-home impact: the Smart Leasing/MillarX payment correction (with a link to the
  payment-structure article), and optional quote costs omitted from the running-cost inputs.
  It points readers to “Where do other lines on my quote go?” on the Running costs page.
- Targeted UX tests: 34 passed; changed TypeScript ESLint clean. Calculator rebuilt and Astro
  preview restarted on port 4340. Nothing pushed or merged.

## 16 Nov: Driva price-label source correction

- The numbered Driva image is based on Reddit post `1xr5coj` (Nov 2026), whose Vehicle Information
  has “DriveAway Price”. The “Effective novated vehicle price” phrase came from a separate Driva
  post `1w1ejpj` (Aug 2026), where the full price is labelled “Vehicle price (drive away)”.
  The earlier article and Guided pointer incorrectly implied both labels appeared on one page.
- The article now names the separate post and its labels; Guided's main pointer only describes
  the numbered page and keeps the other layout in its tooltip. Guide sources now include both
  posts plus the earlier comparison post `1vfxcqr`, so the review note says 3 examples and Nov
  2026. The private Driva `KEY.md` was corrected too (it is git-ignored).
- Targeted provider tests: 117 passed; changed TypeScript ESLint clean. Calculator rebuilt and
  Astro preview restarted on port 4340. Nothing pushed or merged.

## 16 Nov: servicing/tyres warning placement

- The running-cost check compares servicing and tyres together with a combined typical yearly
  amount. On Easi, $16.15 maintenance + $135.49 tyres per fortnight made the old warning say
  $3,943/year under Maintenance, which looked like it was about $16.15 alone.
- The warning now explains the two annual components and appears under Tyres when that is the
  larger cause. The calculation of results is unchanged. A targeted Easi UI test covers the
  example; 8 tests passed, ESLint clean, calculator rebuilt and preview restarted on port 4340.

## 16 Nov: high insurance comparison prompt

- Easi's $135.49 per fortnight ex-GST insurance budget is $3,523/year, well above the
  calculator's $2,180/year ex-GST rough estimate for a $58,000 EV. The old generic check only
  warned at 3× typical, so it missed this.
- Added a gentle quote-shopping warning under Insurance when the annual amount is **both**
  at least 30% and $500 above the model estimate. It asks the reader to check period, cover
  and excess and compare comprehensive quotes. Easi quotes link to
  [Easi's self-insurance policy](https://support.easifleet.com.au/self-insurance-policy);
  other quotes link to [AFIA's novated leasing code](https://www.afia.asn.au/finance-code/schedule-2-novated-leasing).
  These sources say own comprehensive cover is possible subject to the lease terms.
- Market check: [CHOICE's Jan 2026 quote sample](https://www.choice.com.au/money/insurance/car/articles/the-cost-of-insuring-electric-vehicles)
  found $2,440/year for new EVs on average and wide brand variation;
  [Compare the Market's Mar 2026 model sample](https://www.comparethemarket.com.au/news/ev-insurance-up-in-12-months/)
  found $2,306 across ten EVs, with substantial model differences. Those are consumer
  premium quotes whereas Guided's ex-GST comparison uses an ex-GST estimate, so the
  published figures support only a broad ballpark check. The estimator formula was retained;
  the warning does not call any premium wrong.
- Targeted tests: 10 passed; ESLint clean. Calculator rebuilt and Astro preview restarted on
  port 4340. Nothing pushed or merged.

## 16 Nov: Easi monthly/fortnightly payment correction

- The owner showed the 36-month Easi quote: $1,147.66/month ex GST × 12 ÷ 26 rounds to its
  $529.69/fortnight Lease Rental. Both inputs give the calculator the same finance amount when
  their matching period and GST basis are selected.
- [Easi's own finance-schedule guide](https://support.easifleet.com.au/novated-finance-schedule)
  explains the 60-month/58-instalment example: payroll collects the quoted rental over the full
  term; the financier receives fewer, larger instalments after a two-month deferral. Easi says
  the total paid is unchanged. This is cash accumulation before the first remittance, not
  evidence of the extra refundable reserve modelled by the Smart Leasing/MillarX correction.
- Removed the Easi-specific monthly-payment warning while keeping SG Fleet's. Updated Guided
  pointer, article, tests and private template KEY to accept either Easi figure. Targeted tests:
  116 passed; ESLint clean. Calculator rebuilt and Astro preview restarted on port 4340.
  Nothing pushed or merged.
10. Parked by the owner: Queensland Government "Summary Table" quotes
    (`~/novated-lease-guide/private/qld-summary-table/`).

## Walkthrough update, 16 Nov 2026

- Alliance Leasing: the owner chose page 2's “Budgeted Running Costs” table as the reference
  for finance payment, running costs and management fee. GST is shown separately there, so
  Guided says to enter those figures as printed with Excluding GST. A focused
  `page2-budget.webp` was cropped from the already redacted `page2-example.webp`
  (crop 738,321–1400,980; no original quote data) and is used for all three pictures. Page 3
  shows GST-inclusive alternatives under footnote 5, except vehicle registration; the article
  and payment tooltip explain this. Guided's conversion also preserves Alliance's explicitly
  ex-GST registration amount if a reader instead enters the page 3 figures with a GST credit.
  Keep the provider article, image manifest and Guided pointers in sync.
- `calculator2`: 448 Vitest tests pass; ESLint passes on the changed TS/TSX files; the changed
  site sync script passes `node --check`. Calculator built and Astro preview restarted on 4340.
- Alliance's focused page 2 crop is a special example; its payment, running-cost, management-fee
  and documentation-fee viewers now offer “Whole page” in the same window, using the redacted
  `page2-example.webp`, then “Focused view” to return. Special examples without a linked full
  page still show only their example.
- Alliance management fee: the extra “On Alliance Leasing quotes” sentence was removed from
  Guided as redundant beside the page 2 table. Its marked picture remains available.
- Autopia FBT base value: the quote visibly prints “base price”, but that line excludes GST.
  Guided now shows a marked crop of the redacted vehicle price breakdown and gives the
  quote-specific calculation: total onroad cost less registration and stamp duty. The article
  has numbered field 1 and an ATO source, while explaining that the final FBT base value is
  calculated, not printed. The crop was made from `autopia/redacted-quote.webp` at
  (50,280)–(665,615), with the base-price-through-LCT group outlined and labelled 1.
- Autopia drive-away pointer: removed the redundant “Confirm your quote includes GST” sentence;
  the quoted line is simply “total onroad cost”.
- Drive-away residual fallback: the “Not on your quote? Work it out from the residual” link is
  hidden in Guided when the reviewed provider guide gives a printed drive-away total or a clear
  sum of printed lines (20 providers, listed in `DRIVEAWAY_QUOTE_METHOD` in `providerGuide.ts`).
  It remains for Smart Leasing, Oly, Remunerator, Paywise, Prosperity Smart Drive, LeaseExpress,
  ORIX, RemServ and Other/unspecified. LeasePlan's reviewed sample lacks both a drive-away total
  and a residual, so the residual helper is also hidden there. This only changes which helper
  appears; drive-away calculations and the “Or add up the parts” option are unchanged.
  `calculator2`: 449 Vitest tests and changed-file ESLint pass. Calculator built and Astro
  preview restarted on port 4340.
- Autopia's “luxury non-deductible” line appears only in the ANNUAL payroll column. Guided now
  defaults the luxury adjustment to Per year when Autopia is selected with an empty answer,
  lets readers choose the adjustment's period separately, and converts the entered annual
  amount to the fortnightly value passed to Advanced. Existing saved amounts without an
  adjustment period retain the old finance-payment-period interpretation. The Autopia field
  pointer and article now say to enter the annual figure as printed. Targeted period, provider
  pointer and Guided-to-Advanced tests pass; changed-file ESLint and TypeScript pass. Calculator
  built and Astro preview restarted on port 4340. Full suite was not run for this small change.
- Guided payment screen: removed the “about $X per fortnight ex GST” subline under the
  effective interest rate. It confused readers of monthly quotes such as Autopia and did not
  add a useful input instruction. The rate itself and its calculation are unchanged.
- Guided payment GST question: a visible note now says to choose Excluding GST when a quote
  adds GST and then subtracts the same amount as an employer GST credit (ITC). The existing
  prompt to check the heading and footnotes remains when no provider payment pointer exists.
- Guided running-cost GST question: a proposed extra ITC hint was removed at the owner's
  request. The existing “Including GST” → GST-credit follow-up already handles those quotes.
- Clear Lease template cleanup: the three crude black marker strokes in the header, personal
  details box and page join were replaced with blank paper and neutral value bars in
  `docs/assets/images/quote-guide/clearlease/redacted-quote.webp`. The quote's labels and numbered
  markers remain from the original redacted template. `scripts/clean_clearlease_template.py`
  reproduces the cleanup using only that already-redacted 1400×3564 asset; if the private master
  is republished later, run the script again on the new redacted WebP. The public Astro asset is
  hardlinked to the tracked `docs` file. Visual inspection and a pixel check found no remaining
  near-black stroke pixels in the three cleaned areas. No private original was committed.
- Fingo naming: the provider picker, exported guide data, article section copy and guide index
  now use “Fingo” without “(Automotive Lease Packaging)”. This is a display-name change only.
  The calculator build regenerated those files; focused provider-picker/export tests (101)
  and changed-file ESLint passed. Astro preview was restarted on port 4340.
- Guided figure checks: amber and red computed findings now wait until a money input loses focus,
  including checks based on multiple fields. The input's unreadable-amount message also waits.
  Saved answers still show findings on return, and clicking Next checks the entered value after
  the input blurs. The focused Guided interaction tests (71), export test, TypeScript build and
  changed-file ESLint passed; Astro preview restarted on port 4340.
- Advanced entry: numeric fields still update linked calculations live, but their own clamp/error
  messages wait until blur. The vehicle-finance safeguard and high-rate note stay hidden while its
  amount is being edited; the lease-duration requote note likewise waits until blur. Rate-stepper
  buttons still update immediately. All 459 Vitest tests passed; the calculator built and preview
  restarted on 4340. Lint passed for changed files except five pre-existing rule violations in
  `LeaseRateGuard.tsx` (three react-refresh exports, one set-state-in-effect, one ref during render);
  with only those rules disabled for that file, lint passed.
- Quick Tour: the Guided introduction now says that naming a provider brings up redacted quote
  examples and flags entry slips. The Guided-card step explains the marked field lines, numbered
  guide and GST, payment-period and price-label traps. Copy only; no tour navigation changed.
  Render-smoke and provider-export tests, TypeScript build and lint with Tour.tsx's two existing
  set-state-in-effect violations excluded passed. Astro preview restarted on port 4340.
- FleetPartners GST presentation: on the reviewed "Your order" example, the quote's
  "Vehicle GST" total includes GST on CTP as well as on the vehicle subtotal. The engine uses
  FBT/vehicle base ÷ 11 (capped), so before separately financed fees it can derive a financed
  amount slightly higher than the quote's ex-GST drive-away by the GST on CTP.
  The owner preferred a footnote over changing the general engine. A brief tooltip on the
  FleetPartners drive-away pointer and a note in its article now explain the difference without
  publishing quote numbers. ATO guidance lists vehicle and CTP insurance GST separately.
  Provider-picker/export tests (101), changed-file ESLint and calculator build passed; Astro
  preview restarted on port 4340.
- FleetPartners FBT base value: the owner identified the "Vehicle" row's Total column in
  "Your order" → "Price specifications" as the GST-inclusive base before on-road charges.
  Guided now treats this as a located field, with a marked field 1 crop and full-page marker
  added to the already redacted quote. The article table uses the same row and no longer
  presents it as missing. Do not publish the owner's numeric screenshot or private original.
- Kooya management fee: removed the redundant “On Kooya quotes: If you see Administration fee...”
  pointer and its Show me link from Guided. The redacted example still marks field 10, and the
  article retains a plain table mapping from Administration fee to lease management fee.
- Advanced Details: all eight report sections now start collapsed, including Basic information
  and Section 2. A link to a specific Details section still opens that target. Every Guided →
  Advanced entry (header toggle, skip link, full-workings hand-off, and return to existing
  Advanced figures) now selects Details on arrival; a direct Advanced load still starts on
  Summary. Focused interaction tests cover the initial state and three entry paths.
- LeaseExpress drive-away guidance: the article now explicitly says readers can use the
  residual value and percentage in Guided's “Not on your quote? Work it out from the residual”
  helper. The drive-away trap text also mentions this fallback; “Vehicle finance amount” remains
  excluded as the drive-away price.
- LeaseLab drive-away location: both components are on page 1 but far apart: “GST Saved on Car
  Price” in the top-right savings tile and “Novated Vehicle Price” lower down in Vehicle
  Information. Guided and the article now name both locations. The already-redacted full page
  has marker 2 on both lines, with a stacked focused crop; no quote amounts were published.
- LeasePlan source attribution: the Aug 2025 Reddit comparison post 1n16kcg has two images.
  Image 0 (“Your quote details”) is the source of the LeasePlan guide; it says “Insurance -
  LeasePlan Supplier” and matches the same layout in post 1mfmtsg, whose page footer explicitly
  names LeasePlan Australia Limited. Image 1 (“What are my running costs?”) is unbranded in the
  crop, but its distinctive table matches a branded Inside Edge quote in post 1t2cg4z.
  The article now states this provenance and links the supporting posts.
- Inside Edge guide: added to Guided and the provider index, with per-field pointers and a
  standalone article. The public numbered sample combines “The Basics” and “The Details” from
  the *same* quote (post 1p2wqvv); layout was checked against later branded examples in
  1t2cg4z and 1t9nkbk. The private originals were never added to git. The redacted public
  WebP pages and field crops are reproducible with `scripts/build_insideedge_template.py`.
  “Purchase Price” on Basics is the on-road price in the checked examples, but the pointer asks
  readers to confirm discounts/on-road costs on their own quote; Details' ex-GST price is not
  used for drive-away. Use the explicitly ex-GST residual on Details. Recurring “Finance
  Documentation” goes with management fees, not the one-off documentation box. The Basics
  page supplies the finance payment and running-cost budgets; Details supplies FBT base value
  and annual kilometres. Months deferred is not printed on this sample. The local preview is
  `http://10.1.1.108:4340/start-here/how-to-read-insideedge-quote/`; Guided is at
  `http://10.1.1.108:4340/calculator/`. Provider tests (101), changed-file lint and calculator
  build passed. The full Astro build reached its OG-image route, then failed because the
  sandbox could not resolve `cdn.jsdelivr.net`; the local article returned HTTP 200.

## 16 Nov: LeasePlan removed

- SG Fleet (owner of LeasePlan Australia since 2022) moved LeasePlan's novated customers onto
  its own systems in Oct 2025 and decommissioned LeasePlan Online; its FAQ says "LeasePlan
  Australia is now known as SG Fleet". The archive has no LeasePlan-format quote after Sep 2025,
  and later "LeasePlan / SG Fleet" quotes (e.g. post 1oi1kdd) use SG Fleet's layout. Nobody can
  get a LeasePlan quote now, so the owner asked to delete every trace rather than alias it.
- Removed: the picker entry, guide, trap/not-shown/running-layout entries and the residual-helper
  exception; the article, index link, redacted images and manifest entries; the sync-table and
  freshness-check entries. The sync scripts' provider counts are now 29. The 12-month "old guide"
  mechanism stays (no guide currently triggers it); its tests now use FleetPartners and a fake date
  with Inside Edge. Private `running-layout/runlines.json` still lists LeasePlan and lacks Inside
  Edge (hand-added to `runningLayout.ts` in 25e5c4f4, with "Comp Insurance Provision" instead of
  the generator's "Insurance"): reconcile before regenerating.
- Provider tests (113) and changed-file ESLint pass; calculator built; preview restarted on 4340.

## 16 Nov: CarBon added

- Owner asked for CarBon (CarBon Leasing and Rentals Pty Ltd). Three distinct quotes in the
  archive share one layout: `1s8dvmb` (Mar 2026, branded, weekly), `1tglqjr` image 2 (May 2026,
  a comparison post; the same quote is re-posted in comments on `1tferlm`, downloaded privately to
  `private/quote-review-2026-11/comment-images/`) and `1xgrene` (Oct 2026). The OCR provider
  guesser had missed them all. The `CarBon_Novated` Reddit account is a CarBon rep; on `1xgrene`
  it said the $0 management fee was because another company would manage the lease.
- Public sample: `scripts/build_carbon_template.py` redacts `1s8dvmb_0` (header contact block,
  car name, vehicle details, every figure via OCR, the savings panel by hand), marks fields
  2, 3, 6, 7, 8, 9, 10, 11 and writes 9 WebPs plus the manifest entries. OCR of the outputs finds
  only marker numbers and the generic "$5 monthly Fleet Card Fee" disclaimer.
- Guidance: payment is "Finance" in "Budgeted Running Costs (Excluding GST)", not "Lease payment"
  (amber trap); the period is the printed "Payroll Cycle"; residual is inc GST; term and km are in
  the first sentence. Drive-away is printed on only one quote, so the residual helper stays.
  FBT base value, deferral and doc fee are not printed; the doc-fee line asks CarBon for the
  amount financed and any establishment fee (a Reddit customer reported brokerage, originator
  and establishment fees in a CarBon loan, `1t3vu6z`). "Exclusions" lines are not budgeted:
  enter expected spend (existing "Not included" rule). "Finance Management Fee" (March and May
  quotes, no amount) is unexplained: the fee tooltip says to ask CarBon.
- Sync-script provider counts are now 30; freshness check has CarBon labels; private
  `runlines.json` has CarBon. Provider tests (114), changed-file ESLint and calculator build
  pass; preview restarted on 4340; the walkthrough page (:4343) rebuilt with 30 providers.

## 16 Nov: walkthrough server moved back to the private folder

- The :4343 walkthrough server had been started from an old session scratchpad copy
  (`/private/tmp/.../e7e9dd65-.../scratchpad/provider-walk`), so rebuilding the private
  `provider-walk/index.html` didn't change what the owner saw, and the owner's marks
  (16 providers "good", Alliance through LeaseLab) were saved only in that copy. Merged them into
  `private/quote-review-2026-11/provider-walk/feedback.json` (backup of the previous file:
  `feedback.before-merge-2026-11-16.json`) and restarted `server.py` from the private folder.
  Always run it from there.

## 16 Nov: effective-rate note placement

- On the Payment screen, the rate verdicts (`rate_high` BYO suggestion, `rate_unusually_low`,
  `rate_typical`) now show under the “Effective interest rate” box instead of under the amount
  box, above the period and GST questions (owner request). Entry slips such as `payment_too_high`
  stay under the amount. Notes still wait until the amount input loses focus (the whole finding
  map is emptied while typing). New ordering test; 176 related tests and lint pass.

## 16 Nov: Lendly drive-away and FBT base value reconciled

- On the reviewed Lendly quote (`1wus9yl`), Drive Away $59,534.35 − GST Tax Credit $5,311.54 =
  $54,222.81, but “Total Price (ex. GST)” is $56,712.80. The $2,489.99 gap is the add-ons the
  “Lease^” footnote lists (tint, dash cam, Scratch & Dent membership), financed outside the
  drive-away price. On `1t93tpn` (May 2026, extras inside the drive-away) the block adds up to
  the cent, so that quote is now a second Lendly source. Using the printed drive-away price had
  Guided understate the amount financed by ~$2,490 and show ~13.7% instead of ~11.9–12.1%.
- Drive-away pointer is now “Add ‘Total Price (ex. GST)’ and ‘GST Tax Credit’”; Guided then derives
  exactly $56,712.80. The residual implies a base of $56,949.27 ex GST (another $236.47,
  probably a financed fee, not named on the quote): left alone.
- FBT base value: Lendly's page 7 statutory “Taxable Value” $11,685.39 ÷ 0.2 = $58,426.95, equal to
  GST credit × 11 to the cent. Pointer keeps × 11; the cap fallback is now Taxable Value ÷ 0.2.
- Lendly's full page and drive-away crop re-marked by `scripts/remark_lendly_driveaway.py`
  (one-shot; works on the committed redacted page, re-copies only the printed words “Drive Away^”
  from the private source because the old outline crossed the “y”). OCR finds no figures.
  The Lendly article states the payment's GST basis isn't labelled; the “Less GST Savings” line
  suggests it is ex GST, but that wording was not changed.
- Simplified (owner): Lendly's FBT base value line is now “Find ‘GST Tax Credit’. Less than
  $6,353? Multiply it by 11. At $6,353, the maximum? Multiply ‘Taxable Value’ by 5.” (× 5, not
  ÷ 0.2, at the owner's request.) Its picture `lendly/field-base-value-methods.webp` stacks the
  GST Tax Credit crop and a redacted “Taxable Value” crop from page 7, each with a plain label;
  built by `scripts/build_lendly_base_value.py`. OCR finds no figures.
- Lendly payment GST: page 3's “Pre-tax salary sacrifice” $1,547.47 = running costs + Lease +
  Licence Fee − GST savings; PAYG savings = 39% of it; A+B is the take-home drop. GST savings
  ($44.51) is about the GST on running costs alone, so the $1,067.35 Lease is ex GST. Per the
  owner's rule not to state a provider's GST basis as fact, the new payment pointer gives a check:
  “If ‘Less GST Savings’ is less than a tenth of ‘Lease’, choose Excluding GST.” Article table
  row 7 now syncs from it (`sync-provider-tables.mjs`), replacing “choose I'm not sure”.
- Lendly article: new “Reading the monthly costs page” section (owner wording): on the quote
  seen, “Lease” is already ex GST while running costs include GST, so “Less GST Savings” is about
  1/11 of the running costs; A+B is the figure to compare; “Net lease costs (B)” isn't the lease's
  cost; pre-tax deduction = A + Lease + Licence Fee − GST savings. The payment tooltip says the same.
- Correction (owner spotted): Lendly's “Less GST Savings” $44.51 is exactly Total running costs
  (A) $489.63 ÷ 11, registration included; nothing for Lease or Licence Fee. Article and tooltip now
  say “exactly 1/11”, and the article notes this may overstate the GST credit by a few dollars a
  month (rego has little or no GST). The Licence Fee is not explained on either quote, Lendly's
  site or Reddit; Guided keeps treating it as a management fee.

## 16 Nov: no "typical estimate" note on the kWh price

- The charging-price quick-picks (feed-in tariff, off-peak, standard, public) mark the value as
  estimated, which showed “Typical estimate, not from your quote…”. The price is the reader's own
  tariff and never on a quote, so `MoneyInput` now accepts `estimatedNote={null}` to hide the note,
  and the kWh field uses it. The estimated flag on `chargingRate` drives nothing else. New test.

## 16 Nov: take-home tooltip, GST bullet

- The results take-home tooltip has a third check (owner request): providers treat GST on lines
  such as registration or insurance differently, while the engine applies one GST multiplier to
  every running cost except electricity (`calculator/src/engine/worksheet_130.ts`), so small
  differences are normal. Lendly, for example, credits 1/11 of all running costs, rego included.

## Handover, end of 16 Nov session (for Codex)

State: branch `codex/provider-guide-completion`, 260 commits ahead of `main`, worktree clean,
nothing pushed or merged. Full suite: 462 Vitest tests pass (35 files). Preview: Astro on 4340,
walkthrough `server.py` on 4343, both on `0.0.0.0`. Tailscale address is now **100.102.139.46**
(was 100.95.205.3); MagicDNS name `mac-mini.tailbb9ee.ts.net`.

This session's commits (oldest first), each detailed in a section above:
1. `4872a7f8` LeasePlan removed entirely (no alias): SG Fleet absorbed it, Oct 2025.
2. `0c229ecb` CarBon added: 3 quotes, `scripts/build_carbon_template.py`, article, pointers.
3. `5f7474f0` Walkthrough server moved back to the private folder; owner's 16 "good" marks merged.
4. `08a8c4e8` Payment screen: rate verdict (BYO suggestion etc.) under the effective-rate box.
5. `cb283a75`, `38e80bf3`, `fa0146b0`, `ddfcd9b6`, `5db4f372` Lendly: drive-away = Total Price
   (ex. GST) + GST Tax Credit (re-marked image); FBT base value = credit × 11, or Taxable Value × 5
   at the cap (stacked picture); payment GST check; "Reading the monthly costs page" section.
6. `8483bcbb` No "Typical estimate, not from your quote" note on the kWh charging price.
7. `71b24796` Take-home tooltip: third bullet on per-line GST treatment (applies to all providers).

Open items (not started; raise with the owner):
- `TO_REVIEW.md` and `PROVIDER_GUIDE_MERGE_CHECKLIST.md` still mention LeasePlan and "27
  providers"; there are now 29 named guides (30 with Other). Tidy before merge.
- Inside Edge's running layout is hand-added to generated `runningLayout.ts` and missing from
  private `runlines.json`; its insurance box says "Comp Insurance Provision", breaking the
  always-"Insurance" rule. Regenerating would change visible wording: ask first.
- CarBon: "Finance Management Fee" (Exclusions, no amount) unexplained; tooltip says ask CarBon.
- Lendly: $236.47 extra in the residual base (probably a financed fee) unexplained; "Licence Fee"
  meaning unconfirmed (treated as a management fee).
- Owner is mid-walkthrough on :4343; wait for the next review point and check code + source quote
  before changing guidance. Rules at the top of this file still apply (merge only on "merge",
  merge commit not squash, no prepare-content.mjs, no `.astro/`, no unredacted images).

## 16 Nov: walkthrough template images repaired

- The private `provider-walk/assets` symlink was missing, so NLA's template images (and likely
  other providers' published pictures) returned 404 in the walkthrough. Recreated it pointing
  to this worktree's `docs/assets`. The NLA full quote and field images exist; both the full
  quote and running-cost crop returned HTTP 200 on the walkthrough server, including at
  `http://10.1.1.108:4343/`. This is private server setup, not a public asset change.

## 16 Nov: private subreddit quote archive backfill

- The private Arctic Shift archive in `private/quote-review-2026-11/data/all.json` now has
  2,547 posts, from the archive's first r/NovatedLeasingAU post (1 Jul 2025) through its
  latest available post at 16 Nov 2026 12:50 UTC. Added 51 posts since the earlier 11 Nov pull.
- `private/quote-review-2026-11/scripts/backfill_gaps.py` expanded `data/imgposts.json` to
  1,195 indexed image-bearing posts and attempted 837 missing image slots. It saved 140 valid
  JPGs, leaving 2,123 JPG files across the `images-*` folders. The 697 failed links all
  returned HTTP 404 on a second check; 309 indexed image-bearing posts still have no local
  JPG. Some of those posts are not quote posts. Original JSON backups and the detailed
  `reports/backfill-2026-11-16.json` audit remain private.
- Ran `freshness_check.py --no-pull --since-days 7` to OCR all collected images and write
  `reports/freshness-2026-11-16.md`. Its “0 new images” line means none were downloaded in
  this *second* pass; the backfill just before it saved 140. The OCR-based provider flags
  need visual review and did not trigger any public guidance changes. The post scraper
  covers submissions, not image-bearing comments or deleted uploads. No private image or
  post data was committed to the public branch.

## 16 Nov: NLA payment GST subtotal hint

- On NLA source quote 1xs3una, the “Gross fortnightly rental” rows before GST sum to
  $659.34 and the GST row is $65.93, 10% after rounding. The gross rental including GST
  is $725.27. Guided now explains under “Does the payment include or exclude GST?” that
  readers should choose Excluding GST **if their own table adds up the same way**. The
  payment pointer and article also direct readers to the subtotal rather than claiming
  every NLA quote has one GST basis. No quote numbers appear in the public copy. The
  focused provider tests (100), changed-file ESLint and calculator build passed; Astro
  preview restarted on 4340. Full suite was not run for this small change.

## 16 Nov: private comment-image archive backfill

- Searched the Arctic Shift r/NovatedLeasingAU comment archive for `preview.redd.it` links.
  Found 506 image-bearing comments and saved 340 valid JPGs under the private
  `comment-images-YYYY-MM/` folders; OCR text is in `comment-ocr/`. These are separate from
  the 2,123 submission JPGs. A second HEAD check returned 404 for all 165 failed links;
  one other linked image was under 100 pixels and was excluded.
- Private script: `scripts/backfill_comment_images.py`. Private audits:
  `reports/comment-image-backfill-2026-11-16.json` and
  `reports/comment-image-link-status-2026-11-16.json`. This fills an important gap in the
  earlier submission-only archive, but does not prove every historical quote image is
  recoverable. No private comment data or images were committed to this branch.

## 16 Nov: illustrated GST subtotal checks

- Under “Does the payment include or exclude GST?”, NLA now has a “Show me” control after
  the conditional GST hint. It shows the relevant part of the existing redacted quote in
  the **right-hand provider panel on desktop** (inline only at phone width), boxes the GST
  amount, and states that GST is 10% of the other rental lines above.
- The same control appears for reviewed Alliance Leasing, Easi, Clear Lease and Fingo examples.
  Alliance's GST is 10% of “Lease total”; Easi's “GST per Month” is 10% of its monthly
  ex-GST lease; Clear Lease's GST is 10% of the finance, GAP and other budget lines
  combined; Fingo's GST is 10% of “Sub Total”. These were checked against the source
  quotes. The copy tells readers to
  match their own quote rather than asserting one basis for every quote from a provider.
- The illustrations use inline SVG viewports over existing redacted assets; no original
  amounts or identifying details were published. Focused provider tests (105),
  changed-file ESLint and calculator build passed. Astro preview restarted on 4340.

## 16 Nov: GST credit answer example

- On the Running costs screen, the Yes answer to “is a GST credit taken off the running
  costs?” now gives both “Less GST credit” and “Input tax credit” as possible printed
  line names. This is a copy-only change; the calculation is unchanged.

## 16 Nov: running-cost period copy

- Removed “Use whichever your quote shows. All the boxes below use it.” below the
  running-cost period choices to reduce clutter. The choices and calculation are unchanged.

## 16 Nov: running-cost GST choice copy

- Removed the redundant “Amount ex GST” and “Amount inc GST” bylines beneath the
  Excluding GST and Including GST choices. Kept the “I can't see it” assumption.

## 16 Nov: kilometres help pointer

- Removed “How do I use my current driving to estimate this?” from the Running costs
  screen. The kilometres field and provider-specific quote pointer remain.

## 16 Nov: NLA administration fee period

- The reviewed NLA quote (1xs3una, page 2) prints “Administration (fixed)” in the
  Gross fortnightly rental table, before the separate GST line. Its Annual budgets
  (including GST) section does not repeat this fee. The Running costs fee pointer is
  now amber: for Per year and Including GST, multiply the fortnightly fee by 26 and
  then 1.10. Its tooltip covers other period/GST selections. The generated NLA article
  also gets this warning. The calculation engine is unchanged.

## 17 Nov: private provider image sort

- User requested a cheap, autonomous sort of the local Reddit image archive. Private
  `scripts/sort_images_by_provider.py` indexed 2,465 JPGs (2,123 submission images and
  342 comment images, including two older comment files). Originals remain in place;
  `provider-sort-2026-11-17/` contains 2,465 symlinks grouped by provider, context-only
  candidates, or review status. The CSV/JSON index and count report are under private
  `data/provider-image-index-2026-11-17.*` and
  `reports/provider-image-sort-2026-11-17.md`.
- Results: 1,000 single-provider OCR matches, 3 exact previously reviewed source images,
  374 context-only candidates, 57 multi-provider ambiguous, 806 unidentified, and 225
  unlikely to be quotes. The three reviewed overrides distinguish Prosperity Smart Drive
  from generic “lease plan” wording, and the Vehicle Solutions versus Smart Leasing
  images in one comparison post. Recovered OCR for two older comment images and 18 Kooya
  images whose filenames collide with dated images; `ocr-kooya/` keeps those separate.
  The labels are heuristic and image counts are not quote counts. No private image or
  index was committed to the public worktree; no calculator guidance changed.

- Follow-up audit corrected two private sorting rules: “Macquarie Park” in an ORIX
  address is not the Macquarie provider, and “payable to ALP” identifies the Fingo/ALP
  quote layout. After refreshing the sort, 1,006 images have one OCR provider match,
  3 have exact reviewed-source overrides, 373 are context-only candidates, 51 contain
  multiple provider names, 807 are unidentified and 225 are unlikely quotes. There are
  32 labels with OCR/reviewed-source images: the 30 active guides plus Smartsalary
  (Smart Leasing alias) and retired LeasePlan/Ayvens. RACV appears only as a context
  candidate, with no provider match in the image itself. These remain heuristic counts.

## 17 Nov: CarBon representative comments archived privately

- `u/CarBon_Novated` comments were fetched from Arctic Shift for 14 locally identified
  CarBon-related threads, including the three guide quote sources, the reposted-quote
  thread, and the financing-fee discussion. There are 11 comments in 5 threads.
  The private archive has `scripts/archive_carbon_comments.py`, the linked report
  `reports/carbon-novated-comments-2026-11-17.md`, and structured records in
  `data/carbon-novated-comments-2026-11-17.json`. No comment text or private assets
  were added to this public worktree.
- On `1xgrene`, the account says the quoted finance rate is 7.49%, its effective
  rate is capped at 8.95%, and CarBon is not managing that particular lease (the
  reason given for a $0 management fee). These are account statements, not
  independently verified provider policy; the guide's existing $0-fee explanation
  is consistent. The other comments discuss effective rates and competing quotes.

- Owner clarified the scope: include the account's comments on **any** thread in
  r/NovatedLeasingAU, not only CarBon-related threads. The private script and files
  above were expanded and replaced. The complete Arctic Shift author search returned
  386 comments across 265 threads, dated 28 Apr–16 Nov 2026. All 265 threads are in
  the local post archive. Eleven comments remain on the previously identified
  CarBon-related threads. This is an archive result, not a guarantee that deleted or
  otherwise missing Reddit comments are recoverable. No calculator guidance changed.

## 17 Nov: EV FBT introduced-bill update

- Owner requested an update from Treasury's September exposure draft to Schedule 5 of
  Treasury Laws Amendment (Tax Reform No. 4) Bill 2026. The bill was introduced
  27 Oct, passed the House 29 Oct and was introduced in the Senate 16 Nov; as checked
  17 Nov it is not law. Parliament's PDF endpoint returned HTTP 403 from this
  environment; the changes were checked against the owner's item-level comparison,
  Treasury consultation, indexed bill text, ATO's legislation-status page and
  parliamentary proceedings. Do not describe the bill as enacted.
- Updated the main phase-out guide and related site/calculator copy. Key differences:
  Schedule 5 items 12 and 15 permit additional grandfathering by ministerial
  legislative instrument only until 1 Apr 2032 (none assumed or found); item 10
  adds s 135Q(4A) for reportable amounts; items 13–14 use the 25% times qualifying
  days / total car-benefit days proportion after Apr 2029; proposed s 9A keeps the
  earliest-holding-time base-value test and omits the old 1 Jul 2022 and never-paid-
  LCT tests. The calculator still models the bill's default tiers using lease start
  date as a commitment-date proxy; it does not model future instruments or the
  special s 135Q case.
- Checks: 469 calculator tests passed; targeted phase-out and render tests passed
  after the final UI wording change; calculator and Astro site builds passed.
  Changed-file ESLint passed except for seven errors in `shared.tsx` that are
  identical on HEAD and predate this edit. `git diff --check` passed.
- The owner explicitly asked to **commit and push this update**. This supersedes
  the old no-push rule for this review branch only. Do not merge into main or push
  main without a separate "merge" instruction. The calculator preview was restarted
  at http://100.102.139.46:4340/calculator/ after its build.

## 17 Nov: financed first-year insurance quote pictures

- Oly and Maxxia Guided lease screens now show a dedicated right-panel crop when
  the first-year insurance question or amount box is focused. The marked crops
  come from the already published, redacted quote pages; they distinguish the
  one-off financed premium from the renewal budget. The crops are reproducible
  with `scripts/make_financed_insurance_crops.py`.
- Smart Leasing's reviewed quotes show comprehensive insurance among running
  costs, and the inspected terms say it is excluded from the financed amount.
  There is no comparable first-year financed-premium picture or question for Smart.
- The pre-signing checklist already warns that financing insurance adds interest
  and can increase the early-termination payout; it suggests considering running
  costs. It does not currently present a specific benefit of financing year one.
- Focused provider-picker tests: 109 pass. Changed-file ESLint and calculator
  build pass. No private quote was copied into the repository. This review fix
  has not been pushed or merged.

## 17 Nov: more RemServ quotes in the private walkthrough

- The private `provider-walk/build.py` now adds seven more RemServ Reddit posts
  to the :4343 walkthrough, for eight posts and 12 source images total. Duplicate
  pages and non-RemServ pages in mixed posts are filtered. The HTML was rebuilt,
  all linked local images exist, and :4343 serves the new post IDs.
- This changes the private review page only; no unredacted image is in Git and
  the public RemServ article or Guided instructions have not changed.
- **Correction to the earlier first-year insurance assessment:** RemServ posts
  `1t4254u` and `1tcq1nr` clearly list “1st year Comprehensive Insurance” in
  the amount financed. At that point Guided asked the financed first-year
  insurance question only for Oly and Maxxia; the next section records the
  RemServ fix.

## 17 Nov: RemServ alternate-format guidance (committed next)

- Reviewed the older summary table in Reddit post `1rpt6ql` and the detailed
  lease and deductions pages in `1t4254u`. The short estimate, summary table
  and detailed breakdown are three distinct layouts. The summary's “Total
  Vehicle Costs” includes first-year insurance and must not be copied as the
  drive-away price. The detailed page prints separate FBT, purchase, residual,
  establishment and financed first-year insurance rows. The deductions page
  prints ex-GST and inc-GST columns for finance and running costs.
- Added redacted full-page and focused examples in `docs/assets/images/quote-guide/remserv/`.
  `scripts/build_remserv_alternate_templates.py` recreates them from the local
  private archive. All public pages have answers masked; OCR found no dollar
  amounts. The full-page views and focused crops share numbered orange boxes,
  including field 1 on “Vehicle FBT Base Value”. A user's phone screenshot
  caught the missing full-page marker before commit.
- Guided now shows the separate financed first-year insurance question for
  RemServ, counts that premium once, and preserves registration as printed
  beside inclusive-GST running costs. RemServ pointers, running-line order and
  the article distinguish the layouts and conditional GST columns. Do not
  infer skipped finance payments merely from “two-month deferred structure”;
  ask or choose Not sure when the payment schedule is absent.
- Updated private generation sources `private/quote-review-2026-11/running-layout/runlines.json`
  and `private/quote-review-2026-11/provider-walk/runlayout_gen.py` for RemServ's
  detailed running-cost labels. These private files are outside this worktree.
  Rebuilt the private :4343 walkthrough to show the new public templates.
- Checks: 158 focused tests passed across four files, changed calculator
  ESLint passed, calculator build/export/prebuild passed, prior Astro build
  passed (85 pages), and `git diff --check` passed. The :4340 calculator was
  restarted and serves the annotated image with HTTP 200. No push or merge.

## 17 Nov: RemServ net-of-residual summary variant (committed next)

- Reviewed Reddit post `1x6eio8` and all three split screenshots in the private
  archive. The :4343 walkthrough had shown only image 2; private `provider-walk/build.py`
  now includes images 0, 1 and 2 and was rebuilt. The public guide now counts
  four reviewed RemServ posts, latest November 2026.
- The summary's printed “Total Amount Financed” formula subtracts residual
  value. The older `1rpt6ql` summary has the same formula, but the detailed
  `1t4254u` layout uses that label differently. Guided takes drive-away price,
  upfront fees and residual in separate boxes; entering the summary's net
  total as drive-away can inflate the derived interest rate. Added a second
  RemServ drive-away pointer with a redacted, numbered extract showing that
  formula. The article explains the variant and links the Reddit post.
- The quote's Supplier Margin note says it is excluded from the financed total,
  while the printed formula adds it. The fee tooltip and article flag this
  inconsistency and advise checking whether it is financed before counting it
  once. No specific effective rate was inferred from the quote.
- `scripts/build_remserv_alternate_templates.py` creates the new public extract
  from the local private screenshot, masks all answer amounts, and records the
  image size in the manifest. OCR found no dollar amounts in the output.
  `sync-provider-traps.mjs` now includes both pointers for a field in one
  article bullet; the guide export keeps the first pointer as its main text.
- Checks: calculator build/export/prebuild passed, 112 focused tests passed,
  changed calculator ESLint and `git diff --check` passed. No full suite, push
  or merge.

## 17 Nov: RemServ “Total Vehicle Costs” as the summary price

- Owner reviewed several RemServ formats and decided the bold “Total Vehicle Costs”
  is the summary's drive-away figure. Guided and the article now point directly to
  it on the March and November summary layouts. Their marked redacted crops box
  the total instead of the earlier vehicle-cost rows. The March FBT marker and
  first-year insurance marker were corrected on its redacted page.
- The summary total already contains the financed first-year insurance. Guided
  now asks which RemServ price was entered: “Total Vehicle Costs” or the detailed
  “Vehicle purchase price”. For the summary choice, it subtracts the entered
  premium internally from vehicle drive-away before the car GST and finance
  calculations, then adds that premium once as financed insurance. The detailed
  choice retains the earlier calculation. Existing saved drafts have no choice
  until the reader selects one, avoiding a silent change in their numbers.
- The unexplained differences between visible summary rows and printed totals
  remain in the article as an optional itemisation check; they no longer block
  using the bold total. “Total Amount Financed” remains net of residual and must
  not be used as the price. No private source image was committed.
- Removed the two obsolete RemServ crops that boxed the wrong rows and rebuilt
  the private :4343 walkthrough. Calculator build/export/prebuild passed;
  158 focused tests and changed calculator ESLint passed. Astro preview on
  :4340 was restarted and returned HTTP 200. No full suite, push or merge.

## 17 Nov: RemServ summary price guidance refinement (committed next)

- Owner's screenshot showed that the drive-away field opened a detailed lease
  picture even when the reader had the `1x6eio8` summary table. That made the
  two amber notes hard to act on. Guided now leads with the summary's “Purchase
  Details” rows. The initially published text treated Vehicle Cost alone as
  drive-away when visible on-road rows were zero; the next section corrects
  that conclusion after reconciling the split screenshots.
- Added a redacted full summary page and a focused price crop from `1x6eio8_2`,
  with the included rows boxed and insurance outside the box. The detailed
  lease page remains a second, plain location pointer. The article now states
  the zero-on-road shortcut. The separate net-finance extract stays in the
  article. OCR found no dollar amounts in either new public image.
- Checks: calculator build/export/prebuild passed, 112 focused tests passed,
  changed calculator ESLint and `git diff --check` passed. No full suite, push
  or merge.

## 17 Nov: correction to RemServ drive-away inference (committed next)

- Rechecked all three `1x6eio8` images. The posted top section ends after
  “Initial Roadside Assistance”; the next screenshot begins with “Total Vehicle
  Costs”. The visible amounts are Vehicle Cost $32,711 and first-year insurance
  $1,444.80, while Total Vehicle Costs is $34,609. The unexplained gap is
  $453.20. No posted image identifies the missing line. The total includes
  insurance and is not a confirmed drive-away price. Vehicle Cost alone is
  likewise not confirmed as drive-away until the gap is explained.
- Corrected the Guided price pointer, picture caption and RemServ article.
  They now direct readers to the visible Purchase Details rows, warn against
  using Total Vehicle Costs, and ask for the omitted item and a full on-road
  price including GST. Removed the incorrect zero-on-road shortcut for this
  quote. The redacted picture itself remains valid.
- Checks: calculator build/export/prebuild passed; 112 focused tests, changed
  calculator ESLint and `git diff --check` passed. No full suite, push or merge.

## 17 Nov: second RemServ summary reconciliation and more review sources

- Owner supplied the full `1rpt6ql` summary. Its visible Purchase Details rows
  total $46,605.50 vehicle cost + $1,486.74 first-year insurance = $48,092.24,
  but “Total Vehicle Costs” is $48,990.00: an unexplained $897.76 gap. The
  latter includes insurance and is not a confirmed drive-away price; neither
  is Vehicle Cost confirmed until the gap is itemised. The article and Guided
  tooltip now say both reviewed summary tables have unexplained gaps.
- The quote defines “Total Amount Financed” net of residual. Its printed
  inclusive-GST arithmetic is $26,809.18 + $23,078.30 residual = $49,887.48,
  which is $897.48 above Total Vehicle Costs, consistent with unitemised margin
  and fees in the printed formula. Do not divide only the residual by 1.1 in
  this check. Adding the premium again to Total Vehicle Costs double-counts it;
  subtracting FBT base ÷ 11 assumes a GST credit not printed in this summary.
  These reconciliations still do not identify the drive-away price.
- Updated the private :4343 `provider-walk/build.py` RemServ queue from eight
  posts to 13, with 25 original quote images. New posts: `1r2tn1w` (Sealion 7),
  `1tppq58` (BYD Seal), `1upgaoy` (Zeekr 7X), `1uv3aj6` (Ora 5, two terms),
  and `1lfz51n` (Polestar 4, r/AusFinance). Only RemServ pages 0, 2 and 3
  from the last mixed post are included; duplicate dealer pages are excluded.
  The `1upgaoy` poster's two detailed summary pages from their Reddit comments
  were downloaded privately and added to that post's gallery. New posts are
  marked “Added 17 Nov” on the walkthrough page.
  Also restored the second distinct `1x9tyqk` page. Rebuilt `index.html` and
  verified all 13 source entries and local images; the new Reddit links were
  spot-checked. These private files are outside Git and must never be published.
- Checks: calculator build/export/prebuild passed, 112 focused tests passed,
  changed calculator ESLint and `git diff --check` passed. No full suite, push
  or merge.

## 18 Nov: RemServ supplier margin and “Total Amount Financed”

- Owner's analysis of a disclosed RemServ quote found the supplier margin
  matches finance brokerage over the lease term ($588.28/year × five years ≈
  $2,941.41). This supports treating it as already priced into the finance
  payment in that example, not automatically adding it as an upfront fee.
  RemServ's public credit guide discusses commissions but does not define the
  “Supplier Margin” label. The article and Guided fee tooltip now say to enter
  it separately only if RemServ confirms it is an additional financed amount.
- The summary's “Total Amount Financed” deducts residual value; its printed
  formula includes Supplier Margin but omits the separately printed Upfront
  GST Savings, and an adjacent note says the financier excludes the margin.
  The article now states plainly that adding residual back is only a check of
  the printed formula and does not reliably recover conventional loan principal.
  Continue using the separate price, residual, insurance, fee and payment lines.
- Checks: 111 focused provider tests and changed calculator ESLint passed;
  calculator build/export/prebuild and `git diff --check` passed. Rebuilt the
  private walkthrough and restarted Astro :4340. No full suite, push or merge.

## 17-18 Nov: Toyota Fleet deferral pointer reworded

- Owner asked why Toyota says “Straight away”. Source `1x9tvny` is a FleetPartners vs Toyota
  comparison post; only image 1 is Toyota. Its page shows no deferral or payment count, but the
  printed 8.86% rate, $55,665.96 financed and $30,698.08 ex-GST residual give exactly the printed
  Rent $1,365.70 with 24 monthly payments in arrears (22 payments deferred 2 months would be
  ~$1,501). TFM Novated's site says nothing on timing. Pointer now: “No deferral is shown. Choose
  ‘Straight away’: on the quote we checked, ‘Rent’ matches the printed rate with payments from
  month 1.” `QUOTE_FORMAT_ISSUES_2026-11.md` issue 7 wrongly lists “with deferred payments” under
  Toyota Fleet; that wording is the FleetPartners quote's. Not yet corrected.
- Committed with index-only patches because uncommitted RemServ work (not this session's) was in
  the worktree; `docs/assets/calculator/main.js` was rebuilt but left uncommitted with that work.

## 18 Nov: Codex's uncommitted RemServ insurance work folded in (Claude)

- Found uncommitted Codex work (owner not using Codex today): RemServ first-year insurance no
  longer assumed financed. Summary `1qbn7bf` (Qld Gov template, Jan 2026) prints “Not Financed”
  beside “Initial 12 Months Comprehensive Insurance”; new redacted crop
  `remserv/field-alt-insurance-not-financed.webp` (built by `build_remserv_alternate_templates.py`,
  OCR finds no figures); `1qbn7bf` added as a fifth RemServ source.
- Kept: summary rule (“Not Financed” → No; no status → Not sure), drive-away tooltip no longer
  claims the summary total includes the premium (its Total Vehicle Costs doesn't reconcile with
  the visible rows either way).
- Corrected Codex's detailed-page softening: on `1t4254u` the listed lines add up exactly to
  “Total amount financed” ($87,986.00 − $6,334.00 + $437.82 + $2,395.31 first-year insurance +
  $3,893.92 + $952.77 + $3,262.06 = $92,593.88), so on that layout the premium is financed: the
  pointer, the RemServ hint on the lease page and the article now say Yes for the detailed page.
- Tests updated (the insurance side panel now opens on the Not Financed crop; 5 sources; new
  article sentence). Full suite 478 passed; changed-file ESLint and `git diff --check` clean.
