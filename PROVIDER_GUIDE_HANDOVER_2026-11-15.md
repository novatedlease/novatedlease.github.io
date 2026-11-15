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
- `calculator2`: 447 Vitest tests pass; ESLint passes on the changed TS/TSX files; the changed
  site sync script passes `node --check`. Calculator built and Astro preview restarted on 4340.
