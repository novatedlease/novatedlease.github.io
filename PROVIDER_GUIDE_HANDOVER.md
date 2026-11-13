# Provider guide worktree handover

This file continues the private handover at `/Users/changyang1230/novated-lease-guide/private/CODEX_HANDOVER_2026-11-12.md` without changing the main checkout. Work only in this worktree on `codex/provider-guide-completion`. Nothing here has been pushed or merged.

## Item 10 — image weight (2026-11-13)

- Converted all 34 page and special-example PNGs to WebP (maximum width 1400 px, quality 80). The new script is `new-site/scripts/prepare_quote_images.py`; it takes the private `crops/markers.json` path.
- Removed the 34 PNGs, 32 image-only PDFs, and all quote-guide PDF links. Changed Guided and all provider articles to WebP. Existing field crops stay WebP.
- `docs/assets/images/quote-guide/manifest.json` lists intrinsic dimensions for every image, including the four GST-credit crops and both `FIELD_EXAMPLES`; it also records page dimensions and scaled field marker positions and heights for the later scrollable viewer. Guided now sets intrinsic image width and height.
- Visual review: six contact sheets covering all 34 new images. The quote-guide directory is 6.7 MB; no WebP exceeds 400 KB.
- Validation: TypeScript, 302 calculator tests, ESLint on changed TS/TSX, calculator build, and site build (82 pages) pass. Site build requires network access for the existing OG font CDN.
- Next: item 18 housekeeping, then items 4 + 12 + 6 as the owner-directed redesign. The redesign requires a mock-up for owner approval before coding. Do not start items 5, 7, 8, 9, 11, 15, 16 or 17 without owner direction.

## Item 18 — housekeeping (2026-11-13)

- Corrected the issue list to 27 provider examples and removed stale references to deleted quote-guide PDFs.
- Updated the picker design note to reflect its actual first-screen placement and WebP article images.
- Marked `freshness_check.py` as requiring the private archive and manual execution outside public CI.
- Added an OCR and full-size visual redaction gate to the maintenance reminder.
- Made provider changes atomic in Guided: provider, correction reset and Smart/MillarX state now enter the draft in one update. Existing provider-switch tests cover correction reset and the Smart/MillarX choice.
- Validation: TypeScript, 302 calculator tests, ESLint on GuidedMode.tsx, calculator build, and site build (82 pages) pass.
- Next: owner-directed combined redesign of items 4 + 12 + 6. Show a mock-up and get owner approval before coding. User asked to keep progressing item by item; the mock-up is the next independent deliverable.

## Items 4 + 12 + 6 — mock-up checkpoint (2026-11-13)

- Created `design/provider-guidance-redesign-mockup.html` with the proposed desktop side-panel crop, phone inline picture, amber trap, plain location line, muted missing line, one date footer, and a scrollable full-page toggle. It uses SG Fleet redacted WebP assets.
- Preview: `http://localhost:4341/design/provider-guidance-redesign-mockup.html` while the local Python server is running (server session on port 4341). The file also opens directly from this worktree.
- Checked the desktop layout and phone picture/full-page toggles in the browser. This is a design mock-up only; the calculator has not yet been redesigned.
- **Next action requires owner approval per the prior handover:** get feedback on the mock-up before implementing items 4 + 12 + 6. Do not infer approval from the mock-up existing.

## Items 4 + 12 + 6 — approved redesign (2026-11-13)

- Owner approved the mock-up in this chat: “Yes, implement this layout.”
- Guided now renders plain location lines, muted missing-field lines and amber trap boxes. The reviewed date appears once at the foot of each quote step. There is no provider-change link.
- Explicit amber trap classification (27 provider/field pairs): SG Fleet payment and FBT base value; MillarX payment; Smart Leasing payment and documentation fee; Flare drive-away; Oly drive-away, insurance and documentation fee; Maxxia insurance and documentation fee; FleetPartners documentation fee; LeasePlan drive-away and documentation fee; Alliance drive-away; Remunerator drive-away and payment; Easi payment; Autopia FBT base value; LeaseLab drive-away; SPA drive-away and FBT base value; Smartsalary running costs; Driva drive-away; Fingo drive-away; LeaseExpress drive-away; Lendly drive-away. All other written pointers are locate lines, and generated not-shown pointers are missing lines.
- The desktop side column displays the selected provider's marked quote image and follows focus across fields. The generic diagram is under “Typical quote”. On phones, that typical quote stays collapsed and the marked picture opens inline.
- Picture control is “Show me” / “Hide picture”; the full-page view scrolls within the card to the manifest marker, rather than clipping the page. Smart Leasing's two available pages stack. SG Fleet FBT and drive-away, Smart Leasing terms, Oly residual and Alliance fees are now data-driven `FIELD_EXAMPLES`.
- Removed the duplicate FBT alias hint under the input; it remains in the tooltip. Shortened the most crowded SG Fleet and Smart Leasing pointer copy. Payment GST basis wording still follows the employer-specific rule.
- Validation: TypeScript, 303 calculator tests, ESLint on changed TS/TSX, calculator build and 82-page site build pass. Browser-checked desktop Price focus switching and phone Price inline image at 390 px. Preview: `http://localhost:4342/calculator/` while local server on port 4342 is running.
- Known limits: the full-page toggle is offered only when a corresponding full reviewed page exists; separate cropped examples (such as SG Fleet's later FBT section) open their own image and link to the provider article. Later item 5 can rewrite the remaining long or sample-centred pointer text.
- Next according to the original handover: items 5, 7, 8, 9, 11, 15, 16 and 17 were outside batch A. The owner's latest instruction was to progress item by item; decide the next priority with the owner before tackling accuracy-sensitive items 7 and 8.

## Item 5 — provider pointer wording (2026-11-13)

- Shortened 27 long or sample-focused provider lines and all five generated “not shown” messages. Main text now speaks to the reader's quote, avoids marker numbers and technical shorthand, and is at most 140 characters for every provider/field returned by `pointersFor`. Added or kept key qualifications in `more` tooltips.
- The Smartsalary running-cost instruction now describes the printed “Less” GST-credit line without exposing the ITC abbreviation in the main text. The exact provider wording remains visible in its redacted quote image. SG Fleet and Smart Leasing lines were already shortened in the preceding redesign commit.
- Existing date, evidence-source and payment-GST safeguards remain. The quote images and provider articles were not changed in this item.
- The literal grep from the old review plan still matches type names, code comments and `FIELD_EXAMPLES` alt/caption strings. A runtime test checks every displayed pointer's main text for the prohibited wording and 140-character limit.
- Validation: TypeScript, 304 calculator tests, ESLint on changed TS/test files, calculator build, and 82-page site build pass. Local preview remains `http://localhost:4342/calculator/` while its server is running.
- Next priorities need care: item 7 (Maxxia/Oly financed insurance) and item 8 (Smart-branded Smartsalary) were flagged as needing owner decisions in the original review. Safer independent items are 9, 11, 15, 16 and 17, although 9 depends on the accuracy choice for 7/8.

## Item 11 — picker polish (2026-11-13)

- The empty picker now explains that the provider is the company at the top of the quote, not the employer or dealer.
- A named selection confirms that provider-specific locations will appear. If its reviewed guide is older than six months, the hint names the example month (e.g. LeasePlan, Aug 2025).
- “Other / not listed” explains that general hints still work and links to quote-layout feedback. The Smart Leasing / Smartsalary layout note remains.
- No free text is sent to analytics. Tests cover default, named, stale and Other states. Validation: TypeScript, 305 calculator tests, ESLint on changed TS/TSX, calculator build and 82-page site build pass.
- Owner decisions pending on item 7's financed-insurance treatment and item 8's Smart-branded correction escape hatch. Do not assume the default options without a reply.

## Item 7 — Maxxia and Oly financed first-year insurance (2026-11-13)

- Owner chose the dedicated-question option. Guided now asks Maxxia/Oly readers whether first-year comprehensive insurance is in the amount financed. If Yes, it asks for that premium separately from the documentation fee. Changing provider clears the answer.
- The premium is added to the financed amount for the effective interest rate. A new optional engine input, `insuranceFinancedFirstYear`, removes one premium spread over the lease from lease running costs. Cash and post-lease insurance keep the full annual cost, so the calculator counts year one through the finance payment and renewals through running costs.
- Updated both provider pointers and articles to explain the separate entries and removed original quote-specific premium figures from article prose. The marked documentation-fee quote crop is adjacent to the new question.
- Tests cover both providers, financed amount and rate, the lease-only running-cost adjustment, unchanged cash insurance, and answer gating. TypeScript, 308 calculator tests, ESLint, calculator build and 82-page site build pass. The synthetic rate check uses a known 8% payment; it does not independently re-enter the original private quotes.
- Next: item 9 provider-aware warnings can omit the obsolete Maxxia/Oly documentation-fee warning. Item 8 owner decision remains pending. No push or merge.

## Item 7 follow-up — Advanced handoff (2026-11-13)

- The owner asked how the new adjustment behaves in Advanced mode. The optional engine input defaults to zero for all existing Advanced inputs and old saved scenarios, so their calculations remain unchanged.
- Advanced now visibly shows the total one-off financed fees/add-ons and the subset already financed for first-year insurance. The second amount is editable and uses the same GST basis as Advanced's annual Insurance field. Guided passes both fields through; the subset changes only the lease running-cost budget, not the cash scenario.
- The Advanced form smoke test checks both labels. This prevents the Guided-to-Advanced copy from carrying a hidden cost adjustment. No push or merge.

## Item 9 — provider-aware findings (2026-11-13)

- Added warning-only `checkProvider` findings to the existing Price and Payment findings slots. SG Fleet/Easi warn about monthly lease figures; Remunerator warns when its annual payment is entered under another period; LeaseLab checks the usual weekly period; Smartsalary prompts a GST-heading check; and six providers name their GST-reduced drive-away trap when the entered drive-away price is below the FBT base value.
- The six trap labels live beside the provider guides in `DRIVEAWAY_TRAP_LABELS`. Findings use the selected quote and the reader's own inputs, never auto-change an answer. Maxxia/Oly documentation-fee warnings from the original item 9 plan were omitted because item 7 now asks for financed insurance separately.
- Each visible provider warning sends `guided_provider_check` once per provider/code/session, with no entered figures or personal data. Unit tests cover every condition, all six trap labels, negative cases, and Other/null. TypeScript, 321 calculator tests, ESLint and calculator build pass. The build also includes the visible Advanced insurance field from the preceding checkpoint.
- Next: item 8 owner decision may still be pending; otherwise items 15, 16 and 17 remain. No push or merge.

## Item 17 — guidance analytics (2026-11-13)

- Added the closed-list provider ID (or `none`) to `guided_step` and `guided_completed`. The "Mine looks different" link now emits `guided_provider_feedback_click` with the provider ID. Item 9 already added one-per-session `guided_provider_check` events with provider and check code. No quote values, free text or customer details are sent.
- A UI test checks the feedback event payload. TypeScript, focused provider-picker tests (45), ESLint and calculator build pass. The prior full 321-test suite passed after item 9; this item changed only three event calls and their test.
- This branch is not deployed, so there is no ship date yet. When deployed, record that date against the coffee-nudge social-proof A/B test before interpreting its mid-December funnel. After four weeks, compare named-provider versus none completion from Price to results, rate-warning share, and picture-open rate by field.
- Remaining: item 8's owner choice, item 15 source consolidation, and item 16 article strategy. No push or merge.

## Item 15, checkpoint A — image manifest and coverage (2026-11-13)

- Removed the duplicated `TEMPLATE_FIELDS` and `FIELD_CROPS` inventories. Guided now detects pages and focused field crops from `manifest.json`; a page fallback requires a recorded marker. Smart Leasing's unmarked drive-away context is an explicit `pageContextFields` entry in the manifest and its generator. Extra full pages are discovered from manifest filenames.
- Added an integration test for every manifest image file, every image path produced by the guide API, every named provider article and index link, and all `seen` month strings. Deleting an image or provider article now fails the test. TypeScript, 46 provider-picker tests, ESLint and calculator build pass.
- **Item 15 is not finished:** 27 hand-written article tables still duplicate the guide wording, and dateModified is not yet driven from `seen`. The site uses plain `.md` content without MDX; an Astro component cannot be inserted directly. Next checkpoint should use a build-time generated Markdown section or a remark transform, preserving each article's unique explanation and diffing the result.
- No push or merge.

## Item 16, checkpoint A — phone table layout (2026-11-13)

- Provider-quote article tables become stacked, labelled cards below 600 px. Other article tables keep their existing behavior. The article script adds labels from each table's own headings; if JavaScript is unavailable, the original sideways-scrollable table remains.
- Skipped the old duplicate-first-cell rowspan merge for provider tables, so every card retains its own number and label. The site build passed (82 pages). Browser-checked the Maxxia article at 375 px: six numbered cards showed all four column labels and the long financed-insurance guidance wrapped within the card.
- The owner has not yet answered the title/indexing choice for the rest of item 16. Item 15 article-table generation is also still open. No push or merge.

## Item 15, checkpoint B — article review provenance (2026-11-13)

- Added a `prebuild` script that reads each provider's `sources.length` and `seen` from `GUIDES` and synchronizes a clearly marked line directly below the article title: quote-example count and newest layout review month. It updates all 27 articles on the next site build and is idempotent.
- A provider integration test verifies each article's review month against `guideFor(id).seen`. This does not turn the quote-review month into `dateModified`: some old quotes were reviewed before these articles existed, and the site correctly derives actual article modification dates from Git.
- TypeScript, 46 provider-picker tests, ESLint and 82-page site build pass. The first build after writing all 27 files emitted Astro duplicate-id cache warnings; a second unchanged build completed with none.
- **Item 15 remains open:** the old article tables still need a careful data model before replacing their quote-specific detail with generated pointer text. Do not strip those tables wholesale. No push or merge.

## Item 15, checkpoint C — table conversion audit (2026-11-13)

- Added `PROVIDER_ARTICLE_TABLE_AUDIT_2026-11.md`. It inventories all 27 main tables, the three second-section tables, and 14 provider/field pairs whose explicit pointer is absent from the main table. It gives a row schema and safe conversion path.
- The audit explains why copying the short pointer into a generic table would lose verified quote labels and provider-specific GST/period details. The table conversion is deliberately left open for provider-by-provider review; no existing article table was removed.
- No push or merge.

## Item 16, checkpoint B — provider index (2026-11-13)

- The provider index now has the picker's five "Most common" providers, followed by all 27 named providers alphabetically. The link list is generated during `new-site` prebuild from `PROVIDERS` and `POPULAR` in `providerGuide.ts`, so the index stays in step with the picker.
- The integration test checks the five common IDs, both headings, every provider article and link. Provider-picker tests (46), ESLint and 82-page site build pass. Astro emitted one duplicate-id cache warning for the changed index on the first build, as it did for changed articles; the build completed.
- The owner choice on titles and whether any thin pages should be noindexed is still pending. No push or merge.

## Item 15, checkpoint D — first article table linked to Guided (2026-11-13)

- Added an idempotent `sync-provider-tables.mjs` to the site prebuild, initially for Flare. Its numbered drive-away and payment action cells now come directly from the corresponding `GUIDES` pointer text, while the article keeps the verified quote labels and its other rows.
- This corrected a stale Flare article claim that the finance payment is always excluding GST. The current pointer identifies the fortnightly payment without asserting a GST basis that can vary with the employer.
- An integration test checks the two generated rows against `pointersFor` and rejects the old wording. Focused tests (47), ESLint and 82-page site build pass; built HTML contains the new payment text. Astro emitted its usual one-time duplicate-id cache warning for the edited article.
- Conversion remains provider by provider. Only Flare is linked so far; the rest of item 15 is open. No push or merge.

## Item 15, checkpoint E — SG Fleet table linked to Guided (2026-11-13)

- The SG Fleet article's FBT base value, drive-away and finance-payment action cells now sync from the `GUIDES` pointers at site build, retaining the exact quote labels and other detailed rows. The table generator supports both three- and four-column article tables and marker labels such as `7a / 7b`.
- Removed the stale table instruction to enter the per-pay rent “ex GST”; the article now says to check the payment's GST heading and footnotes because employer layouts vary.
- Focused tests (48), ESLint and 82-page site build pass. The built HTML contains the new GST-basis sentence and no old ex-GST payment instruction. Astro emitted its one-time duplicate-id cache warning for the edited article.
- Flare and SG Fleet are migrated; other articles remain hand-curated pending careful row-by-row conversion. No push or merge.

## Item 15, checkpoint F — Maxxia financed-insurance rows (2026-11-13)

- Maxxia's numbered fee and insurance action cells now sync from the Guided pointers, with the printed quote labels retained. The article's separate first-year insurance explanation remains.
- Reworded the Maxxia and Oly pointers to avoid “above”/“below”, which were location-specific to Guided and misleading when reused in an article. Both say the financed premium is handled separately.
- Focused tests (49), TypeScript, ESLint, calculator build and 82-page site build pass. The test checks Maxxia's fee/insurance rows and that the old “add the two” instruction is absent. Astro emitted its one-time duplicate-id cache warning for this edited article.
- Flare, SG Fleet and Maxxia have migrated rows. Oly is the next related article to review. No push or merge.

## Item 15, checkpoint G — Oly financed-insurance row (2026-11-13)

- Oly's numbered establishment-fee row now syncs from its Guided pointer, so the article directs readers to the separate financed-insurance question. The quote-specific drive-away and residual explanations and the first-year insurance section remain hand-curated.
- Focused tests (50), ESLint and 82-page site build pass. Astro emitted its one-time duplicate-id cache warning for the edited Oly article.
- Four articles have migrated rows (Flare, SG Fleet, Maxxia, Oly). Continue only with rows whose old article details can be safely replaced by the short pointer; keep the quote-specific evidence. No push or merge.

## Item 15, checkpoint H — MillarX payment rows (2026-11-13)

- MillarX's monthly payment row now syncs from its Guided pointer. The fortnightly alternative remains quote-specific prose but no longer asserts an ex-GST basis without a label. A sentence below the table directs readers to check the GST heading and use the deferred months as the correction buffer.
- Focused tests (51), ESLint and 82-page site build pass. The test rejects the old unqualified “per month/fortnight, ex GST” wording. Astro emitted its one-time duplicate-id cache warning for the edited article.
- Five articles have migrated rows. Smart Leasing's correction treatment remains subject to the owner's item 8 choice. No push or merge.

## Item 15, checkpoint I — Easi payment and price rows (2026-11-13)

- Easi's drive-away and fortnightly lease-payment action cells now sync from Guided. The article keeps the source-specific reconciliation between monthly and fortnightly figures and asks readers to confirm the actual deduction count and GST heading.
- Removed the unqualified ex-GST instruction from Easi's finance-payment row. Focused tests (52), ESLint and 82-page site build pass. Astro emitted its one-time duplicate-id cache warning for this edited article.
- Six articles have migrated rows; continue provider by provider. No push or merge.

## Item 15, checkpoint J — Remunerator annual payment (2026-11-13)

- Remunerator's drive-away, payment-deferral and yearly finance-payment action cells now sync from Guided. The table keeps the quote's printed “Lease Payment (excl GST)” label and the prose warning against the headline take-home-pay amount.
- Focused provider tests (53) and ESLint pass. The article table generator was run and updated the Markdown. A site build was not repeated for this small row-only change; the generator and table layout passed prior site builds.
- Seven articles have migrated rows. No push or merge.

## Item 15, checkpoint K — Driva GST-reduced price trap (2026-11-13)

- Driva's drive-away, residual and finance-payment action cells now sync from Guided, retaining the source quote's labels and payment-cycle context. Corrected the intro's review month from November to August 2026 to match `GUIDES` and the generated provenance line.
- Focused provider tests (54) and ESLint pass. The table generator updated the Markdown. A site build will be rerun after the next article batch; no change to layout code was made here.
- Eight articles have migrated rows. No push or merge.

## Item 15, checkpoint L — Fingo price, deferral and payment (2026-11-13)

- Fingo's GST-reduced price trap, optional two-payment deferral and finance-payment cells now sync from Guided. The quote's printed GST subtotal remains described separately so readers can check whether their own payment includes GST.
- Focused tests (55), ESLint and 82-page site build pass. The build also rechecked the preceding Remunerator and Driva article changes. Astro emitted cache duplicate-id warnings for those three edited articles, but built all pages.
- Nine articles have migrated rows. No push or merge.

## Item 15, checkpoint M — Lendly drive-away trap and date (2026-11-13)

- Lendly's drive-away action cell now syncs from Guided while retaining the “Price … Drive Away” printed label. Corrected the intro's review month from November to October 2026 to match the guide and generated provenance.
- Focused provider tests (56) and ESLint pass. The table generator updated the Markdown; site build will be checked with the next article batch.
- Ten articles have migrated rows. No push or merge.

## Item 15, checkpoint N — SPA full drive-away price (2026-11-13)

- Improved SPA's Guided drive-away pointer to name the printed “Total Drive Away Price” directly, then synced the FBT base value, drive-away and deferral action cells into its article. Kept the Queensland Government “Vehicle Cost” qualification in prose below the table.
- Focused provider tests (57), ESLint, calculator build and 82-page site build pass. The site build also covered the preceding Lendly article. Astro emitted its one-time duplicate-id cache warnings for both edited articles.
- Eleven articles have migrated rows. No push or merge.

## Item 16, checkpoint C — provider article titles (2026-11-13)

- Renamed the title and visible heading of all 27 provider articles to the pattern “How to read a/an {provider} novated lease quote”. The descriptions and body text still explain Guided mode. The general quote guide and article URLs are unchanged.
- Kept every provider page indexable while the owner's separate indexing preference is unresolved. A provider integration check verifies the title and heading match across all 27 articles.
- Focused provider tests (57) and the 82-page site build pass. Astro emitted its one-time duplicate-id cache warnings for the edited articles; the pages built and Pagefind indexed all 82 pages.
- Item 16 still needs the proposed provider-specific trap introductions and any owner decision about thin-page indexing. Item 15 article table conversion remains at 11 of 27. Item 8 Smart-branded Smartsalary treatment still awaits the owner's choice. No push or merge.

## Item 15, checkpoint O — Paywise payment and management fees (2026-11-13)

- Paywise's numbered finance-payment and management-fee action cells now sync from its Guided pointers. The pointer text keeps the **Package Inclusions (ex. GST) – Fortnightly** basis, warns against using the package total, and says to combine **Lease Management** with **Salary Packaging** using the quote's period. Other table rows keep their quote-specific wording.
- Focused provider tests (58), ESLint, calculator build and 82-page site build pass. The first site build emitted Astro's one-time duplicate-id cache warning for the edited Paywise article.
- Twelve of 27 provider articles now have at least one synced table row. Continue reviewing the remaining articles one by one. No push or merge.

## Item 15, checkpoint P — RemServ unlabelled GST basis (2026-11-13)

- RemServ's residual and finance-payment table cells now sync from the Guided pointers. The finance pointer states the fortnightly period and keeps the GST basis uncertain when the quote has no GST label. This removed the article's stale “we assume ex GST” instruction.
- The running-cost row and price warning remain hand-curated to retain the quote's multiple cost categories and the unclear “RemServ price” inclusions.
- Focused provider tests (59), ESLint and calculator build pass. The site table generator ran; site build was last checked at Paywise checkpoint O and should be rerun with the next article batch.
- Thirteen of 27 provider articles now have at least one synced table row. No push or merge.

## Item 15, checkpoint Q — Simplygreen price, deferral and payment (2026-11-13)

- Simplygreen's numbered vehicle-price, deferred-months and finance-payment action cells now sync from its Guided pointers. The visible quote-label column still identifies **Vehicle Cost** above **GST Credit**, **Months Deferred**, and fortnightly **Total Lease Cost** under the excluding-GST budget heading.
- Generalized the Guided deferral pointer: use **Months Deferred** when printed, or subtract **No. of Payments** from the lease term. This avoids embedding one example's month counts in the reusable guidance. The running-cost row and contingency-buffer warning remain hand-curated.
- Focused provider tests (60), ESLint, calculator build and 82-page site build pass. The site build covered the preceding RemServ change too; Astro emitted its one-time duplicate-id cache warnings for these two edited articles.
- Fourteen of 27 provider articles now have at least one synced table row. No push or merge.

## Item 15, checkpoint R — LeaseLab weekly payment (2026-11-13)

- LeaseLab's numbered residual and lease-payment action cells now sync from Guided. The payment pointer names the quote's **Budgeted Allowance (ex GST)** heading under weekly allowances and directs readers to choose **Per week** and **Excluding GST**.
- Kept the article's separate drive-away calculation, its running-cost category placement and its weekly budget caveat. Focused provider tests (61), ESLint and calculator build pass. The table generator ran; site build can be checked with the next article batch.
- Fifteen of 27 provider articles now have at least one synced table row. No push or merge.

## Item 15, checkpoint S — LeaseExpress residual and payment GST (2026-11-13)

- LeaseExpress's numbered FBT, residual and fortnightly payment cells now sync from Guided. The residual pointer explicitly chooses **Excluding GST** when a separate **GST on residual** line appears; the payment pointer says to exclude the separate GST column and use the fortnightly period.
- The article keeps its detailed running-cost category notes. Its unnumbered drive-away warning now directs readers to the full on-road price including GST or Guided's residual helper instead of **Vehicle finance amount**.
- Focused provider tests (62), ESLint, calculator build and 82-page site build pass. The site build also covered LeaseLab; Astro emitted its one-time duplicate-id cache warnings for the two edited articles.
- Sixteen of 27 provider articles now have at least one synced table row. No push or merge.

## Item 15, checkpoint T — ORIX residual (2026-11-13)

- ORIX's numbered residual row now syncs from Guided. Its **Other Fees** and **Lease Rental** rows deliberately stay hand-curated: the article carries a capitalisation note and the quote's GST footnote that the short pointers do not capture. The missing FBT and drive-away explanations also remain in prose.
- Focused provider tests (63) and diff check pass. The site table generator ran; the site build was last checked at checkpoint S and can be rerun with the next article batch.
- Seventeen of 27 provider articles now have at least one synced table row. ORIX's fee/payment rows need a separate evidence-preserving review before conversion. No push or merge.

## Item 15, checkpoint U — NLA price components and payment (2026-11-13)

- NLA's numbered FBT, drive-away component, residual and finance-payment cells now sync from Guided. The finance pointer specifies the fortnightly period, excludes the separate GST line and warns against using the take-home-pay reduction. The article retains its printed price-component list and separate take-home-pay warning.
- Focused provider tests (64), ESLint, calculator build and 82-page site build pass. The build also covered ORIX; Astro emitted one-time duplicate-id cache warnings for these two edited articles.
- Eighteen of 27 provider articles now have at least one synced table row. No push or merge.

## Item 15, checkpoint V — Toyota Fleet table repair (2026-11-13)

- Toyota Fleet Management's numbered drive-away, residual and rent action cells now sync from Guided. The fee row remains hand-curated because the two financed fees may show different GST bases and the short pointer does not express the article's printed-basis caveat.
- Repaired the article's Markdown table: a deferral paragraph had been inserted between rows 7 and 9, splitting one table into two. It now sits below the complete table. The text still explains why this reviewed quote supports choosing **Straight away**.
- Focused provider tests (65), diff check and 82-page site build pass. Astro emitted its one-time duplicate-id cache warning for the edited article.
- Nineteen of 27 provider articles now have at least one synced table row. No push or merge.

## Item 15, checkpoint W — Custom Fleet price and fees (2026-11-13)

- Custom Fleet's numbered drive-away price, luxury-vehicle adjustment and combined management-fee cells now sync from Guided. The article keeps its three-column annual/monthly/fortnightly lease-payment instruction, the excluding-GST package heading, running-cost categories and included-in-rent exclusions.
- Focused provider tests (66) and diff check pass. The table generator ran; site build can be rerun with the next article batch.
- Twenty of 27 provider articles now have at least one synced table row. No push or merge.

## Item 15, checkpoint X — Vehicle Solutions payment choices (2026-11-13)

- Vehicle Solutions's numbered drive-away, deferral, residual and `7a` payment action cells now sync from Guided. The `7b` inclusion-GST alternative remains its own hand-curated row, so both fortnightly choices stay visible. The running-cost row retains its separate ex-GST, inc-GST and annual column instruction.
- Generalized the deferral pointer to read the number before **MONTHS DEFERRED** instead of embedding one example's count. The payment pointer now explicitly says to use a fortnightly figure with its matching GST answer.
- Focused provider tests (67), ESLint, calculator build and 82-page site build pass. The site build covered the preceding Custom Fleet change too; Astro emitted its one-time duplicate-id cache warnings for both edited articles.
- Twenty-one of 27 provider articles now have at least one synced table row. No push or merge.

## Item 15, checkpoint Y — FleetPartners split costs and deferral (2026-11-13)

- FleetPartners's numbered drive-away and deferral action cells now sync from Guided. The deferral pointer uses the stated delay or subtracts **Based on** payment months from the lease term; the article keeps its 60 − 58 = 2 example outside the table.
- The one-off PPSR/brokerage row, monthly establishment-fee row, split Part A–D context, and warning against **Total lease cost** remain hand-curated. FleetPartners has a template exception, so do not infer other marker positions from its private source without visual review.
- Focused provider tests (68), ESLint and calculator build pass. The table generator ran; the site build can be checked with the next article batch.
- Twenty-two of 27 provider articles now have at least one synced table row. No push or merge.

## Item 15, checkpoint Z — LeasePlan monthly versus one-off fee (2026-11-13)

- LeasePlan / Ayvens's one-off **Security Interest** fee row now syncs from Guided and distinguishes it from monthly **Finance Documentation**, which belongs with management fees. The monthly payment row remains hand-curated because its GST basis is not labelled on the reviewed line.
- The article's unnumbered price explanation now asks for a full on-road price including GST and warns that the residual helper may not work because this example shows no residual. Its August 2025 provenance remains visible.
- Focused provider tests (69), diff check and 82-page site build pass. The site build also covered FleetPartners; Astro emitted its one-time duplicate-id cache warnings for the edited articles.
- Twenty-three of 27 provider articles now have at least one synced table row. No push or merge.

## Item 15, checkpoint AA — Alliance first-page price and deferral (2026-11-13)

- Alliance Leasing's first-page drive-away and deferred-month action cells now sync from Guided. Its first-page **Total Lease Payment** and second-page **Finance** rows remain hand-curated because the same finance payment appears with different GST bases, established by the quoted footnote. The page-2 **Entry Fee** and other detail remain intact.
- Focused provider tests (70) and diff check pass. The table generator ran; site build can be checked with the next article batch.
- Twenty-four of 27 provider articles now have at least one synced table row. No push or merge.

## Item 15, checkpoint AB — Autopia price and setup fee (2026-11-13)

- Autopia's numbered drive-away and setup-fee action cells now sync from Guided. The article retains its unnumbered FBT warning: **base price** excludes GST, and **fringe benefit value** is a taxable value rather than the FBT base value. Payment and luxury adjustment rows remain hand-curated with their period and GST context.
- Focused provider tests (71), diff check and 82-page site build pass. The site build also covered Alliance; Astro emitted its one-time duplicate-id cache warnings for both edited articles.
- Twenty-five of 27 provider articles now have at least one synced table row. The two remaining are Smart Leasing and Smartsalary; their distinct branded layouts should remain separate. Item 8's Smart-branded Smartsalary escape hatch still awaits the owner's choice. No push or merge.

## Item 15, checkpoint AC — Smartsalary Smart Drive GST (2026-11-13)

- Smartsalary Smart Drive's numbered finance-payment and running-cost action cells now sync from its own Guided pointers. The payment selects **Including GST** and the printed period; the running-cost pointer explains the employer GST credit without relying on the acronym in the short calculator text. The article keeps the exact **Less: Employer Claimed ITC** quote label and its total-salary-deduction warning.
- Focused provider tests (72), ESLint and calculator build pass. The table generator ran; site build can be checked with Smart Leasing in the final article batch.
- Twenty-six of 27 provider articles now have at least one synced table row. Smart Leasing remains. Item 8's separate Smartsalary escape-hatch choice still awaits the owner. No push or merge.

## Item 15, checkpoint AD — all 27 provider articles linked (2026-11-13)

- Smart Leasing's numbered **Months deferred** and terms-page **Documentation fee** cells now sync from its Guided pointers. The payment row stays hand-curated because it must explain the monthly/fortnightly figures, matching GST answer and Smart Leasing correction tool. The article still says its terms page comes from a different quote, while the first two pages belong together.
- `sync-provider-tables.mjs` now has a reviewed mapping for at least one action cell in all 27 provider articles. It intentionally leaves quote-specific rows and secondary tables hand-curated. This completes the current article-table linking pass, not a full structured migration of every row. Do not replace remaining rows mechanically.
- Full calculator test suite passes: 350 tests in 26 files. ESLint and diff check pass. The final 82-page site build passes, with all 27 table syncs and Pagefind indexing. The build emitted Astro's one-time duplicate-id cache warnings for the two edited Smart-branded articles. A jsdom `window.scrollTo` notice appeared in a passing test, as before.
- Remaining outside this pass: item 8 Smart-branded Smartsalary escape-hatch decision from the owner; item 16 provider-specific trap introductions and any indexing preference; a deeper row model if desired; live deployment date for analytics. No push or merge.


## Item 16, checkpoint D — trap introductions (2026-11-14)

- New prebuild script `new-site/scripts/sync-provider-traps.mjs` adds "What catches people out on a/an {Provider} quote" to all 27 provider articles, after the intro and before the first image or table. It lists the same trap pointers Guided shows in amber (`TRAP_FIELDS`), labelled by field. The eight providers with no traps (Custom Fleet, NLA, ORIX, Paywise, RemServ, Simplygreen, Toyota Fleet Management, Vehicle Solutions) get one line: "Nothing on the {Provider} quotes we checked looked easy to misread." Idempotent; runs after the table sync.
- a/an handles acronyms ("an SG Fleet", "an ORIX").
- The provider integration test now checks each article's trap section holds exactly the trap pointers for that provider.
- Validation: TypeScript, 350 calculator tests, ESLint on the changed test, calculator build and site build pass; the built SG Fleet page shows the new heading.
- Still awaiting the owner: item 8 (Smart-branded Smartsalary escape hatch) and item 16's indexing choice for thin pages. No push or merge.

## Owner decisions (2026-11-14)

- Item 16 indexing: keep all 27 provider pages indexed. Revisit with Search Console data after launch. Item 16 is complete.
- Item 8: owner deferred ("deal with this later"). Do not implement any option until asked. The options put to the owner were: escape hatch in the Smart Leasing correction callout; a picker note only; or wait for Smart.

## Second big-picture review (2026-11-13)

- `PROVIDER_GUIDE_REVIEW_ROUND2_2026-11.md` scores the branch against the design aims and lists 15 follow-up plans (R1–R15) written for a smaller model. Nothing in it is implemented.
- Batch A (R1, R2, R3, R4, R9, R10, R11) needs no owner input. R5 and R6 need the owner to read the wording. R7 and R8 need an owner decision first. R12–R15 are pre-merge work.
- Item 8 stays parked. No push or merge.

## R1 — a/an before provider names in Guided (2026-11-13)

- New `articleFor()` in `providerGuide.ts`, same rule as the site's trap script. The picker hint and the "Show me on … quote" button now read "an Oly", "an SG Fleet", "an ORIX". Removed the unused `button` labels from `FieldExample`.
- The existing picker test had asserted "on a SG Fleet quote"; corrected. New unit test covers eight labels. TypeScript, 358 tests, ESLint and calculator build pass. No push or merge.

## R2 — one caption per picture (2026-11-13)

- An opened picture now shows one caption: the special example's own caption, or "A real {provider} quote with numbers removed.", then "Tap the image to enlarge." once. The review date is no longer repeated under each picture (the step footer has it). The crop/page toggle reads "Whole page" / "Just this line".
- Test: no example caption contains "Tap the image" or a "Checked Mon YYYY" date. 359 tests, TypeScript, ESLint and calculator build pass.
- To see: Oly → Price step → "Show me" under FBT base value (was two captions).

## R3 — phone: typical-quote toggle below the fields (2026-11-13)

- Below 820 px, with a named provider chosen, "See a typical quote (not {provider}'s)" now sits after the fields and just above the "As seen on …" line, instead of between the step title and the intro. With no provider, "Where is this on my quote?" stays on top, now with 8 px clear of the title. Desktop unchanged.
- Checked at 390 px as Oly on the Price step. 359 tests and calculator build pass.

## R4 — GST-reduced price warning: one message (2026-11-13)

- For the six providers with a GST-reduced "drive-away" label (Flare, Oly, Fingo, SPA, Driva, Lendly), entering a drive-away price below the FBT base value now shows one message under the price: "This looks like “Oly driveaway price”, which has the GST saving taken off. Use the dealer's full on-road price including GST instead." The generic "swapped the two boxes?" error is no longer shown alongside it. The provider message is now an error, so the step still asks the reader to confirm before moving on, exactly as before.
- `DRIVEAWAY_TRAP_LABELS[].right` is now `{ label }` (quoted) or `{ text }` (not quoted). SPA's right answer now names its printed “Total Drive Away Price”, matching its pointer.
- **Not done: the residual-based trigger from the plan.** Checked the maths: without an FBT base value the calculator has no GST saving, so it cannot compute an expected residual either; and a GST-reduced price shifts the residual ratio by about 1.1, the same signature as an ex/inc GST mix-up, which the residual check already reports. A reliable second trigger would need a new question; left for the owner.
- Browser-checked as Oly at 390 px: one red message. 359 tests, TypeScript, ESLint and calculator build pass.

## R9 — Oly drive-away: words now match the marked crop (2026-11-13)

- The plan was to repaint the crop so "Recommended retail price" wasn't marked as the answer. On checking, the crop is right for this quote: the article (row 2) already says the retail price reconciled to the on-road price including GST. The mismatch was in the words, so the pointer now says: "Don't use “Oly driveaway price”: it has the GST saving taken off. Use “Recommended retail price” if it includes all on-road charges." The tooltip says it matched on the quote checked and to ask the dealer if not. No image changed.
- The warning from R4 and the article's trap list follow (site build synced). 359 tests, calculator and site builds pass.

## R10 — article defects (2026-11-13)

- **Review months:** 20 article intros said "layout reviewed in {Month Year}", which could disagree with the generated "latest layout reviewed" line (Oly said August under a November line). They now say "layout(s) we reviewed"; the generated line is the only date. LeasePlan's "reviewed in August 2025" became "older than the others". A test blocks review months outside the generated line.
- **Italics:** fixed the stray space before the closing `*` in the Alliance and Oly captions.
- **"here/above/below":** rewrote 11 pointer lines that only made sense next to a calculator box (they are reused in the articles): "enter … here" → "as the documentation fee"; "the residual helper below" → "work it out from the residual"; Simplygreen "above" → "the line before". A test blocks those words in pointer main text.
- **FleetPartners doc fee:** now "If “Lease Establishment Fee” is monthly, add it to management fees instead. Add the one-off PPSR fee and any financed brokerage." (the crop boxes both).
- **NLA drive-away:** now includes "any luxury car tax shown".
- Maxxia/Oly doc fee also reworded (overlaps R6): "Enter only “Financier's Establishment Fee” as the documentation fee. Financed year-one insurance has its own question."
- 361 tests, ESLint, calculator and site builds pass. Look at: Oly, Alliance, FleetPartners, LeasePlan, NLA articles.

## R12 — site scripts read a generated JSON file (2026-11-13)

- `calculator2/tests/provider-export.test.ts` imports the real `providerGuide.ts` and compares it with the committed `new-site/src/data/provider-guides.json` (labels, popular list, review month, source count, written pointer text, trap fields in order, and every resolved pointer including "can't find it" lines and their pictures). It fails when the JSON is stale. Regenerate with `EXPORT_PROVIDER_GUIDES=1 npx vitest run tests/provider-export.test.ts` in `calculator2`. Reddit source ids are not exported.
- `sync-provider-review-month`, `-index`, `-tables` and `-traps` now read the JSON; none parses TypeScript any more. `GUIDES` and `TRAP_FIELDS` are exported for the test. The site build changed no article (byte-identical output).
- **New step after editing `providerGuide.ts`:** regenerate the JSON before the site build, or the calculator test will fail and the articles won't pick up the change.
- 362 tests, TypeScript, ESLint and site build pass.

## R11 — articles carry the "can't find it" lines and the × 11 tip (2026-11-13)

- New prebuild script `new-site/scripts/sync-provider-missing.mjs` adds "If a figure isn't on your quote" just before each article's closing links, listing the same "Can't find it on your {provider} quote?" lines Guided shows (text plus tooltip), with the GST-credit picture for MillarX, Oly, RemServ and Lendly. 23 articles get the section; 4 have nothing missing. Reads `provider-guides.json` (R12). Idempotent.
- Test: each article's section lists exactly the "missing" pointers for that provider and includes their pictures. 363 tests and site build pass. Checked the Oly page in the browser.
- **Left for review:** the older hand-written "Not shown on this sample: …" sentence still sits just above the new section in most articles. It also lists fields Guided doesn't cover (interest rate, lease term) and quote-specific detail, so it was not removed mechanically. Owner may want it trimmed article by article.

## R5 — softened claims that rest on one quote (2026-11-13) — owner to read

Before → after:
- LeaseLab check: "LeaseLab quotes are usually weekly. Check the period next to your payment." → "The LeaseLab quote we checked showed weekly amounts. Check the period beside your payment."
- Smartsalary check: "Smartsalary often shows this payment including GST. Check the heading…" → "If your payment sits under “Motor Vehicle Deductions (inc GST)”, choose Including GST. Check the heading on your own quote."
- Remunerator check: "Remunerator shows the lease payment per year. Check whether…" → "On the Remunerator quote we checked, “Lease Payment” was a yearly total. If yours is under “Annual Car Expenses”, choose “Per year”."
- Maxxia residual: "If you see “Total residual value” with no GST label, it's usually including GST." → "If “Total residual value” has no GST label, check the footnotes or ask Maxxia. Not sure? Choose “I'm not sure”." Tooltip: "On the quotes we checked it included GST. With “I'm not sure”, the calculator works out which reading fits your figure."
- Oly residual: "…near the end of the estimate, it includes GST: choose Including GST." → "Look for “Your total residual value (after lease term)” near the end of the estimate." Tooltip says it included GST on the quote checked. Oly article row 6 matched by hand.
- SG Fleet FBT: "often on a later page" → "which may be on a later page".
- Tests: no pointer main text or provider check says "usually", "often" or "always"; no check states a payment's GST basis as fact.
- New `npm run export:guides` in `calculator2` regenerates `provider-guides.json` and runs the site prebuild syncs in one step. 365 tests pass.

## R6 — plain sentences instead of telegram-style pointers (2026-11-13) — owner to read

Before → after (main text; tooltips in brackets):
- Maxxia and Oly insurance: "…including year one. Guided accounts for any financed first-year premium separately." → "Enter the full yearly insurance premium, including year one." (Tooltip adds: "If the first year is financed, the calculator counts it once.")
- Paywise payment: "Under “Package Inclusions (ex. GST) – Fortnightly”, enter “Lease Payment” per fortnight, ex GST—not the package total." → "Use “Lease Payment” under “Package Inclusions (ex. GST) – Fortnightly”, per fortnight, Excluding GST. Don't use the package total." (Tooltip: the total adds running costs and fees.)
- Smartsalary running: "“Motor Vehicle Deductions (inc GST)” plus a “Less” GST credit? Enter costs incl GST; say employer claims GST." → "If the heading is “Motor Vehicle Deductions (inc GST)”, choose Including GST and enter the costs as printed." (Tooltip: if a “Less” line takes a GST credit off, answer Yes to the GST-credit question, which is the question Guided actually asks next.)
- NLA payment: "…excluding its GST line—not take-home-pay reduction." → "Use “Lease payment (fixed)” under “Gross fortnightly rental”, per fortnight, without its separate GST line." (Tooltip: not the take-home-pay reduction.)
- RemServ payment: semicolon sentence → "If “Finance” is per fortnight with no GST label, enter it per fortnight and choose “I'm not sure” for GST."
- Maxxia/Oly doc fee were already rewritten in R10.
- Test: outside quoted labels, pointer main text has no "—", ";", "incl" or "Guided". Curly quotes were not normalised across the file (left; low value). 366 tests, calculator and site builds pass.

## R7 — trimmed the amber trap list (2026-11-13) — owner decision taken provisionally

- The plan asked the owner to choose. Applied the middle option, which is easy to reverse (one line each in `TRAP_FIELDS`): Maxxia `insurance`, Oly `insurance` and Smart Leasing `docFee` are now plain location lines, because they are plain instructions ("enter the full yearly premium"; "look on the terms page"). Maxxia and Oly `docFee` **stay amber**: the financed amount bundles the insurance with the fee, which is a real way to enter the wrong figure. 27 → 24 trap pairs.
- Articles regenerated: Maxxia's and Oly's "What catches people out" lists lose the insurance line; Smart Leasing's keeps only the payment line.
- To reverse: put the three fields back in `TRAP_FIELDS` and run `npm run export:guides` in `calculator2`. 366 tests and both builds pass.

## R8 — desktop side picture (2026-11-13) — partly, owner to look

- New `pictureFor()` in `providerGuide.ts` picks the side picture in the same order as the inline "Show me" (pointer's own example, special example, crop, marked page). Focusing Oly's FBT base value now shows the GST-credit "× 11" crop instead of falling back to the generic diagram. When the focused field has no picture, the panel keeps the last provider picture.
- The side picture is now a link that opens full size ("Click to enlarge"); its height cap is 70vh instead of 260 px; from 1200 px the side column can grow to 420 px. In the 1380 px check it is noticeably larger, though the card's own width still limits it.
- New `FIELD_NAMES` map: side-panel heading and image alt text now say "Marked Maxxia quote: Residual" instead of raw ids like `docFee`.
- **Not done (owner preference):** hiding the inline "Show me" on desktop while the side panel shows the same picture. Both still appear.
- Tests updated and one added (Oly base value → GST-credit picture). 367 tests, ESLint and calculator build pass.

## R13, R14, R15 — merge checklist, analytics plan, freshness routine (2026-11-13)

- New `PROVIDER_GUIDE_MERGE_CHECKLIST.md`: what changes for visitors, the safety checks run on the branch diff (no private files, PDFs, markers or PNGs; 204 redacted WebP), what is still to do before merging, how to roll back, the analytics reading plan (R14), and the freshness routine with the owner's open questions (R15).
- **Not done from R13:** the scripted 27-provider × 4-step contact sheet in light and dark. Playwright is not installed in `calculator2` and installing it was out of scope; the checklist lists a manual walk-through of six providers instead. Light theme has still never been reviewed.
- **Owner action before deploy:** register `provider`, `field` and `code` as GA4 event-scoped custom dimensions, or the new events can't be reported by provider.

## Kooya added as the 28th provider (2026-11-13)

Owner request: Kooya had no guide. Three Kooya quotes on one green template (Reddit 1st7ozz Apr 2026,
1unt2tj Jul 2026, 1vg13w1 Aug 2026; images in the private archive under `images-kooya/` and
`images-aug-nov-2026/`). Older 2025 posts that mention Kooya were not used.

- **Picker and Guided:** "Kooya" in the A–Z list. Pointers for drive-away, FBT base value, payment,
  deferral, residual, luxury adjustment, running costs and management fee; documentation fee is a
  "Can't find it?" line.
- **Two traps (amber):**
  - drive-away: “Price (ex. GST)” is “Total (drive way)” minus the “GST” line on all three quotes. Added to
    `DRIVEAWAY_TRAP_LABELS`, so the GST-reduced-price error fires when it's entered.
  - payment: the page 1 “Finance” tile was “Lease payment” × 1.1 on all three quotes
    (1,105.17 → 1,216; 653.48 → 719; 1,651.21 → 1,816). The pointer says only that it's a different
    figure; the "about a tenth higher" detail is in the tooltip. No GST basis is stated for the payment.
- **Per pay cycle:** Kooya's table is “Per paycycle”, following “Employer pay cycle” (monthly on two
  quotes, fortnightly on one). Said in the payment tooltip and running-cost pointer.
- **Deferral:** only the April quote has the “Employee authorisation” page (“based on a 2-month
  deferred lease structure”). It is a `FIELD_EXAMPLES` crop, `kooya/defer-example.webp`.
- **Not done:** the financed first-year insurance question stays Maxxia/Oly only. All three Kooya
  quotes say “Comprehensive first year funded: No”; the article tells readers with “Yes” to ask Kooya.
- **Images:** `kooya/redacted-quote.webp` (Aug 2026, both pages stacked; red ✕ on “Price (ex. GST)”
  and the Finance tile), seven field crops and the deferral crop. Template config in the private
  `templates/kooya/`; markers merged into private `crops/markers.json` (backup
  `markers.before-kooya.json`). The drive-away crop is two stacked strips so it's readable on phones.
  Every image OCR-checked for amounts, emails and phone numbers (clean) and viewed.
- **Counts:** sync scripts now expect 28 providers. New article `how-to-read-kooya-quote.md`.
- Checks: tsc, 368 tests, eslint, calculator build, site build; Guided Price step and article checked
  in the browser.

## R3 follow-up — phone: no typical-quote link once a provider is chosen (2026-11-13)

- Owner review: the "See a typical quote (not Oly's)" link below the fields was still clutter. Below 820 px, with a named provider chosen, the side column is no longer rendered at all; the provider's own "Show me" pictures cover it. With no provider, "Where is this on my quote?" stays at the top. Desktop unchanged (side panel keeps its "Typical quote" fold).
- 368 tests, TypeScript, ESLint and calculator build pass.

## R4 follow-up — red drive-away message points to the amber note (2026-11-13)

- Owner review: the red "This looks like … Use … instead" message repeated the amber drive-away note directly below it. The red message is now just "This looks like “{label}”. See the note below." The amber note keeps the full explanation and the "Show me" picture.
- `DRIVEAWAY_TRAP_LABELS` keeps only `wrong`; the unused `right` labels were removed. New test: every provider in it has `driveaway` in `TRAP_FIELDS`, so the note it points to always exists. 369 tests, TypeScript, ESLint and calculator build pass.

## Ticks instead of numbers on the Guided crops (2026-11-13)

- Owner review: in a crop, "2" doesn't tell the reader it is the line to use (the number only means something next to the article's table). All 173 `field-*.webp` crops now mark the line to use with a green ✓ in place of its number; red ✕ markers are unchanged; other numbered markers that fall inside a crop are painted out. Sizes unchanged, so the manifest's image sizes still hold.
- Whole page keeps its numbers (they match the article tables). Guided's caption now says "Your line is marked 2." in whole-page view and "✓ marks the line to use." in crop view; the desktop side panel matches. The numbers come from a new `lineLabels` key in `manifest.json` (`lineLabelFor()` in `providerGuide.ts`), written by the private `crops/line_labels.py` (markers.json plus make_crops' FIXES and AVOID). `prepare_quote_images.py` now keeps `lineLabels` when it rebuilds the manifest.
- Special example pictures (SG Fleet FBT and drive-away, Smart Leasing terms, Oly residual, Alliance page 2, Kooya deferral) keep their numbers, because the articles show them next to the numbered table; each Guided caption now names the number.
- How it was done: the full-resolution page PNGs are no longer on disk, so the published crops were edited in place by the private `crops/tick_crops.py` with hand corrections in `tick_overrides.txt`. Every crop was viewed, and every painted-out marker was checked in a zoomed before/after strip. Known small leftovers: faint inpainting marks on Fingo's striped background and where a removed marker touched an orange outline (LeaseExpress running, Kooya running); SG Fleet running keeps its "7b" and "10" markers because they sit on page icons. Future crops: draw a ✓ for the field's own marker in `make_crops.py`.
- Tests: whole-page labels exist for every crop that has a page marker; special captions name their number. 371 tests, TypeScript, ESLint, calculator and site builds pass. Browser-checked as Kooya on the Price step.

## Guided: picture steps use the full width (2026-11-13)

- Owner review: Guided was capped at 1040 px while Advanced uses the full calculator width (about 1270 px at a 1460 px window). Steps with a quote picture beside the questions (Price, Lease, Payment) now drop the cap (`.gd:has(.gd-split)`), and above 1200 px the picture column is `minmax(360px, 1fr)` instead of 300–420 px: at 1462 px the picture is about 595 px wide instead of about 390 px. Single-column steps (Before you start, Running costs, About you, Review) keep 1040 px, because their choice buttons and text stretch badly at full width. So the card widens and narrows between steps.
- Fix found in the same review: the "× 11" GST-credit pictures (outlined line, no tick) were captioned "✓ marks the line to use". They now say "The line to use is outlined." in both the inline caption and the desktop side panel.
- 371 tests, TypeScript, ESLint and calculator build pass; checked at 1462 and 1100 px with headless Chromium.

## Desktop side panel: whole pages scroll at full width (2026-11-13)

- Owner review: where a field has no crop (e.g. Oly lease term), the side panel showed the whole page shrunk to 70vh tall, so it was unreadable. A whole page now fills the panel's width inside a 70vh scrolling frame, scrolled to the field's marker when the picture or field changes (not on every re-render, so the reader's own scrolling stays). Caption: "… Your line is marked 3. Scroll to see more; click to enlarge."
- `lineLabels` now also lists the lease term ("3") for the 25 providers whose page numbers it (`line_labels.py`).
- 371 tests, TypeScript, ESLint and calculator build pass; checked as Oly on the Lease step at 1462 px (headless Chromium).

## Desktop: "Show me" drives the side panel; no inline picture (2026-11-13, settles R8)

- Owner decision: on wide screens (over 820 px, steps with the side panel: Price, Lease, Payment) "Show me" no longer opens a picture inside the pointer box. It sends that pointer's picture (its own example, crop or page) to the side panel. The panel now carries the same viewer as the phone inline box: crop with ✓ caption, "Whole page / Just this line" toggle (whole page in a scrolling frame scrolled to the line, "Your line is marked N. Scroll to see more."), "See the whole quote" and "Mine looks different". Focusing another field's input returns the panel to that field's default picture.
- Phones, and the Running costs step (no side panel), keep the inline picture.
- Code: one `QuotePicture` component used by both `ProviderPointer` (inline) and `ProviderSidePanel`; `SidePanelContext` is provided by `Side` only when wide and a provider is chosen. `guided_pointer_open` still fires on each Show me.
- Tests: pointer tests now run at phone width (jsdom has no matchMedia, which reads as wide); new test that on a wide screen Show me fills the side panel and the toggle shows the whole page with "Your line is marked 7b." 372 tests, TypeScript, ESLint, calculator build pass; checked with headless Chromium at 1462 px.

## Desktop side panel sticks below the nav bar (2026-11-13)

- Owner review: when scrolling, the panel stuck 12 px from the window top, under the site's 56 px sticky nav, so its title ("Oly quote: Residual") was hidden. It now sticks at `--nav-height + 12px`, and the panel picture (crop or whole-page frame) is capped at `100vh − nav − 230px` so the whole panel fits on screen. Checked with headless Chromium at 1462×925 while scrolled to the residual question.

## Side panel: no "Typical quote" once a provider is chosen (2026-11-13)

- Owner decision: the provider panel no longer offers the generic "Typical quote" diagram. The diagram still shows on desktop when no provider is chosen or the provider has no picture for the field, and on phones (no provider) behind "Where is this on my quote?". Test updated: the Maxxia panel has no "Typical quote". 372 tests, ESLint, calculator build pass.

## Guide export runs with every calculator build (2026-11-13)

- `npm run build` in `calculator2` now ends with `npm run export:guides`. Rebuilding Guided always refreshes `new-site/src/data/provider-guides.json` and the synced article blocks, so the articles can't keep old wording by accident.
- `npm run export:guides` still works on its own. The stale-JSON test remains as a backstop.

## R11 follow-up: old "Not shown on this sample" lines trimmed (2026-11-13)

- In the 14 articles that had both, the hand-written "Not shown on this sample" line no longer repeats fields covered by the generated "If a figure isn't on your quote" section. It keeps only the rest (usually the luxury adjustment and interest rate) and its provider-specific notes (Autopia base price, ORIX drive-away parts, Custom Fleet lease term and inclusions). No line became empty. Site build passes.

## R6 follow-up: Paywise payment names the printed GST label (2026-11-14)

- Paywise payment pointer: "Use “Lease Payment” under “Package Inclusions (ex. GST) – Fortnightly”, not the package total. If you see “(ex. GST)”, choose Excluding GST." Tooltip: "Enter it per fortnight. The package total adds running costs and fees." Exactly 140 characters, the pointer limit. Article row 7 synced.
- Also fixed the Autopia article test that the R11 trim broke by re-wrapping a sentence ("fringe benefit value" back on one line).
- 372 tests, calculator and site builds pass. ESLint's only error is the existing `import/no-relative-packages` rule lookup in `tests/golden-master.test.ts`, unchanged.

## R7 decided: trap trim kept (owner, 2026-11-14)

- Maxxia and Oly insurance and Smart Leasing doc fee stay plain lines. Maxxia and Oly doc fee stay amber.

## LeaseLab: weekly or fortnightly (2026-11-14)

- Extra-quote search (Reddit backlog Jul 2025 – Jul 2026 plus r/AusFinance): 11 LeaseLab quotes, 8 "Weekly Allowances" and 3 "Fortnightly Allowances" (1pzysjl Dec 2025, 1t51ned May 2026, 1urknk3 Jul 2026), none monthly. The old check wrongly flagged "per fortnight".
- Check `provider_weekly_payment` now fires only for "per month": "The LeaseLab quotes we checked showed weekly or fortnightly amounts. Check the period beside your payment."
- Payment pointer: "If “Lease” is under “Budgeted Allowance (ex GST)”, choose the period in the heading (Weekly or Fortnightly Allowances) and Excluding GST." Running pointer: "Choose the period in the heading for the running costs too." Article rows 7, 9, 10 and the allowances note follow.
- 371 tests (two period cases merged into one), calculator and site builds pass.

## Maxxia residual: back to a direct answer (owner, 2026-11-14)

- Extra-quote search: on 30 Maxxia quotes with readable figures (Aug 2025 – Nov 2026), "Total residual value" = 1.00–1.11 × ATO% × (FBT base value − GST saving) × 1.1, never near the excluding-GST figure. Three match to 0.01%; the rest are higher by about the stamp duty financed.
- Pointer: "If “Total residual value” has no GST label, choose Including GST." Tooltip: "It included GST on all 30 Maxxia quotes we checked (Aug 2025 to Nov 2026)." Article row 6 matched by hand. 371 tests and both builds pass.
