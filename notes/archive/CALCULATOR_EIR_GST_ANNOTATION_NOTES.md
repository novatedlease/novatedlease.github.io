# Calculator: annotating "GST not passed on" and its effect on EIR — brainstorm

> **Superseded 2026-11-28.** Shipped differently from what is discussed below: when GST isn't passed
> on, the engine holds the finance payment inc GST (so totals are right), the effective interest
> rate shown is the finance rate from payment ÷ 1.1, and a second line gives the rate a GST-passing
> employer's staff would need to pay the same amount. See `calculator2/src/financeRate.ts` and the
> published article `/costs-and-savings/gst-not-passed-on-inflates-eir/`.

This is a parked design discussion about how (or whether) to further annotate the
calculator's Effective Interest Rate (EIR) output to explain the "GST not passed
on the lease payment" scenario, covered in the article
[GST not passed on the lease payment itself](new-site/src/content/docs/costs-and-savings/gst-not-passed-on-inflates-eir.md).

Nothing here has been implemented yet — this is context to pick back up later.

---

## The core question

If someone's employer doesn't pass on GST on the lease payment itself (not just
running costs), their calculator EIR reads ~11%, while the underlying financier's
wholesale rate is really ~8% (see the article for the full worked example, based
on a real Smart Leasing quote). The question: what should we actually tell this
person their "real EIR" is?

## Conclusion reached: 11% is the honest, real EIR — not 8%

EIR is defined (per the site's own existing content) as a property of the
person's *actual cash flows*. This person's actual cash flows genuinely amortise
like an 11% loan. The 8% is a different thing — the underlying financier's
wholesale rate, which would only be *their* rate if GST were passed through.

Telling them "your real EIR is 8%" would understate what they're actually
paying. The GST non-pass-through is a genuine extra cost, not a quoting
artifact to be corrected away.

## Why this doesn't fit the Smart Leasing / MillarX "correction module" pattern

In the Smart Leasing/MillarX case, there is one objectively correct number to
enter, and fixing the input fixes *both* the dollar totals and the EIR at once —
a clean, mechanical correction.

Here there is no such single fix:
- Entering the GST-inclusive figure → dollar totals (net savings, total cost)
  are accurate, but EIR reads "high" (~11%) relative to the underlying rate.
- Entering the GST-exclusive figure → EIR reads "correct" relative to the
  underlying rate (~8%), but dollar totals would be *understated*, since the
  person doesn't actually get that GST credit back.

There's nothing wrong to "correct" on the input side. The issue is purely about
how to *interpret* the output — so an input-transformer tool (like the Smart
Leasing panel) isn't the right shape for a fix here.

## Recommended direction: annotation/decomposition, not a correction module

Instead of a full tool, something lighter that decomposes the EIR reading:
an optional toggle (e.g. "My employer doesn't pass on GST on the lease
payment") that, when checked, shows two clearly labelled numbers side by side:

- "Your effective rate: 11% (what you're actually paying)"
- "Underlying financier rate if GST were passed through: 8%"

This was floated as an idea, not committed to. Still to figure out: where it'd
sit in the UI, whether it needs its own input or can be derived from the
existing `gstSavingPassedOn` field, and whether it's worth the UI complexity
versus just improving the tooltip text (see below).

## Current tooltip (as of this writing)

Lives in `calculator2/src/components/LeaseRateGuard.tsx:290`, as caveat #3 of 4
in the "Calculation caveats" info panel next to the EIR readout:

> "3. GST not passed on: when GST is not passed on by the employer, the
> fortnightly lease charged is inc GST; however the effective interest rate
> calculation assumes this is the ex GST figure, which results in an
> inconsistent rate. This will be addressed in a future update."

### Gaps identified in the current wording

1. **No directionality** — "results in an inconsistent rate" doesn't say the
   reading comes out *higher*, not just "off."
2. **"Will be addressed in a future update"** now reads as a stale promise —
   there's no clean single-number fix here (unlike Smart Leasing), so this sets
   an expectation of an automatic correction that may never ship in that form.
3. **No link to the worked-example article** — someone confused enough to open
   this tooltip is exactly who'd benefit from reading it.

### Draft replacement wording (not yet applied)

> "3. GST not passed on: if your employer doesn't pass on GST on the lease
> payment itself, entering your true out-of-pocket (inc-GST) figure is still
> correct for accurate dollar totals — but the effective interest rate reading
> will come out *higher* than the underlying financier's rate, purely because
> of the extra GST cost. This isn't a bug to be fixed — see [GST not passed on
> the lease payment](https://novatedlease.guide/costs-and-savings/gst-not-passed-on-inflates-eir/)
> for a full worked example."

## Status

- Article: written, reviewed, **not yet pushed** (kept as a local draft per
  request).
- Tooltip rewrite: drafted above, **not yet applied**.
- Toggle/decomposition UI idea: **not designed**, just floated.

Pick this back up by re-reading the article draft at
`new-site/src/content/docs/costs-and-savings/gst-not-passed-on-inflates-eir.md`
and deciding on the tooltip + (optionally) the toggle UI.
