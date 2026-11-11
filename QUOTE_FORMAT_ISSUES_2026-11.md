# Guided mode vs real quotes — issue list (started 2026-11-11)

> **Status 2026-11-12:** issues 1–13, 15 and 20 done on `main` (not pushed). 14, 16 and Advanced-mode monthly handling are on review branches. 17–19 wait on owner decisions. Each issue has a status line. Work through it with the owner one
> issue at a time, as in `UX_FIXES_HANDOFF_2026-11.md` (plan in a few lines → implement → tests →
> build → browser check → wait for "next"). That file also has the build, test and preview commands.

## Where this came from

We took real novated lease quotes posted to r/NovatedLeasingAU, translated each one into Guided
mode (`calculator2/src/guided/`) field by field, and noted where the wording, hints or options
would lead a first-time user astray. Coverage: the newest quote for about 30 providers, out of all
567 quote images posted between 1 Aug and 11 Nov 2026 (providers were identified by OCR).

Raw material is **private** (the screenshots show consultants' names and phone numbers), so it
lives in the git-ignored iCloud folder, never in the repo:

- `private/quote-review-2026-11/review/index.html`: one card per quote, images beside a ✓ / ! / ✗
  walk-through of every Guided field. **Start here.**
- `private/quote-review-2026-11/images-aug-nov-2026/` (named `<reddit post id>_<n>.jpg`), `ocr/`,
  `data/` (archive dump), `scripts/` (pull, OCR and classify, build the page).
- How the archive was pulled: see memory `reference_reddit_quote_archive`. Reddit itself blocks
  both curl and Claude in Chrome.

Evidence below cites Reddit post IDs: `https://www.reddit.com/r/NovatedLeasingAU/comments/<id>/`.
Formats drift (Easi changed between 29 Oct and 7 Nov), so re-check a provider's newest quote
before writing anything provider-specific.

---

## Issues (suggested order)

### 1. MillarX: the buffer follows each quote's deferral (1 or 2 months), not a fixed 1

**Status (2026-11-12):** ✅ Done: `f3f18880` (buffer follows the deferral, 1 or 2 months).

- **Understanding: settled (2026-11-11), with the owner.** The article's mechanism holds on every
  MillarX quote that can be checked. The fortnightly figure is the monthly financier payment × 12/26,
  collected over the whole term, while the financier gets (term − deferral) payments. So the extra
  collected equals the deferral:
  - Mazda 6e (1xcd4xa, 22 Oct): "$819/mth × 58 (after 2-mth deferral)", "$378 fortnightly" →
    **2-month** buffer.
  - XPeng L03 (1x6ikxh, 9 Oct, plus a follow-up comment): "$816/mth × 59", "Finance + fee $388" =
    $376.70 finance + $11.31 management fee ($24.50/month × 12/26) → **1-month** buffer.
  - 1xj7w9y (30 Oct): "$527/mth × 59" → 1 month (no fortnightly figure shown).
- **Rates reconcile.** On our engine's footing (start-of-month payments) we get 7.50 / 8.90 / 7.93%
  against MillarX's printed 7.54 / 8.94 / 7.98%. That's a consistent ~0.04% method difference
  (day count or timing), not a structural one. Leaving the setup fee out of the financed amount
  makes the gap worse, not better. "Amount financed" prints $6–11 below its own components on two
  quotes; this is immaterial (under 0.01%).
- **Correction to an earlier note:** the "$X/mth × N" line is *not* exempt from the correction.
  The engine reads any monthly or fortnightly figure as spread over the whole term
  (fortnightly × 130 ÷ payable months), so $819/mth needs the same 58/60 as $378/fn. They're the
  same figure in two periods, and both give $365.40/fn after correction.
- **Done 2026-11-11 (not committed):**
  - `components/leaseAdjust.ts` (new): `bufferMonthsFor` (Smart 2; MillarX = deferral) and
    `initialMillarxDefer` (the reader's answer if 1, else 2).
  - `LeaseAdjustModal.tsx`: for MillarX, a "Months until your first payment" 1/2 choice, defaulting
    to the deferral passed in (Guided `d.monthsDeferred`, Advanced `inputs.monthsDeferred`). A note
    explains "× 58 on 60 months = 2" and to take the management fee out of "Finance + fee".
  - Guided callout: "includes" → "usually includes" a budget reserve.
  - Article: MillarX holds as many months as the deferral (1 or 2); tool steps; new "Reading a
    MillarX quote (November 2026)" section.
  - Tests: `tests/lease-adjust-modal.test.tsx` (Mazda $378 → $365.40, $819/mth → same, XPeng
    $376.70 → $370.42). 241 tests pass; build done. Browser: XPeng quote in Guided → 8.89%
    (MillarX prints 8.94%).
- **New, 2026-11-12: a Smart layout that may not need the correction.** Post 1x9l1fe (Oct 2026,
  quoted by Smartsalary for SA Government staff, purple "Smart" branding, Smart Leasing logo) shows
  only a fortnightly "Lease Payment $529.60 ex GST" and a printed "Comparison Interest Rate 11.29%".
  As printed it gives 11.34% in our engine; after the 58/60 Smart correction, 10.30%. So on this
  layout the per-pay figure looks already spread over the term, and Guided's forced Smart
  correction would understate it by about a point. One quote only; a different channel from the
  Smart Leasing quote confirmed in June. Ask Smart before changing anything.
- **Open (not blocking):** asked MillarX what decides 1 vs 2,
  where the reserve and its refund are written down, and the amount-financed gap. If he says the
  buffer isn't always the deferral, revisit.
- Reference pictures: `private/quote-review-2026-11/provider-examples/millarx/`.

### 2. No weekly option for the payment or running costs, and no annual option for the payment

**Status (2026-11-12):** ✅ Done: `721baf85` (week/fortnight/month/year periods).

- **Problem:** the payment can only be per fortnight or per month (`draft.ts` `paymentPeriod`).
  Running costs can be per fortnight, month or year (`RunningPeriod`). Weekly-pay quotes force
  users into hand conversion, and an annual-only payment has nowhere to go.
- **Evidence:** SG Fleet weekly-pay quotes (1xoemj6: "Lease rental $341.21", "Weekly change to your
  take home pay"); LeaseLab, weekly only (1xrv7kd, 9 Nov); Fingo/ALP (shows weekly next to
  fortnightly and monthly, so it's fine); Remunerator, "Lease Payment (excl GST)" per year on its
  one-page "Your Estimated Novated Lease Savings" summary. That's the only Remunerator page anyone
  has posted (5 posts, 8 images, Sep 2025 – Nov 2026: 1nbk683, 1vmavwz, 1vr8ncr, 1xb8dca, 1xof9wr).
  A fuller quote or lease schedule probably exists but hasn't been seen. Remunerator was bought by
  FleetPartners in Dec 2025 (post 1pdipz3), so its format may change.
- **Where:** `draft.ts` (`paymentPeriod`, `RunningPeriod`, `runningFactor`, the per-fortnight
  conversion ~line 458); `GuidedMode.tsx` payment period choice (~1256), running period (~1587);
  the Smart/MillarX modal's `initialPeriod`.
- **Proposed fix:** add "Week" (and "Year" for the payment) and convert internally to per
  fortnight. Weekly = ×52/26, annual = ÷26.
- **Done 2026-11-11 (not committed):** one `Period` type (week/fortnight/month/year) with
  `PERIODS_PER_YEAR`, `PERIOD_UNIT` and `toPerFn` in `draft.ts`. Payment: Week / Fortnight / Month /
  Year (Year included, so Remunerator's annual figure goes in as printed). Running costs: Per week
  added. The luxury adjustment follows the payment's period. The period-slip check now tries weekly
  too (fortnight → month first, then week). The correction tool stays fortnight/month. Tests:
  `tests/periods.test.tsx`. Browser: SG Fleet Zeekr weekly quote ($341.21/wk) → 7.89%, exactly
  SG Fleet's printed rate.
- **Noticed, not fixed:** the quote diagram shows example values for the luxury adjustment and
  running costs, not the reader's own (pre-existing).

### 3. SG Fleet shows two payment figures and states deferral only as a payment count

**Status (2026-11-12):** ✅ Done in Guided: `e89060df` (monthly = financier payment), article `8193645b`. Advanced mode: review branch (see summary).

- **Problem:** SG Fleet prints a per-pay "Lease rental" (spread over the full term) and a "Monthly
  lease rental" "(payable as 34 payments)" on a 36-month term. The per-pay figure with a 2-month
  deferral understates the cost. The GST basis appears only in the fine print ("shown exclusive of
  GST, unless otherwise stated"). Deferral is never stated in words.
- **Evidence:** 1xp7rio, 1xoemj6, 1xrc93u (8 Nov: "payable as 46 payments" on 48 months).
- **Proposed fix:** a general hint (see issue 7) plus, if a provider picker is added (issue 16), an
  SG Fleet pointer: "Use 'Monthly lease rental' (ex GST). 'Payable as 34 payments' on 36 months
  means 2 months deferred."
- **Owner decision:** fold into issue 7 / 16, or handle now?

- **Update 2026-11-12: how per-pay figures are built (bigger than SG Fleet).** On every quote
  checked against a printed rate (SG Fleet ×2, MillarX, Toyota Fleet, Alliance), the **monthly**
  lease figure is the real financier payment. Guided reads a monthly figure as spread over the
  whole term, so typing SG Fleet's "Monthly lease rental" gives 8.97% instead of the true 7.19%;
  SG Fleet's per-pay "Lease rental" is the correct one to enter (it's spread: $1,195 × 34 ÷ 78).
  Over-collection status (owner, 2026-11-12):
  - Confirmed directly: Smart Leasing, MillarX.
  - **May be** over-collecting: Alliance (2 of 3 quotes reconcile only after 58/60; 1xnlk94 matches
    as printed) and Easi (per-pay = monthly × 12/26 on one layout; another Easi layout spreads it).
    Owner is not pursuing this for now; draft emails to both are saved, unsent, in Gmail.
  - Not over-collecting: SG Fleet. Untested: providers that print only a fortnightly figure.
  - Proposed calculator fix (not yet agreed): read a monthly figure as the financier payment; for a
    per-pay figure, suggest using the monthly figure if the quote has one.

### 4. "Drive-away" figures with the GST already taken off

**Status (2026-11-12):** ✅ Done: `966af4f0`.

- **Problem:** several quotes headline a price net of the GST saving, and it's labelled as if it
  were the drive-away price. Our `base_exceeds_driveaway` check catches it only when the base value
  is entered and exceeds it.
- **Evidence:** Flare "Vehicle cost $56,149 — Flare Cars driveaway cost" vs "Total on-road price
  $61,431" (1xptqzg, again 1xrpgvb 9 Nov); Oly "Oly driveaway price" (ex GST); Fingo "Your car price
  (drive away price when financed)" novated column; SPA "Novated lease purchase price (excluding
  GST)"; Driva "Effective novated vehicle price"; Lendly "Total Price (ex. GST)" beside the
  drive-away.
- **Where:** `PriceStep` drive-away `where` text (~line 1102); `QuoteDiagram.tsx` driveaway note.
- **Proposed fix:** add to the drive-away hint: "Use the full price including GST. Some quotes also
  show a lower 'novated' price with GST taken off; don't use that one." Add "on-road price" and
  "vehicle purchase price" to the also-known-as list.

### 5. FBT base value: the aliases mislead, and there's no fallback when it isn't printed

**Status (2026-11-12):** ✅ Done: `966af4f0`.

- **Problem:** the hint says "Also called vehicle subtotal or vehicle cost"; the diagram adds
  "RRP". "Vehicle cost" means the drive-away on SPA (1xs6pa5) and excludes delivery on Alliance
  (1xocvn9). Autopia prints no base value, and its "base price" is ex GST (1xq2wcg). FleetPartners
  and Driva print none either.
- **Labels seen:** "FBT base value", "FBT Value" (Remunerator, Paywise), "Vehicle base value"
  (NLA), "Value for FBT purposes" (LeaseExpress), "FBT base value (inc GST)" (ORIX), on page 4 of 5
  for SG Fleet.
- **Where:** `PriceStep` hint (~line 1092) and tooltip; `QuoteDiagram.tsx` baseValue note.
- **Proposed fix:** aliases become "FBT value, vehicle base value, value for FBT purposes". Add a
  fallback: "Not printed? The car plus options and delivery, including GST, before stamp duty, rego
  and CTP." Drop "vehicle cost" and "RRP".

### 6. "Look for the word GST next to the payment" is too narrow

**Status (2026-11-12):** ✅ Done: `f3f18880` (Not sure option, wider hint) + `7215dcd7` (shown-twice tooltip).

- **Problem:** the GST basis usually sits in the table heading, a footnote or only on the total.
  The same quote can show both: Alliance page 3 "Total Lease Payment (Finance Payment)" $440.80 is
  inc GST (footnote 5 only), while page 2 "Finance" $400.73 is ex GST. Easi switched from ex GST
  (29 Oct) to "Lease Payment Per Month (inc GST)" (7 Nov, 1xqceg2).
- **Evidence:** Paywise, Flare, SPA, Toyota Fleet (heading); SG Fleet, ORIX (fine-print
  disclaimer); LeasePlan (total line only); "Smart Drive"/Smartsalary "(inc GST)" heading; QLD
  Government template (Alliance, Smart Leasing QLD 1xl03bp).
- **Where:** `paymentBasis` hint (~line 1299).
- **Partly done 2026-11-11 (with issue 1, not committed):** Guided hint is now "Check next to the
  payment, its table heading and the footnotes." The correction tool asks "Does the payment include
  GST?" with Ex GST / Inc GST / Not sure. "Not sure" is treated as ex GST and passed back to Guided
  as "unknown", so Guided's "assume ex GST and check it" still applies. A Guided "I'm not sure" now
  arrives in the tool already chosen. Still open: the "if it's shown twice, the smaller is usually ex
  GST" line.
- **Proposed fix:** "Look next to the payment, in its table heading, and in the footnotes. If the
  quote shows the payment twice, the smaller one is usually ex GST." The existing "not sure → assume
  ex GST and check" path stays.

### 7. Deferral is rarely written as "deferred N months"

**Status (2026-11-12):** ✅ Done: `cb663960`.

- **Problem:** the hint says "Quotes often say 'deferred 2 months'". Only about a third do.
- **Seen:** "Months deferred: 2" (Smart Leasing, Easi, Alliance, Simplygreen); "payable as 34
  payments" (SG Fleet); "Number of Lease Payments: 59" (Remunerator); "Number of Installments 58"
  (Easi); "Based on 22 months" in prose (FleetPartners); "Based on 2-month deferred lease" (SPA);
  "1 month(s) deferred" footnote (Fingo); "with deferred payments" (Toyota Fleet); nothing at all
  (NLA, Paywise, Maxxia, LeaseExpress).
- **Where:** `LeaseStep` deferral hint (~line 1169).
- **Proposed fix:** add "Or count the payments: 58 payments on a 60-month lease means 2 months
  deferred." Keep "Not sure → 2".

### 8. Documentation fee: shown monthly, split into a PPSR fee, or hidden in a footnote

**Status (2026-11-12):** ✅ Done: `cb663960` + `a09e7ce3` (one-off fees ex GST; monthly fees → management fees).

- **Problem:** Guided takes a single upfront amount.
- **Seen:** monthly ("Lease Establishment Fee $8.87/month" FleetPartners 1x9tvny, $3.36 in 1xlqzm8;
  "Finance Documentation $7.50/month" LeasePlan 1n16kcg). Split (SG Fleet "PPSR fee $49.50"; Toyota
  Fleet "Est. Fee - financed $179" + "PPSR Fee $6"; LeasePlan "Security Interest $45"). Footnote
  only (ORIX "Establishment Fee $395", "Non-Appointed Dealer Fee $450/$650", "capitalised into the
  lease rental"). Other names: "Financier's Establishment Fee" (Maxxia, Oly), "Setup fee" (MillarX),
  "Entry Fee" (Alliance), "autopia setup fee".
- **Where:** `docFee` field (~line 1177) and the QuoteDiagram note.
- **Proposed fix:** "Add any PPSR or security interest fee. If it's shown per month, leave this at
  $0: the monthly amount is already inside the payment or fees. Check the small print and 'other
  fees'."
- **Owner decision:** confirm how the engine treats the doc fee (financed vs upfront) so the
  monthly-shown case is advised correctly.

### 9. Luxury vehicle adjustment goes by many names

**Status (2026-11-12):** ✅ Done: `7215dcd7`.

- **Seen:** "Luxury vehicle adjustment" (Easi, Driva, Toyota Fleet, Lendly), "Luxury levy" (SG
  Fleet 1xoemj6), "Luxury car charge" (Alliance), "Luxury vehicle non-deductible" (ORIX), "Non-
  Deductible Depreciation" (Custom Fleet 1xp2oq9), "Luxury Depreciation Allowance" (Simplygreen
  text).
- **Where:** `luxAdj` field (~line 1419) `where` text; QuoteDiagram luxAdj note.
- **Proposed fix:** "May be called luxury levy, luxury car charge or non-deductible depreciation."

### 10. Running-cost lines with no matching box

**Status (2026-11-12):** ✅ Done: `aa26cd26`. Owner to confirm the contingency/optional-cover defaults.

- **Problem:** Guided has five boxes (servicing/tyres, rego, insurance, management fees,
  fuel/charging). Quotes also carry roadside, incidentals, car wash, a second "salary packaging"
  fee, "licence fee", minor damage repair, LeaseGuard/lease protection, contingency, carbon offset.
- **Evidence:** Paywise ("Lease Management" + "Salary Packaging"); Custom Fleet ("Lease Management
  Fee" + "Salary Packaging Fee"); Maxxia "Incidentals"; LeasePlan "Misc Operating Costs", "Minor
  Damage Repair"; SG Fleet "LeaseGuard Insurance"; Lendly "Licence Fee"; Simplygreen "Contingency
  Budget", "Car Washes/Incidentals"; RemServ "Servicing & Incidentals".
- **Where:** running-cost step (~line 1679 onward).
- **Proposed fix:** one line above the boxes: "Other lines: put fees in 'Lease management fees',
  everything else (roadside, incidentals, protection products) in 'Servicing'."
- **Owner decision:** where should optional insurances (lease protection, GAP) and a contingency
  buffer go: included, or left out because they're optional or refundable?

### 11. First-year insurance financed upfront (Maxxia, Oly)

**Status (2026-11-12):** ✅ Done: `aa26cd26` (insurance tooltip). Rate effect of a financed premium: see issue 14.

- **Problem:** Maxxia and Oly put the first year's comprehensive insurance into the amount financed
  ("1st year Comprehensive Insurance $2,107.82"). The running-cost line is only the renewal, so
  insurance looks cheap in year one, and the finance payment carries a year of insurance.
- **Evidence:** 1xs8shk, 1xt3of3 (11 Nov), 1vfxcqr (Oly).
- **Owner decision:** just a tooltip, or treat it in the engine? Low priority.

### 12. No drive-away printed, and sometimes no residual either

**Status (2026-11-12):** ✅ Done: `1bb129a4` ("Or add up the parts").

- **Problem:** the residual helper covers most quotes with no drive-away (Smart Leasing, Paywise,
  Smartsalary, LeaseExpress). LeasePlan (1n16kcg) prints neither, and NLA and LeasePlan print only
  the parts (price ex GST + GST + stamp duty + rego/CTP). RemServ prints only a "RemServ price"
  with no stated basis (1xdwkvq).
- **Proposed fix:** a second helper option: "or add up the parts" (vehicle price inc GST + stamp
  duty + rego + CTP).
- **Owner decision:** worth building, or is the residual helper enough?

### 13. Residual with no GST label

**Status (2026-11-12):** ✅ Done: `cb663960` (GST-on-residual tooltip).

- **Seen:** Maxxia "Total residual value"; RemServ "Residual value"; SPA page 1; LeaseExpress
  "Residual value (28.13%)" with "GST on residual" beside it (so ex GST); Lendly (only the footnote
  says inc GST). Ex GST only: NLA, Toyota Fleet, FleetPartners, Driva, LeaseLab, ORIX, MillarX.
- **Proposed fix:** the "Most quotes print this one" sub on "Including GST" is still right. Add to
  the hint: "If a separate 'GST on residual' line sits beside it, the figure is ex GST." The "I'm
  not sure" path already works it out.

### 14. Payment that includes fees (Maxxia "Financed payments")

**Status (2026-11-12):** 🔶 Review branch `worktree-agent-a3b8e74448be3cdd8` (`847b71c7`): optional "other amounts financed" field. Not merged.

- **Problem:** Maxxia's payment line says "Includes the car on roads and Financier Fees". If the user
  also enters the $437.82 establishment fee as the doc fee, is it counted twice?
- **Owner decision:** check the engine. If the doc fee is assumed financed into the payment, this is
  fine.

### 15. Running-cost buffers similar to Smart Leasing's reserve

**Status (2026-11-12):** ✅ Covered by issue 10 (`aa26cd26`).

- **Seen:** Simplygreen "Contingency Budget $300/yr"; LeaseLab "unspent funds will be returned at
  the end of the lease".
- **Owner decision:** note only, or exclude contingency lines as refundable? (Ties to issue 10.)

---

## Structural work (after the wording fixes)

Suggested order: issues 2–10 first (they help every provider, including ones we'll never have
pictures of), then 16, then 18–20, then 17. Issue 1 can go any time.

### 16. Optional provider picker with provider-specific pointers

**Status (2026-11-12):** 🔶 Prototype branch (see summary). Not merged. Design: `PROVIDER_PICKER_DESIGN_2026-11.md`.

Replace the "Smart Leasing or MillarX?" yes/no with an optional dropdown (default "Other / not
listed") on the first quote screen. Show a dated pointer at the affected field only where general
wording fails: SG Fleet (issue 3), Flare/Oly (issue 4), Maxxia/Oly (issue 11), FleetPartners/
LeasePlan (issue 8), Alliance/QLD template (issue 6), Smart Leasing (correction), MillarX (issue 1).
Also gives analytics on which providers users have. Word pointers as "if you see X", not page/line
positions. Prerequisite for issue 18.

### 17. Per-provider "how to read your quote" articles

**Status (2026-11-12):** ⏸ Waiting: needs consented quote images (issue 19).

Top providers only (2026 posts with images: Smart Leasing, SG Fleet, Maxxia, Paywise,
Smartsalary). Each article is the full annotated quote from issue 18 (every page, numbered boxes
matching the Guided fields), with a short "where to find each figure" list. Guided's per-field
crops link to the matching article. Doubles as search content ("how to read my SG Fleet quote").

### 18. Annotated "where to find it" pictures of each provider's quote

**Status (2026-11-12):** ⏸ Design written (`7de4c8c2`); waiting on owner decisions and consented images.

- **Idea (owner, 2026-11-11):** for each provider, show a picture of its real quote with the
  figure we're asking about boxed, instead of (or as well as) describing the label.
- **In Guided:** at each field, when a provider is chosen (issue 16), show a crop of just the
  relevant part, e.g. on the residual question "On SG Fleet quotes it's here", with a highlight box.
  "Show the whole page" opens the full annotated quote or links to its article (issue 17). Without a
  provider, the generic `QuoteDiagram` stays.
- **Cover, don't blur:** blurring can be reversed and looks messy. Paint solid boxes over names,
  phone numbers, emails, quote and reference numbers, and employers. Better still, replace the
  dollar figures with round example numbers so nothing traces back to a person (keep the figures
  consistent with each other).
- **Mobile:** crops must be legible at phone width, so crop per field, not per page. Lazy-load
  them per provider so the calculator bundle doesn't grow.
- **Light and dark theme:** a white quote crop on the dark theme needs a frame or a dimmed border.
- **Pilot:** SG Fleet (the most confusing: two payments, deferral only as a payment count, weekly
  pay) and Smart Leasing (the highest volume). Then Maxxia, Paywise, Smartsalary. Everyone else gets
  the improved general hints.
- **Needs from the owner:** one SG Fleet and one Smart Leasing quote shared with permission, ideally
  full PDFs (sharper crops than phone screenshots).
- **Reference pictures collected so far:** `private/quote-review-2026-11/provider-examples/<provider>/`
  with a `NOTES.md` per provider saying where each figure sits. MillarX is done: the NLTS page
  ("$816/mth × 59" = true payment, balloon ex GST, $24.50/month management fee), "Finance + fee"
  breakdown, "What you're financing", and the newer 22 Oct layout. They're from Reddit, so they're
  for reference or redrawing only until a consented copy arrives (issue 19).
- **Owner decisions:** crop style (highlight box, arrow, numbered marker); replace numbers or keep
  them; full page in Guided, or crops only with the full page in the article.

### 19. Image sourcing and consent

**Status (2026-11-12):** ⏸ Design written (`7de4c8c2`); owner to decide submission route and consent wording.

- Publish only quotes sent to us with permission, not the Reddit screenshots. Reddit posters
  shared theirs for a quote check, not for our site. The Reddit set (`private/quote-review-2026-11/`)
  stays for learning layouts and spotting format changes.
- A short consent line for submitters: we'll cover personal details and may change the figures,
  and they can ask for removal.
- Using a provider's branded document to explain it is low risk for education, but keep the
  annotations factual, with no commentary that knocks the provider. (Not legal advice; the owner
  decides.)
- Keep the originals and the redaction record in `private/`, never in the repo.
- **Owner decisions:** how people send quotes (email, an upload form, the Buy Me a Coffee page?),
  and the wording of the consent line.

### 20. Keeping the pictures current when formats change

**Status (2026-11-12):** ✅ Built privately: `private/quote-review-2026-11/scripts/freshness_check.py`; first report in `reports/`.

- Date every picture on the page: "SG Fleet quotes, as of Nov 2026".
- A "Mine looks different? Send it to us" link beside each crop, feeding issue 19.
- A recurring check: re-run the archive + OCR pipeline (`private/quote-review-2026-11/scripts/`,
  memory `reference_reddit_quote_archive`) every month or two and report providers whose newest
  quote looks different. It would have caught Easi's 29 Oct → 7 Nov change. Could be a scheduled
  agent run.
- A rule of thumb: a picture older than about 6 months gets a "may have changed" note until it's
  refreshed.
- **Owner decisions:** how often to check; whether a stale picture is hidden or kept with the
  note.

---

## Providers covered (newest quote checked)

Smart Leasing (incl. QLD Gov template), SG Fleet, Maxxia, Paywise, Smartsalary ("Smart Drive"),
RemServ, MillarX, Toyota Fleet Management, FleetPartners, Flare, Driva, Oly, Easi, NLA, Fingo/ALP,
Alliance, SPA, Remunerator, Autopia, Custom Fleet, ORIX, LeaseLab, Simplygreen, Lendly, Vehicle
Solutions, LeaseExpress, LeasePlan (2025 only). Seen in the archive but not reviewed: Fleetcare,
Macquarie, Westpac (BYO).

## Owner decisions log

- 2026-11-11: issue 1 settled and implemented (buffer = deferral, 1 or 2 months); awaiting owner check and commit.
- 2026-11-11: go ahead with annotated per-provider quote pictures (issues 18–20); the owner will
  collect current quotes from people.
