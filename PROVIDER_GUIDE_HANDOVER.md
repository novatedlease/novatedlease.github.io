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
