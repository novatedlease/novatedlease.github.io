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
- **Re-verified 2026-07-04** (follow-up research pass, Prompt C): searched specifically for whether
  this measure has progressed from announcement to actual Bill/Act text since the original audit.
  Result: it has **not** — no Treasury Laws Amendment Bill, Explanatory Memorandum, or
  legislation.gov.au entry for this specific 2026 EV FBT phase-out could be found (the only
  "Treasury Laws Amendment (Electric Car Discount) Bill" on record is the *original 2022* Bill that
  created the exemption, not this phase-out). It remains an **announced Budget measure** (5 May 2026,
  following Treasury's Statutory Review of the Electric Car Discount, ahead of the 2026-27 Budget),
  not yet enacted law.
- **However, confidence in the parameters themselves is now materially higher**: the original audit
  checked only the repo's own explainer article; this pass independently checked five external,
  dated (2026) professional tax-advisory sources (PwC, BDO, AusTax.tools, Hudson Financial Planning,
  Zecar) plus the original ministerial announcement. All independently agree on the same structure:
  **Phase 1** (unchanged, full exemption) until 31 March 2027 → **Phase 2** (1 Apr 2027 – 1 Apr 2029):
  full exemption retained only for EVs ≤ $75,000, with a 25% FBT discount (not full exemption) for
  EVs above $75,000 but below the fuel-efficient LCT threshold → **Phase 3** (from 1 Apr 2029):
  25% discount only, full exemption gone entirely. This matches `EV_TRANSITIONAL_FULL_EXEMPT_CAP =
  75000` and the `getEcmStatutoryRate()` 15% (=75%×20%) discounted rate exactly.
- **Boundary-inclusivity confirmed too**: BDO's phrasing — full exemption continues "until 31 March
  2027" and Phase 2 runs "from 1 April 2027" — puts 1 April 2027 itself inside the *new* (transitional)
  tier, consistent with the engine's inclusive-forward treatment. Same shape for the 1 Apr 2029
  boundary. No source suggested a different (exclusive/day-after) reading.
- **Verdict: PARAMETERS CORROBORATED, LEGISLATION STILL PENDING.** The $75,000 cap, both boundary
  dates, the 25%-discount mechanism, and the inclusive-forward boundary treatment are now
  well-corroborated across multiple independent 2026 sources (upgraded from "repo's own article
  only"). But this is still an announced policy, not settled law — recommend the owner re-check
  once an actual Bill/Explanatory Memorandum is introduced (search for "Treasury Laws Amendment"
  + "electric car" + the relevant year once it exists), since announced measures can still shift
  before passage, and grandfathering-for-existing-leases (also confirmed by BDO/PwC — the rate in
  place at lease commencement applies for that lease's full term) should be spot-checked against
  the engine's `leaseStartDate`-driven category logic if not already covered elsewhere in this
  audit.

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
- **Re-verified 2026-07-04** (follow-up research pass, Prompt C), traced to the actual primary
  legislative source this time: the DSS **Family Assistance Guide §3.2.3 "Adjusted fringe benefits
  total"** (`guides.dss.gov.au/family-assistance-guide/3/2/3`), which administers the *A New Tax
  System (Family Assistance) Act 1999* definition used to compute adjusted taxable income (ATI) —
  the figure that gates Child Care Subsidy eligibility (Family Assistance Guide §1.1.A.20).
- **Exact formula found:** *adjusted fringe benefits total = (exempt employer fringe benefits total
  × (1 − applicable fringe benefits tax rate)) + non-exempt employer fringe benefits total.* The
  "exempt employer fringe benefits total" applies specifically to reportable fringe benefits from
  employers identified under **Fringe Benefits Tax Assessment Act 1986 s57A** — registered public
  benevolent institutions, registered health promotion charities, some hospitals, and public
  ambulance services — the same category the code's "FBT-exempt (childcare)" option targets (e.g.
  public hospitals). Non-exempt-employer fringe benefits are counted at 100%, confirming the 0.53
  factor is deliberately scoped to *only* the exempt-employer case, matching the code's condition.
- **Rate confirmed:** the "applicable fringe benefits tax rate" is the standard FBT rate, currently
  **47%** (unchanged for the 31 March 2023 – 31 March 2027 FBT years, per ATO's rates-and-thresholds
  page). 1 − 0.47 = **0.53**, exactly the code's derivation.
- **Verdict: MATCHES.** Both the factor (0.53 = 1 − 47% FBT rate) and its scope (only
  s57A-exempt-employer reportable fringe benefits, used specifically in the ATI calculation that
  underlies Child Care Subsidy / family assistance eligibility) are confirmed against the primary
  administrative source. No discrepancy found; this item can be considered closed.

## 9. Flat 20% statutory rate for RFBA — CORRECTED 2026-07-04, not a bug

- **Original finding (retracted):** this item previously claimed the flat `statutoryRate = 0.2`
  in `calculator/src/components/ATI.tsx` and `calculator/src/engine/rfba.ts` was applied to
  `EV_FBT_DISCOUNTED`-category leases too, and should instead use 15% (matching
  `getEcmStatutoryRate()`'s 15% for that category), with a worked-example $7,547.20/FY impact.
  **This was wrong** — flagged by the owner questioning it, then verified against the actual code
  path rather than the standalone formula.
- **What the code actually does:** in both v1 (`ATI.tsx:225`, `:258-260`) and v2
  (`reports/ATI.tsx:127`, `:141`), the RFBA figure is gated by `fbtApplicable`:
  `const rfba = fbtApplicable ? 0 : (rfbaByFinancialYearEnding.get(...) ?? 0)`, and
  `isFbtApplicable(i)` (`engine/types.ts:236-237`) returns `true` for every category **except**
  `EV_FBT_EXEMPT`. So RFBA is unconditionally **zero** for `EV_FBT_DISCOUNTED`,
  `EV_FBT_APPLICABLE`, and `NON_EV_FBT_APPLICABLE` leases — the `statutoryRate` constant is never
  reached for the DISCOUNTED category in the first place, in either app. There is no live
  code path where "20% instead of 15%" actually changes a number for that category, because no
  RFBA is reported for it at all.
- **Why this is deliberate, not an oversight:** v2's `reports/ATI.tsx:9-22` has a code comment
  (absent similar detail in v1, but the same behaviour) explaining that RFBA is intentionally
  zeroed whenever `isFbtApplicable()` is true — the Employee Contribution Method (ECM, using the
  *correct* 15%-for-DISCOUNTED rate via `getEcmStatutoryRate()`) reduces the FBT taxable value,
  and therefore the reportable fringe benefit, to nil for any category where actual FBT applies.
  Full RFBA is only computed for `EV_FBT_EXEMPT`, reflecting the ATO's "notional taxable value
  despite $0 FBT payable" treatment for genuinely exempt cars — which is exactly the case flat
  20% is correct for (confirmed in the original finding below). The DISCOUNTED category doesn't
  need — and doesn't get — its own RFBA rate at all, correct or otherwise, because ECM already
  handles it through a different mechanism (post-tax employee contributions, computed separately
  in `taxableIncomePostNlByFinancialYearEnding` using the correct 15% via `getEcmStatutoryRate()`).
- **Verdict: NOT A BUG.** The flat 20% is applied only to the one category (`EV_FBT_EXEMPT`)
  where it is confirmed correct. No fix needed; Prompt B (§5 of `CALCULATOR2_NOTES.md`) is closed
  as a false positive from the earlier audit pass, not implemented. `calculator/src/` was not
  touched.

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

1. ~~RFBA flat-20% rate for `EV_FBT_DISCOUNTED` leases (item 9)~~ — **RETRACTED 2026-07-04, NOT
   A BUG.** The original finding was wrong: RFBA is unconditionally zero for any non-EXEMPT
   category in both apps (`fbtApplicable` gate), so the flat 20% is only ever applied where it's
   correct (the EXEMPT category). No fix needed, no code touched. Caught because the owner asked
   "are you sure?" — worth remembering that a formula-level audit can miss a gating condition
   that only shows up by reading the actual call site.
2. ~~Childcare 53% factor (item 8)~~ — **RESOLVED 2026-07-04, MATCHES.** Traced to DSS Family
   Assistance Guide §3.2.3: 0.53 = 1 − 47% FBT rate, applied only to reportable fringe benefits from
   FBTAA s57A-exempt employers. No action needed.
3. **Transitional cap/date tiers (item 2)** — **re-checked 2026-07-04**: the $75,000 cap, both
   boundary dates, and the inclusive-forward boundary treatment are now corroborated by five
   independent 2026 professional-advisory sources (up from the repo's own article alone), but the
   measure is still an *announced* Budget policy — no Bill/Act text exists yet as of this recheck.
   Still worth a final pass once actual legislation is introduced, but parameter confidence is now
   high.
4. **SG rate / Div 293 / HECS thresholds (item 6)** and **car depreciation limit (item 5)** — not
   modelled as engine constants at all. Likely intentional (out of calculator scope), but flagging
   so it's a confirmed decision rather than an assumption.
5. **rfba.ts/fbt.ts duplication (architecture note)** — no numbers bug found, but same
   "v2-only engine file v1 never sees" shape that caused the share-link bug. Recommend a
   deliberate decision on whether to converge v1 onto these engine files at some point.

Everything else (LCT thresholds, ECM rates, ATO residual %, GST cap, tax brackets, gross-up rate,
the childcare 53% factor, and now the RFBA statutory rate) matches primary sources exactly or is
confirmed not-a-bug. Only the pending-legislation caveat on item 2 remains open, and it's a
"recheck once enacted" note rather than a numeric discrepancy.
