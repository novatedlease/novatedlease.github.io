# calculator2 — redesign notes

Single reference for the `/calculator2/` redesign. Supersedes `CALCULATOR2_REDESIGN_PROMPT.md`
(Phase 1 brief) and `CALCULATOR2_PHASE2_PROMPT.md` (parity gap list), both now deleted —
everything still relevant from them is folded in here. Last audited 2026-07-04: **all Phase 1
and Phase 2 build items are implemented and verified in code; 73 vitest tests green.** What
remains is one verification task, a few owner decisions, and housekeeping (see "Outstanding").

Live hidden preview: <https://novatedlease.guide/calculator2/> (noindex, sitemap-excluded, unlinked).

---

## 1. Architecture — how it fits together

- **`calculator/`** — v1, the live React 19 + TS + Vite app at `/calculator/`. Builds to
  `docs/assets/calculator/` with stable filenames `main.js` / `style.css`.
- **`calculator2/`** — v2, the redesigned app. Same stack. Imports the calculation engine
  **directly from `calculator/src/engine/`** via the `@engine` tsconfig/vite alias — the engine
  is never forked. Builds to `docs/assets/calculator2/` (`base: "/assets/calculator2/"`).
- **`new-site/`** — Astro site. `new-site/public/assets` is a symlink to `../../docs/assets`,
  so both calculator bundles ride along in the Astro build.
  `new-site/src/pages/calculator2/index.astro` embeds the v2 bundle (FAQ prose + FAQPage
  JSON-LD + support boxes ported from the v1 page; `noindex` kept until cut-over; excluded
  from sitemap via the filter in `new-site/astro.config.mjs`; not in nav or search).
- **Deploy**: push to `main` → `.github/workflows/publish.yml` builds `new-site` → gh-pages.
- **Design system**: `calculator2/src/styles/tokens.css` (palette derived from
  `new-site/src/styles/global.css`) + `components.css` + shared atoms
  (Field/Section/Tabs/Button/InfoTooltip). Max width 1300px matching v1; input column 430px.

### Hard constraints (still in force until cut-over)

1. **Never modify `calculator/src/` or `docs/assets/calculator/`** — v1 stays live and
   byte-identical. One permitted exception class: clear-cut engine maths bugs, fixed only
   after reporting, each with a regression test (and noting it affects live v1).
   - *Known recorded deviation:* commit `f92be20b` edited `calculator/src/engine/urlState.ts`
     to fix the share-link payload-key mismatch (`{v, i}` → `{v, inputs}`). Harmless in
     practice — v1's App.tsx never imports that module and the v1 bundle was not rebuilt —
     but it is a documented exception, not a clean record.
2. **Never fork the engine** — v2 imports `@engine/*`; all maths lives in one place.
3. Share links (`?c=`) use the same codec both ways; saved quotes use v1's exact
   localStorage key and `SavedQuoteV1` shape so quotes are shared across versions.
4. Every change: `npm run build` clean → `npx vitest run` green (73+ tests) →
   `git diff --stat calculator/` empty → push → watch BOTH the publish workflow and the
   native "pages build and deployment" step (the latter fails transiently; an empty commit
   re-push fixes it) → verify the live URL.

## 2. Feature status — everything below is DONE and verified in source

**Phase 1 (build-out):**
- `calculator2/` package, `@engine` alias, full build chain to `docs/assets/calculator2/`.
- Hidden Astro page (noindex, sitemap-excluded, unlinked).
- Golden-master engine tests (30 scenarios: FBT tiers, terms, incomes, comparators) plus
  correctness regressions incl. the $47,138 totalSaving pin.
- Simple mode: 7 questions → `src/assumptions.ts` → full engine `Inputs`; assumptions panel
  with per-field "edit in Advanced" links; mode choice remembered; `?c=` links open Advanced.
- Advanced mode: all 8 v1 input sections, every `Inputs` field editable; all 7 report
  sections + BasicInformationReport; Summary/Details/Compare tabs; horizon toggle; v1's
  three-card Summary comparison ported verbatim.
- Share links (bidirectional v1↔v2, fixed and end-to-end verified), saved quotes
  (save/load/rename/delete/export/import), comparator view, the three auto-sync effects
  (residual, financed amount, market value), lease-rate guard (0.1%–30%).
- Mobile responsiveness at 375/768/1280; accessibility pass (keyboard, contrast,
  `prefers-reduced-motion` in tokens.css).

**Phase 2 (parity gaps, all 15 closed):**
1. Footer disclaimer block (`src/components/ui/Footer.tsx`).
2. GA4 analytics — v1's event vocabulary preserved (`expand_<section>`,
   `breakdown_expanded`, `copy_link_clicked`, tab-open events, `save_quote_clicked`,
   `input_changed`, `calculator_started`) plus v2-only `mode_switched` and
   `simple_mode_go_advanced_clicked`.
3. Electricity auto-fill: `electricityAnnual` from `annualMileageKm × $0.0547` until
   overridden (`App.tsx:115-137`).
4. Lease-duration re-quote warning banner (`InputsPanel.tsx`).
5. Cross-navigation from Summary/Compare cards to specific Details sections
   (`onNavigateToDetails` callback + anchor ids).
6. EV FBT eligibility warning banner, May-2026 phase-out info banner, 75%-FBT start-date
   notice (`InputsPanel.tsx`).
7. Fortnightly/monthly display toggle threaded through InputsPanel → LeaseReport + WhatIf.
8. Reset-to-defaults button (plus fix `f4ccf368` for residual/electricity stuck at 0).
9. Residual ex/inc-GST display toggle (stored canonically ex-GST).
10. Maths audit written and committed: `calculator2/MATHS_AUDIT.md` (see §3 for its open items).
11. Headline-figure parity audit — default scenario fully verified; multi-scenario sweep
    outstanding (see §3). Findings in `calculator2/PARITY_AUDIT_NOTES.md`.
12. Layout widened to 1300px (tokens.css + Astro wrapper), input column 430px.
13. Effective-rate nudge steppers (±0.1% grid, press-and-hold repeat) in LeaseRateGuard.
14. LeaseAdjustModal — Smart Leasing (2 buffer months) / MillarX (1); links the explainer
    article `/special-and-policy/smart-leasing-millarx-payment-structure/`.
15. Comparator cash-flow/asset/liability breakdown table — ported into ComparatorView AND
    the single-quote Financial Summary section (`652df128`, beyond original scope).

**Deliberate scope cuts (agreed — do not re-add without asking):**
- v1's per-section accent colours + emoji headers (replaced by the design system).
- `window.wsNl` debug globals.
- Section 2's row-by-row layout was initially simplified; the full tables were later
  restored, so this cut no longer applies.

## 3. Outstanding — the only open items

(Ready-to-run implementation prompts for each of these are in §5.)

1. **Multi-scenario parity sweep (highest priority).** The parity audit
   (`calculator2/PARITY_AUDIT_NOTES.md`) verified v1↔v2 number-identity only on the
   *default* scenario (perfect match). Custom scenarios were blocked by the share-link
   codec bug, which is now fixed (`f92be20b`) — but the sweep was never re-run. Re-check
   ComparatorView net positions, the three EffectiveInterestReport definitions, the
   LeaseReport FY table, WorstCase series, and ATI/SG rows across FBT-category /
   lease-term / comparator variations, using share links to drive both apps (fast now the
   codec is compatible). One loose end from that audit: v2's "$449.25 net charging expense"
   stat in BasicInformationReport had no exact v1 counterpart — likely a labelling
   difference, never confirmed.
2. **Maths-audit owner decisions** (`calculator2/MATHS_AUDIT.md`):
   - **RFBA flat 20% for `EV_FBT_DISCOUNTED` leases** — moderate-to-high confidence it
     should be 15% for that category (~$7,547/FY RFBA difference in the worked example).
     Fixing touches live v1 (`calculator/src/components/ATI.tsx`) — owner sign-off required.
   - 53% childcare-subsidy factor: not verified against Services Australia / Family
     Assistance Act primary sources.
   - $75k transitional cap + 2027/2029 tier dates: verified only against the repo's own
     article, not bill text (measure may still be pre-legislation).
   - Architecture flag: `engine/rfba.ts` / `engine/fbt.ts` are v2-only; v1 keeps its own
     (verified-identical) inline copies — same divergence shape that caused the share-link
     bug. Consider converging v1 onto the engine files at cut-over.
3. **Cut-over plan** (owner decision): swap `/calculator/` to v2, redirect or retire
   `/calculator2/`, remove noindex, keep v1 source in-repo until confident.
4. **Simple-mode assumption review** (owner): drive-away ÷ 1.08 base-value heuristic,
   9.5% p.a. assumed effective rate, flat rego/insurance — documented in
   `src/assumptions.ts` but set unilaterally.

## 4. Working rules (learned the hard way — keep following)

- **Verify parity against v1's rendered output, not your reading of its code.** Every
  silent-divergence bug so far (headline missing the interest term; missing input form;
  the share-link codec) passed builds, type-checks, and smoke tests.
- Add a regression test with every bug fix, pinned to the specific number that was wrong.
- All input sections stay `defaultOpen` — a collapsed Section renders nothing (not
  hidden), which is how the missing-inputs bug stayed invisible.
- Restart the Astro dev server after rebuilding a calculator bundle — live reload does not
  pick up the JS asset change.
- The 1280px `scrollWidth` overflow (1343px) is the site-wide nav dropdown, present on
  every page — not a calculator2 bug; don't chase it.
- Headless Chromium for visual/functional verification: playwright with explicit
  `executablePath` to the `ms-playwright/chromium-1217` cache (scratch scripts, not
  committed).

## 5. Pipeline prompts — copy-paste briefs for the remaining work

Each prompt below is self-contained given this file as context. Run them roughly in the
order listed (A gates D; B needs an owner decision first). Every prompt inherits §1's hard
constraints and §4's working rules without restating them.

### Prompt A — multi-scenario parity sweep (do this first)

> Complete item 11 of the Phase-2 audit: verify that v2 renders numbers identical to v1
> across a full scenario matrix, not just the default scenario. The share-link codec is now
> bidirectionally compatible (`f92be20b`), which unblocks the method the original audit
> couldn't use.
>
> Method: build both apps unmodified and serve each via `vite preview`. Reuse the ~30
> golden-master scenarios from `calculator2/tests/` (FBT tiers: EV exempt / transitional /
> over-LCT / post-2029 / non-EV; terms 1–5y; deferred months; incomes at bracket edges;
> comparators on/off) — encode each as a `?c=` share link via `engine/urlState.ts` and load
> the SAME link in both apps with headless Chromium (playwright, explicit `executablePath`
> to the `ms-playwright/chromium-1217` cache; scripts stay in the scratchpad, not the repo).
> For each scenario, open all three tabs (Summary / Details with every section expanded /
> Compare), extract every dollar and percentage figure from the rendered text, and diff
> v1 vs v2. Cover specifically: ComparatorView net positions and the cash-flow/asset/
> liability rows, all three EffectiveInterestReport definitions, the LeaseReport FY table,
> WorstCase series, ATI/RFBA rows, and SG rows.
>
> Also settle the one loose end from the first pass: v2's BasicInformationReport shows
> "$449.25 — Net charging expense (after tax reimbursement)" with no exact v1 counterpart;
> trace both computations and state definitively whether it's a labelling difference or a
> numeric divergence.
>
> Report before fixing: append findings to `calculator2/PARITY_AUDIT_NOTES.md` (which also
> needs committing — it is currently untracked). Any real divergence gets a regression test
> pinned to the wrong number, then a fix in v2 only; if the divergence traces to the engine
> or v1, flag it for the owner instead of fixing. Finish with a clear verdict: either
> "parity verified across the matrix" or an itemised diff list.

### Prompt B — RFBA statutory rate for discounted-FBT leases (gated on owner sign-off)

> OWNER DECISION REQUIRED FIRST — do not start until the owner confirms the fix. Context:
> `calculator2/MATHS_AUDIT.md` item 9 found that RFBA is computed with a flat 20% statutory
> rate in all FBT categories, but for `EV_FBT_DISCOUNTED` leases (transitional 2027-29 and
> post-2029 tiers) the correct rate is very plausibly 15% — consistent with
> `getEcmStatutoryRate()`, which already returns 15% for exactly this category.
>
> If approved, fix BOTH copies (they are duplicated; changing one alone reintroduces a
> v1/v2 divergence): (a) `calculator/src/engine/rfba.ts` — the copy v2 imports — replace
> the hardcoded/defaulted `0.2` with a rate derived from `getLeaseFbtCategory()`; (b) v1's
> inline `computeRfbaSchedule` in `calculator/src/components/ATI.tsx` (~lines 104, 154-155)
> — same change. (b) modifies live v1: this is the one permitted engine-change class
> (reported maths bug, owner-approved, regression-tested). It requires rebuilding
> `docs/assets/calculator/` — verify the rebuilt v1 bundle diff contains ONLY this change.
>
> Regression test pinned to the audit's worked example: $80,000 EV, lease start 2027-06-01
> (`EV_FBT_DISCOUNTED`), full-FY exposure → RFBA must be 0.15 × 80,000 × 1.8868 =
> $22,641.60 (was $30,188.80). Add a second case asserting the EXEMPT category still uses
> 20% (flat 20% is CORRECT there — the ATO's notional-taxable-value reporting for exempt
> EVs uses the standard statutory rate; do not "fix" it). Confirm both v1 and v2 render the
> corrected figure for the same share link.

### Prompt C — verify the two unconfirmed constants (research only, no code)

> Close out the two COULD-NOT-VERIFY items in `calculator2/MATHS_AUDIT.md`. This is a
> research task: no code changes; the deliverable is updated verdicts in that file plus a
> short summary for the owner.
>
> 1. The 53% adjusted-fringe-benefits factor used for the childcare-subsidy purpose
>    (`calculator/src/components/ATI.tsx:229-230,260`). Verify against primary sources:
>    the adjusted fringe benefits total definition in A New Tax System (Family Assistance)
>    Act 1999 and current Services Australia CCS income-test guidance. The factor should
>    equal (1 − FBT rate), i.e. 1 − 0.47 = 0.53 — confirm that derivation and that it
>    applies to FBT-exempt-employer RFBA in the CCS test.
> 2. The EV FBT phase-out parameters: $75,000 transitional full-exemption cap and the
>    1 Apr 2027 / 1 Apr 2029 tier boundaries (`calculator/src/engine/types.ts:95,210-228`).
>    The May-2026 budget measure may now be legislation — find the bill or Explanatory
>    Memorandum text and confirm the cap, both boundary dates, and the inclusive/exclusive
>    edge behaviour (the engine treats a lease starting exactly on a boundary date as
>    falling into the NEW tier — check the legislative wording agrees).
>
> If either source contradicts the engine, write it up as a new MATHS_AUDIT.md finding with
> a worked example and severity — report, don't fix.

### Prompt D — cut-over: v2 becomes `/calculator/` (gated on Prompt A passing + owner go-ahead)

> Promote v2 to the canonical `/calculator/` URL. Prerequisites: Prompt A's sweep passed,
> and the owner has explicitly said go. The v2 bundle needs NO rebuild — its assets keep
> living at `/assets/calculator2/`; only Astro pages change.
>
> 1. Replace the content of `new-site/src/pages/calculator/index.astro` with
>    `new-site/src/pages/calculator2/index.astro`'s content, minus the `noindex` prop, so
>    `/calculator/` embeds `/assets/calculator2/main.js` + `style.css`. Keep `/calculator/`'s
>    canonical URL, sitemap presence, and nav links untouched.
> 2. Turn `/calculator2/` into a redirect that PRESERVES the query string (GitHub Pages has
>    no server redirects, and a plain meta-refresh drops `?c=` share links):
>    `location.replace('/calculator/' + location.search)` plus a meta-refresh fallback and
>    a manual link. Keep it noindex and sitemap-excluded.
> 3. v1 afterlife: add a hidden `/calculator-v1/` page (noindex, sitemap-excluded, unlinked
>    — mirror how `/calculator2/` was set up) embedding the untouched
>    `/assets/calculator/` bundle, as the fallback during the confidence period. Do NOT
>    delete `calculator/src/` — v2 imports the engine from it.
> 4. Verify end-to-end after deploy (watch both workflows per §1.4): `/calculator/` renders
>    v2; an old v1-era share link opens correctly on `/calculator/`; a preview-era
>    `/calculator2/?c=...` link survives the redirect with state intact; saved quotes from
>    v1 appear (same localStorage key, and now same path/origin); GA4 events fire with the
>    unchanged ids; `/calculator-v1/` renders old v1.

### Prompt E — Simple-mode assumption tuning (needs owner's values first)

> The owner has reviewed `calculator2/src/assumptions.ts` and supplied revised values for
> some of: the drive-away ÷ 1.08 dutiable/FBT-base heuristic, the 9.5% p.a. assumed
> effective interest rate, and the flat rego/insurance/service running-cost estimates.
> [OWNER: paste the revised values into this prompt when running it.]
>
> Apply them only in `assumptions.ts` — it is the single annotated source of truth; nothing
> elsewhere hardcodes these numbers. Update the per-assumption explanatory text so the
> "Assumptions we made for you" panel stays accurate, update any tests that pin derived
> Simple-mode outputs, and sanity-check one Simple-mode scenario end-to-end (the derived
> `Inputs` must still produce a plausible verdict and survive the switch to Advanced mode
> with state preserved).

### Prompt F — post-cut-over housekeeping: kill the v1/v2 duplication (optional, low priority)

> Only after cut-over (Prompt D), while `/calculator-v1/` still exists as a live fallback.
> Two duplication hazards remain, both the same shape that caused the share-link bug:
>
> 1. v1's `App.tsx` / `components/ATI.tsx` keep inline copies of logic that also exists in
>    `calculator/src/engine/` (`urlState.ts`, `rfba.ts`, `fbt.ts` — the engine copies are
>    currently v2-only). Converge v1 onto the engine imports and delete the inline copies,
>    OR — if v1 is now frozen for retirement — add a prominent header comment to each engine
>    file stating v1 does not import it and must not be trusted as v1's behaviour. Pick
>    based on how long `/calculator-v1/` will live; ask the owner if unclear.
> 2. `calculator/src/engine/ato.ts:3` hardcodes `GST_EXEMPT_CAP = 6353` rather than deriving
>    it as CAR_LIMIT / 11 (MATHS_AUDIT.md item 5). Introduce a `CAR_LIMIT` constant
>    ($69,883 for FY2026-27) and derive the cap, so next FY's update is one number. Add a
>    test asserting the derived value equals the ATO-published cap.
>
> Both changes touch the engine, so the full §1.4 verification loop applies, including a
> `docs/assets/calculator/` rebuild if v1 source changes.
