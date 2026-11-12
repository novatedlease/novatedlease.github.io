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

