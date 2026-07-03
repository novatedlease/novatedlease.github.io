# Task: Full UI redesign of the novated lease calculator → `/calculator2/` (hidden preview)

You are redesigning the front end of an existing, mature novated lease calculator. The
calculation engine is trusted and battle-tested; the UI has grown organically and needs a
professional redesign plus a first-time-user "Simple mode". The result must ship as a
**hidden preview page at `/calculator2/`** so the owner can review it side-by-side with the
existing `/calculator/` page, which must remain completely untouched and functional.

---

## 1. Context — how the current system fits together

- **`calculator/`** — React 19 + TypeScript + Vite app (the current calculator).
  - `calculator/src/engine/` — pure TypeScript calculation engine (~1,700 lines across
    `types.ts`, `tax_au.ts`, `fbt.ts`, `effectiveinterest.ts`, `worksheet_130.ts`,
    `fy_breakdown.ts`, `lease_payments.ts`, `lease_schedule.ts`, `rfba.ts`, `ato.ts`,
    `charging.ts`, `compound.ts`, `derived.ts`, `urlState.ts`, `summaryStatements.ts`,
    `scenarioTypes.ts`). No React imports. This is the single source of truth for all maths.
  - `calculator/src/components/` — the current UI: `InputsPanel.tsx` (2,326 lines),
    `SummaryView.tsx`, `LeaseReport.tsx`, `FinancialReport.tsx`, `EffectiveInterestReport.tsx`,
    `ATI.tsx`, `SG.tsx`, `WhatIf.tsx`, `WorstCase.tsx`, `ComparatorView.tsx`,
    `BasicInformationReport.tsx`. `App.tsx` (1,787 lines) wires everything, including
    saved-quotes (localStorage), share links (`?c=` base64url-encoded inputs), analytics
    (`src/utils/analytics.ts`), and auto-sync effects (residual, financed amount, market value
    auto-fill until user override).
  - Styling today is ~70% inline `style={{...}}` objects plus `src/index.css` — this is the
    main thing being replaced.
  - `calculator/vite.config.ts` builds to `../docs/assets/calculator/` with
    `base: "/assets/calculator/"`, emitting stable filenames `main.js` / `style.css`.
- **`new-site/`** — Astro site. `new-site/public/assets` is a **symlink to `../../docs/assets`**,
  so the built calculator ships inside the Astro build. The page
  `new-site/src/pages/calculator/index.astro` embeds the bundle via
  `<link href="/assets/calculator/style.css">` + `<script src="/assets/calculator/main.js">`
  into `<div id="nl-calculator-root">`.
- **Deploy**: push to `main` → `.github/workflows/publish.yml` builds `new-site` and publishes
  `new-site/dist` to gh-pages. Nothing else deploys the calculator; it rides along via the
  symlinked assets.
- Site design tokens live in `new-site/src/styles/global.css` (e.g. `--color-border`) — read
  them before choosing a palette so the calculator no longer feels like a separately-styled
  widget.

## 2. Hard constraints

1. **Do not modify anything under `calculator/src/` or `docs/assets/calculator/`.** The live
   `/calculator/` page must be bit-for-bit unaffected. (Exception: you may add *test files*
   under `calculator/` if needed for the maths verification in §6, but no changes to shipped
   source.)
2. **Do not fork the engine.** Create the new app at `calculator2/` and import the engine
   directly from `../calculator/src/engine/` (Vite compiles TS source across package
   boundaries fine; add a `tsconfig` path alias like `@engine/*` for cleanliness). If a maths
   bug is confirmed (§6), fix it in the engine **only after** reporting it, with a regression
   test — that is the one permitted engine change, and note that it will also affect v1.
3. **Hidden preview**: the new page must be reachable only by direct URL `/calculator2/`:
   - New page `new-site/src/pages/calculator2/index.astro` (minimal shell — no FAQ/SEO prose
     needed for the preview).
   - `<meta name="robots" content="noindex, nofollow">` on that page (add a `noindex` prop to
     the Base/FullPage layout — none exists today).
   - Exclude `/calculator2/` from the sitemap (`@astrojs/sitemap` `filter` option in
     `new-site/astro.config.mjs`).
   - Do not add it to `new-site/src/data/navigation.ts`, the search index, or any internal links.
4. **Build wiring**: `calculator2/vite.config.ts` mirrors v1 but with
   `base: "/assets/calculator2/"` and `outDir: "../docs/assets/calculator2"`, stable filenames
   `main.js` / `style.css`. Verify the full chain locally: `npm run build` in `calculator2/`,
   then `npm run build` in `new-site/`, then confirm `/calculator2/` renders from the Astro
   dev server (restart the dev server after rebuilding the calculator bundle — live reload
   does not pick up the JS asset change).
5. **Feature parity, not feature loss.** Everything the current calculator computes and
   displays must still be reachable in the new UI (in Advanced mode): the Summary view with
   the 5-year vs lease-end horizon toggle, the seven detail sections (lease payments,
   financial summary worksheet, effective interest rate + amortisation, ATI/RFBA impacts,
   super guarantee loss, rate sensitivity check, early-termination worst case), the
   saved-quotes manager (save/load/rename/delete/export/import JSON), the quote comparator,
   and the share-link button.
6. **Share-link compatibility both ways**: `/calculator2/?c=<encoded>` must load state from
   existing v1 share links (same codec in `engine/urlState.ts` / `App.tsx` coercion logic),
   and links generated by v2 must remain loadable by v1. Do not invent a new encoding.
   Saved quotes should read/write the same localStorage store as v1 (same key and
   `SavedQuoteV1` shape) so the owner's existing saved quotes appear in the preview.
7. Keep the existing analytics event vocabulary (`src/utils/analytics.ts` in v1) — port the
   call sites so events keep firing with the same ids where the equivalent UI exists.
8. The footer disclaimer block (CC BY-NC-SA licence, "consult a financial adviser", etc.)
   must be preserved verbatim.

## 3. Redesign goals — you have design freedom here

Replace the inline-style patchwork with a coherent, professional design system. You choose
the specifics (layout, colour scheme, typography scale, component shapes); these are the
quality bars:

- **A real design system**: CSS custom properties for colour/spacing/typography tokens +
  CSS modules or a single well-organised stylesheet. Zero ad-hoc inline styles except truly
  dynamic values. Derive the palette from `new-site/src/styles/global.css` so the tool feels
  native to the site. Aim for a trustworthy, independent-fintech tone (think ATO/MoneySmart
  clarity, not lease-provider marketing gloss).
- **Layout**: rethink the current two-column "giant inputs panel + stacked report sections"
  arrangement. Strong candidates (your call): sticky key-outcome header that stays visible
  while inputs change; grouped input accordion with progress/completeness indication; results
  as tabbed or anchored sections with a table of contents. Optimise the "change one input →
  see the verdict move" loop.
- **Hierarchy of the answer**: the single most important output — net financial outcome of
  novated lease vs the comparators (cash / loan / keep current car) — should be unmissable
  at all times, with the detailed sections as progressive disclosure below.
- **Mobile-first responsiveness**: the current app has a crude `isPhoneViewport` switch;
  replace with proper responsive CSS. Test at 360px, 768px, 1280px widths.
- **Accessibility**: keyboard-navigable controls, visible focus states, labels tied to
  inputs, `aria-expanded` on disclosure widgets, WCAG AA contrast, respects
  `prefers-reduced-motion`.
- **Input ergonomics**: currency/percent inputs with proper formatting on blur, sensible
  steppers, inline validation messages (port the existing lease-quote guard that warns when
  the implied effective rate falls outside 0.1%–30%), and the existing auto-fill-until-
  override behaviour for residual value, financed amount, and estimated market value (this
  interaction is subtle and load-bearing — port it faithfully from `App.tsx` lines ~723–798).
- Keep the existing info-tooltip explanations (`InfoTooltip.tsx` content) — they carry a lot
  of educational value; restyle, don't delete.

## 4. Simple mode vs Advanced mode

The headline UX feature. First-time visitors get a **Simple mode** asking only what they can
answer without a quote in hand; power users get **Advanced mode** = full current feature set.

- **Mode switch** is prominent, top of the calculator; default to Simple for first-time
  visitors, remember the choice (localStorage). Arriving via a `?c=` share link opens
  Advanced directly.
- **Simple mode asks roughly 6–8 questions** (final list is your call, but in this spirit):
  1. Vehicle type — EV / petrol-diesel-hybrid
  2. Approximate drive-away price
  3. Your annual taxable income
  4. Lease term (default 5 years)
  5. Annual kilometres (default ~12,000)
  6. Do you have a home-loan offset account? (if yes: interest rate, defaulted)
  7. Lease start: defaults to 30 days from today (not editable in Simple mode) — matters for
     the EV FBT phase-out tiers
- **Everything else is derived via documented standard assumptions** and piped into the full
  `Inputs` object (see `engine/types.ts`) so Simple mode runs the *same engine* — never a
  separate simplified model. Assumptions to implement (tune values as you see fit, but they
  must be centralised in one annotated module, e.g. `calculator2/src/assumptions.ts`):
  - Vehicle dutiable/FBT base value estimated from drive-away price via a documented
    heuristic; vehicle condition = New.
  - Fortnightly lease payment **derived from an assumed market-typical effective interest
    rate (~9.5% p.a.)** using the existing engine function
    `fortnightlyLeaseFromEffectiveAnnualRate` in `engine/effectiveinterest.ts` — do not
    hand-roll annuity maths.
  - Residual = ATO minimum for the term (engine already computes this).
  - Running costs (service/tyres, rego, insurance, fuel or electricity, management fees)
    estimated from vehicle type + annual km, consistent with v1 defaults in `App.tsx`.
  - GST saving passed on = Yes; super guarantee from pre-NL income = Yes; no deferral;
    no luxury adjustment.
- **Show the assumptions.** Simple mode results must include an "Assumptions we made for
  you" panel listing every assumed value, each with an "edit" affordance that switches to
  Advanced mode with that field focused. Simple-mode results should be framed as a ballpark
  ("indicative estimate — get a real quote and use Advanced mode to check it").
- **Switching Simple → Advanced preserves state** (the derived full `Inputs` carries over,
  nothing resets). Advanced → Simple warns that custom advanced values will be re-derived.
- Simple mode output: the key verdict (better/worse off vs cash and vs car loan, at 5 years),
  a small cost breakdown, the early-termination warning, and a clear "see full detail"
  path into Advanced. It should fit on ~1.5 phone screens.

## 5. Suggested build order

1. Scaffold `calculator2/` (copy v1's package.json/tsconfigs, point vite config per §2.4),
   import engine via alias, render a walking skeleton on `/calculator2/`.
2. Maths verification suite (§6) — do this **before** UI work so refactors are guarded.
3. Design tokens + core components (inputs, section shells, verdict banner).
4. Advanced mode at full parity, porting the auto-sync/guard logic.
5. Simple mode + assumptions module.
6. Polish pass: responsive, a11y, empty/edge states, then full build-chain verification.

Commit in reviewable increments with clear messages.

## 6. Maths verification (required, not optional)

The engine is trusted but has never had an automated test suite. Build one, then audit.

1. **Golden-master harness first.** Add `vitest` and characterisation tests that run the
   engine (imported from `calculator/src/engine/`) across a scenario matrix and snapshot the
   key outputs (net position vs each comparator, per-FY take-home deltas, ECM amounts,
   effective rate, residual, RFBA/ATI rows). Matrix must cover at least:
   - FBT categories: EV exempt / EV transitional-discounted (start 2027-06-01, base value
     $80k) / EV over-LCT / post-2029 EV / non-EV — exercising `getLeaseFbtCategory` tiers.
   - Vehicle condition: new, used dealer (GST inc), used private (no GST, and the
     used-EV eligibility checkboxes both pass and fail).
   - Lease terms 1–5 years; deferred months 0 and >0; luxury adjustment > 0.
   - Incomes straddling tax bracket edges (e.g. $45k / $135k / $190k boundaries per current
     brackets) and Div 293 territory ($250k+).
   - GST saving passed on Yes/No; super from pre-NL income Yes/No; keep-current-car and
     car-loan comparators on.
2. **Independent audit** of constants and formulas against primary sources (ATO/legislation),
   as of today. Check at minimum:
   - EV LCT thresholds: $91,387 pre-1/7/2026 and $91,661 from 1/7/2026; transitional full-
     exemption cap $75,000; the three date tiers in `getLeaseFbtCategory` (boundaries
     1 Apr 2027 and 1 Apr 2029, inclusive/exclusive edges).
   - ECM statutory rates (20% full, 15% discounted), the s11(2) two-thirds base-value rule
     and its FY-weighted 11/12 transition-year approximation (`getEcmMultiplierForFy`).
   - ATO minimum residual percentages by term (65.63 / 56.25 / 46.88 / 37.5 / 28.13) and
     the ex-GST vs inc-GST handling in `calcResidualPayable*`.
   - GST input-tax-credit cap ($6,353 from 1/7/2026), car depreciation limit ($69,883
     FY2026-27) — recently updated in this repo; confirm they're used in the right places.
   - Income tax brackets, Medicare levy (2%, and low-income reduction if modelled), HECS/HELP
     repayment thresholds used in ATI, Div 293 threshold, SG rate (12% from 1/7/2025),
     26 fortnights/year assumptions, and FBT-year vs FY proration in `fy_breakdown.ts`.
   - Offset-account simulation compounding basis (documented as fortnightly — verify the
     implementation matches its own documentation).
3. **Report before fixing.** Any suspected discrepancy: write it up (file, line, expected vs
   actual, severity, worked example) in `calculator2/MATHS_AUDIT.md` and surface the list to
   the owner in your summary. Only fix engine bugs that are clear-cut, each with a regression
   test; flag judgement calls for the owner instead of deciding unilaterally.
4. **v1 ↔ v2 equivalence test**: with identical `Inputs`, v2's displayed numbers must equal
   v1's engine outputs exactly (same rounding). Add at least one automated test that feeds
   the golden scenarios through whatever adapter layer v2 introduces and compares against the
   raw engine, so the redesign cannot silently drift from the engine.

## 7. Acceptance checklist

- [ ] `/calculator/` (v1) byte-identical: no diffs under `calculator/src/` or
      `docs/assets/calculator/` (except optional new test files that don't affect the build).
- [ ] `/calculator2/` renders the new UI locally through the full Astro build chain.
- [ ] noindex meta present; `/calculator2/` absent from sitemap, nav, and search.
- [ ] Simple mode: ≤8 questions, assumptions panel with per-field edit links, same engine.
- [ ] Advanced mode: full parity per §2.5, including saved quotes, comparator, share links.
- [ ] v1 share links load correctly in v2 and vice versa.
- [ ] Golden-master + equivalence tests pass; `MATHS_AUDIT.md` written with findings (or a
      clean bill of health).
- [ ] Responsive at 360/768/1280; keyboard-navigable; AA contrast.
- [ ] Footer disclaimer preserved; analytics events firing.
- [ ] Summary to the owner: what changed, screenshots at three widths, audit findings, and
      any open design decisions.
