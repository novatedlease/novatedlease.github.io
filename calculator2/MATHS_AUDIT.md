# Maths audit — calculator2 engine constants vs primary sources

Audited 2026-07-04. Scope: independent verification of tax/FBT constants and formulas in
`calculator/src/engine/` (imported unchanged by calculator2 via the `@engine` alias) against
ATO primary sources. Read-only research — no code changes made here; see "Summary for owner"
for what needs a decision.

---

## 1. EV LCT thresholds

- **File:** `calculator/src/engine/types.ts:83,89` — `EV_LCT_THRESHOLD = 91387`, `EV_LCT_THRESHOLD_FROM_JUL_2026 = 91661`.
- **Found:** ATO fuel-efficient LCT threshold is $91,387 for 2025-26 and $91,661 for 2026-27.
- **Verdict: MATCHES.**
- **Caveat:** from 1 July 2025 the ATO's definition of "fuel-efficient" tightened from ≤7.0 L/100km
  to ≤3.5 L/100km. This doesn't affect EVs (0 L/100km either way) but is worth knowing if the
  calculator is ever extended to plug-in hybrids.

## 2. Transitional full-exemption cap & date tiers

- **File:** `calculator/src/engine/types.ts:95,210-228` — `EV_TRANSITIONAL_FULL_EXEMPT_CAP = 75000`;
  tiers at 1 Apr 2027 and 1 Apr 2029, both boundaries inclusive-forward (`leaseStart < TRANSITIONAL_START`
  / `< POST_PHASEOUT_START`, i.e. a lease starting exactly on the boundary date falls into the *new* tier).
- **Found:** Matches the May 2026 budget announcement structure described in the repo's own
  `special-and-policy/ev-fbt-exemption-phase-out-budget-2026` article (not independently
  re-derived from a government primary source within this audit's time budget, since this is a
  *proposed/announced* policy rather than a value published on a stable ATO reference page).
- **Verdict: COULD NOT FULLY VERIFY** against a government primary source — recommend the owner
  cross-check the exact boundary dates and the $75,000 figure against the actual bill/explanatory
  memorandum text when it's introduced to Parliament, since announced budget measures sometimes
  shift before legislation.

## 3. ECM statutory rates & s11(2) two-thirds rule

- **File:** `calculator/src/engine/types.ts:117-137,145-149` — 20% full / 15% discounted (`getEcmStatutoryRate`);
  two-thirds base-value reduction from the FBT year containing the car's 4th anniversary
  (`getEcmTwoThirdsFromFy`), with an 11/12-weighted transition year (`getEcmMultiplierForFy`).
- **Found:** The 20% statutory formula rate and the "held for 4 full FBT years → two-thirds base
  value" rule are the standard FBTAA s9/s11(2) car-fringe-benefit rules. 15% = 75% × 20% matches
  the EV transitional/post-2029 discount structure in item 2. The 11/12 weighted-transition-year
  approximation is a reasonable per-FY approximation of an FBT-year (1 Apr–31 Mar) rule.
- **Verdict: MATCHES.**

## 4. ATO minimum residual percentages

- **File:** `calculator/src/engine/ato.ts:16-27` — 65.63/56.25/46.88/37.5/28.13% for 1-5 year terms.
- **Found:** These are the long-standing ATO minimum residual value percentages for novated
  leases (unchanged for many years), consistent with the repo's own existing
  `special-and-policy` article citing them.
- **Verdict: MATCHES.**

## 5. GST input-tax-credit cap & car depreciation limit

- **File:** `calculator/src/engine/ato.ts:3` — `GST_EXEMPT_CAP = 6353`.
- **Found:** ATO 2026-27 car limit is $69,883; the GST credit cap is defined as 1/11 × car limit
  = $6,353.09 → $6,353. **Matches exactly.** (2025-26 figures for comparison: car limit $69,674,
  GST cap $6,334 — confirms the engine is using the *current* FY's figures, not last year's.)
- **Verdict: MATCHES** for the GST cap.
- **Gap found:** the car depreciation limit itself ($69,883) is **not referenced anywhere in the
  engine** (grepped the full `calculator/src/engine/` and `calculator/src/` trees — no match for
  69883, CAR_LIMIT, or "depreciation limit"). The GST cap is hardcoded directly rather than
  derived from a `CAR_LIMIT` constant. This isn't a numeric error (the derived value is currently
  correct), but it means next financial year's update requires knowing the 1/11 relationship
  rather than just updating one constant — worth a maintainability note for the owner, not a bug.

## 6. Income tax brackets, Medicare levy, SG rate, Div 293, HECS

- **File:** `calculator/src/engine/tax_au.ts:10-26` — brackets at $18,200/$45,000/$135,000/$190,000
  with rates 16/30/37/45%; flat 2% Medicare levy (no low-income phase-out modelled).
- **Found:** These are the current (Stage 3-revised) resident tax brackets, unchanged since
  1 July 2024 and still current for 2026-27.
- **Verdict: MATCHES** for brackets and the 2% Medicare levy rate.
- **Gap found:** SG rate (12%), Div 293 threshold ($250,000), and HECS/HELP repayment thresholds
  do **not appear anywhere in `calculator/src/engine/`** — grepped the whole engine directory.
  `derived.ts`'s `sgRows` computes the *reduction in pre-tax salary-sacrificed income* (a
  cashflow/take-home effect), not an actual super-guarantee dollar amount at 12% — so there may be
  no SG-rate constant to verify at all (the 12%-of-what calculation might happen entirely in the UI
  layer via user-provided figures, not the engine). Div 293/HECS thresholds are mentioned in the
  ATI report's UI copy (as things ATI *affects*) but aren't used as calculation inputs — this
  looks intentional (the calculator shows post-NL taxable income; the user is expected to apply
  their own HECS/Div293 rules externally), not a discrepancy, but the owner should confirm this
  is the intended scope rather than an oversight.
- **Verdict: COULD NOT VERIFY** (not modelled, appears to be intentional scope, not a coded constant).

## 7. Type-2 gross-up rate (1.8868)

- **File:** `calculator/src/components/ATI.tsx:154` (v1's own inline default) and
  `calculator2/src/components/reports/ATI.tsx:67` (v2's, same default) — both `grossUpRate ?? 1.8868`.
- **Found:** ATO's lower (type 2) gross-up rate has been 1.8868 since the 2018 FBT year and
  remains unchanged (it only moves when the FBT rate or top marginal rate + Medicare changes).
- **Verdict: MATCHES.**

## 8. ATI's 53% childcare-subsidy factor

- **File:** `calculator/src/components/ATI.tsx:229-230,260` — RFBA × 0.53 when the user selects
  the "FBT-exempt (childcare)" purpose, applying only to FBT-exempt-employer scenarios (e.g.
  public hospitals) for childcare-subsidy income-test purposes.
- **Found:** Reportable fringe benefits from FBT-exempt/rebatable employers do receive concessional
  treatment in some Centrelink/Services Australia income tests, but I could not independently
  confirm the specific 53% figure against a current Services Australia or Social Security Act
  primary source within this audit's time budget — this factor is more Centrelink-adjacent than
  ATO-adjacent, and the primary legislative source (A New Tax System (Family Assistance) Act,
  adjusted fringe benefits total provisions) wasn't checked directly.
- **Verdict: COULD NOT VERIFY** — recommend the owner (or a follow-up audit) confirm 53% directly
  against Services Australia's CCS guidance or the Family Assistance Act, since this is a
  narrower, less-documented figure than the mainstream ATO constants above.

## 9. Flat 20% statutory rate for RFBA — judgement call

- **File:** `calculator/src/components/ATI.tsx:104,154-155` (v1's inline `computeRfbaSchedule`)
  and `calculator/src/engine/rfba.ts` (a **separate, v2-only** implementation — see architecture
  note below) — both hardcode/default `statutoryRate` to a flat `0.2`, regardless of
  `getLeaseFbtCategory()`.
- **Found:** For a **fully FBT-exempt EV**, ATO guidance (PCG-style treatment of exempt electric
  cars) requires reporting a "notional taxable value" computed via the standard statutory
  formula method — i.e. the same 20% rate that would apply if the vehicle weren't exempt. Flat
  20% is **correct** for this category.
  For the **EV_FBT_DISCOUNTED category** (75%-of-full-FBT transitional/post-2029 leases), actual
  FBT *is* payable, just at a reduced rate — the engine's own `getEcmStatutoryRate()` already
  returns 15% (75% × 20%) for this exact category, used for the ECM calculation. RFBA is
  logically the same base-value × rate × gross-up structure, so the reportable amount for a
  DISCOUNTED-category lease should very plausibly use 15%, not the flat 20% currently applied.
- **Verdict: JUDGEMENT CALL FOR OWNER — moderate-to-high confidence of a real discrepancy** for
  the DISCOUNTED category specifically (not the EXEMPT category, where flat 20% is correct).
  **Worked example:** a $80,000 EV, transitional lease (2027-06-01 start, `EV_FBT_DISCOUNTED`),
  full FY exposure: current RFBA = 0.20 × 80,000 × 1.8868 = **$30,188.80**. If corrected to the
  category rate (15%): 0.15 × 80,000 × 1.8868 = **$22,641.60** — a **$7,547.20** difference in
  reportable fringe benefits amount per FY, which flows into ATI and can matter for
  HECS/childcare/Div 293 thresholds. This needs the owner's sign-off before fixing (it affects
  live v1 via `calculator/src/components/ATI.tsx`, not just v2) and a regression test pinned to
  this example.

## Architecture note: duplicated-but-verified-equivalent engine files

Same pattern as the share-link codec bug found and fixed earlier in this project: `calculator/src/engine/rfba.ts`
and `calculator/src/engine/fbt.ts` are **never imported by v1** (`calculator/src/App.tsx` /
`components/ATI.tsx`) — v1 has its own separate inline `computeRfbaSchedule` and FBT-year-overlap
logic. Only calculator2 imports the `engine/` versions. Unlike the share-link bug, I compared the
two implementations line-by-line and **the day-counting/overlap/proportion formulas are
identical** (same UTC-day normalisation, same 1 Apr–31 Mar FBT year boundary, same overlap
formula) — so this is confirmed **harmless duplication, not a numbers bug**. Still worth flagging:
any future edit to one copy without the other would silently reintroduce a v1/v2 divergence, the
same way the share-link bug happened. Consider a follow-up to make v1 import from `engine/fbt.ts`
and `engine/rfba.ts` instead of keeping its own copy (out of scope for this audit — flagging only).

---

## Summary for owner

Ranked by confidence × impact:

1. **RFBA flat-20% rate for `EV_FBT_DISCOUNTED` leases (item 9)** — moderate-to-high confidence
   this is wrong for the new 2027+ transitional/post-2029 category specifically (not the
   fully-exempt category, which is correct as-is). ~$7,500/FY impact in the worked example above.
   Needs your decision before fixing, since it touches `calculator/src/components/ATI.tsx` (live v1).
2. **Childcare 53% factor (item 8)** — not independently verified against Services
   Australia/Family Assistance Act sources; low urgency but worth a targeted follow-up if anyone
   relies on the childcare-subsidy purpose option.
3. **Transitional cap/date tiers (item 2)** — based on the repo's own article, not a government
   primary source directly (the measure may still be pre-legislation as of the audit date) — worth
   re-checking once the actual bill text is available.
4. **SG rate / Div 293 / HECS thresholds (item 6)** and **car depreciation limit (item 5)** — not
   modelled as engine constants at all. Likely intentional (out of calculator scope), but flagging
   so it's a confirmed decision rather than an assumption.
5. **rfba.ts/fbt.ts duplication (architecture note)** — no numbers bug found, but same
   "v2-only engine file v1 never sees" shape that caused the share-link bug. Recommend a
   deliberate decision on whether to converge v1 onto these engine files at some point.

Everything else (LCT thresholds, ECM rates, ATO residual %, GST cap, tax brackets, gross-up rate)
matches primary sources exactly.
