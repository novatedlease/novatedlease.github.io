# Owner decisions on UX_REVIEW_2026-11-14.md (walked through in Chrome, 2026-11-14)

- **1. "Lease: payments" label:** approved, short form. "Lease: payments incl. running costs" with an ⓘ:
  "Your take-home pay reduction: finance and running costs, after tax."
- **2. Take-home pay line:** approved as written. Under the headline: "Your take-home pay: about $X
  less per fortnight." (in the quote's period), then "Compare this with the take-home figure on your
  quote." (quote path only).
- **3. Lost super:** shown beside the headline, not subtracted. "Not counted above: about $X less
  super over 5 years." plus "Your employer works out super on your salary after the lease." Only when
  the reader said super is worked out after the lease.
- **4. Alternatives checks:** approved in full. Hint "Monthly account-keeping fee, often $0–$15. Not
  the one-off establishment fee." Amber, non-blocking warnings: monthly fee > ~$30; loan rate < 2% or
  > 25%; market value at lease end above today's price; current car running costs > ~$15,000 a year.
- **5. Answers list shows values as typed:** approved. Dates as "15 Dec 2026". Residual shows what was
  typed with its GST answer ("$16,860 including GST"); the ex-GST figure stays in the full workings.
  Other cases: typed + ex GST → "$15,327 excluding GST"; typed + Not sure → "$16,860, GST not stated
  (we read it as including GST)"; no figure → "Not on your quote: the ATO minimum, $X excluding GST".
- **6. "Not answered":** approved, muted style, Edit link kept. A car with no type reads "New (type not
  answered)".
- **7. Income hint:** approved with "after deductions" kept: "From all your jobs, after deductions but
  before tax, and before this lease. The ‘taxable income’ line on your last tax return is a good guide."
- **8. Payment step order:** approved. "Finance (lease) payment" first, period and GST questions under it.
- **9. Phone bullets in "Still to answer":** fix (CSS bug).
- **10. Advanced running-cost "Electricity":** rename to "Electricity budget in the lease".
- **11. NSW Health placement and financed-amount hint:** skipped, leave both as is.
- **12. "Lease: electricity gain / loss":** rename to "Charging: lease budget vs your real cost", tooltip kept.
- **13. Help text:** "Assumptions we made for you" → "What we assumed".
- **14. Quote path "What we assumed (n)":** approved, full list, collapsed by default. First the "Not
  sure" fill-ins ("You chose “Not sure”"), then "How we work it out" method lines (tax rates, cash
  buyer's running costs plus GST, offset/savings rate held constant, residual paid from cash, car's
  end value). Fold in the two italic notes (residual, interest comparison). Check every method line
  against the engine before shipping. Description: "Where your quote or answers didn't say."
- **15. Boilerplate "Can't find it?" lines:** approved. Drop all 34 from Guided; deferral "Not sure"
  gets the sub-label "We'll assume 2". Provider-specific lines stay; articles keep theirs.
- **16–17. One hint per question, provider line under its question:** approved both.
- **18. Generic picture link and typical-figure nudge:** hide both (generic link only when a provider is picked; nudge on the whole quote path).
- **19. Oly FBT base value:** approved. "Multiply the “GST” line in the price breakdown by 11. Don't use
  “Estimated GST savings upfront”." Tooltip: "Or add “Vehicle list price” and “Dealer delivery
  charges”, then add 10%." No cap caveat for Oly.
- **20–21. RemServ and MillarX:** approved. Printed "FBT Base Value" first, × 11 as the fallback.
- **22. Cap wording:** skipped; keep $6,353.
- **23. 11 × cap safety net:** approved with softer wording: "This matches 11 × the maximum GST credit.
  If you worked it out that way, your car may cost more. Check for an FBT base value or price
  breakdown." Amber, non-blocking, all providers, within ~$30 of $69,674 or $69,883.

## Implementation batches (none started)

- A, trust fixes: 1, 5, 6, 9, 12
- B, alternatives checks: 4
- C, provider clutter: 15, 16, 17, 18
- D, FBT base value: 19, 20, 21, 23
- E, copy: 7, 10, 13, 14
- Bigger: 2 (take-home line), 3 (lost super beside headline), 8 (payment amount first)
- Skipped: 11, 22
