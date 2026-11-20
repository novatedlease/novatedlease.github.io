# Guided mode polish plan (written 2026-11-20)

From a review of the live Guided mode (desktop 1280 px and phone 390 px, light and dark, quote path
with a Maxxia EV quote and the exploring path, plus an axe accessibility scan). This file is the
implementer's brief. It is written so a smaller model can work through it item by item.

`GuidedMode.tsx` below means `calculator2/src/guided/GuidedMode.tsx`. Line numbers are as of commit
`2fdbbcaf`; search for the quoted code if they've drifted.

---

## 0. Rules (read first)

**Working style (owner's preference).** Do one item at a time:
1. Say the plan in 2–4 lines.
2. Implement it and add or update tests.
3. Build and check it in the browser (§9).
4. Tell the owner exactly what to look at.
5. Wait for "next" or "ok" before starting the next item.

The owner checks on a wide monitor and on a phone, in light and dark themes.

**Build and test** (inside `calculator2/`):

```bash
npx tsc -b
npx vitest run              # all must pass (≈400 tests)
npm run build               # writes docs/assets/calculator/main.js + style.css; the site serves these
npx eslint <only the files you changed>
```

- `npx eslint src` reports pre-existing errors in untouched files. Don't fix unrelated lint.
- "Error: Not implemented: window.scrollTo" in test output is jsdom noise.

**Preview:**
- `cd new-site && npx astro dev --port 4322` → http://localhost:4322/calculator/. This serves the
  *built* bundle, so run `npm run build` in `calculator2` first, then reload.
- Don't kill the owner's server on port 4321.

**Hard constraints:**
- Never modify `calculator/src/` (the v1 engine is shared; read-only for this work).
- Never run `new-site/scripts/prepare-content.mjs` (it wipes content).
- `new-site/src/styles/global.css`, `docs/assets/images/smartleasing-example/` and
  `new-site/src/content/docs/costs-and-savings/real-example-smartleasing-21000-cheaper.md` hold the
  owner's **uncommitted** work. Don't edit, stage or commit them. Where a fix would naturally go in
  `global.css`, this plan puts it somewhere else.
- One commit per item. Commit only after the owner OKs the item. **Never push**: a push to `main` is
  live in about 75 seconds, and the owner pushes.
- End commit messages with the attribution lines from the session's system reminder.

**Copy rules (owner):**
- Australian English.
- Short main text; nuance goes in an ⓘ tooltip (`Tip`).
- No over-assertive or over-generous claims.
- Never say a provider's payment "is" ex or inc GST.
- Plain words, not jargon.

**Analytics:** new user actions get a `trackEvent("guided_…")` call (`calculator2/src/utils/analytics.ts`).

---

## 1. Owner decisions

**Answered 2026-11-20:**
- D1: the recommended default.
- D2: the recommended default (add all rows, keep the rate as "Interest rate (worked out)").
- D3: **declined**, so D-1 (take-home check) is parked; don't build it.
- D4, D5, D6: yes. Build D-2, D-3 and D-4 as specified.

| # | Question | Recommended default | Gates |
|---|---|---|---|
| D1 | Exploring path: the breakdown under the rounded headline shows exact dollars ($26,656 under "about $27,000"). How should it read? | Round the big figure and the bold total in the breakdown to "about $27,000"; leave line items exact, with one muted line: "Line items are unrounded workings from typical figures." | A3 |
| D2 | "Your answers" on the quote path: add running costs, kilometres, super, loan and current-car rows? Keep "Effective interest rate" in the list? | Add them (see A5). Keep the rate, relabelled "Interest rate (worked out)". | A5 |
| D3 | Take-home check on results: an optional box for the quote's own take-home figure, compared with ours? | Yes, as specified in D-1. | D-1 |
| D4 | Quote path: add a "What would a cheaper lease be worth?" interest-rate slider that doesn't change their answers? | Yes, as in D-2. | D-2 |
| D5 | Add a simple bar chart of each option's net cost to "Your result"? | Yes, plain CSS bars, no chart library (D-4). | D-4 |
| D6 | Print / save-as-PDF button on results? | Yes (D-3). | D-3 |

---

## 2. Batch A — bugs and visible defects (do first)

### A1. Blank space under the calculator (no decision)

- **Problem:** `global.css:1839` gives `#nl-calculator-root` a `min-height: clamp(1200px, 140vh,
  1800px)`, and 1700px under 900px wide. The height was reserved for the old Advanced layout and stays
  after the app mounts. On Guided's first screen the app is about 440px tall, which leaves about 800px
  blank on desktop and about 1,260px on a phone.
- `calculator2/src/main.tsx` already removes `data-loading` on mount.
- **Fix** (don't touch `global.css`): in the `<style>` block of
  `new-site/src/pages/calculator/index.astro` (~line 297), add:
  ```css
  /* The reserved height only matters while the bundle loads; release it once the app mounts. */
  #nl-calculator-root:not([data-loading]) { min-height: 0; }
  ```
  Astro's scoping attribute plus the `:not([data-loading])` attribute make this outrank both
  `global.css` rules. Check that by measuring, not by assuming.
- **Accept:** after load at 1280 and 390 wide, `#nl-calculator-root` height ≈ `.nlc-root` height
  (§9 script `measure`). The loading skeleton still reserves space before the JS runs: throttle to
  "Slow 3G" in devtools, or check that `data-loading` is still on the element in the static HTML.

### A2. Step bar ticks steps with unanswered questions (no decision)

- **Problem:** in the step bar (`GuidedMode.tsx` ~597–620), the tick depends only on position:
  `data-done={i < stepIndex ? "true" : undefined}` and `{i < stepIndex ? "✓" : i + 1}`. A step whose
  questions are still unanswered shows ✓ while the results page says "Some answers are missing".
- **Fix:**
  ```ts
  const needsAnswers = (id: StepId) =>
    id !== "review" && visited.includes(id) && id !== step && missingForStep(id, draft).length > 0;
  ```
  `missingForStep` is already imported (used in `ReviewStep`).
  - If `needsAnswers(id)`: set `data-incomplete="true"`, show `!` in the dot, and add visually hidden
    text " (needs answers)" inside the button for screen readers.
  - Otherwise keep the current logic.
- **CSS** (`calculator2/src/guided/guided.css`, after line 22):
  `.gd-steps__btn[data-incomplete="true"] .gd-steps__dot { background: var(--nlc-warn-light); border-color: var(--nlc-warn); color: var(--nlc-text); }`
- **Test:** new case in `tests/guided-review-fixes.test.tsx` (copy its setup).
  - Seed a quote draft in localStorage at `step: "review"` with `docFee` blank and all steps visited.
  - Expect the "The lease" step button to have `data-incomplete="true"` and no "✓".
  - Expect a complete step to keep its ✓.

### A3. Exploring path: rounded headline, exact breakdown — gated on D1

- **Problem:** `ReviewStep` passes `approx={exploring}` to `ResultHeadline` (~3223) but not to
  `SummaryView` (~3244). The breakdown's `Hero` therefore shows "$26,656" under "about $27,000".
- **Fix:**
  - Add an optional `approx?: boolean` prop to `SummaryView` (`calculator2/src/components/SummaryView.tsx`,
    signature at line 192). Default false, so Advanced is unchanged.
  - When true:
    - `Hero` shows `about ${fmtAud0(Math.round(Math.abs(n)/1000)*1000)}`.
    - The bold "Total saving / Total extra cost" rows use the same rounding.
    - Under each Hero, add a muted line: "Line items are unrounded workings from typical figures."
  - Pass `approx={exploring}` from `ReviewStep`.
- **Test:** render the exploring results and expect "about $27,000" in the breakdown, with no
  "$26,656" in a Hero. `tests/total-saving.test.tsx` and its snapshots must stay unchanged (Advanced).

### A4. Interest rate shown at two precisions (no decision)

- **Problem:**
  - The Payment step's stat box shows `toFixed(2)` ("11.76%"), `GuidedMode.tsx` ~1724.
  - The note under it uses `pct()` in `calculator2/src/guided/checks.ts:244`, which is `toFixed(1)`
    ("11.8%").
  - `worseOffReasons` (~3505) also uses `toFixed(1)`.
- **Fix:**
  - Add `export function fmtRatePct(pct: number): string { return `${pct.toFixed(2)}%`; }` to
    `calculator2/src/utils/format.ts`.
  - Use it for every *interest-rate* display: the stat box, the three rate messages in `checks.ts`
    (~339, 345, 355), the answers row (~3081), `worseOffReasons` and the `TryNumbers` rate slider label.
  - Leave `pct()` alone for any non-rate uses. Grep `pct(` in `checks.ts` and change only the rate
    messages.
- **Test:** update any assertions on "11.8%"-style text (grep tests for `effective interest rate of`).
  Add one test that the stat box and note show the same figure.

### A5. "Your answers" omits half the inputs — gated on D2

- **Problem:** the quote-path rows (`GuidedMode.tsx` ~3044–3090) leave out:
  - the provider;
  - kilometres and running costs;
  - first-year insurance in the amount financed;
  - the luxury adjustment;
  - the super answer;
  - NSW Health;
  - car-loan details (rate, deposit, fee);
  - current-car details.

  The exploring path also leaves out loan and current-car details.
- **Fix** (default from D2). Add rows in screen order. Each row is `[label, value, editStep]`; skip
  conditional rows with `null` (the list already filters `Boolean`).
  - **"Quote from"** (first row, quote path only): `providerLabel(d.provider)`, or "Not given" when null
    or "other". Edit → `"intro"`.
  - **"Insurance in amount financed"**: only when `d.provider` is `maxxia`, `oly` or `remserv`.
    Values: "Yes, $X" / "No" / "Not sure". Edit → `"lease"`.
  - **"Luxury adjustment"**: only when `isLuxuryRange(d)`. Show "$X per <period>" or "None".
    Edit → `"payment"`.
  - **"Kilometres per year"**: Edit → `"running"`.
  - **"Running costs"**:
    - Value: `"$4,970 per year ex GST"`. Sum the answered service, tyres, rego, insurance, mgmt, plus
      `chargingBudget` (EV) or `fuel` (non-EV), in `d.runningPeriod`. Use the period word and the GST
      wording from `d.runningGstHeading` (ex / inc / "GST not shown").
    - Below it, a muted second line listing the parts: "Servicing $800 · Tyres $400 · Rego $900 ·
      Insurance $1,600 · Fees $450 · Charging $820".
    - Edit → `"running"`.
  - **"Charging price"** (EV only): "25c per kWh" or "Free". Edit → `"running"`.
  - **"Super"**: `superPreNl` maps "Yes" → "Worked out on your salary before the lease", "No" →
    "Worked out on your salary after the lease", "Unsure" → "Not sure (we assumed before the lease)".
    Edit → `"you"`.
  - **"NSW Health employer share"**: only when `nswHealth === true`. Show "$X per <period>".
    Edit → `"you"`.
  - **"Car loan"** (both paths, when `compareLoan`): "8.5% interest, $0 deposit, $10 a month fee".
    Edit → `"alternatives"`.
  - **"Current car"** (both paths, when `compareCurrent`): "Worth $X now, $Y at the end; running costs
    $Z a year". Edit → `"alternatives"`.
  - Relabel "Effective interest rate" to "Interest rate (worked out)".
- Answers that aren't given must use `NOT_ANSWERED` (muted style), never $0.
- **Forum summary:** `forumAnswers` (~3092) is built from `rows`, then pushes its own kilometre and
  per-line running rows. Drop the new on-screen "Kilometres per year", "Running costs" and "Charging
  price" rows from `forumAnswers` so the forum text doesn't repeat them. Keep its per-line detail.
  `tests/forum-summary.test.ts` must still pass unchanged.
- **Test:** seed the full quote draft from §9. Expect rows for Quote from, Running costs ("$4,970 per
  year ex GST"), Super and Car loan. Expect the row count to go up from 13.

### A6. "Compared against" always starts with "Cash purchase" (no decision)

- **Problem:** `comparedRow` (~3010) always starts with "Cash purchase", even when `cashHome === "none"`.
- **Fix:** build it from the existing `alternatives` array (~2953), which already orders cash last
  "(for reference only)". Capitalise the first letter of the joined string.
- **Test:** a draft with `cashHome: "none"` and `compareLoan: true` gives "Compared against: A car
  loan, buying with cash (for reference only)".

### A7. Repeated subtitle in "What this is based on" (no decision)

- **Problem:** on the quote path the Part subtitle "What you told us. Edit takes you back to that
  screen." (~3121) sits right above the Section description "What you told us on each screen. Edit
  takes you back to it."
- **Fix:** change the quote-path Part subtitle to "Your answers, and what we assumed where your quote
  didn't say." Leave the exploring subtitle as is.

### A8. Luxury-adjustment period order differs (no decision)

- **Problem:** at `GuidedMode.tsx` ~1763 the options run Per year, month, fortnight, week. Everywhere
  else they run Per week → Per year.
- **Fix:** reorder to Per week, Per fortnight, Per month, Per year. Autopia's default
  (`luxAdjPeriod = "perYear"`) is set by value, so it isn't affected.
- Check tests that click by position (grep `luxAdj`).

---

## 3. Batch B — accessibility (no decisions)

Run the axe script (§9 `axe`) before and after. **Target: zero `color-contrast`,
`link-in-text-block` and `definition-list` violations inside `.nlc-root`** on the intro, payment,
running, you and review steps, in both themes.

### B1. Contrast

Each problem below is from the axe scan. The suggested fix is a starting point; confirm it with axe.

| Element | Where | Suggested fix |
|---|---|---|
| Inactive "Advanced" mode toggle | `styles/components.css:53` `.nlc-mode-toggle__btn` | `color: var(--nlc-text-soft)` |
| Step-bar dot, unvisited steps (light) | `guided.css:17` `.gd-steps__dot` (inherits `--nlc-text-muted` on `--nlc-bg-sunken`) | `color: var(--nlc-text-soft)` on the dot |
| Current-step dot in dark | `guided.css:21` (white on dark-theme `--nlc-blue`) | dark theme: `background: var(--nlc-blue-dark)` or dark text; check the ratio is ≥ 4.5 |
| Input unit suffix ("per year", "km") | `components.css:313` `.nlc-field__suffix` | `color: var(--nlc-text-soft)` |
| Choice sub-label on a pressed button | `guided.css:132` `.gd-choice__sub` | `color: var(--nlc-text-soft)` |
| "ex GST" tags (dark) | `guided.css:237` `.gd-gsttag` uses `--nlc-text-faint` | `var(--nlc-text-muted)` |

### B2. Links shown by colour only

- axe flags the BYO link in the rate note, and the "See the whole quote" and "Mine looks different"
  links in the quote-picture panel. "Whole page" is underlined but its siblings aren't.
- **Fix:** underline every inline text link in Guided. Leave card-style links alone (the "What to do
  next" cards). Use one rule scoped to text contexts, e.g. `.gd a:not(.gd-next__card)`, using whatever
  class the cards actually use; find it in `components/NextSteps.tsx`.

### B3. Invalid `<dl>` in "Your answers"

- **Problem:** `GuidedMode.tsx` ~3134. Each `<div className="gd-answers__row">` holds `<dt>`, `<dd>`
  and a `<button>`, and the button isn't allowed there.
- **Fix:** move the Edit button inside the `<dd>`, after the value. Adjust `.gd-answers__row` /
  `dd` CSS in `guided.css` so the layout looks identical: value left, Edit at the right edge. Check
  at 390 px too.

---

## 4. Batch C — presentation (no decisions)

### C1. Thousands separators in money boxes

- **Problem:** boxes show "60000", "16860", "15000".
- **Fix** in `MoneyInput` (`calculator2/src/guided/parts.tsx` ~60–95), in `onBlur`:
  ```ts
  const n = parseAmount(value.text);
  if (n !== null && n >= 1000 && !value.none) {
    const pretty = n.toLocaleString("en-AU", { maximumFractionDigits: 2 });
    if (pretty !== value.text) onChange({ ...value, text: pretty });   // keep `estimated` as it was
  }
  ```
  - `parseAmount` already strips commas, so nothing downstream changes.
  - Don't format values under 1000 (rates like 6.1, prices like 0.25).
  - "52.4k" becomes "52,400" on blur. That's intended.
- **Test:** type "60000", blur, and expect the box to read "60,000". The draft value is still 60000
  (`moneyValue`). Typing "6.1" stays "6.1".
- Also check the Smart Leasing / MillarX pop-up (`components/LeaseAdjustModal.tsx`) still reads the
  formatted payment.

### C2. Live total on Running costs

- In `RunningStep` (~2106), after the last money row and before "Where do other lines on my quote
  go?", add a summary row once at least two running-cost boxes have a figure:
  > **Total: $4,970 per year** ex GST
  > Matches your quote's running-costs subtotal? If not, check each line.
- Sum the same fields as A5 (not `chargingRate`), in `d.runningPeriod`. Use the GST tag the boxes
  already show (`gd-gsttag`).
- Put the figure-building helper in a small function shared with A5's "Running costs" row, e.g.
  `runningTotal(d)` in `draft.ts`.
- **Test:** unit test `runningTotal`, and a render test that the total shows and updates.

---

## 5. Batch D — features (each gated on its decision)

### D-1. Check against the quote's take-home figure (D3)

- **Why:** every quote prints the take-home change per pay. Comparing it with ours catches most
  entry mistakes. Today the comparison sits only inside a tooltip (`ResultHeadline`, ~3641–3665).
- **Draft:**
  - Add `quoteTakeHome: Money` to `GuidedDraft` and to `emptyDraft()` (`draft.ts`).
  - `loadStored` merges `emptyDraft()`, so old drafts still load.
  - It is optional: not in `missingItems`.
- **UI** (quote path only, `payPeriod` set), right under the take-home line:
  > Your quote's figure (optional): [$ ____ ] per fortnight

  Use `MoneyInput` with the suffix in the pay period. Once a value is entered, compare it with `perPay`:
  - **Within 3% or $10:** green, "✓ Matches your quote."
  - **Otherwise:** amber, "Ours is $X more/less per fortnight than your quote's. Common reasons:",
    followed by the three bullets now in the tooltip. Put the Smart Leasing / MillarX bullet first
    when `d.paymentCorrected`.
  - Remove the tooltip; the bullets now live in the amber note.
- **Forum summary:** add `["Quote's take-home reduction", "$X per <period>"]` when given.
- **Analytics:** `trackEvent("guided_takehome_check", { match: boolean, diff_pct_bucket: "<3" | "3-10" | ">10" })`.
- **Tests:** a match case, a mismatch case and a blank case (nothing shown).

### D-2. "What would a cheaper lease be worth?" on the quote path (D4)

- **Why:** the most common next question after a quote is "what if BYO finance gets me 7.5%?". Only
  the exploring path has sliders (`TryNumbers`, ~3730), and those rewrite the answers.
- **Build:** a new Part on the quote-path results, between "What this is based on" and "Save, share".
  - It holds one `Slider` (reuse the `Slider` component, ~3435) for the effective interest rate.
    - Range: 4% to the current rate + 2%, step 0.05.
    - Starts at the current rate from `paymentDiagnosisFor(d)`.
  - It does **not** change the draft. Work it out locally:
    - New payment per fortnight from the rate with `fortnightlyLeaseFromEffectiveAnnualRate`
      (`@engine/effectiveinterest`; see how `buildInputs` in `draft.ts` turns `estimateRatePct` into
      a payment on the exploring path, and copy that call).
    - Run `summaryFigures({ ...inputs, vehicleLeasePerFn: newPerFn }, horizon)`.
  - Show:
    > At 7.50%: about **$X better off** than paying cash (now $Y), and take-home about **$Z more per
    > fortnight**.
  - Show a link "Can you bring your own finance? →" to `/tools/byo-employer-check/` when the slider
    is below the current rate.
- Hide the Part when there's no rate (`diag.status !== "ok"`).
- **Analytics:** `trackOncePerSession("guided_quote_whatif", "guided_quote_whatif")` on first move.
- **Tests:**
  - Moving the slider down raises the shown saving.
  - The draft and the main headline are unchanged.

### D-3. Print / save as PDF (D6)

- **Button:** add "Print or save as PDF" to "Save, share or see the full workings" (`ResultTools`,
  ~3848). It calls `window.print()` and fires `trackEvent("guided_print")`.
- **Expand on print:** in `ReviewStep`, listen for `beforeprint` and bump a nonce passed as
  `forceOpenNonce` to the breakdown, "Your answers" and "What we assumed" `Section`s. `Section`
  already supports `forceOpenNonce` (`components/ui/Section.tsx:12`).
- **Print CSS** in `guided.css`, inside `@media print { … }`:
  - **Hide:**
    - the step bar and step count;
    - `.gd-banner`;
    - `.gd-nav`;
    - the start-over links;
    - the What-to-do-next part;
    - TryNumbers and D-2 sliders;
    - the `ResultTools` buttons;
    - the mode toggle and tour button;
    - any coffee nudge.
  - **Force light colours:** check how `styles/tokens.css` switches to dark, and override those
    tokens back to light inside `@media print`.
  - Add `break-inside: avoid` on result cards and answer rows.
  - The site header, nav, FAQ and footer sit outside the app. Hide them with a print block in
    `new-site/src/pages/calculator/index.astro` using `<style is:global>` or `:global(...)`.
    **Not** in `global.css`.
- **Print header:** add a print-only header at the top of the results: "Novated Lease Guide —
  novatedlease.guide/calculator", today's date ("20 Nov 2026" style, `longDate` in `answerText.ts`),
  and one line: "General information, not financial advice. Based on the answers listed below."
- **Check:** use Chrome's print preview (or Playwright `page.pdf()`, §9). Expect at most about 3 A4
  pages for the quote example, nothing cut off, and readable in black-and-white.

### D-4. Bar chart of net cost (D5)

- **Where:** in "Your result", under the headline lines and above "Show how we got this".
- **What:** horizontal bars, one per option shown, in the same order as the headline (cash last when
  `cashNone`).
  - Each bar is that option's **net cost over the horizon**, defined so that the bar differences equal
    the headline savings:

    | Option | Net cost |
    |---|---|
    | Novated lease | `nlTotalSpent + nlInterestTotal` |
    | Paying cash | `offsetTotalSpent + cashInterestTotal` |
    | Car loan | `loanTotalSpent + loanInterestTotal` |

    All of these come from `summaryFigures(inputs, horizon)`.
  - **Check the signs first:** in `summaryFigures`, `interestSaving = nlInterestTotal -
    cashInterestTotal` is a *saving* for the lease, so the interest fields may be "interest earned or
    saved" rather than a cost. Work out the sign so that `cashBar - leaseBar === totalSaving` and
    `loanBar - leaseBar === totalSavingVsLoan`. Add a unit test for both identities.
  - Leave "Keep current car" out of the chart: its comparison includes the car's end value and isn't
    a like-for-like cost. Add a one-line note when it's selected.
- **Build:** plain divs with CSS widths, no chart library.
  - Label and dollar figure on each bar; the lease bar in `--nlc-blue`, the others in
    `--nlc-border-mid`.
  - Give it an `aria-label` that states the figures.
  - Exploring path: round the labels to the nearest $1,000 with "about".
- **Tests:** the identity unit tests, plus a render test with three bars on the quote example.

---

## 6. Parked (don't build without the owner)

- **Early-exit figure on results** ("leave your job after year 2: about $X to pay out"). The logic
  lives inside the `WorstCase` component (`components/reports/WorstCase.tsx`) and would first need
  extracting into a pure function with golden tests. Raise it with the owner after Batch D.
- **Comparing two quotes in Guided** (provider vs BYO). Saved quotes and the comparison view exist in
  Advanced only. A large piece of work.
- **End-of-lease options** (refinance the residual, sell, trade in). Needs engine changes. The
  "residual paid from cash" method line in "What we assumed" already discloses the assumption.
- **Part-year lease terms in Guided** (whole years only today).

---

## 7. Suggested order

A1 → A2 → A3 → A4 → A5 → A6 → A7 → A8 → B1 → B2 → B3 → C1 → C2 → D-2 → D-3 → D-4.
(D-1 was declined by the owner on 2026-11-20.)

---

## 8. Files you'll touch

- `calculator2/src/guided/GuidedMode.tsx`
- `calculator2/src/guided/guided.css`
- `calculator2/src/guided/parts.tsx`
- `calculator2/src/guided/checks.ts`
- `calculator2/src/guided/draft.ts`
- `calculator2/src/guided/forumSummary.ts`
- `calculator2/src/components/SummaryView.tsx`
- `calculator2/src/styles/components.css`
- `calculator2/src/utils/format.ts`
- `calculator2/tests/*`
- `new-site/src/pages/calculator/index.astro`
- `docs/assets/calculator/main.js` and `style.css` (build output, committed)

---

## 9. Verification scripts

The owner's Chrome extension may not be connected. Headless Playwright works.

**Setup** (in your scratchpad directory, not the repo):

```bash
npm init -y >/dev/null && npm i playwright@1.56.1 axe-core@4.10.2
```

Use the already-installed browser:

```js
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const browser = await chromium.launch({ executablePath: exe });
```

**Seeding a draft:** set `localStorage['nlc2-guided-draft-v3']` to `{draft, step, visited}` and reload.
- `nlc2-mode` = `'guided'`.
- Back up and restore localStorage if you use the owner's real Chrome (see
  `notes/archive/UX_FIXES_HANDOFF_2026-11.md`).
- Point `BASE` at `http://localhost:4322/calculator/` for local builds.

```js
const m = t => ({ text: t, none: false, estimated: false }), e = m('');
const quote = { hasQuote:true, vehicleType:'EV', vehicleCondition:'New', compareLoan:true, compareCurrent:false,
  loanDeposit:m('0'), loanRate:m('8.5'), loanFee:m('10'), curValueNow:e, curValueEnd:e, curService:e, curRego:e,
  curFuel:e, curFuelBasisKm:null, curInsurance:e, usedAfter2022:null, usedLctNever:null, leaseStartDate:'2026-12-15',
  exploreStart:null, estimateRatePct:null, baseValue:m('55000'), driveaway:m('60000'), remservPriceSource:null,
  leaseYears:5, monthsDeferred:2, monthsDeferredUnsure:false, docFee:m('500'), insuranceFinanced:'No',
  financedInsurance:e, residualBasis:'incGst', residual:m('16860'), marketValueEnd:e, provider:'maxxia',
  smartMillarx:false, paymentPeriod:'perFn', paymentBasis:'exGst', payment:m('480'), paymentCorrected:false,
  luxAdj:e, luxAdjPeriod:null, gstPassedOn:'Yes', runningGstHeading:'exGst', runningGstCredit:null,
  mileage:m('15000'), runningPeriod:'perYear', service:m('800'), tyres:m('400'), rego:m('900'),
  insurance:m('1600'), mgmt:m('450'), fuel:e, chargingRate:m('0.25'), chargingBudget:m('820'),
  income:m('120000'), superPreNl:'No', cashHome:'offset', offsetRate:m('6.1'), investedRate:e,
  savingsRatePreTax:e, nswHealth:false, nswAmount:e, nswPeriod:null };
// Exploring: { ...quote, hasQuote:false, provider:null, compareLoan:false, exploreStart:'before' }, steps ['quick','review'].
const STEPS = ['intro','car','compare','price','lease','payment','running','you','alternatives','review'];
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(([d, s, v]) => localStorage.setItem('nlc2-guided-draft-v3', JSON.stringify({ draft: d, step: s, visited: v })), [quote, 'review', STEPS]);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('.gd').screenshot({ path: 'review.png' });
```

Baseline with this draft (live site, 2026-11-20):
- $22,931 better off than cash.
- $28,579 better off than a loan.
- Take-home $456 less per fortnight.
- Super $10,500 less.

These must not change unless an item says so.

**`measure` (A1):**

```js
await page.evaluate(() => ({
  root: document.getElementById('nl-calculator-root').offsetHeight,
  app: document.querySelector('.nlc-root').offsetHeight,
}));
```

**`axe` (Batch B):** run in each colour scheme with
`browser.newContext({ colorScheme: 'light' | 'dark', viewport: { width: 1280, height: 900 } })`.

```js
await page.addScriptTag({ content: fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8') });
const v = await page.evaluate(async () => (await axe.run(document.querySelector('.nlc-root'),
  { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] })).violations
  .map(x => `${x.id} x${x.nodes.length}: ${x.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' ; ')}`));
```

**Print check (D-3):** `await page.emulateMedia({ media: 'print' }); await page.pdf({ path: 'result.pdf', format: 'A4' });`

---

## 10. Progress log

Implementer: tick items here as the owner approves them, with the commit hash.

- [~] A1 (implemented 2026-11-20, **not committed, awaiting owner check**) · [ ] A2 · [ ] A3 · [ ] A4 · [ ] A5 · [ ] A6 · [ ] A7 · [ ] A8
- [ ] B1 · [ ] B2 · [ ] B3
- [ ] C1 · [ ] C2
- ~~D-1~~ (declined) · [ ] D-2 · [ ] D-3 · [ ] D-4

---

## 11. Where things stand (paused 2026-11-20)

**A1 is implemented but not committed.**
- The change is 2 lines at the top of the `<style>` block in
  `new-site/src/pages/calculator/index.astro`:
  `#nl-calculator-root:not([data-loading]) { min-height: 0; }`.
- Verified on the local dev server (port 4322), at the plan's "Accept" widths:

  | Width | `#nl-calculator-root` | `.nlc-root` |
  |---|---|---|
  | 1280 | 432 px | 432 px |
  | 390 | 441 px | 441 px |

- Before the app mounts, the page still reserves 1,260 px (140vh of a 900 px window).
- 481 tests pass; tsc is clean.

**Owner to check A1** at http://localhost:4322/calculator/ (start it with
`cd new-site && npx astro dev --port 4322`):
1. Confirm there's no gap below the calculator on desktop and phone.
2. Confirm the longer steps grow without clipping.

**To resume:** start a session and say "continue the Guided polish plan".
1. Commit A1, if approved. Stage only `new-site/src/pages/calculator/index.astro`.
2. Have a Sonnet agent take the next item (A2), one item at a time, under section 0's rules.

The order is in section 7. Decisions are in section 1.
