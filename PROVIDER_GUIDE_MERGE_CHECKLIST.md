# Provider guidance: merge checklist (2026-11-13)

Branch `codex/provider-guide-completion`, 275 files changed against `main`. Nothing is pushed or
merged. Merge only on the owner's instruction.

## What changes for visitors

- **Guided, first screen:** an optional "Who is your quote from? (optional)" picker, with 27
  named providers plus "Other / not listed".
- **Guided, Price to Running steps:**
  - per-provider lines under each question: plain lines, amber boxes for 24 known traps, and
    muted "Can't find it?" lines;
  - marked crops of real redacted quotes, opened with "Show me";
  - on desktop, a side picture that follows the focused field;
  - one "As seen on {provider} quotes, {month}" line per step.
- **Maxxia and Oly:** a new question asks whether first-year insurance is financed, with a premium
  field. This changes their effective rate and lease total.
- **Advanced:** a visible "first-year insurance already financed" field. It defaults to $0, so
  old scenarios are unchanged.
- **Provider warnings** on the Price and Payment steps: monthly-figure, yearly-figure,
  weekly-period and GST-reduced-price checks.
- **Site:** 27 "How to read a/an {provider} novated lease quote" articles and an index page
  ("Most common" plus A–Z). Each article has:
  - a generated review line;
  - "What catches people out";
  - the numbered table, partly synced from Guided;
  - "If a figure isn't on your quote".
- **Images:** 204 redacted WebP files under `docs/assets/images/quote-guide/`. No PDFs.

## Checks done for this list (2026-11-13)

- `git diff --name-only main...HEAD`: no file under `private/`, no PDF, no `markers.json`, no
  PNG added.
- calculator2: `npx tsc -b`, `npx vitest run` (367 tests), `npm run build` pass. The site build
  passes, including the five provider prebuild syncs.
- Redaction: every image was OCR-checked and viewed when it was made (items 3 and 10). Not
  re-checked image by image for this list.

## Still to do before merging

1. **Walk-through (owner):** at phone width, in both light and dark theme, check at least SG
   Fleet, Smart Leasing, Maxxia, Oly, MillarX and one no-trap provider (NLA). On each, open every
   "Show me" on the Price, Lease, Payment and Running steps. Light and dark at phone width: owner reviewed a contact sheet of all 28 guides × Price, Lease, Payment, Running on 2026-11-14 and found no problems. Opened "Show me" pictures are not on it.
2. **Owner wording review:** R6 read 2026-11-14 (Paywise reworded). R5 settled 2026-11-14 after the extra-quote
   search. R7 trap trim kept (owner, 2026-11-14).
3. **Owner choices:**
   - R8: decided 2026-11-13: desktop "Show me" fills the side panel, no inline picture;
   - R11: decided 2026-11-13: older "Not shown on this sample" lines trimmed to what the new section doesn't cover;
   - item 8 (parked).
4. **Merge:** merge into `main` with a merge commit, not a squash, so it can be reverted in one
   step. Push; the site is live about 75 seconds later.
5. **After deploy:**
   - open the calculator and two articles on the live site;
   - check the GA4 real-time view for `guided_provider`;
   - record the ship date under "Reading the numbers" below.

## Roll back

`git revert -m 1 <merge commit>` on `main`, then push. Saved Guided drafts still load: the
provider and insurance answers are optional fields.

## Reading the numbers (review round 2, R14)

- **Ship date:** _fill in on deploy_.
- **Overlap:** the coffee-nudge social-proof A/B test runs until mid-December. Read its funnel
  separately, or note the overlap.
- **Events:**
  - `guided_provider` (provider);
  - `guided_step` and `guided_completed` (provider, or `none`);
  - `guided_pointer_open` (provider, field);
  - `guided_provider_check` (provider, code; once per session);
  - `guided_provider_feedback_click` (provider);
  - `guided_finding_shown` (code, level).
- **GA4 admin:** done 2026-11-14. Event-scoped custom dimensions "Provider" (`provider`), "Field"
  (`field`) and "Check code" (`code`) are registered on property 521792876. `level` is not
  registered.
- **Questions, four weeks after shipping** (use `~/.claude/scripts/ga4_report.py`):
  1. What share of readers who have a quote pick a provider? Which providers, and how many pick
     "Other"?
  2. Completion from the Price step to results: named provider vs `none`.
  3. Which fields get their picture opened most, and which provider checks fire most? A check
     that fires often points to a pointer that isn't working.
  4. How many "Mine looks different" clicks, and for which provider? This is the cue to fetch a
     newer quote.

## Keeping it current (review round 2, R15)

- **Evidence depth:** 15 of 27 guides rest on one quote. The generated article line already says
  "Checked against 1 quote example". LeasePlan's only example is from Aug 2025. Driva (Aug 2026)
  and Vehicle Solutions (Sep 2026) pass six months in early 2027.
- **Routine (proposal):**
  - On the first of each quarter, run `freshness_check.py` against the private archive.
  - Look for new quotes for any guide older than six months; the picker hint already warns
    readers about these.
  - Re-check every provider with a "Mine looks different" click.
- **Decided 2026-11-14:** over 12 months with no newer quote, a guide's amber traps show as plain
  lines with "Based on a … quote from … Yours may look different." Automatic by date; applies to
  LeasePlan now. The 6-month caution stays as it was.
