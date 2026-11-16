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
