# To review (saved 2026-11-14)

Branch `codex/provider-guide-completion`, preview at http://100.95.205.3:4340 (Tailscale) or
localhost:4340. Nothing is pushed or merged. Tick items as you go.

Full detail for every UX item: `UX_REVIEW_2026-11-14.md` (item numbers match).

## 1. Decisions only you can make

- [ ] **UX 2: take-home pay line.** Add "Your take-home pay: about $X less per fortnight" under
  the headline, and "Compare this with the take-home figure on your quote"? Approve or change the wording.
- [ ] **UX 3: lost super.** Show it next to the headline ("Not counted above: about $X less super
  over 5 years"), or subtract it from the headline saving?
- [ ] **UX 8: Payment step order.** Move the amount to the top, with the period and GST questions
  under it? This changes a familiar screen, so only if you like the idea.
- [ ] **UX 22: cap wording.** "the maximum, about $6,300 (for example $6,334 or $6,353)": OK?
- [ ] **LeasePlan article:** drop the duplicated date in the new "Based on a LeasePlan quote from
  Aug 2025" note? (optional)
- [ ] **GA4:** also register `level` as a custom dimension? (optional)

## 2. Ready to implement on your go-ahead

The suggested order is from the review. Each item is small (S) or a few hours (M).

- [ ] **Batch A, quick trust fixes (S):** 1 "Lease: payments" label · 5 answers list shows values
  as typed, and dates as "15 Dec 2026" · 6 "Not answered" instead of $0 · 9 phone bullet
  alignment · 12 "electricity gain / loss" renamed.
- [ ] **Batch B, alternatives checks (S–M):** 4 loan fee hint, plus warnings on the fee, rate,
  market value and running costs.
- [ ] **Batch C, provider clutter (S):**
  - 15 drop 34 boilerplate "Can't find it?" lines;
  - 16 one hint per question;
  - 17 provider line under its question;
  - 18 hide generic picture links and the typical-figure nudge on the quote path.
- [ ] **Batch D, FBT base value (S):**
  - 19 Oly: "GST" line × 11, with no cap caveat;
  - 20 RemServ and 21 MillarX: point to the printed "FBT Base Value" first;
  - 23 warning at 11 × the cap.
- [ ] **Batch E, copy (S):** 7 income hint · 10 Advanced "Electricity budget in the lease" · 11
  NSW Health placement and the financed-amount hint · 13 help text names · 14 "What we assumed" on the
  quote path.

## 3. Before merging (from `PROVIDER_GUIDE_MERGE_CHECKLIST.md`)

- [ ] **Phone walkthrough:** at phone width, light and dark, open every "Show me" on the Price,
  Lease, Payment and Running steps for SG Fleet, Smart Leasing, Maxxia, Oly, MillarX and NLA. The
  contact sheet didn't include opened pictures.
- [ ] **Say "merge":** it will be a merge commit into `main`, not a squash, then a push. The site goes
  live in about 75 seconds.

## 4. Parked or later

- Item 8 from the earlier review (Smart-branded Smartsalary escape hatch): parked, on your instruction.
- Lendly × 11 pointer: only one quote, so leave it until more evidence turns up.
- After launch: raise the "Checked against N quotes" counts as new quotes appear. Read GA4 four
  weeks after shipping (questions in the merge checklist).

## Settled today (no action needed)

- R5 claims backed by extra quotes: LeaseLab, Maxxia, Oly, Remunerator, SG Fleet.
- Paywise wording; R7 trim kept; R11 trim; R15 12-month rule; GA4 dimensions; light/dark contact
  sheet.
- Residual checks now use the ATO's two-decimal percentages (28.13%, not 28.125%).
