# Provider-specific guidance: big-picture review and action plans (2026-11-12)

> **What this is:** a review of the provider picker, pointers, quote crops and per-provider
> articles on branch `codex/provider-guide-completion` (worktree
> `/Users/changyang1230/novated-lease-guide-provider-guide`, head `c9041611`, not merged).
> Nothing here is implemented. Each item is written so a smaller model can do it on its own.
>
> **How it was reviewed:** read `providerGuide.ts`, the `GuidedMode.tsx` diff, the 28 articles and
> the design docs; walked Guided at phone width (500 px, dark theme) as SG Fleet, Smart Leasing
> and Maxxia; built a provider × field coverage matrix; OCR'd all 34 published PNGs for leftovers (the WebP crops are cut from those pages).
> **Not checked:** desktop width, light theme, the rendered article pages, and the redactions by
> eye beyond four images.
>
> **Working rules for the implementer:** work in the worktree above. Build, test and preview
> commands are in `UX_FIXES_HANDOFF_2026-11.md` ("How to build, test and preview"). The worktree
> has no `new-site/node_modules`; run `npm ci` there (don't `npx astro`, it pulls a wrong major
> version). 288 tests pass at head; keep them passing and run `npm run build` in `calculator2`
> before any browser check. Copy rules: short main text, nuance in tooltips, no over-assertive
> claims, readers have weak financial literacy. One item per commit.

## What is good and should stay

- The picker is optional, native, on the first screen, and never blocks progress.
- Replacing the "Smart Leasing or MillarX?" question with the picker for named providers.
- Trap warnings that general wording cannot give (Flare, Oly, Fingo, SPA "drive-away" with GST
  removed; SG Fleet's monthly figure; Remunerator's yearly payment).
- Real page layouts with numbered markers and one number key across all providers.
- Dated pointers, the six-month caution, and the freshness script.
- OCR found no customer amounts, emails or personal phone numbers on any published image; only
  company 1300 numbers (Alliance, LeaseExpress insurers, Simplygreen). PDF metadata is empty.

## Priority order

| # | Item | Size | Needs owner |
|---|---|---|---|
| 1 | Picker is skipped when a reader adds a quote later; no way to change it mid-flow | S | no |
| 2 | Payment pointer arrives after the questions it answers | S | no |
| 3 | Crops that contradict or under-show their text | M | no |
| 4 | Too many blue boxes: sort pointers into trap / locate / missing | M | yes (look) |
| 5 | Pointer wording: jargon and talk about "the sample" | M | review copy |
| 6 | Simplify the picture expander | S | no |
| 7 | Maxxia / Oly insurance advice knowingly skews the result | M–L | yes |
| 8 | Smart-branded Smartsalary quotes get a forced correction they may not need | S | yes |
| 9 | Provider-aware checks for readers who don't read the box | M | no |
| 10 | Image weight: 43 MB of PNG, multi-MB loads on phones | S | PDFs: yes |
| 11 | Picker polish: confirmation, "Other", who-is-my-provider hint | S | no |
| 12 | Generic quote diagram competes with the provider crop | S–M | no |
| 13 | Personalise the correction callout | XS | no |
| 14 | Unused lease-term crops | XS | yes |
| 15 | One source of truth for data, crops and articles | M | no |
| 16 | Articles: titles, thin pages, phone tables | M | yes |
| 17 | Measure whether it helps | S | no |
| 18 | Housekeeping | XS | no |

Suggested batches: **A (before merge):** 1, 2, 3, 6, 10, 13, 14, 18. **B (clarity):** 4, 5, 11,
12. **C (accuracy, owner first):** 7, 8, 9. **D (site):** 15, 16, 17.

---

## 1. Picker is skipped when a reader adds a quote later; no way to change it mid-flow

**Problem.** `ProviderSelect` renders only on the Intro step (`GuidedMode.tsx` ~line 812). A reader
who starts with "No, I'm just exploring" and later taps "I have a quote now" goes through
`onHaveQuote` (~line 550: `set("hasQuote", true); go("car")`) and never sees the picker. They get
the old "Smart Leasing or MillarX?" question and no pointers. Separately, a reader on the Price
step who sees "SG Fleet" pointers for the wrong provider must go back to step 1 to change it.

**Plan.**
1. On the Price step, above "FBT base value", render `<ProviderSelect>` when
   `d.hasQuote === true && d.provider === null`. Reuse the component unchanged.
2. In `ProviderPointers`, after "As seen on … quotes, Nov 2026." add a link button
   "Not {label}? Change" that calls the same `go("intro")` navigation the review screen's edit
   links use (pass `onEdit`/`go` down, or lift a `onChangeProvider` prop). Show it on the first
   pointer box of each step only (see item 4 for the single footer).

**Accept.** Test: draft with `hasQuote:false`, trigger `onHaveQuote`, reach Price, picker is
present; choosing a provider there shows pointers on the same screen. Test: "Change" lands on
Intro with the picker visible. Existing test "is gone from the price screen" must be updated to
"is gone from the price screen once answered".

## 2. Payment pointer arrives after the questions it answers

**Problem.** On the Payment step the order is: period question → GST question → (correction
callout) → amount → provider pointer. The pointer says which figure, period and GST basis to use
("Use 'Lease rental' (per pay), ex GST…"), but by then the reader has answered both questions.
Same on Running costs: the `running` pointer sits under the period choice, which is right, but the
`payment` one is not.

**Plan.** Move `<ProviderPointers d={d} field="payment" />` (~line 1466) to directly under the
step's intro sentence "Enter only the vehicle finance payment…", before the period `Choices`.
Leave the `luxAdj` pointer where it is. Check the same ordering on Lease: the `residual` pointer
currently sits after the residual GST question (~line 1273); move it between the residual amount
and the GST question, since most residual pointers answer the GST question.

**Accept.** DOM-order test: for `sgfleet` on Payment, the `.gd-pointers` node precedes the
"How does your quote show the payment?" group. Browser check at phone width.

## 3. Crops that contradict or under-show their text

**Problem.** Crops are generated from marker boxes
(`private/quote-review-2026-11/crops/make_crops.py`, `crops.json`, `markers.json`), so some don't
match what the pointer says:
- **SG Fleet `field-payment.webp`:** shows 7b "Lease rental" and 7a "Monthly lease rental" with
  equal emphasis. The text says use 7b, not 7a. The crop also shows half-cut markers "2" and "10"
  and a visible seam between two stitched strips.
- **Smart Leasing `field-payment.webp`:** 7a and 7b both boxed; text says either works. Half-cut
  marker "3". Fine in substance, messy at the edges.
- **Maxxia `field-docFee.webp`:** text says add "Financier's Establishment Fee" and "1st year
  Comprehensive Insurance"; only the first is boxed. Oly `docFee` has the same instruction; check.
- **SG Fleet `fbt-example.png`:** the value next to "FBT Base Value" is blank white, not the grey
  bar used elsewhere, so it reads as an empty field.

**Plan.**
1. In `make_crops.py` add a per-crop `avoid` list (labels to mark "don't use"): draw the marker in
   red with a ✕ instead of the blue number. The article index already promises "A red ✕ flags a
   tempting but unsuitable figure". Set `avoid: ["7a"]` for SG Fleet and Easi payment; add ✕ boxes
   for Flare "Vehicle cost", Oly "Oly driveaway price", Fingo "Your car price", SPA "Novated lease
   purchase price", Driva "Effective novated vehicle price", Lendly "Total Price (ex. GST)" where
   those lines are on the page.
2. Add an `extra_boxes` option and box the insurance line on the Maxxia and Oly `docFee` crops.
3. Paint over any marker circle that is less than fully inside the crop, and draw a 12 px light
   grey gap with a "⋯" between stitched strips so the join is deliberate.
4. Redraw the grey value bar on `sgfleet/fbt-example.png`.
5. Write a contact sheet per provider (the script already has `_sheet_<provider>.png`) and
   eyeball each against its pointer text. List every mismatch found in the commit message.

**Accept.** For each provider, every label a pointer tells the reader to use is boxed in blue on
that field's crop, every label it says not to use carries a red ✕, and no partial markers remain.

## 4. Too many blue boxes: sort pointers into trap / locate / missing

**Problem.** With a provider chosen, a reader meets a blue box under almost every field: 8–10 per
run. Coverage matrix (T = text, NS = "the example doesn't show this", img = picture only):
of 270 provider × field slots, 101 have a text pointer, 42 are NS boilerplate, 84 are
picture-only and only 43 show nothing. All three look the same, so the handful that stop a wrong entry (Flare's GST-removed
"drive-away", SG Fleet's monthly figure) are no louder than "If you see 'FBT value', that's the
FBT base value." Weak readers skim; uniform boxes teach them to skip.

**Plan.** Add `kind` to `Pointer` in `providerGuide.ts` and render each differently:

| kind | Meaning | Rendering |
|---|---|---|
| `trap` | A figure that looks right but is wrong, or an entry that needs a different answer than the general hint | Amber box (reuse `.gd-finding` warning colours), bold first sentence, always visible |
| `locate` | "It's called X here" | No box. One line under the field hint: "On Maxxia quotes: **Car price (based on on roads…)**" followed by a "Show me" link that opens the crop |
| `missing` | Not printed on the reviewed quote | One muted line, no box, no date: "Maxxia quotes don't usually state this. Choose 'Not sure'." |
| (picture only) | No text, crop exists | Just the link "Show me on a Maxxia quote" in the hint line |

Steps:
1. Type: `kind: "trap" | "locate" | "missing"`. `notShown` becomes `kind: "missing"`.
2. Classify the 143 existing pointers. Rule: `trap` if the text contains "don't use", "not",
   "instead", a period or GST answer that differs from the default, or routes to the correction
   tool; otherwise `locate`. Expect 20–30 traps (an estimate, not counted). List the classification in the commit for
   owner review.
3. Render per the table. Show "As seen on {label} quotes, {Mon YYYY} · Not {label}? Change" once
   per step, at the foot of the step's last pointer, not under every box. Put the date inside the
   open picture's caption too.
4. CSS: `.gd-pointers` keeps the blue box only for nothing; add `.gd-pointer--trap`,
   `.gd-pointer--locate`, `.gd-pointer--missing`.

**Owner decision.** Happy with amber for traps (it's the colour the correction callout uses)?

**Accept.** SG Fleet run: at most 3 boxed items across all steps (payment, FBT base value,
drive-away if kept as a trap). Tests assert the class per kind and one date line per step.

## 5. Pointer wording: jargon and talk about "the sample"

**Problem.** Many pointers describe our reference image, not the reader's quote, and some use
terms the audience won't know. 21 pointers exceed 160 characters (longest 288).
Examples: "This SG Fleet sample's first two pages do not show…", "On this SG Fleet VSSS quote…
It is marked 2 on page 2" (the reader hasn't opened any picture), "The two available Smart Leasing
pages do not print…", "The Remunerator example marks 'Vehicle Purchase Price' as 2", "capitalised
into the lease rental", "Employer Claimed ITC".

**Rules for the rewrite.**
1. Talk about "your quote", never "the sample / example / page checked / available pages".
2. Lead with the exact label in quotes, then what to do: "Use 'X'." / "Don't use 'X': …".
3. No marker numbers in the text. Numbers belong in the picture caption.
4. Main text ≤ 140 characters; one idea. Reasons go in `more`.
5. Replace: "VSSS" → drop; "capitalised" → "added to the amount you borrow"; "ITC" → "GST
   credit"; "ex GST" stays (the calculator uses it throughout).
6. Hedge honestly: "usually", "on the quotes we've seen".

**Rewrites for the worst cases** (apply, then do the rest by the rules):

| Provider · field | New text | New `more` |
|---|---|---|
| sgfleet · baseValue | Look for "FBT Base Value" in the "Fringe Benefit Tax (FBT)" section, often on a later page. Don't use "Vehicle on-road cost". | Not there? Ask SG Fleet for the FBT base value. |
| sgfleet · driveaway | Use "Vehicle on-road cost (incl. GST)" under "Lease details". | "FBT Base Value" and "Total amount financed" are different figures. |
| sgfleet · payment | Use "Lease rental" (per pay). Don't use "Monthly lease rental": it's paid fewer times than the lease has months. | Entering the monthly figure would make your interest rate look too high. The amounts exclude GST (see the quote's footnote). |
| smartleasing · driveaway | Smart Leasing quotes usually don't print a drive-away price. Use the dealer's on-road price, or work it out from the residual below. | Don't use the FBT base value or a lease payment here. |
| smartleasing · docFee | Look for "documentation fee" in the small print on the terms page. If it includes GST, divide by 1.1. | The same clause gives the total amount financed. That isn't the drive-away price. |
| oly · driveaway | Don't use "Oly driveaway price": it has the GST saving taken off. Use the dealer's full on-road price including GST. | "Recommended retail price" only works if it includes all on-road charges. |
| leaseplan · driveaway | LeasePlan quotes we've seen don't print a drive-away price or a residual. Ask for the full on-road price including GST. | The vehicle subtotal may leave out stamp duty and registration. |
| leaselab · driveaway | No drive-away price printed? Add "GST Saved on Car Price" to "Novated Vehicle Price". | (keep existing) |
| orix · driveaway | ORIX lists the price in parts with no total. Ask for the full on-road price including GST, or work it out from the residual below. | |
| orix · docFee | Check the "Other Fees" footnote for an establishment or dealer fee. | It may already be added to the amount you borrow. |
| remunerator · driveaway | "Vehicle Purchase Price" may not include on-road costs. Check it's the full on-road price including GST. | |
| smartsalary · running | Heading says "inc GST" with a "Less: Employer Claimed ITC" line? Choose Including GST, then say your employer claims the GST credit. | |
| toyotafleet · defer | Toyota Fleet quotes don't state a deferral. Choose "Straight away" unless Toyota Fleet tells you otherwise. | On the quote we checked, the printed rate matched payments starting straight away. |

Also rewrite `notShownText()` (all five cases) to drop "example checked":
"`{p}` quotes don't usually say how many months are deferred. Choose 'Not sure' (we'll assume 2)."
and likewise for the others.

**Accept.** `grep -nE "sample|example|VSSS|marked [0-9]|available pages|capitalised|ITC" providerGuide.ts`
returns only `FIELD_EXAMPLES` captions. A test asserts every pointer `text.length <= 160`.

## 6. Simplify the picture expander

**Problem.** An open picture shows a caption plus up to five controls: "Hide redacted quote",
"Switch to full page view", "Show page 2", "See the numbered field guide", "Open PDF", "My quote
looks different". "Redacted" is not a word this audience uses. The full-page toggle squeezes a
1704 × 3692 page into a phone card, where it is unreadable. `ProviderPointer` has grown six
provider-specific branches (`fbtExample`, `driveawayExample`, `smartTerms`, `smartSample`,
`smartPage`…) with nested ternaries for the button, alt text and caption.

**Plan.**
1. Controls become: toggle button "Show me on a {label} quote" / "Hide picture"; caption
   "A real {label} quote with the numbers removed. Checked {Mon YYYY}. Tap to enlarge."; two
   links: "See the whole quote" (to `/start-here/how-to-read-{id}-quote/`) and "Mine looks
   different". Remove "Open PDF" and both in-place toggles from Guided.
2. Move the special cases into data. Extend `FIELD_EXAMPLES` with entries for
   `sgfleet/baseValue`, `sgfleet/driveaway` and `smartleasing/docFee` (image, button, alt,
   caption), then delete the matching booleans and the `smartPage` state from the component.
   `templateFor` loses its three hard-coded `if` lines.
3. Component then has one path: `example ?? crop ?? none`.
4. Dark theme: add `opacity: .92` to `.gd-template__crop img` under the dark theme selector, as
   the design doc specified, so white quote paper doesn't glare.

**Accept.** `ProviderPointer` has no provider ids in it. Tests in `provider-picker.test.tsx`
that look for the old button labels are updated. Browser check: SG Fleet FBT, Smart Leasing
documentation fee and Oly residual still show their special pictures.

## 7. Maxxia / Oly insurance advice knowingly skews the result

**Problem.** Maxxia and Oly finance the first year's insurance. The current pointers tell the
reader to (a) add that premium to the documentation fee and (b) still enter the full yearly
premium under Insurance. The tooltip admits the consequence: "the lease's cost comes out about
one year's premium too high". So a reader who follows the guidance exactly gets a result biased
against the lease by roughly $2,000, disclosed only behind an ⓘ. For a site whose promise is the
real net outcome, and for readers who won't open the tooltip, this is the weakest spot in the
feature. It is also confusing to be told to type insurance in two places.

**Options (owner to choose).**
- **A, recommended:** make it a first-class answer. When `provider` is `maxxia` or `oly`, show
  one question on the Lease step: "Is the first year's insurance included in the amount
  financed?" (Yes / No / Not sure), with the crop. If Yes, ask for that premium. In
  `buildInputs`, add it to the financed fees for the rate calculation and reduce the lease-side
  insurance running cost by one year's premium spread over the term. The reader types each
  number once. Needs an engine check on how `docFee` flows into cost, plus tests against the two
  Maxxia quotes and the Oly quote in `QUOTE_FORMAT_ISSUES_2026-11.md` issues 11 and 14.
- **B:** merge the existing review branch `worktree-agent-a3b8e74448be3cdd8` ("other amounts
  financed" field, issue 14) and point the Maxxia/Oly pointers at it. Still needs the
  running-cost side fixed to avoid the double count.
- **C, minimum:** keep the behaviour, but move the caveat out of the tooltip into the main text
  of the insurance pointer and repeat it on the results screen when `provider` is `maxxia` or
  `oly`: "Your lease cost is overstated by about one year's insurance (about $X)."

**Accept (A).** Maxxia quote 1xt3of3 entered as printed gives a rate within 0.1 points of the
rate implied by its amount financed, and the total lease cost counts each year's insurance once.

## 8. Smart-branded Smartsalary quotes get a forced correction they may not need

**Problem.** Choosing "Smart Leasing" forces the 58/60 correction. Issue 1 in
`QUOTE_FORMAT_ISSUES_2026-11.md` records a Smart-branded quote issued through Smartsalary (SA
Government, post 1x9l1fe) whose per-pay figure matches its printed 11.29% only when left
uncorrected; corrected, it reads about a point too low. The picker note says "choose the name on
your quote", but that quote carries Smart Leasing branding. One quote, unconfirmed.

**Plan (small, reversible, until Smart answers).**
1. In the Smart Leasing correction callout add one line with an escape: "Does your quote print a
   'Comparison Interest Rate'? After correcting, your rate here should be close to it. If it's
   about a point lower, [undo the correction]."
2. "Undo the correction" restores the printed payment, clears `paymentCorrected`, and sets a new
   draft field `correctionWaived: true` that `checkPaymentCorrected` treats as satisfied. It
   fires `trackEvent("guided_correction_waived", { provider })`. Changing provider resets it.
3. Add the same sentence to `how-to-read-smartleasing-quote.md`.

**Owner decision.** Ship the escape hatch now, or wait for Smart's reply? The event count would
show how often it happens.

## 9. Provider-aware checks for readers who don't read the box

**Problem.** Pointers are passive. Knowing the provider, the calculator can catch the specific
slip after it happens, in the existing findings slot (`checks.ts`), which readers already trust.
The design's `suggests` idea was not built; findings are a safer version of it (no auto-answers).

**Plan.** Add `checkProvider(d): Finding[]` in `checks.ts`, wired into the step findings:

| Condition | Message (warning, not blocking) |
|---|---|
| `sgfleet` or `easi`, `paymentPeriod === "perMonth"` | "{label}'s monthly figure is paid fewer times than the lease has months. Use the per-pay 'Lease rental' instead, or your rate will look too high." |
| `remunerator`, period not `perYear`, payment > 0 | "Remunerator shows the lease payment per year. Check you chose 'Per year'." |
| `leaselab`, period is `perFn` or `perMonth` | "LeaseLab quotes are usually weekly. Check the period." |
| `smartsalary`, `paymentBasis === "exGst"` | "Smartsalary usually shows this payment including GST. Check the heading." |
| `flare`, `oly`, `fingo`, `spa`, `driva`, `lendly`: drive-away entered and `driveaway < baseValue` | Name the trap label for that provider: "This looks like '{label}', which has GST taken off. Use '{right label}'." Store both labels in a small map beside the guides. |
| `maxxia`, `oly`: `docFee` > 0 and < $1,000 | "Did you add the first year's insurance? Maxxia includes it in the amount financed." (drop if item 7 option A is built) |

Each fires `trackOncePerSession("guided_provider_check", { provider, code })`.

**Accept.** One unit test per row, plus one asserting no provider check fires for `other`/null.

## 10. Image weight

**Problem.** `docs/assets/images/quote-guide/` is 60 MB: 43 MB PNG, 13 MB image-only PDFs, 3 MB
WebP crops. Eighteen files exceed 1 MB; `smartleasing/terms-example.png` is 4.9 MB (2098 × 2976)
and `sgfleet/redacted-quote.png` 3.7 MB. Guided loads these on a phone when a special example
or the full page opens, and every article embeds its full PNG. The `<img>` has `width="720"` and
no height, so the page jumps when it loads. The repo is public and GitHub Pages; 60 MB of
binaries in history is permanent.

**Plan.**
1. Convert every page-level PNG to WebP at max 1400 px wide, quality ~80 (`cwebp` or Pillow in
   the private crops script). Target under 300 KB each. Update paths in `providerGuide.ts`
   (`pageFor`, `FIELD_EXAMPLES`, the three special cases) and in the 27 articles.
2. Emit `docs/assets/images/quote-guide/manifest.json` from the script:
   `{ "<provider>/<file>": { "w": n, "h": n } }`. Import it in `providerGuide.ts` and set real
   `width`/`height` on the `<img>`.
3. PDFs: they are images wrapped in a PDF. Recommend deleting them and the "Open PDF" links.
4. Do this **before merging** so the large PNGs never reach `main`. If the branch has already
   been pushed (it has: `origin/codex/provider-guide-completion`), squash-merge so `main`'s
   history only holds the WebP files.

**Owner decision.** Drop the PDFs, or keep them on article pages only?

**Accept.** `du -sh docs/assets/images/quote-guide` under 10 MB; no file over 400 KB; no layout
shift when a picture opens.

## 11. Picker polish

**Problem.** After choosing, nothing confirms what the choice does. "Other / not listed" is a
dead end. Readers may not know who the "provider" is: the quote may carry an employer portal
name, a dealer, or a brand that differs from the list (Ayvens, EasiFleet, ALP, Smart Drive, the
shared Queensland Government template used by Alliance, Smart Leasing QLD and SPA). The hint is
two sentences and the second ("No personal information needed") answers a question nobody asked
at a dropdown.

**Plan.**
1. Hint → "The company named at the top of your quote, not your employer or the car dealer."
2. After a named choice, replace the hint with a confirmation in the success colour:
   "We'll show you where each figure is on a {label} quote." For providers whose guide is stale
   (`guideMayHaveChanged`), add "Our {label} example is from {Mon YYYY}."
3. After "Other / not listed": "No problem. The general hints work for any quote." plus a link
   "Tell us who it's from" to `/about/contact/#quote-layout-feedback`.
4. Keep the Smart Leasing / Smartsalary note.

**Accept.** Tests for the three hint states. No free text is sent to analytics.

## 12. Generic quote diagram competes with the provider crop

**Problem.** Every quote step still shows the generic `QuoteDiagram` ("Where is this on my
quote?", collapsed on phones, open in the side column on desktop). With a provider chosen the
reader now has two different "example quotes": a made-up one and their provider's real layout.

**Plan.**
1. In the `Side` wrapper (~line 728), when `guideFor(d.provider)` has a page image, change the
   phone summary to "See a typical quote (not {label}'s)" so the two aren't confused. Keep it
   collapsed.
2. Desktop (do after checking how it looks at ≥1024 px): show the provider's crop for the
   currently focused field in the side column, with the generic diagram under a "Typical quote"
   toggle. `highlight` already tracks the focused field, so pass it to a small
   `ProviderSidePanel` that calls `templateFor(provider, highlight)`.

**Accept.** Phone: summary text changes with the provider. Desktop: focusing "Residual" with
Maxxia chosen shows Maxxia's residual crop beside the form.

## 13. Personalise the correction callout

**Problem.** With Smart Leasing chosen, the callout still says "You need to correct your Smart
Leasing / MillarX payment first" (~line 1408). The "done" state and the modal title likely do the
same.

**Plan.** Build the name once: `d.provider` named → `providerLabel(d.provider)`, else
"Smart Leasing / MillarX". Use it in both callout states. In `LeaseAdjustModal`, when
`initialProvider` is passed from a named provider, hide the Smart/MillarX toggle (the reader
already told us); also pass `"smart"` explicitly for `smartleasing`.

**Accept.** Test: provider `millarx` → callout reads "…your MillarX payment first" and the modal
has no provider toggle.

## 14. Unused lease-term crops

**Problem.** `FIELD_CROPS` lists `term` for 24 providers and the files exist, but no
`<ProviderPointers field="term">` is rendered, so they are never shown.

**Plan.** Recommended: delete the 24 `field-term.webp` files and remove `"term"` from
`FIELD_CROPS` and `TEMPLATE_FIELDS`. Lease term is the easiest figure on any quote and another
link under it adds noise. Alternative: wire it as a picture-only link.

**Owner decision.** Delete (recommended) or wire.

## 15. One source of truth for data, crops and articles

**Problem.** The same facts live in four hand-kept places: `GUIDES` pointers, `NOT_SHOWN`,
`TEMPLATE_FIELDS` / `FIELD_CROPS`, and the 27 article tables. `TEMPLATE_FIELDS` and `FIELD_CROPS`
already disagree for 11 providers. When a layout changes, four edits are needed and nothing
fails if one is missed.

**Plan.**
1. Replace `TEMPLATE_FIELDS` and `FIELD_CROPS` with the `manifest.json` from item 10: a crop
   exists if the manifest has `<id>/field-<f>.webp`.
2. Add a test that walks `GUIDES`: every image path the code can produce exists on disk; every
   provider in `GUIDES` has `new-site/src/content/docs/start-here/how-to-read-<id>-quote.md` and
   is linked from `provider-quote-guides.md`; every `seen` parses.
3. Article tables: add an Astro component `ProviderFieldTable.astro` that imports
   `providerGuide.ts` (the site already builds the calculator source path; if the import is
   awkward, export the guides to `new-site/src/data/providerGuides.json` in the calculator build)
   and renders the "Guided field / Look for / What to enter" rows from the pointers. Keep each
   article's hand-written intro. Convert the articles one at a time, diffing the rendered table
   against the old one.
4. Add `dateModified` to each article's frontmatter from the guide's `seen`.

**Accept.** Deleting a crop file or an article makes a test fail. Changing a pointer's text
changes the article table on the next build.

## 16. Articles

**Problem.** Twenty-seven pages published the same day share one template; several are a
six-row table built from a single quote. Titles end "…for Guided mode", which nobody searches
for. Four-column tables are tight at phone width. The index lists all 27 with equal weight.
Risk: thin, near-duplicate pages dilute a site that ranks on depth.

**Plan.**
1. Titles: "How to read a {Provider} novated lease quote". Keep "Guided mode" for the
   description and the closing link.
2. Each article opens with "What catches people out on a {Provider} quote": the `trap` pointers
   from item 4 as a short list. Providers with no traps say so in one line.
3. Add "Checked against {n} quotes, newest {Mon YYYY}" under the title, from `sources.length`
   and `seen`.
4. Providers with one source and no traps (candidates: LeaseExpress, Lendly, Vehicle Solutions,
   Simplygreen, Custom Fleet, LeasePlan 2025): set `noindex` and keep them reachable from the
   index and from Guided, or fold them into sections of the index page.
5. Index page: group as "Most common" (5) then "All providers", matching the picker.
6. Phone tables: check each article at 375 px; if the table scrolls sideways, render rows as
   stacked cards under 600 px (CSS only, in `global.css`).

**Owner decisions.** New title pattern; which thin pages get `noindex` or folding.

## 17. Measure whether it helps

**Problem.** Only `guided_provider` (on change) and `guided_pointer_open` exist. That shows
which providers people have, not whether the guidance changes outcomes.

**Plan.** Through `utils/analytics.ts`, closed-list values only:
1. Add `provider: d.provider ?? "none"` as a parameter on the existing `guided_step` (~line 381)
   and `guided_completed` (~line 421) events.
2. `guided_provider_feedback_click { provider }` on "Mine looks different".
3. `guided_provider_check { provider, code }` from item 9.
4. After four weeks compare, for named vs none: completion rate from Price to results, share of
   runs ending with a rate warning from `LeaseRateGuard`, and pointer-open rate per field (fields
   nobody opens can lose their picture link).

The coffee-nudge social-proof A/B test runs until mid-December. Shipping this mid-test changes
the funnel, so record the ship date beside that test's notes.

## 18. Housekeeping

- `QUOTE_FORMAT_ISSUES_2026-11.md` header on the branch says "11 numbered, redacted quote-page
  examples"; it is 27. Fix the line.
- `PROVIDER_PICKER_DESIGN_2026-11.md` says the picker "moved to the Price step" in one paragraph
  and "on the first screen" in the decisions list. The first screen is what shipped; fix the
  earlier paragraph.
- `new-site/scripts/freshness_check.py` needs the private archive; add a two-line header saying
  so, so nobody tries to run it in CI.
- Add a redaction gate to `PROVIDER_GUIDE_MAINTENANCE.md` step 3: before committing new images,
  run tesseract over them and grep for `$` amounts, emails and phone numbers (the one-liner used
  in this review), then view each at full size.
- `ProviderSelect` change handler calls `set` up to four times; fold into one draft update if
  `set` supports it, to avoid intermediate saved states.
