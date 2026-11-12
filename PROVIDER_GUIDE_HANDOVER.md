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
