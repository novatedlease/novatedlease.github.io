# calculator2 UI/copy fixes — owner feedback 2026-07-04

Raw feedback from the owner, to be implemented one by one in `calculator2/` only
(never `calculator/src/`). Each item checked off as done, with implementation notes.

1. [x] In "Vehicle & FBT eligibility", the FBT-exempt/applicable outcome badge should only
   appear *after* the Vehicle condition question — currently it shows before Vehicle
   condition even though eligibility depends on it.
2. [x] Remove " — LCT threshold for this lease start date: $91,661" from the FBT-applicable
   outcome line.
3. [x] Bug: choosing "Petrol / diesel / hybrid" never shows an FBT-applicable outcome at all
   (the badge is currently gated on `isEv`). Fix so Non-EV also shows its outcome
   (FBT-applicable, always, per `NON_EV_FBT_APPLICABLE`).
4. [x] "Tesla calls it Vehicle Subtotal" → generalise to "Many invoices label this vehicle
   subtotal" (Vehicle dutiable value tooltip).
5. [x] "Drive-away cost" tooltip: remove "Do NOT include any EV rebate."
6. [x] "Rule of thumb" → rename to "Suggestion" (Estimated market value hint).
7. [x] "Initial financier setup fee, if any." → add "Set as 0 if not applicable" (Lease
   documentation fee hint).
8. [x] Home loan offset interest rate tooltip: elaborate on how to enter the rate if the user
   has no home loan (use next-best rate, e.g. HISA) or an investment home loan offset/HISA
   (scale by (1 − marginal rate), worked example: 6% × 0.53 = 3.18% for a 45%+2% marginal
   rate). Explain the underlying question is "what's the opportunity cost of this cash if not
   spent on the car".
9. [x] Super Guarantee tooltip: link to
   https://novatedlease.guide/special-and-policy/super-guarantee/
10. [x] All FBT phase-out mentions: link to
    https://novatedlease.guide/special-and-policy/ev-fbt-exemption-phase-out-budget-2026/
11. [x] All number entry fields: allow and correctly display up to 2 decimal places (currently
    many CurrencyFields default to 0 decimals for display, even though the stored value is
    already full-precision — the display was misleadingly implying rounding).
12. [x] Effective interest rate: port v1's full "Calculation caveats" (4 items: financed-amount
    add-ons, residual-method mismatch, GST-not-passed-on, Smart Leasing/MillarX) as a tooltip —
    currently missing entirely from v2.
13. [x] Vehicle dutiable value tooltip: elaborate with ✅/❌ list of what's included (RRP, GST,
    delivery fee, optional add-ons) vs excluded (CTP, rego, stamp duty, LCT).
14. [x] "Smart / MillarX?" link is bunched together with the per-fortnight/per-month toggle on
    the Vehicle lease field — reposition (e.g. right-aligned separately, or next to the
    "Vehicle lease" label) so it reads as a distinct, separate option.
15. [x] Vehicle lease field: MUST keep a tooltip (port + improve v1's wording); label it "ex
    GST"; rename the field from "Vehicle lease" to "Vehicle finance".
16. [x] Luxury vehicle adjustment (per fortnight) hint: clarify it only applies above $69,883
    "due to complex employer accounting reasons" (separate concept from the LCT threshold),
    link to
    https://www.sgfleet.com/docs/australialibraries/novated/novated-support/7-sgf-oct2024-luxury-vehicle-adjustment.pdf
17. [x] "GST saving passed on in NL" tooltip: link to
    https://novatedlease.guide/running-costs/failure-to-pass-gst-saving/
18. [x] "NSW Health save share" field: link to
    https://novatedlease.guide/special-and-policy/nsw-health-employer-share/
19. [x] Car loan comparator "Loan term is forced to match lease duration (5 years) above." —
    bold "Loan term", and add a hint that to compare different lease/loan lengths, set up two
    separate saved quotes and use the Compare tab.

## Round 2 — owner feedback after first look

20. [x] "Vehicle finance (ex GST)" + "Smart Leasing / MillarX customer?" on the same row is
    still too busy/cluttered — find a way to declutter (move the Smart Leasing/MillarX link
    elsewhere).
    Implementation: moved the link out of the field label entirely, onto its own quiet,
    muted, right-aligned line directly below the input (between the input and the effective
    interest rate box). The label row now only has "Vehicle finance (ex GST)" + the tooltip
    icon, and the per-fortnight/per-month toggle sits on its own row beneath it.
21. [x] Tooltip links don't work on desktop: moving the cursor from the "i" icon toward a link
    inside the tooltip closes the tooltip before the link can be clicked. Either fix the
    tooltip so it doesn't close when moving the cursor toward it, or move those links out of
    the tooltip and into the field's regular (non-tooltip) hint/box element instead.
    Implementation: fixed `InfoTooltip.tsx` with a delayed-close ("hover-intent") pattern —
    mouseleave on the trigger icon or the popup schedules a close after 250ms, and mouseenter
    on either cancels the pending close. Previously it used a `relatedTarget`-containment
    check, which only works if the two elements are geometrically adjacent; since the popup
    is portalled to `document.body` and positioned independently (often not touching the
    icon), the cursor's path to a link inside it usually crossed unrelated elements first,
    closing the tooltip prematurely. Verified with a simulated multi-step mouse move from the
    icon to a tooltip link (not an instant `.hover()` teleport) — tooltip now stays open and
    the link remains clickable.
