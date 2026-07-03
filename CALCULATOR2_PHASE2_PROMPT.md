# Task: calculator2 Phase 2 — close the v1 parity gaps and finish launch-readiness

This supersedes `CALCULATOR2_REDESIGN_PROMPT.md` (kept for reference). Phase 1 is built,
tested (72 vitest tests), and live at the hidden preview `https://novatedlease.guide/calculator2/`.
This prompt is the audited list of what remains before v2 could replace v1 at `/calculator/`.

Everything in "Context — how the system fits together" and "Hard constraints" from the
original prompt still applies verbatim, in particular: **never modify `calculator/src/` or
`docs/assets/calculator/`** (v1 stays live and byte-identical until cut-over), engine is
imported from `calculator/src/engine/` via the `@engine` alias (never forked), builds go to
`docs/assets/calculator2/`, and every change is verified with `npm run build` + `npx vitest run`
in `calculator2/` before committing. A headless Chromium is available for visual/functional
verification (see `scratchpad` scripts pattern from Phase 1: playwright with explicit
`executablePath` to the `ms-playwright/chromium-1217` cache).

---

## 1. Phase 1 status — what is DONE (do not redo)

| Area | Status |
|---|---|
| `calculator2/` package, `@engine` alias, build chain to `docs/assets/calculator2/` | ✅ done |
| Hidden Astro page `/calculator2/` (noindex, sitemap-excluded, unlinked) | ✅ done |
| Golden-master engine tests (30 scenarios: FBT tiers, terms, incomes, comparators) | ✅ done |
| Design system (`tokens.css`, `components.css`, Field/Section/Tabs/Button/InfoTooltip/shared atoms) | ✅ done |
| Simple mode (7 questions → `assumptions.ts` → full engine `Inputs`, assumptions panel) | ✅ done |
| Full Advanced-mode input form — all 8 v1 input sections, every `Inputs` field editable | ✅ done |
| All 7 report sections + BasicInformationReport ported | ✅ done |
| **Summary tab** — v1's three-card comparison (hero + cashflow/interest decomposition) ported verbatim; Summary/Details/Compare tab structure restored; horizon toggle | ✅ done |
| Share links (`?c=`, bidirectional v1 compat, tested) | ✅ done |
| Saved quotes (same localStorage key/shape as v1; save/load/rename/delete/export/import) | ✅ done |
| Comparator view (pathway selection, validation guards, ranked net-position table) | ✅ done |
| All 3 auto-sync effects (residual, financed amount, market value) | ✅ done |
| Lease-rate guard (0.1%–30% rejection + live effective rate + >10% BYO note) | ✅ done |
| Mobile: no horizontal overflow at 375/768/1280; EIR grid collapse; tap targets | ✅ done |
| Correctness regression suite incl. the $47,138 totalSaving pin | ✅ done (72 tests) |

Two correctness bugs were found by the owner comparing against v1 (missing interest term in
the headline figure; missing input form) — both fixed with regression tests. **Lesson encoded
below: parity claims must be verified against v1's rendered output, not against "it compiles
and looks reasonable".**

## 2. Remaining gaps — MUST port before cut-over

Work through these in order; each item names the v1 source to port from.

1. **Footer disclaimer block** — v1 `App.tsx` lines ~1757-1785: "CC BY-NC-SA 4.0 — © CY YEW",
   factual-information-only note, "consult a qualified financial adviser", borrowing-capacity
   warning. The original prompt required this verbatim; it was never added. Render it at the
   bottom of both Simple and Advanced modes. (Update the © year handling as v1 does.)

2. **Analytics** — v1 `src/utils/analytics.ts` (`trackEvent`, `trackOncePerSession`) and its
   call sites: section opens (v1 CollapsibleSection `analyticsId` per section), save-quote
   clicks, share-link copies, tab switches. Port the util verbatim and wire the same event
   ids so GA4 dashboards remain comparable across v1/v2. v2 additions worth new events:
   mode switches (simple↔advanced), Simple-mode "go advanced" clicks.

3. **Electricity auto-fill effect** — v1 `InputsPanel.tsx` lines ~44-89: `electricityAnnual`
   (the packaged claim) auto-fills from `annualMileageKm × $0.0547` until manually overridden,
   with share-link/saved-quote override detection (the `lastAuto`/`touched` pattern, same as
   the three auto-sync effects already ported in v2 `App.tsx`). Without this, changing annual
   km in v2 silently leaves a stale electricity claim — a *numbers-differ-from-v1* bug, not a
   cosmetic one. This is the highest-priority item on this list.

4. **Lease-duration re-quote warning** — v1 `InputsPanel.tsx` lines ~36-42 and ~676-713:
   changing lease duration shows a dismissible red banner telling the user to update their
   per-fortnight quote (and quote-dependent fields), with an "I've updated the quote" button.
   Prevents silently-wrong outputs after a term change.

5. **Cross-navigation links** — v1 uses a `nlguide:navigate` CustomEvent so Summary cards
   ("Go to Details →"), BasicInformationReport's effective-rate row, and guard warnings can
   jump to a specific Details section. v2's SummaryView dropped these buttons and its
   Disclaimer says "see Section 4 in Details" as dead text. Implement equivalent navigation
   (switch `outputTab` to details + scroll to the section; a small context or callback prop is
   fine — no need to keep the CustomEvent mechanism itself).

6. **Vehicle-details eligibility warning banner** — v1 `InputsPanel.tsx` lines ~405-440: when
   an EV fails FBT-exemption (used-car checks unticked, or over LCT), a red banner explains
   exactly why and what to do. v2 currently shows only a small "FBT-applicable" label line.
   Port the banner content (it prevents the single most common user confusion). Also port the
   May-2026 phase-out info banner (v1 lines ~369-402) shown for transitional/post-2029 start
   dates, and the "75% FBT Applicable" date-triggered notice near the start-date field
   (v1 lines ~648-663).

7. **Fortnightly/monthly display toggle** (`vehicleLeasePeriodMode`) — v1 threads this through
   InputsPanel, LeaseReport, and WhatIf so users with monthly quotes can enter/read monthly
   figures. Port it: a small per-fortnight / per-month switch next to the lease payment field,
   passed to LeaseReport and WhatIf (both v2 ports already accept the prop — currently unwired).

8. **Reset-to-defaults button** — v1 `InputsPanel.tsx` header. One button, trivial, and
   important for a tool where users mangle inputs while exploring.

9. **Residual ex/inc GST display toggle** — v1 `InputsPanel.tsx` lines ~97-108 and ~715-743:
   residual field can display/accept either ex-GST or inc-GST (stored canonically ex-GST).
   Real quotes state residuals inc-GST, so users currently have to divide by 1.1 by hand.

10. **Maths audit** (`calculator2/MATHS_AUDIT.md`) — §6 of the original prompt; still not done
    (a background agent assigned to it went off-task and it was deferred). Verify engine
    constants against primary ATO sources: LCT thresholds ($91,387 / $91,661), transitional
    $75k cap and tier dates, ECM rates + s11(2) two-thirds rule, ATO residual percentages,
    GST cap $6,353, car limit $69,883, tax brackets + 2% Medicare, SG 12%, Type-2 gross-up
    1.8868, ATI's 53% childcare factor. Also research the flagged judgement call: whether a
    flat 20% statutory rate for RFBA (v1 `ATI.tsx`) is right in all FBT categories. Report
    before fixing anything; clear-cut engine fixes need regression tests and affect live v1.

11. **Headline-figure parity audit** — systematically diff every number v2 displays against
    v1's rendered output for identical inputs (same-input side-by-side in headless browser, or
    porting v1's per-component computations into assertions). Two silent divergences already
    slipped through Phase 1; assume more exist until each displayed figure is checked. Cover:
    ComparatorView net positions, FinancialSummaryReport rows, LeaseReport FY table,
    EffectiveInterestReport all three definitions, WorstCase series, ATI/SG rows.

12. **Layout width** — v2 renders noticeably narrower than v1 and the output column looks
    cramped. v1's `.calc-page` is `max-width: 1300px` (new-site/src/styles/global.css); v2 is
    constrained twice: the Astro page wrapper `.calc2-page` at 1100px
    (`new-site/src/pages/calculator2/index.astro`) AND `--nlc-max-width: 1200px`
    (`calculator2/src/styles/tokens.css`, applied via `.nlc-app`). Set both to 1300px to match
    v1. Owner-requested. After widening, re-run the overflow checks at 375/768/1280/1440px and
    sanity-check that the wider output column doesn't leave the fixed 400px input column
    (`--nlc-input-col`) looking underweight — nudge it up proportionally if needed.

13. **Effective-rate nudge arrows** (±0.1% steppers) — owner explicitly wants this kept: it's
    how users answer "what if my interest rate were x%?" without doing annuity maths. Port
    from v1 `InputsPanel.tsx` (~lines 110-156, 948-1051) + the recompute handler in v1
    `App.tsx` (~lines 949-1010): stepping adjusts the effective rate to the next 0.1% grid
    point (with the float-drift epsilon logic) and recomputes `vehicleLeasePerFn` from it via
    `fortnightlyLeaseFromEffectiveAnnualRate`. Keep press-and-hold repeat (initial 320ms
    delay, then 110ms interval) and the iOS pointer-capture handling. **Restyle freely** to
    match the design system (e.g. proper stepper buttons in the LeaseRateGuard's rate strip
    instead of v1's △/▽ glyphs) — the behaviour is what's cherished, not the look. In v2
    there is no cross-component CustomEvent needed: LeaseRateGuard already owns both the rate
    display and `setInputs`, so implement it locally there.

14. **`LeaseAdjustModal` (Smart Leasing / MillarX payment-structure adjuster)** — owner wants
    this kept: these providers quote a per-month figure that hides a 1-2 month buffer, a
    common point of confusion (the site has a whole article on it). Port from v1
    `InputsPanel.tsx` (~lines 1979 onward): provider picker (Smart = 2 buffer months,
    MillarX = 1), quoted-amount input with per-fortnight/per-month mode, computes
    `adjusted = quoted × (totalMonths − bufferMonths) / totalMonths` and applies it to
    `vehicleLeasePerFn`. Surface it as a small "Using Smart Leasing or MillarX? Adjust your
    quote" link/button near the fortnightly lease payment field, opening a modal or inline
    expander (implementer's choice; match the design system). Link the explainer article:
    `/special-and-policy/smart-leasing-millarx-payment-structure/`.

15. **Comparator detailed cashflow/asset/liability breakdown table** — owner wants this kept:
    the ranked summary alone doesn't show *where* the money goes per pathway. Port Section B
    from v1 `ComparatorView.tsx` (~lines 1084 onward): per-pathway columns with the Cash Flow
    row group (sale proceeds, upfront, lease/loan payments, running, charging delta, residual,
    = total), Asset row (car value at end), and Liability row (home-loan interest vs no-car
    baseline), honouring the same horizon toggle as the summary ranking table. The
    `extractPathwayNumbers` helper in v2's ComparatorView already computes a subset of these —
    extend it to expose the full row set rather than recomputing separately, and cross-check
    each row against v1's rendered table for identical inputs (per working rule #1).

## 3. Deliberately NOT porting (agreed scope cuts — do not implement without asking)

- **v1's per-section accent colour scheme + emoji headers** — replaced by the design system.
  (Owner confirmed happy to drop.)
- **`window.wsNl` debug globals** in v1 FinancialReport — dev leftovers, not ported.

## 4. Launch-readiness items (needed before v2 replaces `/calculator/`, not before preview sign-off)

- **Astro page content**: v2's page is a bare shell (35 lines vs v1's 162). Before cut-over,
  port the FAQ prose + FAQPage JSON-LD schema, "how to use" section, support/GoFundMe boxes,
  and intro copy from `new-site/src/pages/calculator/index.astro`. Keep noindex until cut-over.
- **Accessibility pass**: keyboard-only walkthrough of both modes (tab order through the full
  input form, Section headers, Tabs, QuotesPanel dropdown focus trap), aria-labels on
  icon-only buttons, contrast spot-check on the muted hint text, `prefers-reduced-motion`
  already handled in tokens.css.
- **Cut-over plan** (owner decision, not implementer): swap `/calculator/` to v2, redirect or
  retire `/calculator2/`, remove noindex, keep v1 source in-repo until confident.
- **Simple-mode assumption tuning**: current heuristics (drive-away ÷ 1.08 base value,
  9.5% rate, flat rego/insurance) are documented but were set unilaterally — owner review.

## 5. Working rules (learned from Phase 1 — follow these)

- **Verify parity against v1's rendered output, not your reading of its code.** The two
  Phase-1 bugs both passed builds, type-checks, and render-smoke tests. For every ported
  figure, load v1 and v2 with identical inputs and compare the displayed numbers.
- Ship in small commits, each: build clean → 72+ tests green → `git diff --stat calculator/`
  empty → push → watch BOTH the publish workflow AND the native "pages build and deployment"
  step (the latter fails transiently ~occasionally; an empty commit re-push fixes it) → verify
  the live URL.
- Add a regression test with every bug fix, pinned to the specific number that was wrong.
- All input sections stay `defaultOpen` — a collapsed Section renders nothing (not hidden),
  which is how the missing-inputs bug stayed invisible.
- The 1280px `scrollWidth` overflow (1343px) is the site-wide nav dropdown, present on every
  page including the homepage — not a calculator2 bug; don't chase it.
