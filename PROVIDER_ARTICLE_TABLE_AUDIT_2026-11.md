# Provider article table audit

This audit covers the 27 provider articles and `calculator2/src/guided/providerGuide.ts` on `codex/provider-guide-completion`, 13 November 2026. It guides the unfinished table part of item 15 in `PROVIDER_GUIDE_REVIEW_2026-11.md`.

## What the tables contain

- Every provider article has a numbered main table. Alliance, Oly and Toyota Fleet Management have a second table for another quote section.
- The 27 guides have 101 explicit field pointers. Their articles generally have more numbered rows than pointer entries. A pointer is a short instruction for the calculator; an article row can also identify the exact label on the quote, the GST or payment period qualification, and the relationship between two printed lines.
- The main table has no row corresponding to an explicit pointer in 14 provider/field cases across 13 providers: SG Fleet `luxAdj`; Smart Leasing `driveaway`; Oly `residual`; LeasePlan `driveaway`; Alliance `docFee`; Autopia `baseValue`; LeaseLab `driveaway`; Paywise `driveaway`; Smartsalary `driveaway`; Toyota Fleet Management `defer`; LeaseExpress `driveaway`; ORIX `baseValue` and `driveaway`; RemServ `driveaway`. Some appear in a second table or explain that the number is absent from the sample. The main table alone is not a complete source for Guided.

## Safe conversion path

1. Keep the article's intro, numbered page image and quote-specific explanation.
2. Model each numbered row with `provider`, `marker`, `field`, `quoteLabel` and a layout-only note. Link the action text to the corresponding `GUIDES` pointer instead of copying it. Include second-page rows and missing-number explanations explicitly.
3. Generate a Markdown table at build time because the site uses plain `.md`, not MDX. Replace one provider article at a time and compare its rendered rows and page image with the existing version. Maxxia and Oly need an explicit check that documentation fee and financed insurance remain separate.
4. Once converted, make a test fail when an article row lacks a valid field, a pointer changes without regenerating the article, or a referenced image is missing.

Do not replace all 27 tables with only the short pointers: that would remove verified quote labels and important explanations. The already committed `sync-provider-review-month.mjs` shows an idempotent build-time update pattern for article metadata, and the manifest integration test covers images and article existence.
