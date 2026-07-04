# Implementation prompt: "Quick tour" for first-time users

> This is a self-contained implementation prompt. Everything below (goals, step copy,
> technical grounding, acceptance criteria) was pre-researched against the codebase as of
> July 2026 — verify anchor IDs / component names still match before building.

## Goal

Add a guided, step-by-step product tour to the novated-lease calculator (`calculator2/`)
that walks a first-time visitor through both calculator modes and every major output
feature. The tour uses a spotlight/highlight overlay that visually points at each feature
while a small card explains it.

## Entry point (the tour button)

- Add a **"Quick tour"** button at the **top-left** of the calculator header.
  - The header row lives in `App.tsx` (the `div` wrapping `<ModeToggle>`, currently
    `justifyContent: "flex-end"`). Change it to `space-between` with the tour button on
    the left and the mode toggle staying on the right.
- The button must be **unmissable**: primary/accent colour, an icon (e.g. ✨ or a compass),
  and a subtle looping pulse animation (CSS `@keyframes`, respect
  `prefers-reduced-motion`). It should read like an invitation, e.g.
  **"✨ New here? Take the quick tour"**.
- Attach a small **"Hide"** affordance to the button (an `×` or a tiny "don't show this
  again" link beside/inside it). Clicking it:
  - hides the button immediately, and
  - persists the choice in `localStorage` under **`nlc2-tour-hidden`** (follow the
    existing `nlc2-*` key convention, see `MODE_STORAGE_KEY = "nlc2-mode"` in `App.tsx`),
    so it never shows again in future sessions.
- Optional nice-to-have: after hiding, keep a low-key "Quick tour" text link in the footer
  (`components/ui/Footer.tsx`) so the tour remains reachable.

## Tour engine

**Hand-roll a small `<Tour>` component rather than pulling in a library.** The tour has to
switch calculator mode (Simple ↔ Advanced) and output tabs (Summary → Details → Compare)
*between steps*, which off-the-shelf tour libraries handle poorly. Requirements:

- A full-viewport dimmed overlay with a **spotlight cutout** around the current target
  (SVG mask or 4-box overlay technique), plus a floating card with: step title, body copy,
  step counter ("Step 4 of 15"), **Back / Next / Skip tour** buttons.
- Targets are located via **`data-tour-id="…"` attributes** added to the existing
  components (listed per-step below). The tour scrolls the target into view
  (`scrollIntoView({ block: "center", behavior: "smooth" })`) before highlighting, and
  re-measures on window resize.
- Each step may declare a `before` action the tour runner executes before rendering the
  highlight — used to switch mode, switch output tab, or force-open a collapsed Details
  `Section` (the app already has this machinery: see `navTarget` / `forceOpenNonce` /
  `pendingDetailsNav` in `App.tsx`). Lift the tour state into `App` so it can call
  `changeMode` and `setOutputTab`.
- Keyboard support: `→`/`Enter` next, `←` back, `Esc` closes. Focus is trapped in the
  card; the card is `role="dialog"` with `aria-label`.
- Closing mid-tour (Esc or "Skip tour") and finishing both **restore the mode + output
  tab the user was in before the tour started**.
- Mobile: if the viewport is narrow, dock the card to the bottom of the screen instead of
  floating beside the target.

## Tour steps and copy

Use this copy (it has been editorial-polished — keep the meaning, feel free to tighten
further). Each step lists: target, required `before` action, and card text.

1. **Welcome** — centered card, no spotlight.
   > **Welcome to the novated lease calculator!**
   > In about a minute, this tour will show you around the two calculator modes and the
   > main results. You can leave at any time with Esc or "Skip tour".

2. **The two modes** — target: `ModeToggle` (`data-tour-id="mode-toggle"`). Before: switch to Simple mode.
   > **Simple or Advanced — pick your depth.**
   > **Simple mode** gives you a quick, rough answer from just the 7 inputs that matter
   > most — perfect if you don't have an actual lease quote yet and just want a feel for
   > the numbers. **Advanced mode** models everything in detail once you have real figures.

3. **Simple mode inputs** — target: Simple mode's input column (`data-tour-id="simple-inputs"`, the `.nlc-input-col` in `SimpleMode.tsx`).
   > **Tell us about the car — and about you.**
   > Just a handful of questions: the car's price and type, how far you drive, your
   > income, the lease term, and whether you have a home-loan offset account. That's all
   > Simple mode needs.

4. **The assumptions box** — target: the "Assumptions we made for you" `Section` (`data-tour-id="simple-assumptions"`).
   > **We filled in the rest for you.**
   > Since you haven't entered a real quote, everything else — running costs, finance
   > rate, fees — uses these standard assumptions. Hover the tooltips to see each one,
   > and switch to Advanced mode any time to override them.

5. **Simple mode result** — target: the `SummaryView` output in Simple mode (`data-tour-id="simple-outcome"`).
   > **Your bottom line, five years out.**
   > This is the headline result: your overall financial position after 5 years with a
   > novated lease, compared with buying the same car outright with cash.

6. **Switching to Advanced** — target: `ModeToggle` again. Before: call `changeMode("advanced")` (this also carries your Simple-mode car across).
   > **Now let's look at Advanced mode.**
   > Everything you entered in Simple mode comes with you — Advanced just lets you
   > replace the assumptions with your real numbers.

7. **Advanced inputs** — target: `InputsPanel` (`data-tour-id="advanced-inputs"`).
   > **Every number, under your control.**
   > This panel takes your full situation: the exact figures from your lease quote, your
   > personal finances and tax details, and all the running costs — rego, insurance,
   > servicing, tyres, fuel or charging.

8. **The two extra comparisons** — target: wrapper around the "Compare with car loan" + "Compare with keeping current car" `Section`s at the bottom of `InputsPanel.tsx` (`data-tour-id="extra-comparisons"`). Before: scroll to bottom of inputs.
   > **Not comparing against cash? No problem.**
   > Turn these on to add more pathways to the comparison: financing the same car with a
   > **car loan**, or **keeping your current car** instead of getting a new one at all.

9. **The three output tabs** — target: the output `Tabs` strip (`data-tour-id="output-tabs"`).
   > **Your results, three ways.**
   > **Summary** for the verdict at a glance, **Details** for the full breakdown, and
   > **Compare** for lining up multiple saved scenarios side by side.

10. **Summary tab** — target: `SummaryView` area. Before: `setOutputTab("summary")`.
    > **The quick verdict.**
    > Summary shows which option comes out ahead and by how much — largely
    > self-explanatory, and each figure links to its detailed workings.

11. **Details: the full walkthrough (Sections 1–2)** — target: Sections 1 & 2. Before: `setOutputTab("details")`, force-open via the existing anchor mechanism (`details-section-1-lease-payments`, `details-section-2-financial-summary`).
    > **Every dollar, traced.**
    > Sections 1 and 2 walk through all the figures behind the result — lease payments and
    > the full financial summary, split into pre-tax and post-tax components — so you can
    > check the maths yourself.

12. **Details: rate & tax flow-ons (Sections 3–4)** — target: Sections 3 & 4 (`details-section-3-effective-interest-rate`, `details-section-4-ati`).
    > **What's the lease really costing you?**
    > Section 3 converts the whole package into an **effective interest rate** you can
    > compare against a loan. Section 4 works out your **adjusted taxable income**, which
    > drives flow-on effects like the childcare subsidy, HECS/HELP repayments and other
    > income-tested items.

13. **Details: super & risk checks (Sections 5–7)** — target: Sections 5–7 (`details-section-5-sg`, plus Section 6 "Rate sensitivity check" and Section 7 "Early termination risk" — add anchor IDs if missing).
    > **The fine print that can bite.**
    > Section 5 shows the hit to your **super** if your employer calculates it on your
    > post-lease salary. Section 6 checks how much more your quote's finance rate costs
    > compared with a typical base rate. Section 7 charts the **worst case**: what you'd
    > owe if you had to terminate the lease early.

14. **Compare tab** — target: `ComparatorView` / saved-quotes area (`data-tour-id="compare-view"`). Before: `setOutputTab("compare")`.
    > **Line up completely different scenarios.**
    > Want to weigh a $30k petrol car bought with cash against a $50k EV on a novated
    > lease? Set each one up as its own quote, save them, and compare them side by side
    > here.

15. **Finish** — centered card. After: restore the user's pre-tour mode and tab.
    > **That's the tour!**
    > You can replay it any time from the "Quick tour" button. Now plug in your own
    > numbers and see where you land.

## Analytics

Reuse the existing `trackEvent` helper (see `mode_switched`, `details_tab_opened` usage in
`App.tsx`): fire `tour_started`, `tour_step_viewed` (with `{ step }`), `tour_completed`,
`tour_skipped` (with `{ step }`), and `tour_hidden_forever`.

## Constraints & gotchas (verified against the codebase)

- Mode is persisted under `nlc2-mode`; switching Simple → Advanced syncs inputs via
  `deriveInputsFromSimpleAnswers` — the tour's mode switches will trigger this, which is
  the desired behaviour.
- Details `Section`s default to **collapsed** (except Basic info & Section 2) — steps
  11–13 must use the existing `forceOpenNonce` mechanism, not assume they're open.
- Arriving via a share link forces Advanced mode (`fromUrl` in `App.tsx`); the tour must
  still be able to start (it switches to Simple itself in step 2).
- Sections 6 and 7 may not have `anchorId`s yet — add them following the
  `details-section-N-…` naming pattern.
- The calculator is embedded in the docs site as a built bundle
  (`docs/assets/calculator2/main.js`); after `npm run build`, restart the Astro dev
  server to see changes (live reload does not pick up the rebuilt JS).
- Respect `prefers-reduced-motion` for the pulse animation and smooth scrolling.

## Acceptance criteria

- [ ] Pulsing "Quick tour" button appears top-left of the calculator on first visit.
- [ ] Its "hide" control removes it permanently (persists across sessions via `nlc2-tour-hidden`).
- [ ] Tour runs all 15 steps in order, switching mode/tabs/sections automatically, with a
      visible spotlight on each target.
- [ ] Back / Next / Skip and Esc all work; keyboard navigation works; focus is trapped.
- [ ] Exiting or finishing the tour restores the user's original mode and output tab.
- [ ] Works on mobile widths (card docks to bottom, spotlight still correct).
- [ ] Analytics events fire as specified.
- [ ] No regressions to normal calculator use when the tour is idle.
