# Calculator UX fixes — handoff (started 2026-11-11)

A UX review of the live calculator (`/calculator/`, the v2 app in `calculator2/`) for first-time,
non-financial, possibly stressed users, then a fix-by-fix pass with the owner (Dr Yang). Fixes 1–4b
are **done and committed locally** (commit "fix(calculator): UX review fixes for first-time users
(1-4b)", not pushed yet). The rest are listed below in the suggested order.

Work the way this session did: **one fix at a time**. Explain the plan in a few lines, implement it,
add or update tests, build, check in the browser, then tell the owner exactly what to check. Wait for
"next" before starting the following fix. The owner checks on the real page (dark theme too), so
always rebuild before saying a fix is ready.

---

## How to build, test and preview

```bash
cd calculator2
npx tsc -b                 # type check
npx vitest run             # 208 tests at handoff; all must pass
npm run build              # writes docs/assets/calculator/main.js + style.css (what the site serves)
npx eslint <files you changed>
```

- **Lint:** `npx eslint src` reports many errors in files we haven't touched, plus one existing
  `no-useless-escape` in `src/components/ui/Field.tsx` (`/[^0-9.\-]/`). Only lint the files you
  change. Don't fix unrelated lint in the same commit.
- `tests/` lint fails on a missing `import/no-relative-packages` rule. That's pre-existing too; ignore it.
- "Error: Not implemented: window.scrollTo" in test output is jsdom noise, not a failure.

**Previews**
- Real page: `cd new-site && npx astro dev --port 4322` → http://localhost:4322/calculator/.
  It loads the built bundle, so run `npm run build` in `calculator2` first and reload. The owner's
  own Astro server may be on 4321; don't kill it.
- Calculator only, hot reload: `cd calculator2 && npx vite --port 5199` → http://localhost:5199/assets/calculator/

**Browser checks (Claude in Chrome):** the owner's real Chrome is used, so its localStorage holds
the owner's own test state. Before seeding a draft, back it up and restore it afterwards:

```js
// before
localStorage.setItem('claude_bk', JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>k!=='claude_bk').map(k=>[k,localStorage.getItem(k)]))));
// seed a Guided draft and jump straight to a screen, e.g. the exploring results:
const m=t=>({text:t,none:false,estimated:false});
localStorage.setItem('nlc2-guided-draft-v3', JSON.stringify({draft:{hasQuote:false,vehicleType:'Non-EV',vehicleCondition:'New',compareLoan:false,compareCurrent:false,driveaway:m('60000'),leaseYears:5,mileage:m('15000'),income:m('74000'),cashHome:'offset',offsetRate:m('6.1')},step:'review',visited:['intro','car','compare','quick','you','review']}));
location.reload();
// after
const bk=JSON.parse(localStorage.getItem('claude_bk')); for (const k of Object.keys(localStorage)) if (!(k in bk)) localStorage.removeItem(k); for (const [k,v] of Object.entries(bk)) localStorage.setItem(k,v);
```

Keys: `nlc2-guided-draft-v3` (Guided answers + step), `nlc2-mode` (`guided` / `advanced`).
Close any tabs you open.

---

## Committing

Fixes 1–4b are committed on `main` but **not pushed**. **Ask the owner before committing or
pushing**: a push to `main` goes live in about 75 seconds.

Uncommitted files that belong to the owner, **not** this work. Leave them out of these commits:
- `new-site/src/styles/global.css`
- `docs/assets/images/smartleasing-example/`
- `new-site/src/content/docs/costs-and-savings/real-example-smartleasing-21000-cheaper.md`

This work touches `calculator2/src/**`, `calculator2/tests/**`, `docs/assets/calculator/main.js`,
`docs/assets/calculator/style.css` and `new-site/src/pages/calculator/index.astro` (FAQ). Use the
commit attribution lines from the session's system reminder.

---

## Done (committed, not pushed)

1. **Smart Leasing / MillarX correction pop-up** (`components/LeaseAdjustModal.tsx`, `guided/GuidedMode.tsx` PaymentStep)
   - Opens on the period and GST answers already given in Guided.
   - Asks GST with clear buttons, and outputs in the user's own period and GST basis.
   - No longer silently switches GST to ex.
   - A GST change after correcting converts the figure; switching the provider to "No" clears it.
   - The pop-up scrolls on phones (its buttons used to be off-screen).
   - Advanced (`LeaseRateGuard`) still defaults to per fortnight / ex GST.
2. **Money entry** (`guided/draft.ts` `parseAmount` / `amountProblem`, `guided/parts.tsx` MoneyInput)
   - Accepts `52.4k`, `$85K` and `7.5%`.
   - Unreadable text shows an inline error, and "Still to answer" says "(we couldn't read it)".
   - Advanced `NumberField` (`components/ui/Field.tsx`) reads a trailing `k`, has a default `min = 0`
     with a visible "can't be negative" note, and its ↑/↓ arrow keys update the shown text and stay
     within limits.
   - The correction pop-up uses `parseAmount` too.
3. **Missing answers** (`missingItems` in `draft.ts`, `guided/missing.ts` context, `parts.tsx`, `GuidedMode.tsx`, `guided.css`)
   - Labels use the question's own wording.
   - After Next, unanswered questions get a red outline plus "Not answered yet".
   - The page scrolls and focuses the first one, and list items link to their questions.
   - When everything is answered the box turns green ("✓ All answered…") instead of disappearing, so
     Next doesn't jump.
4. **HECS / childcare wording**: the results caveat now says what's not counted and that Advanced
   works out adjusted taxable income. The FAQ "Does it consider childcare subsidy, HECS, or Div 293
   impacts?" now answers "Partly…", in both the visible FAQ and the JSON-LD in
   `new-site/src/pages/calculator/index.astro`.
   - `calculator-old/index.astro` still has the old "Yes…" text (retired page; left alone).
5. **Exploring results** (`ReviewStep` in `GuidedMode.tsx`)
   - "Rough estimate" note naming the count of assumptions, the assumed rate (follows the slider),
     running costs and super, with "See all assumptions" and "Enter a quote".
   - The explorer headline and "Try different numbers" lines are rounded to the nearest $1,000
     ("about $36,000 better off", via the `Outcome` component). The quote path stays exact.
   - Results parts are now: 1 Your result · 2 What this is based on (Your answers (n) + What we
     assumed (n)) · 3 Try different numbers (explorer only) · 4 What to do next · 5 Save/share.
6. **Layout**
   - `KV` rows (`components/ui/shared.tsx`, `styles/components.css`): text and ⓘ sit side by side,
     so the icon never wraps alone.
   - The answers and assumptions lists are capped at 720 / 680px.
   - The super assumption now reads "Not reduced by the lease (the usual case)" (`assumptions.ts`).

---

## Remaining fixes (suggested order)

Line numbers are approximate (as of handoff). `GuidedMode.tsx` = `calculator2/src/guided/GuidedMode.tsx`.

### Substantive

**5. No-cash answer still leads with "than paying cash"** (small)
- Problem: `cashHome === "none"` ("I don't have the cash to pay outright"), but `ResultHeadline`
  (~2642) and `TryNumbers` (~2698) always put "paying cash" first, and the breakdown card is titled
  "Novated Lease vs Offset Cash".
- Fix:
  - When `cashHome === "none"`, lead with the car loan line, then keeping the current car.
  - Show the cash line last, labelled e.g. "paying cash (for reference — you said you don't have the
    cash)", or drop it from the headline.
  - The "Compared with …" subtitle (`comparedWith`) should follow the same order.
- Watch out: if the user chose "Pay cash for this car" on "What you're comparing" but then "no cash"
  on About you, there's no loan line. Show the cash line with the note, and maybe a hint that the
  answers conflict.

**7. GST answer order differs between screens** (small)
- Residual (LeaseStep ~1180) and `DriveawayHelper.tsx` list Including GST first. Payment
  (PaymentStep) and running costs (RunningStep ~1567) list Excluding GST first.
- Use one order everywhere, keeping each "most quotes print this one" sub-label.
- Update any tests that click by position (they mostly click by name).

**8. "What you're comparing" has no "Not sure" option** (small)
- `CompareStep` (~853). Add a third option, "Not sure — show me both", which sets
  `compareLoan = true` and `compareCurrent = true`. It could be one extra button under both questions,
  or a third choice on each.
- Soften the warn box "This choice matters most…" with "You can change this later."
- `missingItems("compare")` must still pass when this is chosen.

**6. Running-cost GST question asks two things at once** (medium)
- RunningStep (~1567). The "Including GST" option's sub-label reads "Heading says inc GST, and no GST
  credit is taken off later", which a novice can't judge.
- Split it:
  - (a) "What does the running-cost heading say?" → ex GST / inc GST / can't see it.
  - (b) Only if inc GST: "Does the quote take a GST credit off afterwards?" Show a mock-up like the
    existing `GstMock`.
- Map the answers onto the existing `gstPassedOn` (`"Yes"` = ex GST, `"No"` = inc GST with no
  credit). Keep the draft shape backward compatible: old saved drafts only have `gstPassedOn`.
- Update `missingItems("running")`.

**9. "Worse off" results get no plain explanation, and the breakdown uses jargon** (medium)
- When a headline line is negative, add one plain sentence naming the main driver.
  - Example: the payment diagnosis gives an effective rate (`paymentDiagnosisFor` /
    `diagnosePayment` in `checks.ts`). If it's above about 12%, say "Your lease's interest rate
    (15.5%) is the main reason" and link the BYO checker (`/tools/byo-employer-check/`).
  - Otherwise say "running costs" or "the car's value at the end", whichever is largest. Keep it
    simple and only claim what the figures show.
- Breakdown jargon is in `components/SummaryView.tsx` (~200–290): "NL:", "Offset Cash",
  "Cashflow disadvantage (NL)", "Home loan interest advantage (NL)", "Interest baseline: …".
  `SummaryView` is shared with Advanced, so plain wording there helps both.
  - Suggested: "NL" → "Novated lease"; "Offset Cash" → "Paying cash"; "Cashflow disadvantage (NL)"
    → "Extra cash the lease costs you".
  - Confirm with the owner before renaming. `tests/total-saving.test.tsx` and snapshots may check
    labels.

**10. Advanced opens filled with example figures** (small–medium)
- `App.tsx` starts Advanced with `advancedDefaultInputs` (`state/defaultInputs.ts`). A first-timer
  who clicks "Skip to Advanced mode" can't tell these are examples.
- Show a banner at the top of Advanced: "These are example figures. Replace each one with your
  quote." Hide it once the user edits a field, or when inputs came from Guided, a share link or a
  saved quote (`advancedEdited` / URL state in `App.tsx`).
- Optionally rename the Guided intro link "Skip to Advanced mode" to "Used this before? Go to
  Advanced mode".

### Small (can be batched, one or two commits)

11. **Deferred-payment question** (LeaseStep ~1145)
    - "When does the first payment start? (deferred)" with "Now / 1 month / 2 months / Not sure" is
      ambiguous, and "deferred" is jargon.
    - Suggested: "How many months until your first finance payment?" with hint "Quotes often say
      'deferred 2 months'."
    - Options could read "Straight away / After 1 month / After 2 months (most common) / Not sure".
      The example quote diagram already says "after 2 months".
12. **Lease start date has two meanings**
    - Guided's CarStep tooltip says it's when the lease starts ("usually one to two months from now").
    - Advanced's hint (`components/InputsPanel.tsx` ~285) says it's "the date you commit to the
      lease" (exposure-draft rule for the EV FBT tiers).
    - Ask the owner which definition is right, then align both texts.
13. **Advanced residual inc/ex GST toggle** (`InputsPanel.tsx` ~343): 11px text at 45% opacity, for
    the field Guided calls "the most common slip". Replace it with a visible two-button control
    (`.nlc-pill-group` buttons, like `QuoteChoice` in `LeaseAdjustModal.tsx`).
14. **Typical-figure buttons hidden on running costs** (RunningStep): `typicalIn()` returns null until
    `runningPeriod` is chosen, so "Not sure? Use a typical figure" doesn't show. Default the period
    (e.g. per year), or move the period question first with a note.
15. **Intro expectations** (`Intro` ~743)
    - "Most accurate, ~5 minutes" for the quote path is about 35 inputs. Say about 10 minutes with
      the quote open.
    - "Have these ready" should add "your current car's value and running costs (if comparing with
      keeping it)".
    - "Servicing, rego and insurance costs (optional)" is wrong for the quote path, where they're
      required (with typical-figure buttons).
16. **Move "Estimated market value at lease end"** from LeaseStep (shown when `asksMarketValueEnd(d)`)
    to AlternativesStep. It's only asked for the keep-current-car comparison and isn't on the quote.
    Update `STEP_FIELDS` (`marketValue` is under `lease`), `missingItems` (lease → alternatives) and
    the review-row Edit target.
17. **Phone progress** (`guided.css` line ~22 hides `.gd-steps__text` under 640px): only numbered dots
    show. Add a text line on narrow screens: "Step 4 of 9 · The lease".
18. **Accessibility**
    - `Choices` in `parts.tsx` renders `<label htmlFor={id}>` pointing at a `div role="group"`, so the
      group has no accessible name. Give the label an id and set `aria-labelledby` on the group.
    - The Smart Leasing "You need to correct…" callout (PaymentStep ~1352) is `role="alert"` and
      interrupts screen readers on load. Use `role="status"` or none.
19. **Visual polish**
    - The "per month" / "per year" suffix wraps onto two lines inside money boxes: widen it or use
      `white-space: nowrap`.
    - The placeholder "Type the amount" also shows on km, %, and kWh boxes: pass `placeholder` per
      field ("e.g. 15000", "e.g. 6.2").
    - The Smart Leasing callout uses alarming error-red for a routine step: use the warn or blue
      style.
    - "Typical estimate, not from your quote…" repeats under each of five running-cost boxes: show it
      once for the group.
    - The step count grows from 9 to 10 when "Your alternatives" appears: consider always showing it,
      or say "about 9 steps".
20. **Explorer wording**
    - The "continue anyway" tickbox (~545, "I've double-checked these figures against my quote…")
      also shows on the exploring path, where there's no quote. Use "…and want to continue anyway".
    - The "Effective interest rate" slider (TryNumbers) needs a hint: "Typical novated leases: 7–10%".

### Optional / later (ask the owner)

- **2b.** Show Guided's sanity warnings (`guided/checks.ts`: income low/high, extra zero, swapped
  prices, implausible rates) under Advanced's boxes, as warnings only.
- Advanced jargon labels ("GST saving passed on in NL", "Super Guarantee calculated from pre-NL
  income", "Vehicle dutiable value", "Average Wh per km"). The offset-rate tooltip asks users to work
  out a post-tax rate themselves; Guided's "where would the cash sit" question does it for them.
- "Estimated market value after 5 years" shows on a 4-year lease. It's correct (5-year comparison
  horizon) but confusing; add "(5-year comparison)" or similar.
- Tap-to-fill mileage presets (10,000 / 15,000 / 20,000 / 25,000) under the km box.
- The owner decided **against** a visible hint for the ↑/↓ arrow-key shortcut. Don't add one.

---

## Owner preferences seen in this session

- Wants each fix explained briefly and checkable on localhost before moving on. Replies "next" or
  "ok" to proceed.
- Checks on a wide monitor and in dark theme. Notices layout issues (wrapping, overly wide tables).
  Check both themes and wide plus phone widths.
- Prefers plain, specific wording over generic caveats. Approves of rounding estimates.
- Australian English in UI copy.
